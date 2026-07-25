import { EventEmitter } from 'events';
import { db, schema } from '../db/index.js';
import { eq, and, or, asc, desc, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { botLifecycleManager } from './botLifecycle.js';

// ============================================================
// SwarmCoordinator Class
// ============================================================
export class SwarmCoordinator extends EventEmitter {
  constructor() {
    super();
    this.schedulerInterval = null;
    this.SCHEDULER_INTERVAL_MS = 1000; // Check queue every second
  }

  start() {
    this.schedulerInterval = setInterval(
      () => this.processQueue(),
      this.SCHEDULER_INTERVAL_MS
    );
    console.log('Swarm coordinator started');
  }

  stop() {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
    }
    console.log('Swarm coordinator stopped');
  }

  // ============================================================
  // Swarm Management
  // ============================================================
  async createSwarm(userId, name, description, loadBalancing = 'nearest', maxConcurrent = 5) {
    const swarmId = randomUUID();
    
    await db.insert(schema.swarms).values({
      id: swarmId,
      userId,
      name,
      description,
      loadBalancing,
      maxConcurrent,
      createdAt: new Date(),
    });

    return { id: swarmId, name, loadBalancing, maxConcurrent };
  }

  async getSwarm(swarmId) {
    const result = await db.select().from(schema.swarms).where(eq(schema.swarms.id, swarmId));
    return result[0] || null;
  }

  async getUserSwarms(userId) {
    return await db.select().from(schema.swarms).where(eq(schema.swarms.userId, userId));
  }

  async updateSwarm(swarmId, updates) {
    await db.update(schema.swarms).set(updates).where(eq(schema.swarms.id, swarmId));
  }

  async deleteSwarm(swarmId) {
    await db.delete(schema.swarms).where(eq(schema.swarms.id, swarmId));
  }

  // ============================================================
  // Swarm Membership
  // ============================================================
  async addBotToSwarm(botId, swarmId) {
    await db.update(schema.bots)
      .set({ swarmId })
      .where(eq(schema.bots.id, botId));
  }

  async removeBotFromSwarm(botId) {
    await db.update(schema.bots)
      .set({ swarmId: null })
      .where(eq(schema.bots.id, botId));
  }

  async getSwarmBots(swarmId) {
    return await db.select().from(schema.bots).where(eq(schema.bots.swarmId, swarmId));
  }

  // ============================================================
  // Swarm Memory (Shared State)
  // ============================================================
  async setSwarmMemory(swarmId, key, value, expiresAt = null) {
    const existing = await db.select()
      .from(schema.swarmMemory)
      .where(and(
        eq(schema.swarmMemory.swarmId, swarmId),
        eq(schema.swarmMemory.key, key)
      ));

    if (existing.length > 0) {
      await db.update(schema.swarmMemory)
        .set({ value: JSON.stringify(value), expiresAt, updatedAt: new Date() })
        .where(eq(schema.swarmMemory.id, existing[0].id));
    } else {
      await db.insert(schema.swarmMemory).values({
        id: randomUUID(),
        swarmId,
        key,
        value: JSON.stringify(value),
        expiresAt,
        updatedAt: new Date(),
      });
    }
  }

  async getSwarmMemory(swarmId, key) {
    const result = await db.select()
      .from(schema.swarmMemory)
      .where(and(
        eq(schema.swarmMemory.swarmId, swarmId),
        eq(schema.swarmMemory.key, key)
      ));

    if (result.length === 0) return null;
    
    const record = result[0];
    if (record.expiresAt && record.expiresAt < new Date()) {
      await db.delete(schema.swarmMemory).where(eq(schema.swarmMemory.id, record.id));
      return null;
    }
    
    return JSON.parse(record.value);
  }

  async deleteSwarmMemory(swarmId, key) {
    await db.delete(schema.swarmMemory)
      .where(and(
        eq(schema.swarmMemory.swarmId, swarmId),
        eq(schema.swarmMemory.key, key)
      ));
  }

  async getAllSwarmMemory(swarmId) {
    const results = await db.select()
      .from(schema.swarmMemory)
      .where(eq(schema.swarmMemory.swarmId, swarmId));
    
    return results
      .filter(r => !r.expiresAt || r.expiresAt >= new Date())
      .map(r => ({ key: r.key, value: JSON.parse(r.value) }));
  }

  // ============================================================
  // Task Queue Management
  // ============================================================
  async createTask(swarmId, userId, taskData) {
    const taskId = randomUUID();
    
    await db.insert(schema.deliveryQueue).values({
      id: taskId,
      swarmId,
      userId,
      itemName: taskData.itemName,
      itemCount: taskData.itemCount || 1,
      targetX: taskData.targetX,
      targetY: taskData.targetY,
      targetZ: taskData.targetZ,
      targetPlayer: taskData.targetPlayer,
      sourceChestName: taskData.sourceChestName,
      priority: taskData.priority || 0,
      maxRetries: taskData.maxRetries || 3,
      createdAt: new Date(),
    });

    this.emit('task:created', { taskId, swarmId });
    return { id: taskId, status: 'PENDING' };
  }

  async getTask(taskId) {
    const result = await db.select()
      .from(schema.deliveryQueue)
      .where(eq(schema.deliveryQueue.id, taskId));
    return result[0] || null;
  }

  async getSwarmTasks(swarmId, status = null) {
    if (status) {
      return await db.select()
        .from(schema.deliveryQueue)
        .where(and(
          eq(schema.deliveryQueue.swarmId, swarmId),
          eq(schema.deliveryQueue.status, status)
        ));
    }
    return await db.select()
      .from(schema.deliveryQueue)
      .where(eq(schema.deliveryQueue.swarmId, swarmId));
  }

  async getPendingTasks(swarmId) {
    return await db.select()
      .from(schema.deliveryQueue)
      .where(and(
        eq(schema.deliveryQueue.swarmId, swarmId),
        eq(schema.deliveryQueue.status, 'PENDING')
      ))
      .orderBy(desc(schema.deliveryQueue.priority), asc(schema.deliveryQueue.createdAt));
  }

  async cancelTask(taskId) {
    await db.update(schema.deliveryQueue)
      .set({ status: 'FAILED', errorMessage: 'Cancelled by user' })
      .where(eq(schema.deliveryQueue.id, taskId));
  }

  // ============================================================
  // Task Scheduler (Core Swarm Intelligence)
  // ============================================================
  async processQueue() {
    const activeSwarms = await db.select().from(schema.swarms);
    
    for (const swarm of activeSwarms) {
      await this.processSwarmQueue(swarm);
    }
  }

  async processSwarmQueue(swarm) {
    const pendingTasks = await this.getPendingTasks(swarm.id);
    if (pendingTasks.length === 0) return;

    const swarmBots = await this.getSwarmBots(swarm.id);
    const idleBots = swarmBots.filter(bot => {
      const instance = botLifecycleManager.getBot(bot.id);
      return instance && instance.status === 'IDLE';
    });

    if (idleBots.length === 0) return;

    // Get currently active tasks to check concurrency limit
    const activeTasks = await this.getSwarmTasks(swarm.id, 'IN_PROGRESS');
    const lockedTasks = await this.getSwarmTasks(swarm.id, 'LOCKED');
    const totalActive = activeTasks.length + lockedTasks.length;

    for (const task of pendingTasks) {
      if (totalActive >= swarm.maxConcurrent) break;
      if (idleBots.length === 0) break;

      const assignedBot = await this.findBestBot(swarm, idleBots, task);
      if (assignedBot) {
        await this.lockAndAssignTask(task, assignedBot);
        idleBots.splice(idleBots.indexOf(assignedBot), 1);
      }
    }
  }

  async findBestBot(swarm, idleBots, task) {
    switch (swarm.loadBalancing) {
      case 'nearest':
        return this.findNearestBot(idleBots, task);
      case 'least-busy':
        return this.findLeastBusyBot(idleBots);
      case 'round-robin':
        return this.findRoundRobinBot(idleBots);
      default:
        return idleBots[0];
    }
  }

  findNearestBot(idleBots, task) {
    let nearest = null;
    let minDistance = Infinity;

    for (const bot of idleBots) {
      const instance = botLifecycleManager.getBot(bot.id);
      if (!instance) continue;

      const dx = instance.position.x - task.targetX;
      const dy = instance.position.y - task.targetY;
      const dz = instance.position.z - task.targetZ;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (distance < minDistance) {
        minDistance = distance;
        nearest = bot;
      }
    }

    return nearest;
  }

  findLeastBusyBot(idleBots) {
    // All are idle, so just return first
    return idleBots[0];
  }

  findRoundRobinBot(idleBots) {
    // Simple round-robin - return first available
    return idleBots[0];
  }

  async lockAndAssignTask(task, bot) {
    const now = new Date();
    
    await db.update(schema.deliveryQueue)
      .set({
        status: 'LOCKED',
        assignedBotId: bot.id,
        lockedAt: now,
      })
      .where(eq(schema.deliveryQueue.id, task.id));

    this.emit('task:locked', { taskId: task.id, botId: bot.id });

    // Start the task
    await this.startTask(task.id);
  }

  async startTask(taskId) {
    const task = await this.getTask(taskId);
    if (!task || task.status !== 'LOCKED') return;

    const botInstance = botLifecycleManager.getBot(task.assignedBotId);
    if (!botInstance) {
      await this.releaseTask(taskId, 'Bot not found');
      return;
    }

    // Update task status
    await db.update(schema.deliveryQueue)
      .set({ status: 'IN_PROGRESS', startedAt: new Date() })
      .where(eq(schema.deliveryQueue.id, taskId));

    // Set up completion handler
    const completionHandler = async () => {
      await this.completeTask(taskId);
      botInstance.removeListener('item_taken', itemTakenHandler);
      botInstance.removeListener('item_take_error', errorHandler);
    };

    const itemTakenHandler = async (data) => {
      if (data.success) {
        await completionHandler();
      }
    };

    const errorHandler = async (data) => {
      await this.releaseTask(taskId, data.error);
      botInstance.removeListener('item_taken', itemTakenHandler);
      botInstance.removeListener('item_take_error', errorHandler);
    };

    botInstance.once('item_taken', itemTakenHandler);
    botInstance.once('item_take_error', errorHandler);

    // Execute the task - navigate to source chest and take item
    // For now, we'll use a simple approach - the bot needs chest coordinates
    // In production, this would look up chest locations from the database
    this.emit('task:started', { taskId, botId: task.assignedBotId });
  }

  async completeTask(taskId) {
    await db.update(schema.deliveryQueue)
      .set({ status: 'COMPLETED', completedAt: new Date() })
      .where(eq(schema.deliveryQueue.id, taskId));

    this.emit('task:completed', { taskId });
  }

  async releaseTask(taskId, errorMessage = null) {
    const task = await this.getTask(taskId);
    if (!task) return;

    const newRetryCount = task.retryCount + 1;
    
    if (newRetryCount >= task.maxRetries) {
      // Max retries reached - mark as failed
      await db.update(schema.deliveryQueue)
        .set({
          status: 'FAILED',
          errorMessage: errorMessage || 'Max retries exceeded',
          retryCount: newRetryCount,
        })
        .where(eq(schema.deliveryQueue.id, taskId));
      
      this.emit('task:failed', { taskId, errorMessage });
    } else {
      // Release back to queue with elevated priority
      await db.update(schema.deliveryQueue)
        .set({
          status: 'RETRY',
          priority: task.priority + 10,
          retryCount: newRetryCount,
          errorMessage,
          assignedBotId: null,
          lockedAt: null,
          startedAt: null,
        })
        .where(eq(schema.deliveryQueue.id, taskId));

      // Immediately set back to PENDING for re-processing
      await db.update(schema.deliveryQueue)
        .set({ status: 'PENDING' })
        .where(eq(schema.deliveryQueue.id, taskId));
      
      this.emit('task:released', { taskId, retryCount: newRetryCount });
    }
  }

  // ============================================================
  // Bot Failure Handling
  // ============================================================
  async handleBotFailure(botId, error) {
    // Find all tasks assigned to this bot
    const assignedTasks = await db.select()
      .from(schema.deliveryQueue)
      .where(and(
        eq(schema.deliveryQueue.assignedBotId, botId),
        or(
          eq(schema.deliveryQueue.status, 'LOCKED'),
          eq(schema.deliveryQueue.status, 'IN_PROGRESS')
        )
      ));

    // Release all tasks
    for (const task of assignedTasks) {
      await this.releaseTask(task.id, `Bot failure: ${error}`);
    }

    this.emit('bot:failure', { botId, tasksReleased: assignedTasks.length });
  }

  // ============================================================
  // Statistics
  // ============================================================
  async getSwarmStats(swarmId) {
    const totalTasks = await db.select({ count: sql`count(*)` })
      .from(schema.deliveryQueue)
      .where(eq(schema.deliveryQueue.swarmId, swarmId));

    const pendingTasks = await db.select({ count: sql`count(*)` })
      .from(schema.deliveryQueue)
      .where(and(
        eq(schema.deliveryQueue.swarmId, swarmId),
        eq(schema.deliveryQueue.status, 'PENDING')
      ));

    const activeTasks = await db.select({ count: sql`count(*)` })
      .from(schema.deliveryQueue)
      .where(and(
        eq(schema.deliveryQueue.swarmId, swarmId),
        or(
          eq(schema.deliveryQueue.status, 'LOCKED'),
          eq(schema.deliveryQueue.status, 'IN_PROGRESS')
        )
      ));

    const completedTasks = await db.select({ count: sql`count(*)` })
      .from(schema.deliveryQueue)
      .where(and(
        eq(schema.deliveryQueue.swarmId, swarmId),
        eq(schema.deliveryQueue.status, 'COMPLETED')
      ));

    const failedTasks = await db.select({ count: sql`count(*)` })
      .from(schema.deliveryQueue)
      .where(and(
        eq(schema.deliveryQueue.swarmId, swarmId),
        eq(schema.deliveryQueue.status, 'FAILED')
      ));

    const swarmBots = await this.getSwarmBots(swarmId);
    const idleBots = swarmBots.filter(bot => {
      const instance = botLifecycleManager.getBot(bot.id);
      return instance && instance.status === 'IDLE';
    }).length;

    return {
      totalTasks: totalTasks[0]?.count || 0,
      pendingTasks: pendingTasks[0]?.count || 0,
      activeTasks: activeTasks[0]?.count || 0,
      completedTasks: completedTasks[0]?.count || 0,
      failedTasks: failedTasks[0]?.count || 0,
      totalBots: swarmBots.length,
      idleBots,
      busyBots: swarmBots.length - idleBots,
    };
  }
}

export const swarmCoordinator = new SwarmCoordinator();