/**
 * =============================================================================
 * USER PROGRESS HELPER - Database Operations for User Profile & Progress
 * =============================================================================
 * 
 * WHAT IS THIS FILE?
 * This file manages all operations for the "user_progress" table. It handles
 * everything related to the player's profile, XP, levels, and galleons.
 * 
 * WHAT DOES IT DO?
 * - PROFILE: Create and manage the user's profile (username)
 * - XP SYSTEM: Add XP, track total XP earned
 * - LEVELING: Calculate and update user level based on XP
 * - GALLEONS: Manage the user's currency (earn, spend, check balance)
 * 
 * HOW DOES IT WORK?
 * The app supports a single user (local profile). When the user first opens
 * the app, a profile is created. XP is awarded when completing quests, and
 * the level is calculated based on total XP (every 100 XP = 1 level).
 * Galleons are the in-app currency earned from quests.
 * 
 * USER PROFILE STRUCTURE:
 * - id: Unique identifier (auto-generated)
 * - username: The user's display name
 * - level: Current level (starts at 1)
 * - xp: Total experience points earned
 * - galleons: In-game currency balance
 * 
 * LEVEL FORMULA:
 * Level = floor(xp / 100) + 1
 * - 0-99 XP = Level 1
 * - 100-199 XP = Level 2
 * - 200-299 XP = Level 3
 * - And so on...
 * 
 * USAGE EXAMPLES:
 * - await createUserProfile("Harry");
 * - await addXP(50);
 * - await addGalleons(100);
 * - await spendGalleons(25);
 * - const user = await getUserProgress();
 * 
 * =============================================================================
 */

import { db } from './database';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/** Represents user progress in the database */
export interface UserProgress {
  id: number;
  username: string;
  level: number;
  xp: number;
  galleons: number;
}

/** Data needed to create a user profile */
export interface CreateUserData {
  username: string;
}

