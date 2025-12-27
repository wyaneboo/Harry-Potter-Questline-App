/**
 * =============================================================================
 * SETTINGS HELPER - Database Operations for App Settings
 * =============================================================================
 * 
 * WHAT IS THIS FILE?
 * This file manages the "settings" table, a key-value store for app
 * configuration. It includes customizable quest rewards by difficulty.
 * 
 * WHAT DOES IT DO?
 * - GET/SET: Store and retrieve settings by key
 * - REWARDS: Get customizable XP and Galleon rewards per difficulty
 * - DEFAULTS: Initialize default settings on first run
 * 
 * =============================================================================
 */

import { db } from './database';
import { QuestDifficulty } from './questsHelper';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/** Reward structure for completing quests */
export interface QuestReward {
  xp: number;
  galleons: number;
}

/** All difficulty rewards mapping */
export type DifficultyRewards = Record<QuestDifficulty, QuestReward>;

// =============================================================================
// DEFAULT VALUES
// =============================================================================

/** Default rewards for each difficulty level */
export const DEFAULT_REWARDS: DifficultyRewards = {
  Easy: { xp: 10, galleons: 5 },
  Normal: { xp: 30, galleons: 12 },
  Hard: { xp: 70, galleons: 25 },
  Boss: { xp: 150, galleons: 50 }
};

// =============================================================================
// CORE SETTINGS OPERATIONS
// =============================================================================

/**
 * Get a setting value by key.
 * @param key - The setting key
 * @returns The value or null if not found
 */
export async function getSetting(key: string): Promise<string | null> {
  const result = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    [key]
  );
  return result?.value || null;
}

/**
 * Set a setting value.
 * @param key - The setting key
 * @param value - The value to store
 */
export async function setSetting(key: string, value: string): Promise<void> {
  await db.runAsync(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value]
  );
  console.log(`Setting '${key}' updated`);
}

/**
 * Delete a setting.
 * @param key - The setting key to delete
 * @returns True if deleted
 */
export async function deleteSetting(key: string): Promise<boolean> {
  const result = await db.runAsync('DELETE FROM settings WHERE key = ?', [key]);
  return result.changes > 0;
}

/**
 * Get all settings as an object.
 * @returns Object with all key-value pairs
 */
export async function getAllSettings(): Promise<Record<string, string>> {
  const results = await db.getAllAsync<{ key: string; value: string }>(
    'SELECT key, value FROM settings'
  );
  const settings: Record<string, string> = {};
  for (const row of results) {
    settings[row.key] = row.value;
  }
  return settings;
}

// =============================================================================
// REWARD SETTINGS
// =============================================================================

/**
 * Get the reward for a specific difficulty.
 * @param difficulty - The quest difficulty
 * @returns The XP and galleons reward
 */
export async function getRewardForDifficulty(difficulty: QuestDifficulty): Promise<QuestReward> {
  const key = `reward_${difficulty.toLowerCase()}`;
  const stored = await getSetting(key);
  
  if (stored) {
    try {
      return JSON.parse(stored) as QuestReward;
    } catch {
      console.log(`Invalid reward setting for ${difficulty}, using default`);
    }
  }
  
  return DEFAULT_REWARDS[difficulty];
}

/**
 * Set the reward for a specific difficulty.
 * @param difficulty - The quest difficulty
 * @param reward - The XP and galleons reward
 */
export async function setRewardForDifficulty(
  difficulty: QuestDifficulty, 
  reward: QuestReward
): Promise<void> {
  const key = `reward_${difficulty.toLowerCase()}`;
  await setSetting(key, JSON.stringify(reward));
  console.log(`Reward for ${difficulty} set to ${reward.xp} XP, ${reward.galleons} G`);
}

/**
 * Get all difficulty rewards.
 * @returns Object with rewards for each difficulty
 */
export async function getAllRewards(): Promise<DifficultyRewards> {
  const rewards: DifficultyRewards = { ...DEFAULT_REWARDS };
  
  for (const difficulty of ['Easy', 'Normal', 'Hard', 'Boss'] as QuestDifficulty[]) {
    rewards[difficulty] = await getRewardForDifficulty(difficulty);
  }
  
  return rewards;
}

/**
 * Set all difficulty rewards at once.
 * @param rewards - Object with rewards for each difficulty
 */
export async function setAllRewards(rewards: Partial<DifficultyRewards>): Promise<void> {
  for (const [difficulty, reward] of Object.entries(rewards)) {
    if (reward) {
      await setRewardForDifficulty(difficulty as QuestDifficulty, reward);
    }
  }
}

/**
 * Reset rewards to defaults.
 */
export async function resetRewardsToDefault(): Promise<void> {
  for (const difficulty of ['Easy', 'Normal', 'Hard', 'Boss'] as QuestDifficulty[]) {
    await deleteSetting(`reward_${difficulty.toLowerCase()}`);
  }
  console.log('Rewards reset to defaults');
}

/**
 * Initialize default settings if not already set.
 * Call this on app startup.
 */
export async function initializeDefaultSettings(): Promise<void> {
  // Check if rewards have been initialized
  const initialized = await getSetting('settings_initialized');
  if (initialized) return;

  // Set default rewards (optional - they'll use DEFAULT_REWARDS if not set)
  // We just mark as initialized so we don't repeat this check
  await setSetting('settings_initialized', 'true');
  console.log('Settings initialized');
}
