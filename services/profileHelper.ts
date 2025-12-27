/**
 * =============================================================================
 * PROFILE HELPER - Database Operations for User Profile
 * =============================================================================
 * 
 * WHAT IS THIS FILE?
 * This file manages all operations for the "profile" table. It handles
 * the single-row user profile with name, level, XP, and galleons.
 * 
 * WHAT DOES IT DO?
 * - PROFILE: Create and manage the user's profile
 * - XP SYSTEM: Add XP, track total XP earned
 * - LEVELING: Calculate and update user level based on XP
 * - GALLEONS: Manage the user's currency (earn, spend, check balance)
 * 
 * HOW DOES IT WORK?
 * The app supports a single user (local profile). The profile table has a
 * fixed row with id = 1. XP is awarded when completing quests, and
 * the level is calculated based on total XP (every 100 XP = 1 level).
 * 
 * LEVEL FORMULA:
 * Level = floor(xp / 100) + 1
 * - 0-99 XP = Level 1
 * - 100-199 XP = Level 2
 * - 200-299 XP = Level 3
 * - And so on...
 * 
 * =============================================================================
 */

import { db } from './database';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/** Represents user profile in the database */
export interface Profile {
  id: number;
  name: string;
  level: number;
  xp: number;
  galleons: number;
}

/** Data needed to create/update user profile */
export interface ProfileData {
  name?: string;
  level?: number;
  xp?: number;
  galleons?: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** XP required per level */
const XP_PER_LEVEL = 100;

/** Fixed profile ID (single-row table) */
const PROFILE_ID = 1;

// =============================================================================
// CREATE OPERATIONS
// =============================================================================

/**
 * Create or initialize the user profile.
 * This creates the fixed single-row profile if it doesn't exist.
 * @param name - The user's display name
 * @returns True if created, false if already exists
 */
export async function createProfile(name: string): Promise<boolean> {
  const existing = await getProfile();
  if (existing) {
    console.log('Profile already exists');
    return false;
  }

  await db.runAsync(
    `INSERT INTO profile (id, name, level, xp, galleons) VALUES (?, ?, 1, 0, 0)`,
    [PROFILE_ID, name]
  );
  console.log(`Profile created for: ${name}`);
  return true;
}

/**
 * Ensure profile exists, creating one with default name if not.
 * @param defaultName - Default name to use if creating new profile
 * @returns The profile
 */
export async function ensureProfile(defaultName: string = 'Wizard'): Promise<Profile> {
  const existing = await getProfile();
  if (existing) {
    return existing;
  }

  await createProfile(defaultName);
  return (await getProfile())!;
}

// =============================================================================
// READ OPERATIONS
// =============================================================================

/**
 * Get the user's profile.
 * @returns The profile or null if not created
 */
export async function getProfile(): Promise<Profile | null> {
  const profile = await db.getFirstAsync<Profile>(
    'SELECT * FROM profile WHERE id = ?',
    [PROFILE_ID]
  );
  return profile || null;
}

/**
 * Check if a profile exists.
 * @returns True if a profile exists
 */
export async function profileExists(): Promise<boolean> {
  const profile = await getProfile();
  return profile !== null;
}

/**
 * Get the user's current level.
 * @returns The user's level or 1 if no profile
 */
export async function getLevel(): Promise<number> {
  const profile = await getProfile();
  return profile?.level || 1;
}

/**
 * Get the user's total XP.
 * @returns Total XP or 0 if no profile
 */
export async function getXP(): Promise<number> {
  const profile = await getProfile();
  return profile?.xp || 0;
}

/**
 * Get the user's galleons balance.
 * @returns Galleons balance or 0 if no profile
 */
export async function getGalleons(): Promise<number> {
  const profile = await getProfile();
  return profile?.galleons || 0;
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
  const profile = await getProfile();
  const totalXP = profile?.xp || 0;
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
  const profile = await getProfile();
  if (!profile) {
    throw new Error('No profile exists. Create one first.');
  }

  const oldLevel = profile.level;
  const newTotalXP = profile.xp + amount;
  const newLevel = Math.floor(newTotalXP / XP_PER_LEVEL) + 1;
  const leveledUp = newLevel > oldLevel;

  await db.runAsync(
    `UPDATE profile SET xp = ?, level = ? WHERE id = ?`,
    [newTotalXP, newLevel, PROFILE_ID]
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
  const profile = await getProfile();
  if (!profile) {
    throw new Error('No profile exists. Create one first.');
  }

  const newBalance = profile.galleons + amount;
  await db.runAsync(
    `UPDATE profile SET galleons = ? WHERE id = ?`,
    [newBalance, PROFILE_ID]
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
  const profile = await getProfile();
  if (!profile) {
    throw new Error('No profile exists. Create one first.');
  }

  if (profile.galleons < amount) {
    return {
      success: false,
      newBalance: profile.galleons,
      message: `Not enough galleons! Need ${amount}, but only have ${profile.galleons}.`
    };
  }

  const newBalance = profile.galleons - amount;
  await db.runAsync(
    `UPDATE profile SET galleons = ? WHERE id = ?`,
    [newBalance, PROFILE_ID]
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
export async function updateProfile(data: ProfileData): Promise<boolean> {
  const profile = await getProfile();
  if (!profile) {
    throw new Error('No profile exists. Create one first.');
  }

  const fields: string[] = [];
  const values: (string | number)[] = [];

  if (data.name !== undefined) {
    fields.push('name = ?');
    values.push(data.name);
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

  values.push(PROFILE_ID);
  const result = await db.runAsync(
    `UPDATE profile SET ${fields.join(', ')} WHERE id = ?`,
    values
  );

  console.log(`Profile updated, rows affected: ${result.changes}`);
  return result.changes > 0;
}

/**
 * Update the user's name.
 * @param name - The new name
 * @returns True if update was successful
 */
export async function updateName(name: string): Promise<boolean> {
  return updateProfile({ name });
}

// =============================================================================
// RESET OPERATIONS
// =============================================================================

/**
 * Reset profile progress (XP, level, galleons) but keep name.
 * @returns True if successful
 */
export async function resetProgress(): Promise<boolean> {
  const profile = await getProfile();
  if (!profile) {
    return false;
  }

  const result = await db.runAsync(
    `UPDATE profile SET xp = 0, level = 1, galleons = 0 WHERE id = ?`,
    [PROFILE_ID]
  );

  console.log('Profile progress reset to Level 1, 0 XP, 0 Galleons');
  return result.changes > 0;
}

/**
 * Delete the profile entirely.
 * @returns True if deletion was successful
 */
export async function deleteProfile(): Promise<boolean> {
  const result = await db.runAsync('DELETE FROM profile WHERE id = ?', [PROFILE_ID]);
  console.log(`Profile deleted, rows affected: ${result.changes}`);
  return result.changes > 0;
}
