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
 * the level is calculated using a gentle linear curve.
 * 
 * LEVEL FORMULA (Linear Curve):
 * - Level 1 → 2: 100 XP
 * - Level 2 → 3: 120 XP
 * - Level 3 → 4: 140 XP
 * - Each subsequent level: +20 XP more
 * 
 * =============================================================================
 */

import { db } from './database';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/** Hogwarts house options */
export type HogwartsHouse = 'Gryffindor' | 'Slytherin' | 'Ravenclaw' | 'Hufflepuff';

/** Represents user profile in the database */
export interface Profile {
  id: number;
  name: string;
  level: number;
  xp: number;
  galleons: number;
  house: HogwartsHouse;
  profile_picture: string;
}

/** Data needed to create/update user profile */
export interface ProfileData {
  name?: string;
  level?: number;
  xp?: number;
  galleons?: number;
  house?: HogwartsHouse;
  profile_picture?: string;
}

// =============================================================================
// CONSTANTS & XP FORMULAS
// =============================================================================

/** Fixed profile ID (single-row table) */
const PROFILE_ID = 1;

/** Base XP required for first level up (Level 1 → 2) */
const BASE_XP = 100;

/** Additional XP required per level (+20 each level) */
const XP_INCREMENT = 20;

/**
 * Calculate XP required to go from a specific level to the next.
 * Level 1→2: 100, Level 2→3: 120, Level 3→4: 140, etc.
 * @param level - Current level
 * @returns XP needed to reach next level
 */
export function getXPForNextLevel(level: number): number {
  return BASE_XP + (level - 1) * XP_INCREMENT;
}

/**
 * Calculate total XP required to reach a specific level.
 * Uses arithmetic series sum formula.
 * @param level - Target level
 * @returns Total XP needed to reach that level
 */
export function getTotalXPForLevel(level: number): number {
  if (level <= 1) return 0;
  // Sum of arithmetic series: n/2 * (first + last)
  // For levels 1 to L-1: sum of (100, 120, 140, ..., 100 + (L-2)*20)
  const n = level - 1; // number of level-ups
  const firstTerm = BASE_XP;
  const lastTerm = BASE_XP + (n - 1) * XP_INCREMENT;
  return (n * (firstTerm + lastTerm)) / 2;
}

/**
 * Calculate level from total XP using inverse of arithmetic series.
 * @param totalXP - Total XP earned
 * @returns Current level
 */
export function calculateLevelFromXP(totalXP: number): number {
  if (totalXP < BASE_XP) return 1;
  // Derived from quadratic formula solving: 10(L-1)(L+8) = XP
  // L = (-7 + sqrt(81 + 0.4 * XP)) / 2
  const level = Math.floor((-7 + Math.sqrt(81 + 0.4 * totalXP)) / 2);
  return Math.max(1, level);
}

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
  const currentLevel = profile?.level || 1;
  
  // XP earned within current level
  const xpForCurrentLevel = getTotalXPForLevel(currentLevel);
  const currentXPInLevel = totalXP - xpForCurrentLevel;
  
  // XP needed to reach next level
  const xpNeededForNextLevel = getXPForNextLevel(currentLevel);
  
  return {
    currentXPInLevel,
    xpNeededForNextLevel,
    percentage: (currentXPInLevel / xpNeededForNextLevel) * 100
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
  const newLevel = calculateLevelFromXP(newTotalXP);
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
  if (data.house !== undefined) {
    fields.push('house = ?');
    values.push(data.house);
  }
  if (data.profile_picture !== undefined) {
    fields.push('profile_picture = ?');
    values.push(data.profile_picture);
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

/**
 * Update the user's Hogwarts house.
 * @param house - The new house
 * @returns True if update was successful
 */
export async function updateHouse(house: HogwartsHouse): Promise<boolean> {
  return updateProfile({ house });
}

/**
 * Update the user's profile picture.
 * @param picture - The picture identifier
 * @returns True if update was successful
 */
export async function updateProfilePicture(picture: string): Promise<boolean> {
  return updateProfile({ profile_picture: picture });
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
