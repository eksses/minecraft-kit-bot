import { db, schema } from '../db/index.js';
import { whitelistService } from './whitelistService.js';
import { eq, and } from 'drizzle-orm';

const RANK_LEVELS = {
  public: 0,
  user: 1,
  normal: 1,
  vip: 2,
  admin: 3,
};

export class ChestRuleEngine {
  getRankLevel(role) {
    const r = (role || 'public').trim().toLowerCase();
    return RANK_LEVELS[r] !== undefined ? RANK_LEVELS[r] : 0;
  }

  hasRankAccess(playerRole, requiredRank) {
    const pLevel = this.getRankLevel(playerRole);
    const rLevel = this.getRankLevel(requiredRank);
    return pLevel >= rLevel;
  }

  async validateAccess(botId, playerName, chest) {
    const cleanName = (playerName || '').trim().toLowerCase();

    // 1. Check status
    if (chest.status === 'disabled') {
      return { allowed: false, reason: `Kit "${chest.name || 'Chest'}" is currently disabled.` };
    }

    // 2. Check Rank Requirement
    const playerRole = await whitelistService.getRole(botId, cleanName);
    const minRank = chest.minRank || 'public';

    if (!this.hasRankAccess(playerRole, minRank)) {
      return {
        allowed: false,
        reason: `Denied: "${chest.name || 'Chest'}" requires ${minRank.toUpperCase()} rank (Your rank: ${playerRole.toUpperCase()}).`,
      };
    }

    // 3. Check Cooldowns & Usage Limits
    if (chest.cooldownMinutes > 0 || chest.maxHourlyLimit > 0 || chest.maxDailyLimit > 0) {
      const cooldownRecord = await db.query.playerCooldowns.findFirst({
        where: (playerCooldowns, { and, eq }) =>
          and(
            eq(playerCooldowns.botId, botId),
            eq(playerCooldowns.playerName, cleanName),
            eq(playerCooldowns.chestId, chest.id)
          ),
      });

      if (cooldownRecord) {
        const now = Date.now();

        // Cooldown timer check
        if (chest.cooldownMinutes > 0 && cooldownRecord.lastClaimAt) {
          const lastClaim = new Date(cooldownRecord.lastClaimAt).getTime();
          const cooldownMs = chest.cooldownMinutes * 60 * 1000;
          const elapsed = now - lastClaim;
          if (elapsed < cooldownMs) {
            const remainingMinutes = Math.ceil((cooldownMs - elapsed) / (60 * 1000));
            return {
              allowed: false,
              reason: `Kit "${chest.name || 'Chest'}" is on cooldown for ${remainingMinutes}m.`,
            };
          }
        }

        // Hourly limit check
        if (chest.maxHourlyLimit > 0 && cooldownRecord.hourlyResetAt) {
          const hourlyReset = new Date(cooldownRecord.hourlyResetAt).getTime();
          if (now < hourlyReset && cooldownRecord.claimCountHour >= chest.maxHourlyLimit) {
            return {
              allowed: false,
              reason: `Hourly limit reached (${chest.maxHourlyLimit}/hr) for "${chest.name || 'Chest'}".`,
            };
          }
        }

        // Daily limit check
        if (chest.maxDailyLimit > 0 && cooldownRecord.dailyResetAt) {
          const dailyReset = new Date(cooldownRecord.dailyResetAt).getTime();
          if (now < dailyReset && cooldownRecord.claimCountDay >= chest.maxDailyLimit) {
            return {
              allowed: false,
              reason: `Daily limit reached (${chest.maxDailyLimit}/day) for "${chest.name || 'Chest'}".`,
            };
          }
        }
      }
    }

    return { allowed: true };
  }

  async recordClaim(botId, playerName, chestId) {
    const cleanName = (playerName || '').trim().toLowerCase();
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    const oneDayLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const existing = await db.query.playerCooldowns.findFirst({
      where: (playerCooldowns, { and, eq }) =>
        and(
          eq(playerCooldowns.botId, botId),
          eq(playerCooldowns.playerName, cleanName),
          eq(playerCooldowns.chestId, chestId)
        ),
    });

    if (existing) {
      const resetHour = existing.hourlyResetAt ? now.getTime() >= new Date(existing.hourlyResetAt).getTime() : true;
      const resetDay = existing.dailyResetAt ? now.getTime() >= new Date(existing.dailyResetAt).getTime() : true;

      await db.update(schema.playerCooldowns)
        .set({
          claimCountHour: resetHour ? 1 : existing.claimCountHour + 1,
          claimCountDay: resetDay ? 1 : existing.claimCountDay + 1,
          lastClaimAt: now,
          hourlyResetAt: resetHour ? oneHourLater : existing.hourlyResetAt,
          dailyResetAt: resetDay ? oneDayLater : existing.dailyResetAt,
        })
        .where(eq(schema.playerCooldowns.id, existing.id))
        .run();
    } else {
      await db.insert(schema.playerCooldowns).values({
        id: `cd_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        botId,
        playerName: cleanName,
        chestId,
        claimCountHour: 1,
        claimCountDay: 1,
        lastClaimAt: now,
        hourlyResetAt: oneHourLater,
        dailyResetAt: oneDayLater,
      }).run();
    }
  }

  async resetCooldowns(botId, playerName, chestId) {
    const cleanName = (playerName || '').trim().toLowerCase();
    let whereClause;

    if (chestId) {
      whereClause = and(
        eq(schema.playerCooldowns.botId, botId),
        eq(schema.playerCooldowns.playerName, cleanName),
        eq(schema.playerCooldowns.chestId, chestId)
      );
    } else {
      whereClause = and(
        eq(schema.playerCooldowns.botId, botId),
        eq(schema.playerCooldowns.playerName, cleanName)
      );
    }

    await db.delete(schema.playerCooldowns).where(whereClause).run();
    return true;
  }
}

export const chestRuleEngine = new ChestRuleEngine();
export default chestRuleEngine;
