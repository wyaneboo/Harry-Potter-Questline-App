/**
 * =============================================================================
 * ACHIEVEMENTS HELPER - Database Operations for Achievements/Badges
 * =============================================================================
 * 
 * WHAT IS THIS FILE?
 * This file manages all operations for the "achievements" table. Achievements
 * are special badges or milestones that users can unlock by completing
 * certain goals in the app.
 * 
 * WHAT DOES IT DO?
 * - CREATE: Add new achievements to the database
 * - READ: Get all achievements, check unlock status
 * - UNLOCK: Mark achievements as unlocked with timestamp
 * - PROGRESS: Track progress towards achievements
 * 
 * HOW DOES IT WORK?
 * Achievements are predefined milestones (e.g., "Complete 10 quests").
 * When a user reaches a milestone, the achievement is "unlocked" and
 * the unlock timestamp is recorded. Unlocked achievements can be
 * displayed in a trophy case or profile.
 * 
 * ACHIEVEMENT EXAMPLES:
 * - "First Steps" - Complete your first quest
 * - "Dedicated Wizard" - Complete 50 quests
 * - "House Pride" - Choose your Hogwarts house
 * - "Level 10 Wizard" - Reach level 10
 * 
 * USAGE EXAMPLES:
 * - await createAchievement({ name: "First Steps", description: "..." });
 * - await unlockAchievement(1);
 * - const unlocked = await getUnlockedAchievements();
 * - const progress = await checkAchievementProgress(1);
 * 
 * =============================================================================
 */

import { db } from './database';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/** Represents an achievement in the database */
export interface Achievement {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  is_unlocked: number; // 0 = locked, 1 = unlocked
  unlocked_at: string | null;
}

/** Data needed to create a new achievement */
export interface CreateAchievementData {
  name: string;
  description?: string;
  icon?: string;
}

/** Data for updating an achievement */
export interface UpdateAchievementData {
  name?: string;
  description?: string;
  icon?: string;
}

/** Achievement with unlock status as boolean */
export interface AchievementDisplay {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  isUnlocked: boolean;
  unlockedAt: Date | null;
}

// =============================================================================
// CREATE OPERATIONS
// =============================================================================

/**
 * Create a new achievement.
 * @param data - The achievement data
 * @returns The ID of the newly created achievement
 */
export async function createAchievement(data: CreateAchievementData): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO achievements (name, description, icon) VALUES (?, ?, ?)`,
    [data.name, data.description || null, data.icon || null]
  );
  console.log(`Achievement created with ID: ${result.lastInsertRowId}`);
  return result.lastInsertRowId;
}

/**
 * Seed default achievements for the app.
 * Call this during initial setup to populate starter achievements.
 * @returns Number of achievements created
 */
export async function seedDefaultAchievements(): Promise<number> {
  const defaultAchievements: CreateAchievementData[] = [
    { name: 'First Steps', description: 'Complete your first quest', icon: '🏃' },
    { name: 'Getting Started', description: 'Complete 5 quests', icon: '⭐' },
    { name: 'Quest Apprentice', description: 'Complete 10 quests', icon: '🌟' },
    { name: 'Quest Master', description: 'Complete 25 quests', icon: '✨' },
    { name: 'Legend', description: 'Complete 50 quests', icon: '🏆' },
    { name: 'House Pride', description: 'Choose your Hogwarts house', icon: '🏠' },
    { name: 'Rising Star', description: 'Reach level 5', icon: '📈' },
    { name: 'Experienced Wizard', description: 'Reach level 10', icon: '🧙' },
    { name: 'Master Wizard', description: 'Reach level 25', icon: '🎓' },
    { name: 'Challenge Seeker', description: 'Complete a hard difficulty quest', icon: '💪' },
    { name: 'Easy Does It', description: 'Complete 10 easy quests', icon: '😌' },
    { name: 'Dedicated', description: 'Complete quests 7 days in a row', icon: '🔥' },
  ];

  let created = 0;
  for (const achievement of defaultAchievements) {
    // Check if achievement already exists
    const existing = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM achievements WHERE name = ?',
      [achievement.name]
    );
    
    if (!existing) {
      await createAchievement(achievement);
      created++;
    }
  }

  console.log(`Seeded ${created} new achievements`);
  return created;
}

// =============================================================================
// READ OPERATIONS
// =============================================================================

/**
 * Get all achievements.
 * @returns Array of all achievements
 */
export async function getAllAchievements(): Promise<Achievement[]> {
  const achievements = await db.getAllAsync<Achievement>(
    'SELECT * FROM achievements ORDER BY id ASC'
  );
  return achievements;
}

/**
 * Get all achievements formatted for display.
 * Converts SQLite integers to booleans and strings to Dates.
 * @returns Array of achievements ready for UI display
 */
export async function getAchievementsForDisplay(): Promise<AchievementDisplay[]> {
  const achievements = await getAllAchievements();
  return achievements.map(a => ({
    id: a.id,
    name: a.name,
    description: a.description,
    icon: a.icon,
    isUnlocked: a.is_unlocked === 1,
    unlockedAt: a.unlocked_at ? new Date(a.unlocked_at) : null
  }));
}

/**
 * Get a single achievement by ID.
 * @param id - The achievement ID
 * @returns The achievement or null if not found
 */
export async function getAchievementById(id: number): Promise<Achievement | null> {
  const achievement = await db.getFirstAsync<Achievement>(
    'SELECT * FROM achievements WHERE id = ?',
    [id]
  );
  return achievement || null;
}

/**
 * Get an achievement by name.
 * @param name - The achievement name
 * @returns The achievement or null if not found
 */
export async function getAchievementByName(name: string): Promise<Achievement | null> {
  const achievement = await db.getFirstAsync<Achievement>(
    'SELECT * FROM achievements WHERE name = ?',
    [name]
  );
  return achievement || null;
}

/**
 * Get all unlocked achievements.
 * @returns Array of unlocked achievements
 */
export async function getUnlockedAchievements(): Promise<Achievement[]> {
  const achievements = await db.getAllAsync<Achievement>(
    'SELECT * FROM achievements WHERE is_unlocked = 1 ORDER BY unlocked_at DESC'
  );
  return achievements;
}

/**
 * Get all locked achievements.
 * @returns Array of locked achievements
 */
export async function getLockedAchievements(): Promise<Achievement[]> {
  const achievements = await db.getAllAsync<Achievement>(
    'SELECT * FROM achievements WHERE is_unlocked = 0 ORDER BY id ASC'
  );
  return achievements;
}

/**
 * Get achievement statistics.
 * @returns Object with total, unlocked, and locked counts
 */
export async function getAchievementStats(): Promise<{
  total: number;
  unlocked: number;
  locked: number;
  percentComplete: number;
}> {
  const total = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM achievements'
  );
  const unlocked = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM achievements WHERE is_unlocked = 1'
  );
  
  const totalCount = total?.count || 0;
  const unlockedCount = unlocked?.count || 0;
  
  return {
    total: totalCount,
    unlocked: unlockedCount,
    locked: totalCount - unlockedCount,
    percentComplete: totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0
  };
}

/**
 * Check if a specific achievement is unlocked.
 * @param id - The achievement ID
 * @returns True if unlocked
 */
export async function isAchievementUnlocked(id: number): Promise<boolean> {
  const achievement = await getAchievementById(id);
  return achievement?.is_unlocked === 1;
}

/**
 * Check if an achievement by name is unlocked.
 * @param name - The achievement name
 * @returns True if unlocked
 */
export async function isAchievementUnlockedByName(name: string): Promise<boolean> {
  const achievement = await getAchievementByName(name);
  return achievement?.is_unlocked === 1;
}

// =============================================================================
// UPDATE OPERATIONS
// =============================================================================

/**
 * Unlock an achievement.
 * @param id - The achievement ID to unlock
 * @returns True if successful (or already unlocked)
 */
export async function unlockAchievement(id: number): Promise<boolean> {
  // Check if already unlocked
  const achievement = await getAchievementById(id);
  if (!achievement) {
    console.log(`Achievement ${id} not found`);
    return false;
  }
  
  if (achievement.is_unlocked === 1) {
    console.log(`Achievement "${achievement.name}" already unlocked`);
    return true;
  }

  const result = await db.runAsync(
    `UPDATE achievements SET is_unlocked = 1, unlocked_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [id]
  );

  console.log(`🏆 Achievement unlocked: "${achievement.name}"!`);
  return result.changes > 0;
}

