/**
 * =============================================================================
 * INVENTORY HELPER - Database Operations for User Inventory
 * =============================================================================
 * 
 * WHAT IS THIS FILE?
 * This file manages the "inventory" table, which tracks items (drops) that
 * the user has collected along with their quantities.
 * 
 * WHAT DOES IT DO?
 * - ADD: Add items to inventory (increase quantity if exists)
 * - READ: View inventory, check item quantities
 * - REMOVE: Remove items or decrease quantities
 * - STATS: Get inventory statistics
 * 
 * =============================================================================
 */

import { db } from './database';
import { Drop, DropRarity } from './dropsHelper';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/** Represents an inventory entry in the database */
export interface InventoryItem {
  id: string;
  drop_id: string;
  qty: number;
}

/** Inventory item with drop details joined */
export interface InventoryItemWithDetails {
  id: string;
  drop_id: string;
  qty: number;
  name: string;
  rarity: DropRarity;
  icon: string | null;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/** Generate a UUID for new inventory entries */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// =============================================================================
// ADD OPERATIONS
// =============================================================================

/**
 * Add an item to the inventory.
 * If the item already exists, increases the quantity.
 * @param dropId - The drop ID to add
 * @param quantity - Amount to add (default 1)
 * @returns The inventory item ID and new quantity
 */
export async function addToInventory(dropId: string, quantity: number = 1): Promise<{ id: string; qty: number }> {
  // Check if item already exists in inventory
  const existing = await db.getFirstAsync<InventoryItem>(
    'SELECT * FROM inventory WHERE drop_id = ?',
    [dropId]
  );

  if (existing) {
    // Update quantity
    const newQty = existing.qty + quantity;
    await db.runAsync(
      'UPDATE inventory SET qty = ? WHERE id = ?',
      [newQty, existing.id]
    );
    console.log(`Inventory updated: +${quantity} (total: ${newQty})`);
    return { id: existing.id, qty: newQty };
  } else {
    // Create new entry
    const id = generateUUID();
    await db.runAsync(
      'INSERT INTO inventory (id, drop_id, qty) VALUES (?, ?, ?)',
      [id, dropId, quantity]
    );
    console.log(`Item added to inventory with ID: ${id}`);
    return { id, qty: quantity };
  }
}

/**
 * Add a random drop to inventory based on rarity weights.
 * @returns The added inventory item with details, or null if no drops exist
 */
export async function addRandomDrop(): Promise<InventoryItemWithDetails | null> {
  // Get all drops
  const drops = await db.getAllAsync<Drop>('SELECT * FROM drops');
  if (drops.length === 0) {
    console.log('No drops available');
    return null;
  }

  // Rarity weights (higher = more common)
  const weights: Record<DropRarity, number> = {
    common: 60,
    rare: 25,
    epic: 10,
    legendary: 4,
    mythic: 1
  };

  // Calculate weighted selection
  const weightedDrops: Drop[] = [];
  for (const drop of drops) {
    const weight = weights[drop.rarity] || 1;
    for (let i = 0; i < weight; i++) {
      weightedDrops.push(drop);
    }
  }

  // Random selection
  const randomDrop = weightedDrops[Math.floor(Math.random() * weightedDrops.length)];
  const result = await addToInventory(randomDrop.id);

  console.log(`🎁 Received: ${randomDrop.name} (${randomDrop.rarity})`);
  
  return {
    ...result,
    drop_id: randomDrop.id,
    name: randomDrop.name,
    rarity: randomDrop.rarity,
    icon: randomDrop.icon
  };
}

// =============================================================================
// READ OPERATIONS
// =============================================================================

/**
 * Get all inventory items.
 * @returns Array of inventory items
 */
export async function getInventory(): Promise<InventoryItem[]> {
  const items = await db.getAllAsync<InventoryItem>('SELECT * FROM inventory ORDER BY qty DESC');
  return items;
}

/**
 * Get all inventory items with drop details.
 * @returns Array of inventory items with names, rarity, and icons
 */
export async function getInventoryWithDetails(): Promise<InventoryItemWithDetails[]> {
  const items = await db.getAllAsync<InventoryItemWithDetails>(`
    SELECT 
      i.id,
      i.drop_id,
      i.qty,
      d.name,
      d.rarity,
      d.icon
    FROM inventory i
    JOIN drops d ON i.drop_id = d.id
    ORDER BY d.rarity DESC, i.qty DESC
  `);
  return items;
}

/**
 * Get inventory item by drop ID.
 * @param dropId - The drop ID to look up
 * @returns The inventory item or null if not in inventory
 */
export async function getInventoryByDropId(dropId: string): Promise<InventoryItem | null> {
  const item = await db.getFirstAsync<InventoryItem>(
    'SELECT * FROM inventory WHERE drop_id = ?',
    [dropId]
  );
  return item || null;
}

/**
 * Check the quantity of a specific drop in inventory.
 * @param dropId - The drop ID to check
 * @returns Quantity owned (0 if not in inventory)
 */
export async function getItemQuantity(dropId: string): Promise<number> {
  const item = await getInventoryByDropId(dropId);
  return item?.qty || 0;
}

/**
 * Get total number of unique items in inventory.
 * @returns Number of unique items
 */
export async function getUniqueItemCount(): Promise<number> {
  const result = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM inventory'
  );
  return result?.count || 0;
}

