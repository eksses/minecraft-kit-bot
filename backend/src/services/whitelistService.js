import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';

export class WhitelistService {
  async getPlayer(playerName) {
    if (!playerName) return null;
    try {
      const row = await db.query.playerWhitelist.findFirst({
        where: eq(schema.playerWhitelist.playerName, playerName.toLowerCase()),
      });
      return row || null;
    } catch (err) {
      console.error('[WhitelistService] getPlayer error:', err.message);
      return null;
    }
  }

  async getRole(playerName) {
    const player = await this.getPlayer(playerName);
    return player ? player.role : 'user';
  }

  async isWhitelisted(playerName) {
    const player = await this.getPlayer(playerName);
    return !!player;
  }

  async addPlayer(playerName, role = 'user', addedBy = 'system') {
    const cleanName = playerName.trim().toLowerCase();
    const now = new Date();
    const values = {
      id: `wlist_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      playerName: cleanName,
      role,
      addedBy,
      createdAt: now,
    };
    await db.insert(schema.playerWhitelist).values(values).onConflictDoUpdate({
      target: schema.playerWhitelist.playerName,
      set: { role, addedBy },
    }).run();
    return values;
  }

  async removePlayer(playerName) {
    const cleanName = playerName.trim().toLowerCase();
    await db.delete(schema.playerWhitelist).where(eq(schema.playerWhitelist.playerName, cleanName)).run();
    return true;
  }

  async listAll() {
    return await db.select().from(schema.playerWhitelist);
  }
}

export const whitelistService = new WhitelistService();
export default whitelistService;
