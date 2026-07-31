import { db, schema } from '../db/index.js';
import { eq, and } from 'drizzle-orm';

function parseBotAndPlayer(arg1, arg2) {
  if (arg2 === undefined || arg2 === null) {
    return { botId: null, playerName: arg1 };
  }
  return { botId: arg1, playerName: arg2 };
}

export class WhitelistService {
  async getPlayer(botId, playerName) {
    const { botId: targetBotId, playerName: targetPlayerName } = parseBotAndPlayer(botId, playerName);
    if (!targetPlayerName) return null;

    const cleanName = targetPlayerName.trim().toLowerCase();
    try {
      const whereClause = targetBotId
        ? and(eq(schema.playerWhitelist.botId, targetBotId), eq(schema.playerWhitelist.playerName, cleanName))
        : eq(schema.playerWhitelist.playerName, cleanName);

      const row = await db.query.playerWhitelist.findFirst({
        where: whereClause,
      });
      return row || null;
    } catch (err) {
      console.error('[WhitelistService] getPlayer error:', err.message);
      return null;
    }
  }

  async getRole(botId, playerName) {
    const player = await this.getPlayer(botId, playerName);
    return player ? player.role : 'public';
  }

  async isWhitelisted(botId, playerName) {
    const player = await this.getPlayer(botId, playerName);
    return !!player;
  }

  async addPlayer(a, b, c, d) {
    let botId = null;
    let playerName = null;
    let role = 'normal';
    let addedBy = 'system';
    const roles = ['admin', 'vip', 'normal', 'user'];

    if (d !== undefined) {
      botId = a;
      playerName = b;
      role = c || 'normal';
      addedBy = d || 'system';
    } else if (c !== undefined) {
      if (roles.includes(b?.toLowerCase())) {
        botId = null;
        playerName = a;
        role = b;
        addedBy = c;
      } else {
        botId = a;
        playerName = b;
        role = c;
        addedBy = 'system';
      }
    } else if (b !== undefined) {
      if (roles.includes(b?.toLowerCase())) {
        botId = null;
        playerName = a;
        role = b;
        addedBy = 'system';
      } else {
        botId = a;
        playerName = b;
        role = 'normal';
        addedBy = 'system';
      }
    } else {
      botId = null;
      playerName = a;
      role = 'normal';
      addedBy = 'system';
    }

    if (!playerName) return null;
    const cleanName = playerName.trim().toLowerCase();
    const now = new Date();

    const existing = await this.getPlayer(botId, cleanName);
    if (existing) {
      await db.update(schema.playerWhitelist)
        .set({ role, addedBy })
        .where(eq(schema.playerWhitelist.id, existing.id))
        .run();
      return { ...existing, role, addedBy };
    }

    const values = {
      id: `wlist_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      botId: botId || null,
      playerName: cleanName,
      role,
      addedBy,
      createdAt: now,
    };
    await db.insert(schema.playerWhitelist).values(values).run();
    return values;
  }

  async removePlayer(botId, playerName) {
    const { botId: targetBotId, playerName: targetPlayerName } = parseBotAndPlayer(botId, playerName);
    if (!targetPlayerName) return false;

    const cleanName = targetPlayerName.trim().toLowerCase();
    const whereClause = targetBotId
      ? and(eq(schema.playerWhitelist.botId, targetBotId), eq(schema.playerWhitelist.playerName, cleanName))
      : eq(schema.playerWhitelist.playerName, cleanName);

    await db.delete(schema.playerWhitelist).where(whereClause).run();
    return true;
  }

  async listForBot(botId) {
    if (!botId) return [];
    return await db.select().from(schema.playerWhitelist).where(eq(schema.playerWhitelist.botId, botId));
  }

  async listAll() {
    return await db.select().from(schema.playerWhitelist);
  }
}

export const whitelistService = new WhitelistService();
export default whitelistService;

