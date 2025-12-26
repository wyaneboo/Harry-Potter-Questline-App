/**
 * =============================================================================
 * QUEST COMPLETIONS HELPER - Database Operations for Quest Completion Tracking
 * =============================================================================
 * 
 * WHAT IS THIS FILE?
 * This file manages the "quest_completions" table, which keeps a historical
 * record of all quests the user has completed, including when they finished.
 * 
 * WHAT DOES IT DO?
 * - RECORD: Log when a quest is completed
 * - HISTORY: View completion history (all completed quests with dates)
 * - STATS: Get statistics like total completions, streaks, daily progress
 * - UNDO: Remove a completion record if needed
 * 
 * HOW DOES IT WORK?
 * When a user completes a quest, a record is added to this table linking
 * the quest_id with a timestamp. This allows tracking:
 * - WHEN each quest was completed
 * - HOW MANY quests completed over time
 * - COMPLETION PATTERNS (daily, weekly stats)
 * 
 * WHY SEPARATE FROM QUESTS TABLE?
 * The quests table has is_completed (yes/no), but this table stores the
 * actual completion event with timestamp. This enables features like:
 * - "You completed 5 quests today!"
 * - "Your best day was December 25th with 10 completions"
 * - Historical tracking even if quests are deleted
 * 
 * USAGE EXAMPLES:
 * - await recordQuestCompletion(1);
 * - const history = await getCompletionHistory();
 * - const todayCount = await getCompletionsToday();
 * 
 * =============================================================================
 */

import { db } from './database';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/** Represents a quest completion record */
export interface QuestCompletion {
  id: number;
  quest_id: number;
  completed_at: string;
}

/** Completion with quest details joined */
export interface QuestCompletionWithDetails {
  id: number;
  quest_id: number;
  completed_at: string;
  quest_title: string;
  quest_difficulty: string;
  xp_reward: number;
}

/** Daily completion stats */
export interface DailyStats {
  date: string;
  count: number;
  total_xp: number;
}

// =============================================================================
// CREATE OPERATIONS
// =============================================================================

/**
 * Record a quest completion.
 * This adds an entry to the completion history.
 * @param questId - The ID of the completed quest
 * @returns The ID of the completion record
 */
export async function recordQuestCompletion(questId: number): Promise<number> {
  const result = await db.runAsync(
    'INSERT INTO quest_completions (quest_id) VALUES (?)',
    [questId]
  );
  console.log(`Quest ${questId} completion recorded with ID: ${result.lastInsertRowId}`);
  return result.lastInsertRowId;
}

// =============================================================================
// READ OPERATIONS
// =============================================================================

/**
 * Get the complete history of quest completions.
 * @returns Array of completion records (newest first)
 */
export async function getCompletionHistory(): Promise<QuestCompletion[]> {
  const completions = await db.getAllAsync<QuestCompletion>(
    'SELECT * FROM quest_completions ORDER BY completed_at DESC'
  );
  return completions;
}

/**
 * Get completion history with quest details joined.
 * @returns Array of completions with quest information
 */
export async function getCompletionHistoryWithDetails(): Promise<QuestCompletionWithDetails[]> {
  const completions = await db.getAllAsync<QuestCompletionWithDetails>(`
    SELECT 
      qc.id,
      qc.quest_id,
      qc.completed_at,
      q.title as quest_title,
      q.difficulty as quest_difficulty,
      q.xp_reward
    FROM quest_completions qc
    LEFT JOIN quests q ON qc.quest_id = q.id
    ORDER BY qc.completed_at DESC
  `);
  return completions;
}

/**
 * Get completions for a specific quest.
 * @param questId - The quest ID
 * @returns Array of completion records for that quest
 */
export async function getCompletionsForQuest(questId: number): Promise<QuestCompletion[]> {
  const completions = await db.getAllAsync<QuestCompletion>(
    'SELECT * FROM quest_completions WHERE quest_id = ? ORDER BY completed_at DESC',
    [questId]
  );
  return completions;
}

