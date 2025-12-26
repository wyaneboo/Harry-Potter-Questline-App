/**
 * =============================================================================
 * QUESTS HELPER - Database Operations for Quests
 * =============================================================================
 * 
 * WHAT IS THIS FILE?
 * This file contains all the helper functions to interact with the "quests" 
 * table in the database. It's like a toolbox for managing quests.
 * 
 * WHAT DOES IT DO?
 * - CREATE: Add new quests to the database
 * - READ: Get all quests, get a single quest, or filter quests
 * - UPDATE: Modify quest details (title, description, difficulty, etc.)
 * - DELETE: Remove quests from the database
 * - COMPLETE: Mark quests as completed or incomplete
 * 
 * HOW DOES IT WORK?
 * Each function uses the database connection from database.ts to run SQL
 * queries. The functions handle the SQL complexity so you can just call
 * simple functions like getQuests() or createQuest() in your app code.
 * 
 * USAGE EXAMPLES:
 * - const quests = await getAllQuests();
 * - await createQuest({ title: "Defeat the Basilisk", xp_reward: 100 });
 * - await markQuestComplete(1);
 * - await deleteQuest(5);
 * 
 * =============================================================================
 */

import { db } from './database';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/** Represents a quest in the database */
export interface Quest {
  id: number;
  title: string;
  description: string | null;
  difficulty: 'Easy' | 'Normal' | 'Hard' | 'Boss';
  xp_reward: number;
  is_completed: number; // 0 = false, 1 = true (SQLite doesn't have boolean)
  created_at: string;
}

/** Data needed to create a new quest (id and timestamps are auto-generated) */
export interface CreateQuestData {
  title: string;
  description?: string;
  difficulty?: 'Easy' | 'Normal' | 'Hard' | 'Boss';
  xp_reward?: number;
}

/** Data for updating an existing quest (all fields optional) */
export interface UpdateQuestData {
  title?: string;
  description?: string;
  difficulty?: 'Easy' | 'Normal' | 'Hard' | 'Boss';
  xp_reward?: number;
  is_completed?: number;
}

// =============================================================================
// CREATE OPERATIONS
// =============================================================================

/**
 * Create a new quest in the database.
 * @param data - The quest data (title required, others optional)
 * @returns The ID of the newly created quest
 */
export async function createQuest(data: CreateQuestData): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO quests (title, description, difficulty, xp_reward) 
     VALUES (?, ?, ?, ?)`,
    [
      data.title,
      data.description || null,
      data.difficulty || 'Normal',
      data.xp_reward || 10
    ]
  );
  console.log(`Quest created with ID: ${result.lastInsertRowId}`);
  return result.lastInsertRowId;
}

// =============================================================================
// READ OPERATIONS
// =============================================================================

/**
 * Get all quests from the database.
 * @returns Array of all quests
 */
export async function getAllQuests(): Promise<Quest[]> {
  const quests = await db.getAllAsync<Quest>('SELECT * FROM quests ORDER BY created_at DESC');
  return quests;
}

/**
 * Get a single quest by its ID.
 * @param id - The quest ID
 * @returns The quest or null if not found
 */
export async function getQuestById(id: number): Promise<Quest | null> {
  const quest = await db.getFirstAsync<Quest>('SELECT * FROM quests WHERE id = ?', [id]);
  return quest || null;
}

/**
 * Get all incomplete quests.
 * @returns Array of quests that haven't been completed yet
 */
export async function getIncompleteQuests(): Promise<Quest[]> {
  const quests = await db.getAllAsync<Quest>(
    'SELECT * FROM quests WHERE is_completed = 0 ORDER BY created_at DESC'
  );
  return quests;
}

/**
 * Get all completed quests.
 * @returns Array of completed quests
 */
export async function getCompletedQuests(): Promise<Quest[]> {
  const quests = await db.getAllAsync<Quest>(
    'SELECT * FROM quests WHERE is_completed = 1 ORDER BY created_at DESC'
  );
  return quests;
}

/**
 * Get quests filtered by difficulty.
 * @param difficulty - The difficulty level to filter by
 * @returns Array of quests matching the difficulty
 */
export async function getQuestsByDifficulty(difficulty: 'Easy' | 'Normal' | 'Hard' | 'Boss'): Promise<Quest[]> {
  const quests = await db.getAllAsync<Quest>(
    'SELECT * FROM quests WHERE difficulty = ? ORDER BY created_at DESC',
    [difficulty]
  );
  return quests;
}

/**
 * Get the total count of quests.
 * @returns Object with total, completed, and incomplete counts
 */
export async function getQuestCounts(): Promise<{ total: number; completed: number; incomplete: number }> {
  const total = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM quests');
  const completed = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM quests WHERE is_completed = 1'
  );
  return {
    total: total?.count || 0,
    completed: completed?.count || 0,
    incomplete: (total?.count || 0) - (completed?.count || 0)
  };
}

// =============================================================================
// UPDATE OPERATIONS
// =============================================================================

/**
 * Update a quest's details.
 * @param id - The quest ID to update
 * @param data - The fields to update
 * @returns True if update was successful
 */
export async function updateQuest(id: number, data: UpdateQuestData): Promise<boolean> {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (data.title !== undefined) {
    fields.push('title = ?');
    values.push(data.title);
  }
  if (data.description !== undefined) {
    fields.push('description = ?');
    values.push(data.description);
  }
  if (data.difficulty !== undefined) {
    fields.push('difficulty = ?');
    values.push(data.difficulty);
  }
  if (data.xp_reward !== undefined) {
    fields.push('xp_reward = ?');
    values.push(data.xp_reward);
  }
  if (data.is_completed !== undefined) {
    fields.push('is_completed = ?');
    values.push(data.is_completed);
  }

  if (fields.length === 0) {
    console.log('No fields to update');
    return false;
  }

  values.push(id);
  const result = await db.runAsync(
    `UPDATE quests SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
  
  console.log(`Quest ${id} updated, rows affected: ${result.changes}`);
  return result.changes > 0;
}

/**
 * Mark a quest as completed.
 * @param id - The quest ID to mark as complete
 * @returns True if successful
 */
export async function markQuestComplete(id: number): Promise<boolean> {
  return updateQuest(id, { is_completed: 1 });
}

/**
 * Mark a quest as incomplete.
 * @param id - The quest ID to mark as incomplete
 * @returns True if successful
 */
export async function markQuestIncomplete(id: number): Promise<boolean> {
  return updateQuest(id, { is_completed: 0 });
}

// =============================================================================
// DELETE OPERATIONS
// =============================================================================

/**
 * Delete a quest from the database.
 * @param id - The quest ID to delete
 * @returns True if deletion was successful
 */
export async function deleteQuest(id: number): Promise<boolean> {
  const result = await db.runAsync('DELETE FROM quests WHERE id = ?', [id]);
  console.log(`Quest ${id} deleted, rows affected: ${result.changes}`);
  return result.changes > 0;
}

/**
 * Delete all completed quests.
 * @returns Number of quests deleted
 */
export async function deleteAllCompletedQuests(): Promise<number> {
  const result = await db.runAsync('DELETE FROM quests WHERE is_completed = 1');
  console.log(`Deleted ${result.changes} completed quests`);
  return result.changes;
}
