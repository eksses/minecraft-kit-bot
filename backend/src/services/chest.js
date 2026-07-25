import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const CHEST_FILE = join(process.cwd(), 'chestData.json');

export const chestService = {
  getAll() {
    if (!existsSync(CHEST_FILE)) return {};
    try {
      const data = readFileSync(CHEST_FILE, 'utf-8');
      return JSON.parse(data);
    } catch {
      return {};
    }
  },
  
  get(name) {
    const chests = this.getAll();
    return chests[name] || null;
  },
  
  save(name, data) {
    const chests = this.getAll();
    chests[name] = { x: data.x, y: data.y, z: data.z, item: data.item };
    this.write(chests);
  },
  
  saveChest(name, data) {
    return this.save(name, data);
  },
  
  update(name, data) {
    const chests = this.getAll();
    if (!chests[name]) throw new Error('Chest not found');
    chests[name] = { x: data.x, y: data.y, z: data.z, item: data.item };
    this.write(chests);
  },
  
  updateChest(name, data) {
    return this.update(name, data);
  },
  
  delete(name) {
    const chests = this.getAll();
    if (!chests[name]) throw new Error('Chest not found');
    delete chests[name];
    this.write(chests);
  },
  
  deleteChest(name) {
    return this.delete(name);
  },
  
  write(chests) {
    writeFileSync(CHEST_FILE, JSON.stringify(chests, null, 2), 'utf-8');
  },
};