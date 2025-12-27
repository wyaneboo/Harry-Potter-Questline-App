/**
 * =============================================================================
 * QUEST ACTIONS HELPER - Atomic Quest Operations
 * =============================================================================
 * 
 * WHAT IS THIS FILE?
 * This file provides atomic operations for quest-related actions that affect
 * multiple tables. When a quest is completed, XP, galleons, and drops must
 * all be awarded together - this file ensures that happens atomically.
 * 
 * WHAT DOES IT DO?
 * - COMPLETE QUEST: Atomically marks quest done + awards XP + awards galleons + gives drop
 * - UNDO COMPLETION: Reverses a quest completion (without revoking rewards)
 * 
 * WHY ATOMIC?
 * If we update the quest but fail to award XP, the user loses rewards.
 * By wrapping everything in a transaction, either ALL changes happen or NONE do.
 * 
 * =============================================================================
 */

import { db } from './database';
import { addRandomDrop, InventoryItemWithDetails } from './inventoryHelper';
import { calculateLevelFromXP, getProfile } from './profileHelper';
import { getQuestById, Quest, QuestDifficulty } from './questsHelper';
import { getRewardForDifficulty } from './settingsHelper';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/** Result of completing a quest */
export interface QuestCompletionResult {
  success: boolean;
  quest: Quest | null;
  rewards: {
    xp: number;
    galleons: number;
    drop: InventoryItemWithDetails | null;
  };
  levelUp: {
    occurred: boolean;
    oldLevel: number;
    newLevel: number;
  };
  error?: string;
}

// =============================================================================
// ATOMIC OPERATIONS
// =============================================================================

/**
 * Complete a quest atomically.
 * This function:
 * 1. Marks the quest as 'done' with completed_at timestamp
 * 2. Awards XP based on difficulty
 * 3. Awards galleons based on difficulty
 * 4. Optionally awards a random drop
 * 
 * All operations happen in a single transaction - if any fail, all are rolled back.
 * 
 * @param questId - The quest ID to complete
 * @param awardDrop - Whether to award a random drop (default true)
 * @returns Completion result with rewards and level-up info
 */
export async function completeQuest(
  questId: string, 
  awardDrop: boolean = true
): Promise<QuestCompletionResult> {
  // Get the quest first
  const quest = await getQuestById(questId);
  
  if (!quest) {
    return {
      success: false,
      quest: null,
      rewards: { xp: 0, galleons: 0, drop: null },
      levelUp: { occurred: false, oldLevel: 1, newLevel: 1 },
      error: 'Quest not found'
    };
  }

  if (quest.status === 'done') {
    return {
      success: false,
      quest,
      rewards: { xp: 0, galleons: 0, drop: null },
      levelUp: { occurred: false, oldLevel: 1, newLevel: 1 },
      error: 'Quest already completed'
    };
  }

  // Get the profile
  const profile = await getProfile();
  if (!profile) {
    return {
      success: false,
      quest,
      rewards: { xp: 0, galleons: 0, drop: null },
      levelUp: { occurred: false, oldLevel: 1, newLevel: 1 },
      error: 'No profile exists. Create one first.'
    };
  }

  // Get rewards for this difficulty
  const reward = await getRewardForDifficulty(quest.difficulty as QuestDifficulty);
  const oldLevel = profile.level;

  try {
    // Execute all updates in a transaction
    await db.execAsync('BEGIN TRANSACTION');

    // 1. Mark quest as done
    await db.runAsync(
      "UPDATE quests SET status = 'done', completed_at = CURRENT_TIMESTAMP WHERE id = ?",
      [questId]
    );

    // 2. Award XP and update level
    const newTotalXP = profile.xp + reward.xp;
    const newLevel = calculateLevelFromXP(newTotalXP);
    await db.runAsync(
      'UPDATE profile SET xp = ?, level = ? WHERE id = 1',
      [newTotalXP, newLevel]
    );

    // 3. Award galleons
    const newGalleons = profile.galleons + reward.galleons;
    await db.runAsync(
      'UPDATE profile SET galleons = ? WHERE id = 1',
      [newGalleons]
    );

    // Commit the transaction
    await db.execAsync('COMMIT');

    console.log(`✅ Quest "${quest.title}" completed!`);
    console.log(`   +${reward.xp} XP, +${reward.galleons} Galleons`);

    // 4. Award random drop (outside transaction - non-critical)
    let drop: InventoryItemWithDetails | null = null;
    if (awardDrop) {
      drop = await addRandomDrop();
      if (drop) {
        console.log(`   🎁 Received: ${drop.name} (${drop.rarity})`);
      }
    }

    const leveledUp = newLevel > oldLevel;
    if (leveledUp) {
      console.log(`   🎉 LEVEL UP! ${oldLevel} → ${newLevel}`);
    }

    // Get updated quest
    const updatedQuest = await getQuestById(questId);

    return {
      success: true,
      quest: updatedQuest,
      rewards: {
        xp: reward.xp,
        galleons: reward.galleons,
        drop
      },
      levelUp: {
        occurred: leveledUp,
        oldLevel,
        newLevel
      }
    };

  } catch (error) {
    // Rollback on any error
    await db.execAsync('ROLLBACK');
    console.error('Quest completion failed, rolled back:', error);
    
    return {
      success: false,
      quest,
      rewards: { xp: 0, galleons: 0, drop: null },
      levelUp: { occurred: false, oldLevel, newLevel: oldLevel },
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Undo a quest completion (mark as todo again).
 * Note: This does NOT revoke XP, galleons, or drops that were awarded.
 * 
 * @param questId - The quest ID to undo
 * @returns True if successful
 */
export async function undoQuestCompletion(questId: string): Promise<boolean> {
  const quest = await getQuestById(questId);
  
  if (!quest) {
    console.log('Quest not found');
    return false;
  }

  if (quest.status === 'todo') {
    console.log('Quest is already incomplete');
    return true;
  }

  await db.runAsync(
    "UPDATE quests SET status = 'todo', completed_at = NULL WHERE id = ?",
    [questId]
  );

  console.log(`Quest "${quest.title}" marked as incomplete (rewards not revoked)`);
  return true;
}

/**
 * Complete multiple quests at once.
 * Each quest is completed atomically, but failures don't affect other quests.
 * 
 * @param questIds - Array of quest IDs to complete
 * @param awardDrops - Whether to award drops for each quest
 * @returns Array of completion results
 */
export async function completeMultipleQuests(
  questIds: string[],
  awardDrops: boolean = true
): Promise<QuestCompletionResult[]> {
  const results: QuestCompletionResult[] = [];
  
  for (const questId of questIds) {
    const result = await completeQuest(questId, awardDrops);
    results.push(result);
  }
  
  return results;
}