/**
 * Get the total number of quest completions.
 * @returns Total completion count
 */
export async function getTotalCompletionCount(): Promise<number> {
  const result = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM quest_completions'
  );
  return result?.count || 0;
}

/**
 * Get the number of quests completed today.
 * @returns Today's completion count
 */
export async function getCompletionsToday(): Promise<number> {
  const result = await db.getFirstAsync<{ count: number }>(`
    SELECT COUNT(*) as count FROM quest_completions 
    WHERE date(completed_at) = date('now')
  `);
  return result?.count || 0;
}

/**
 * Get the number of quests completed this week.
 * @returns This week's completion count
 */
export async function getCompletionsThisWeek(): Promise<number> {
  const result = await db.getFirstAsync<{ count: number }>(`
    SELECT COUNT(*) as count FROM quest_completions 
    WHERE date(completed_at) >= date('now', '-7 days')
  `);
  return result?.count || 0;
}

/**
 * Get daily completion statistics for the past N days.
 * @param days - Number of days to look back (default 7)
 * @returns Array of daily stats
 */
export async function getDailyStats(days: number = 7): Promise<DailyStats[]> {
  const stats = await db.getAllAsync<DailyStats>(`
    SELECT 
      date(qc.completed_at) as date,
      COUNT(*) as count,
      COALESCE(SUM(q.xp_reward), 0) as total_xp
    FROM quest_completions qc
    LEFT JOIN quests q ON qc.quest_id = q.id
    WHERE date(qc.completed_at) >= date('now', '-${days} days')
    GROUP BY date(qc.completed_at)
    ORDER BY date DESC
  `);
  return stats;
}

/**
 * Check if a specific quest was completed today.
 * @param questId - The quest ID to check
 * @returns True if completed today
 */
export async function wasQuestCompletedToday(questId: number): Promise<boolean> {
  const result = await db.getFirstAsync<{ count: number }>(`
    SELECT COUNT(*) as count FROM quest_completions 
    WHERE quest_id = ? AND date(completed_at) = date('now')
  `, [questId]);
  return (result?.count || 0) > 0;
}

/**
 * Get the most recent completion.
 * @returns The most recent completion record or null
 */
export async function getMostRecentCompletion(): Promise<QuestCompletionWithDetails | null> {
  const completion = await db.getFirstAsync<QuestCompletionWithDetails>(`
    SELECT 
      qc.id,
      qc.quest_id,
      qc.completed_at,
      q.title as quest_title,
      q.difficulty as quest_difficulty,
      q.xp_reward
    FROM quest_completions qc
    LEFT JOIN quests q ON qc.quest_id = q.id
    ORDER BY qc.completed_at DESC
    LIMIT 1
  `);
  return completion || null;
}

// =============================================================================
// DELETE OPERATIONS
// =============================================================================

/**
 * Remove a specific completion record.
 * @param completionId - The completion record ID to remove
 * @returns True if deletion was successful
 */
export async function removeCompletion(completionId: number): Promise<boolean> {
  const result = await db.runAsync(
    'DELETE FROM quest_completions WHERE id = ?',
    [completionId]
  );
  console.log(`Completion ${completionId} removed, rows affected: ${result.changes}`);
  return result.changes > 0;
}

/**
 * Remove all completions for a specific quest.
 * @param questId - The quest ID
 * @returns Number of records deleted
 */
export async function removeCompletionsForQuest(questId: number): Promise<number> {
  const result = await db.runAsync(
    'DELETE FROM quest_completions WHERE quest_id = ?',
    [questId]
  );
  console.log(`Removed ${result.changes} completions for quest ${questId}`);
  return result.changes;
}

/**
 * Clear all completion history.
 * Use with caution - this removes all historical data!
 * @returns Number of records deleted
 */
export async function clearAllCompletionHistory(): Promise<number> {
  const result = await db.runAsync('DELETE FROM quest_completions');
  console.log(`Cleared all completion history, ${result.changes} records removed`);
  return result.changes;
}
