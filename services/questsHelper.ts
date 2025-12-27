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
 * - UPDATE: Modify quest details (title, details, difficulty, etc.)
 * - DELETE: Remove quests from the database
 * - COMPLETE: Mark quests as done or todo
 * 
 * =============================================================================
 */

import { db } from './database';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export type QuestDifficulty = 'Easy' | 'Normal' | 'Hard' | 'Boss';
export type QuestStatus = 'todo' | 'done';

/** Represents a quest in the database */
export interface Quest {
  id: string;
  project_id: string | null;
  title: string;
  details: string | null;
  difficulty: QuestDifficulty;
  due_at: string | null;
  status: QuestStatus;
  created_at: string;
  completed_at: string | null;
}

/** Data needed to create a new quest */
export interface CreateQuestData {
  id?: string;
  project_id?: string;
  title: string;
  details?: string;
  difficulty?: QuestDifficulty;
  due_at?: string;
}

/** Data for updating an existing quest */
export interface UpdateQuestData {
  project_id?: string | null;
  title?: string;
  details?: string;
  difficulty?: QuestDifficulty;
  due_at?: string | null;
  status?: QuestStatus;
  completed_at?: string | null;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/** Generate a UUID for new quests */
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
 * Create a new quest in the database.
 * @param data - The quest data (title required, others optional)
 * @returns The ID of the newly created quest
 */
export async function createQuest(data: CreateQuestData): Promise<string> {
  const id = data.id || generateUUID();
  await db.runAsync(
    `INSERT INTO quests (id, project_id, title, details, difficulty, due_at) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.project_id || null,
      data.title,
      data.details || null,
      data.difficulty || 'Normal',
      data.due_at || null
    ]
  );
  console.log(`Quest created with ID: ${id}`);
  return id;
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
export async function getQuestById(id: string): Promise<Quest | null> {
  const quest = await db.getFirstAsync<Quest>('SELECT * FROM quests WHERE id = ?', [id]);
  return quest || null;
}

/**
 * Get all quests with 'todo' status.
 * @returns Array of quests that haven't been completed yet
 */
export async function getTodoQuests(): Promise<Quest[]> {
  const quests = await db.getAllAsync<Quest>(
    "SELECT * FROM quests WHERE status = 'todo' ORDER BY created_at DESC"
  );
  return quests;
}

/**
 * Get all quests with 'done' status.
 * @returns Array of completed quests
 */
export async function getDoneQuests(): Promise<Quest[]> {
  const quests = await db.getAllAsync<Quest>(
    "SELECT * FROM quests WHERE status = 'done' ORDER BY completed_at DESC"
  );
  return quests;
}

/**
 * Get quests by project ID.
 * @param projectId - The project ID to filter by
 * @returns Array of quests for that project
 */
export async function getQuestsByProject(projectId: string): Promise<Quest[]> {
  const quests = await db.getAllAsync<Quest>(
    'SELECT * FROM quests WHERE project_id = ? ORDER BY created_at DESC',
    [projectId]
  );
  return quests;
}

/**
 * Get quests filtered by difficulty.
 * @param difficulty - The difficulty level to filter by
 * @returns Array of quests matching the difficulty
 */
export async function getQuestsByDifficulty(difficulty: QuestDifficulty): Promise<Quest[]> {
  const quests = await db.getAllAsync<Quest>(
    'SELECT * FROM quests WHERE difficulty = ? ORDER BY created_at DESC',
    [difficulty]
  );
  return quests;
}

/**
 * Get quests that are due on or before a specific date.
 * @param date - The date to check (ISO string)
 * @returns Array of quests due on or before that date
 */
export async function getQuestsDueBefore(date: string): Promise<Quest[]> {
  const quests = await db.getAllAsync<Quest>(
    "SELECT * FROM quests WHERE due_at IS NOT NULL AND due_at <= ? AND status = 'todo' ORDER BY due_at ASC",
    [date]
  );
  return quests;
}

/**
 * Get overdue quests.
 * @returns Array of quests past their due date
 */
export async function getOverdueQuests(): Promise<Quest[]> {
  const quests = await db.getAllAsync<Quest>(
    "SELECT * FROM quests WHERE due_at IS NOT NULL AND due_at < date('now') AND status = 'todo' ORDER BY due_at ASC"
  );
  return quests;
}

/**
 * Get the total count of quests.
 * @returns Object with total, todo, and done counts
 */
export async function getQuestCounts(): Promise<{ total: number; todo: number; done: number }> {
  const total = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM quests');
  const done = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM quests WHERE status = 'done'"
  );
  return {
    total: total?.count || 0,
    done: done?.count || 0,
    todo: (total?.count || 0) - (done?.count || 0)
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
export async function updateQuest(id: string, data: UpdateQuestData): Promise<boolean> {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (data.project_id !== undefined) {
    fields.push('project_id = ?');
    values.push(data.project_id);
  }
  if (data.title !== undefined) {
    fields.push('title = ?');
    values.push(data.title);
  }
  if (data.details !== undefined) {
    fields.push('details = ?');
    values.push(data.details);
  }
  if (data.difficulty !== undefined) {
    fields.push('difficulty = ?');
    values.push(data.difficulty);
  }
  if (data.due_at !== undefined) {
    fields.push('due_at = ?');
    values.push(data.due_at);
  }
  if (data.status !== undefined) {
    fields.push('status = ?');
    values.push(data.status);
  }
  if (data.completed_at !== undefined) {
    fields.push('completed_at = ?');
    values.push(data.completed_at);
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
 * Mark a quest as done.
 * @param id - The quest ID to mark as done
 * @returns True if successful
 */
export async function markQuestDone(id: string): Promise<boolean> {
  const result = await db.runAsync(
    "UPDATE quests SET status = 'done', completed_at = CURRENT_TIMESTAMP WHERE id = ?",
    [id]
  );
  console.log(`Quest ${id} marked as done`);
  return result.changes > 0;
}

/**
 * Mark a quest as todo (undo completion).
 * @param id - The quest ID to mark as todo
 * @returns True if successful
 */
export async function markQuestTodo(id: string): Promise<boolean> {
  const result = await db.runAsync(
    "UPDATE quests SET status = 'todo', completed_at = NULL WHERE id = ?",
    [id]
  );
  console.log(`Quest ${id} marked as todo`);
  return result.changes > 0;
}

// =============================================================================
// DELETE OPERATIONS
// =============================================================================

/**
 * Delete a quest from the database.
 * @param id - The quest ID to delete
 * @returns True if deletion was successful
 */
export async function deleteQuest(id: string): Promise<boolean> {
  const result = await db.runAsync('DELETE FROM quests WHERE id = ?', [id]);
  console.log(`Quest ${id} deleted, rows affected: ${result.changes}`);
  return result.changes > 0;
}

/**
 * Delete all completed quests.
 * @returns Number of quests deleted
 */
export async function deleteAllDoneQuests(): Promise<number> {
  const result = await db.runAsync("DELETE FROM quests WHERE status = 'done'");
  console.log(`Deleted ${result.changes} completed quests`);
  return result.changes;
}

/**
 * Delete all quests for a specific project.
 * @param projectId - The project ID
 * @returns Number of quests deleted
 */
export async function deleteQuestsByProject(projectId: string): Promise<number> {
  const result = await db.runAsync('DELETE FROM quests WHERE project_id = ?', [projectId]);
  console.log(`Deleted ${result.changes} quests for project ${projectId}`);
  return result.changes;
}