/**
 * Unlock an achievement by name.
 * @param name - The achievement name to unlock
 * @returns True if successful
 */
export async function unlockAchievementByName(name: string): Promise<boolean> {
  const achievement = await getAchievementByName(name);
  if (!achievement) {
    console.log(`Achievement "${name}" not found`);
    return false;
  }
  return unlockAchievement(achievement.id);
}

/**
 * Lock an achievement (remove unlock status).
 * Use this to reset an achievement.
 * @param id - The achievement ID to lock
 * @returns True if successful
 */
export async function lockAchievement(id: number): Promise<boolean> {
  const result = await db.runAsync(
    `UPDATE achievements SET is_unlocked = 0, unlocked_at = NULL WHERE id = ?`,
    [id]
  );
  console.log(`Achievement ${id} locked, rows affected: ${result.changes}`);
  return result.changes > 0;
}

/**
 * Update an achievement's details.
 * @param id - The achievement ID
 * @param data - The fields to update
 * @returns True if successful
 */
export async function updateAchievement(id: number, data: UpdateAchievementData): Promise<boolean> {
  const fields: string[] = [];
  const values: (string | null)[] = [];

  if (data.name !== undefined) {
    fields.push('name = ?');
    values.push(data.name);
  }
  if (data.description !== undefined) {
    fields.push('description = ?');
    values.push(data.description);
  }
  if (data.icon !== undefined) {
    fields.push('icon = ?');
    values.push(data.icon);
  }

  if (fields.length === 0) {
    return false;
  }

  values.push(id.toString());
  const result = await db.runAsync(
    `UPDATE achievements SET ${fields.join(', ')} WHERE id = ?`,
    values
  );

  return result.changes > 0;
}

// =============================================================================
// DELETE OPERATIONS
// =============================================================================

/**
 * Delete an achievement.
 * @param id - The achievement ID to delete
 * @returns True if deletion was successful
 */
export async function deleteAchievement(id: number): Promise<boolean> {
  const result = await db.runAsync('DELETE FROM achievements WHERE id = ?', [id]);
  console.log(`Achievement ${id} deleted, rows affected: ${result.changes}`);
  return result.changes > 0;
}

/**
 * Reset all achievements (lock all).
 * @returns Number of achievements reset
 */
export async function resetAllAchievements(): Promise<number> {
  const result = await db.runAsync(
    'UPDATE achievements SET is_unlocked = 0, unlocked_at = NULL'
  );
  console.log(`Reset ${result.changes} achievements`);
  return result.changes;
}
