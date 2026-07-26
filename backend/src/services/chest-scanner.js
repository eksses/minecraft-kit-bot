import { EventEmitter } from 'events';
import { Vec3 } from 'vec3';
import { parseSignText, extractChestName } from '../utils/sign-parser.js';
import pathfinderModule from 'mineflayer-pathfinder';
import { chestLocations } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

const { goals } = pathfinderModule;

export class ChestScanner extends EventEmitter {
  constructor(bot, db) {
    super();
    this.bot = bot;
    this.db = db;
    this.scanning = false;
    this.abortController = null;
  }

  /**
   * Scan for chests within radius of bot's current position.
   * @param {number} radius - Scan radius in blocks (default from config)
   * @param {Object} options - { scanMarkedOnly: boolean }
   * @returns {Promise<Object>} Scan results
   */
  async scan(radius = 32, options = {}) {
    if (this.scanning) {
      throw new Error('Scan already in progress');
    }

    this.scanning = true;
    this.abortController = new AbortController();
    
    const results = { found: 0, cataloged: 0, errors: [] };

    try {
      // Step 1: Discover chest blocks in range
      const chestBlocks = this.findChestBlocks(radius);
      this.emit('progress', { phase: 'discovery', found: chestBlocks.length });

      // Step 2: Pathfind to each chest and read contents
      for (const block of chestBlocks) {
        if (this.abortController.signal.aborted) break;
        
        try {
          await this.scanSingleChest(block, options);
          results.cataloged++;
        } catch (err) {
          results.errors.push({ position: block.position, error: err.message });
        }
        
        results.found++;
        this.emit('progress', { phase: 'scanning', current: results.found, total: chestBlocks.length });
      }

      this.emit('complete', results);
      return results;
    } finally {
      this.scanning = false;
      this.abortController = null;
    }
  }

  /**
   * Find all chest and trapped_chest blocks within radius.
   */
  findChestBlocks(radius) {
    const botPos = this.bot.entity.position;
    const blocks = [];
    
    for (let x = -radius; x <= radius; x++) {
      for (let y = -radius; y <= radius; y++) {
        for (let z = -radius; z <= radius; z++) {
          const pos = botPos.offset(x, y, z);
          const block = this.bot.blockAt(pos);
          if (block && (block.name === 'chest' || block.name === 'trapped_chest')) {
            blocks.push(block);
          }
        }
      }
    }
    
    return blocks;
  }

  /**
   * Scan a single chest: pathfind, open, read contents, check for sign.
   */
  async scanSingleChest(block, options) {
    const pos = block.position;
    
    // Pathfind to chest
    await this.pathTo(pos);
    
    // Check for sign (Scan Marked mod)
    let signData = null;
    let chestName = null;
    
    const signBlock = this.findAttachedSign(block);
    if (signBlock) {
      const lines = this.readSignLines(signBlock);
      signData = parseSignText(lines);
      chestName = extractChestName(signData);
      
      if (options.scanMarkedOnly && !chestName) {
        return; // Skip unnamed chests when scanMarkedOnly
      }
    }
    
    // Open container and read contents
    const container = await this.bot.openContainer(block);
    const contents = this.readContainerContents(container);
    container.close();
    
    // Determine chest name
    if (!chestName) {
      const primaryItem = contents.items[0]?.name || 'unknown';
      chestName = `unnamed:${primaryItem}`;
    }
    
    // Save to database
    await this.saveChestToDb({
      name: chestName,
      x: pos.x,
      y: pos.y,
      z: pos.z,
      item: contents.items[0]?.name || 'unknown',
      itemCount: contents.items[0]?.count || 0,
      allItems: contents.items,
      source: signData ? 'sign' : 'scan',
      signData,
      status: 'active',
      lastScanned: Date.now(),
      botId: this.bot._botId,
    });
  }

  /**
   * Pathfind to a position using GoalNear.
   */
  pathTo(pos) {
    return new Promise((resolve, reject) => {
      this.bot.pathfinder.setGoal(new goals.GoalNear(pos.x, pos.y, pos.z, 1));
      
      const timeout = setTimeout(() => reject(new Error('Pathfinding timeout')), 60000);
      
      this.bot.once('goal_reached', () => {
        clearTimeout(timeout);
        resolve();
      });
    });
  }