/**
 * Get total quantity of all items in inventory.
 * @returns Total item count
 */
export async function getTotalItemCount(): Promise<number> {
  const result = await db.getFirstAsync<{ total: number }>(
    'SELECT COALESCE(SUM(qty), 0) as total FROM inventory'
  );
  return result?.total || 0;
}

/**
 * Get inventory statistics.
 * @returns Object with various inventory stats
 */
export async function getInventoryStats(): Promise<{
  uniqueItems: number;
  totalItems: number;
  byRarity: Record<DropRarity, number>;
}> {
  const uniqueItems = await getUniqueItemCount();
  const totalItems = await getTotalItemCount();
  
  const rarityResults = await db.getAllAsync<{ rarity: DropRarity; total: number }>(`
    SELECT d.rarity, COALESCE(SUM(i.qty), 0) as total
    FROM inventory i
    JOIN drops d ON i.drop_id = d.id
    GROUP BY d.rarity
  `);
  
  const byRarity: Record<DropRarity, number> = {
    common: 0,
    rare: 0,
    epic: 0,
    legendary: 0,
    mythic: 0
  };
  
  for (const row of rarityResults) {
    byRarity[row.rarity] = row.total;
  }
  
  return { uniqueItems, totalItems, byRarity };
}

// =============================================================================
// REMOVE OPERATIONS
// =============================================================================

/**
 * Remove a quantity of an item from inventory.
 * @param dropId - The drop ID to remove
 * @param quantity - Amount to remove (default 1)
 * @returns Object with success status and remaining quantity
 */
export async function removeFromInventory(dropId: string, quantity: number = 1): Promise<{
  success: boolean;
  remainingQty: number;
  message: string;
}> {
  const item = await getInventoryByDropId(dropId);
  
  if (!item) {
    return {
      success: false,
      remainingQty: 0,
      message: 'Item not in inventory'
    };
  }

  if (item.qty < quantity) {
    return {
      success: false,
      remainingQty: item.qty,
      message: `Not enough items! Have ${item.qty}, tried to remove ${quantity}`
    };
  }

  const newQty = item.qty - quantity;
  
  if (newQty === 0) {
    // Remove entry entirely
    await db.runAsync('DELETE FROM inventory WHERE id = ?', [item.id]);
    console.log(`Item removed from inventory entirely`);
  } else {
    // Update quantity
    await db.runAsync('UPDATE inventory SET qty = ? WHERE id = ?', [newQty, item.id]);
    console.log(`Inventory updated: -${quantity} (remaining: ${newQty})`);
  }

  return {
    success: true,
    remainingQty: newQty,
    message: `Removed ${quantity} item(s)`
  };
}

/**
 * Clear all items from inventory.
 * @returns Number of items cleared
 */
export async function clearInventory(): Promise<number> {
  const result = await db.runAsync('DELETE FROM inventory');
  console.log(`Cleared ${result.changes} inventory entries`);
  return result.changes;
}