/** Data for updating user profile */
export interface UpdateUserData {
  username?: string;
  level?: number;
  xp?: number;
  galleons?: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** XP required per level */
const XP_PER_LEVEL = 100;

// =============================================================================
// CREATE OPERATIONS
// =============================================================================

/**
 * Create a new user profile.
 * Note: This app supports only one user (single-player local experience).
 * @param data - The user data (username required)
 * @returns The ID of the newly created user
 */
export async function createUserProfile(data: CreateUserData): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO user_progress (username, level, xp, galleons) 
     VALUES (?, 1, 0, 0)`,
    [data.username]
  );
  console.log(`User profile created with ID: ${result.lastInsertRowId}`);
  return result.lastInsertRowId;
}

// =============================================================================
// READ OPERATIONS
// =============================================================================

/**
 * Get the user's progress (assumes single user).
 * @returns The user progress or null if no user exists
 */
export async function getUserProgress(): Promise<UserProgress | null> {
  const user = await db.getFirstAsync<UserProgress>(
    'SELECT * FROM user_progress ORDER BY id ASC LIMIT 1'
  );
  return user || null;
}

/**
 * Check if a user profile exists.
 * @returns True if a user profile exists
 */
export async function userExists(): Promise<boolean> {
  const user = await getUserProgress();
  return user !== null;
}

/**
 * Get the user's current level.
 * @returns The user's level or 1 if no user
 */
export async function getUserLevel(): Promise<number> {
  const user = await getUserProgress();
  return user?.level || 1;
}

/**
 * Get the user's total XP.
 * @returns Total XP or 0 if no user
 */
export async function getUserXP(): Promise<number> {
  const user = await getUserProgress();
  return user?.xp || 0;
}

/**
 * Get the user's galleons balance.
 * @returns Galleons balance or 0 if no user
 */
export async function getUserGalleons(): Promise<number> {
  const user = await getUserProgress();
  return user?.galleons || 0;
}

/**
 * Calculate XP progress towards next level.
 * @returns Object with current XP in level, XP needed for next level, and percentage
 */
export async function getLevelProgress(): Promise<{
  currentXPInLevel: number;
  xpNeededForNextLevel: number;
  percentage: number;
}> {
  const user = await getUserProgress();
  const totalXP = user?.xp || 0;
  const currentXPInLevel = totalXP % XP_PER_LEVEL;
  
  return {
    currentXPInLevel,
    xpNeededForNextLevel: XP_PER_LEVEL,
    percentage: (currentXPInLevel / XP_PER_LEVEL) * 100
  };
}

// =============================================================================
// UPDATE OPERATIONS
// =============================================================================

/**
 * Add XP to the user and update their level if needed.
 * @param amount - Amount of XP to add
 * @returns Object with new total XP, new level, and whether leveled up
 */
export async function addXP(amount: number): Promise<{
  newTotalXP: number;
  newLevel: number;
  leveledUp: boolean;
  levelsGained: number;
}> {
  const user = await getUserProgress();
  if (!user) {
    throw new Error('No user profile exists. Create one first.');
  }

  const oldLevel = user.level;
  const newTotalXP = user.xp + amount;
  const newLevel = Math.floor(newTotalXP / XP_PER_LEVEL) + 1;
  const leveledUp = newLevel > oldLevel;

  await db.runAsync(
    `UPDATE user_progress SET xp = ?, level = ? WHERE id = ?`,
    [newTotalXP, newLevel, user.id]
  );

  console.log(`Added ${amount} XP. Total: ${newTotalXP}, Level: ${newLevel}`);
  
  if (leveledUp) {
    console.log(`🎉 LEVEL UP! ${oldLevel} → ${newLevel}`);
  }

  return {
    newTotalXP,
    newLevel,
    leveledUp,
    levelsGained: newLevel - oldLevel
  };
}

/**
 * Add galleons to the user's balance.
 * @param amount - Amount of galleons to add
 * @returns New galleons balance
 */
export async function addGalleons(amount: number): Promise<number> {
  const user = await getUserProgress();
  if (!user) {
    throw new Error('No user profile exists. Create one first.');
  }

  const newBalance = user.galleons + amount;
  await db.runAsync(
    `UPDATE user_progress SET galleons = ? WHERE id = ?`,
    [newBalance, user.id]
  );

  console.log(`Added ${amount} galleons. New balance: ${newBalance}`);
  return newBalance;
}

/**
 * Spend galleons from the user's balance.
 * @param amount - Amount of galleons to spend
 * @returns Object with success status and new balance
 */
export async function spendGalleons(amount: number): Promise<{
  success: boolean;
  newBalance: number;
  message: string;
}> {
  const user = await getUserProgress();
  if (!user) {
    throw new Error('No user profile exists. Create one first.');
  }

  if (user.galleons < amount) {
    return {
      success: false,
      newBalance: user.galleons,
      message: `Not enough galleons! Need ${amount}, but only have ${user.galleons}.`
    };
  }

  const newBalance = user.galleons - amount;
  await db.runAsync(
    `UPDATE user_progress SET galleons = ? WHERE id = ?`,
    [newBalance, user.id]
  );

  console.log(`Spent ${amount} galleons. New balance: ${newBalance}`);
  return {
    success: true,
    newBalance,
    message: `Spent ${amount} galleons successfully!`
  };
}

/**
 * Update the user's profile information.
 * @param data - The fields to update
 * @returns True if update was successful
 */
export async function updateUserProfile(data: UpdateUserData): Promise<boolean> {
  const user = await getUserProgress();
  if (!user) {
    throw new Error('No user profile exists. Create one first.');
  }

  const fields: string[] = [];
  const values: (string | number)[] = [];

  if (data.username !== undefined) {
    fields.push('username = ?');
    values.push(data.username);
  }
  if (data.level !== undefined) {
    fields.push('level = ?');
    values.push(data.level);
  }
  if (data.xp !== undefined) {
    fields.push('xp = ?');
    values.push(data.xp);
  }
  if (data.galleons !== undefined) {
    fields.push('galleons = ?');
    values.push(data.galleons);
  }

  if (fields.length === 0) {
    return false;
  }

  values.push(user.id);
  const result = await db.runAsync(
    `UPDATE user_progress SET ${fields.join(', ')} WHERE id = ?`,
    values
  );

  console.log(`User profile updated, rows affected: ${result.changes}`);
  return result.changes > 0;
}

/**
 * Update the user's username.
 * @param username - The new username
 * @returns True if update was successful
 */
export async function updateUsername(username: string): Promise<boolean> {
  return updateUserProfile({ username });
}

// =============================================================================
// DELETE OPERATIONS
// =============================================================================

/**
 * Reset user progress (XP, level, galleons) but keep profile username.
 * @returns True if successful
 */
export async function resetProgress(): Promise<boolean> {
  const user = await getUserProgress();
  if (!user) {
    return false;
  }

  const result = await db.runAsync(
    `UPDATE user_progress SET xp = 0, level = 1, galleons = 0 WHERE id = ?`,
    [user.id]
  );

  console.log('User progress reset to Level 1, 0 XP, 0 Galleons');
  return result.changes > 0;
}

/**
 * Delete the user profile entirely.
 * @returns True if deletion was successful
 */
export async function deleteUserProfile(): Promise<boolean> {
  const result = await db.runAsync('DELETE FROM user_progress');
  console.log(`User profile deleted, rows affected: ${result.changes}`);
  return result.changes > 0;
}