  /**
   * Find a sign block attached to the chest's front or back face.
   */
  findAttachedSign(chestBlock) {
    const pos = chestBlock.position;
    
    // Check north and south faces (z-1 and z+1)
    const faces = [
      { dx: 0, dy: 0, dz: -1 }, // north
      { dx: 0, dy: 0, dz: 1 },  // south
    ];
    
    for (const face of faces) {
      const signPos = pos.offset(face.dx, face.dy, face.dz);
      const block = this.bot.blockAt(signPos);
      if (block && block.name.includes('sign')) {
        return block;
      }
    }
    
    return null;
  }

  /**
   * Read sign text lines from a sign block.
   */
  readSignLines(signBlock) {
    // Mineflayer stores sign text in block entity data
    const entity = signBlock?.entity;
    if (!entity) return [];
    
    return [
      entity.Text1 || '',
      entity.Text2 || '',
      entity.Text3 || '',
      entity.Text4 || '',
    ];
  }

  /**
   * Read all items from an open container.
   */
  readContainerContents(container) {
    const items = container.slots
      .filter(slot => slot !== null)
      .map(slot => ({
        name: this.bot.registry.items[slot.type]?.name || 'unknown',
        count: slot.count,
        slot: slot.slot,
      }));
    
    return { items, totalSlots: container.slots.length };
  }

  /**
   * Save or update chest in database.
   */
  async saveChestToDb(chestData) {
    // Upsert logic: check if chest exists at this position FOR THIS BOT
    // Critical: scope by botId — two bots can have chests at same coordinates
    const existing = await this.db.query.chestLocations.findFirst({
      where: (chestLocations, { and, eq }) =>
        and(
          eq(chestLocations.botId, chestData.botId),
          eq(chestLocations.x, chestData.x),
          eq(chestLocations.y, chestData.y),
          eq(chestLocations.z, chestData.z)
        ),
    });

    if (existing) {
      await this.db.update(chestLocations)
        .set({
          itemCount: chestData.itemCount,
          allItems: JSON.stringify(chestData.allItems),
          lastScanned: chestData.lastScanned,
          status: chestData.status,
        })
        .where(eq(chestLocations.id, existing.id));
    } else {
      await this.db.insert(chestLocations).values({
        id: crypto.randomUUID(),
        userId: this.bot._userId,
        serverId: this.bot._serverId,
        name: chestData.name,
        x: chestData.x,
        y: chestData.y,
        z: chestData.z,
        itemName: chestData.item,
        itemCount: chestData.itemCount,
        allItems: JSON.stringify(chestData.allItems),
        source: chestData.source,
        signData: chestData.signData ? JSON.stringify(chestData.signData) : null,
        status: chestData.status,
        lastScanned: chestData.lastScanned,
        botId: chestData.botId,
        createdAt: Date.now(),
      });
    }
  }

  /**
   * Rescan a single chest after delivery.
   */
  async rescanChest(x, y, z) {
    const pos = new Vec3(x, y, z);
    const block = this.bot.blockAt(pos);
    
    if (!block || (block.name !== 'chest' && block.name !== 'trapped_chest')) {
      // Chest missing or moved
      await this.markChestUnavailable(x, y, z);
      return { status: 'unavailable', reason: 'Chest not found at position' };
    }
    
    // Read contents
    await this.pathTo(pos);
    const container = await this.bot.openContainer(block);
    const contents = this.readContainerContents(container);
    container.close();
    
    // Update database
    await this.updateChestCount(x, y, z, contents.items[0]?.count || 0);
    
    return { status: 'active', itemCount: contents.items[0]?.count || 0 };
  }

  async markChestUnavailable(x, y, z) {
    const botId = this.bot._botId;
    await this.db.update(chestLocations)
      .set({ status: 'unavailable' })
      .where(
        and(
          eq(chestLocations.botId, botId),
          eq(chestLocations.x, x),
          eq(chestLocations.y, y),
          eq(chestLocations.z, z)
        )
      );
  }

  async updateChestCount(x, y, z, count) {
    const botId = this.bot._botId;
    await this.db.update(chestLocations)
      .set({ 
        itemCount: count,
        lastScanned: Date.now()
      })
      .where(
        and(
          eq(chestLocations.botId, botId),
          eq(chestLocations.x, x),
          eq(chestLocations.y, y),
          eq(chestLocations.z, z)
        )
      );
  }

  /**
   * Abort the current scan.
   */
  abort() {
    if (this.abortController) {
      this.abortController.abort();
    }
  }
}