/**
 * =============================================================================
 * DROPS HELPER - Database Operations for Drops (Items)
 * =============================================================================
 * 
 * WHAT IS THIS FILE?
 * This file contains all the helper functions to interact with the "drops" 
 * table in the database. Drops are collectible items with different rarities.
 * 
 * WHAT DOES IT DO?
 * - CREATE: Add new drop definitions to the database
 * - READ: Get all drops, get a single drop, filter by rarity
 * - UPDATE: Modify drop details (name, rarity, icon)
 * - DELETE: Remove drops from the database
 * 
 * RARITY TIERS:
 * - common: Most frequently dropped
 * - rare: Less common, more valuable
 * - epic: Rare and valuable
 * - legendary: Very rare, highly valuable
 * - mythic: Extremely rare, most valuable
 * 
 * =============================================================================
 */

import { db } from './database';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export type DropRarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';

/** Represents a drop/item definition in the database */
export interface Drop {
  id: string;
  name: string;
  rarity: DropRarity;
  icon: string | null;
}

/** Data needed to create a new drop */
export interface CreateDropData {
  id?: string;
  name: string;
  rarity?: DropRarity;
  icon?: string;
}

/** Data for updating an existing drop */
export interface UpdateDropData {
  name?: string;
  rarity?: DropRarity;
  icon?: string;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/** Generate a UUID for new drops */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// =============================================================================
// CREATE OPERATIONS
// =============================================================================

/**
 * Create a new drop definition in the database.
 * @param data - The drop data (name required, others optional)
 * @returns The ID of the newly created drop
 */
export async function createDrop(data: CreateDropData): Promise<string> {
  const id = data.id || generateUUID();
  await db.runAsync(
    `INSERT INTO drops (id, name, rarity, icon) VALUES (?, ?, ?, ?)`,
    [
      id,
      data.name,
      data.rarity || 'common',
      data.icon || null
    ]
  );
  console.log(`Drop created with ID: ${id}`);
  return id;
}

/**
 * Seed default drops for the app.
 * @returns Number of drops created
 */
export async function seedDefaultDrops(): Promise<number> {
  const defaultDrops: CreateDropData[] = [
    // Common items
    { name: 'Chocolate Frog', rarity: 'common', icon: '🐸' },
    { name: 'Bertie Bott\'s Beans', rarity: 'common', icon: '🫘' },
    { name: 'Pumpkin Juice', rarity: 'common', icon: '🎃' },
    { name: 'Quill', rarity: 'common', icon: '🪶' },
    { name: 'Ink Bottle', rarity: 'common', icon: '🖋️' },
    // Rare items
    { name: 'Butterbeer', rarity: 'rare', icon: '🍺' },
    { name: 'Wizard Chess Piece', rarity: 'rare', icon: '♟️' },
    { name: 'Remembrall', rarity: 'rare', icon: '🔮' },
    { name: 'Sneakoscope', rarity: 'rare', icon: '🔭' },
    // Epic items
    { name: 'Marauder\'s Map', rarity: 'epic', icon: '🗺️' },
    { name: 'Time-Turner', rarity: 'epic', icon: '⏳' },
    { name: 'Felix Felicis', rarity: 'epic', icon: '✨' },
    // Legendary items
    { name: 'Invisibility Cloak', rarity: 'legendary', icon: '👻' },
    { name: 'Elder Wand', rarity: 'legendary', icon: '🪄' },
    { name: 'Resurrection Stone', rarity: 'legendary', icon: '💎' },
    // Mythic items
    { name: 'Philosopher\'s Stone', rarity: 'mythic', icon: '🔴' },
    { name: 'Sword of Gryffindor', rarity: 'mythic', icon: '⚔️' },
  ];

  let created = 0;
  for (const drop of defaultDrops) {
    const existing = await db.getFirstAsync<{ id: string }>(
      'SELECT id FROM drops WHERE name = ?',
      [drop.name]
    );
    
    if (!existing) {
      await createDrop(drop);
      created++;
    }
  }

  console.log(`Seeded ${created} new drops`);
  return created;
}

// =============================================================================
// READ OPERATIONS
// =============================================================================

/**
 * Get all drops from the database.
 * @returns Array of all drops
 */
export async function getAllDrops(): Promise<Drop[]> {
  const drops = await db.getAllAsync<Drop>('SELECT * FROM drops ORDER BY name ASC');
  return drops;
}

/**
 * Get a single drop by its ID.
 * @param id - The drop ID
 * @returns The drop or null if not found
 */
export async function getDropById(id: string): Promise<Drop | null> {
  const drop = await db.getFirstAsync<Drop>('SELECT * FROM drops WHERE id = ?', [id]);
  return drop || null;
}

/**
 * Get a drop by name.
 * @param name - The drop name
 * @returns The drop or null if not found
 */
export async function getDropByName(name: string): Promise<Drop | null> {
  const drop = await db.getFirstAsync<Drop>('SELECT * FROM drops WHERE name = ?', [name]);
  return drop || null;
}

/**
 * Get drops filtered by rarity.
 * @param rarity - The rarity level to filter by
 * @returns Array of drops matching the rarity
 */
export async function getDropsByRarity(rarity: DropRarity): Promise<Drop[]> {
  const drops = await db.getAllAsync<Drop>(
    'SELECT * FROM drops WHERE rarity = ? ORDER BY name ASC',
    [rarity]
  );
  return drops;
}

/**
 * Get drop counts by rarity.
 * @returns Object with counts for each rarity tier
 */
export async function getDropCountsByRarity(): Promise<Record<DropRarity, number>> {
  const results = await db.getAllAsync<{ rarity: DropRarity; count: number }>(
    'SELECT rarity, COUNT(*) as count FROM drops GROUP BY rarity'
  );
  
  const counts: Record<DropRarity, number> = {
    common: 0,
    rare: 0,
    epic: 0,
    legendary: 0,
    mythic: 0
  };
  
  for (const row of results) {
    counts[row.rarity] = row.count;
  }
  
  return counts;
}

// =============================================================================
// UPDATE OPERATIONS
// =============================================================================

/**
 * Update a drop's details.
 * @param id - The drop ID to update
 * @param data - The fields to update
 * @returns True if update was successful
 */
export async function updateDrop(id: string, data: UpdateDropData): Promise<boolean> {
  const fields: string[] = [];
  const values: (string | null)[] = [];

  if (data.name !== undefined) {
    fields.push('name = ?');
    values.push(data.name);
  }
  if (data.rarity !== undefined) {
    fields.push('rarity = ?');
    values.push(data.rarity);
  }
  if (data.icon !== undefined) {
    fields.push('icon = ?');
    values.push(data.icon);
  }

  if (fields.length === 0) {
    console.log('No fields to update');
    return false;
  }

  values.push(id);
  const result = await db.runAsync(
    `UPDATE drops SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
  
  console.log(`Drop ${id} updated, rows affected: ${result.changes}`);
  return result.changes > 0;
}

// =============================================================================
// DELETE OPERATIONS
// =============================================================================

/**
 * Delete a drop from the database.
 * Note: This will also delete related inventory entries (CASCADE).
 * @param id - The drop ID to delete
 * @returns True if deletion was successful
 */
export async function deleteDrop(id: string): Promise<boolean> {
  const result = await db.runAsync('DELETE FROM drops WHERE id = ?', [id]);
  console.log(`Drop ${id} deleted, rows affected: ${result.changes}`);
  return result.changes > 0;
}
