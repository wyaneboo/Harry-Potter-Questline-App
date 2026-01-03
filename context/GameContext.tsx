/**
 * =============================================================================
 * GAME CONTEXT - React Native Context for Game State
 * =============================================================================
 * 
 * Provides app-wide access to game state using the existing SQLite database.
 * Wraps database helpers for convenient access in components.
 * 
 * =============================================================================
 */

import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

import { addRandomDrop, getInventoryWithDetails, InventoryItemWithDetails } from '@/services/inventoryHelper';
import {
    addGalleons as dbAddGalleons,
    addXP as dbAddXP,
    ensureProfile,
    getLevelProgress,
    Profile
} from '@/services/profileHelper';
import { getAllProjects, Project } from '@/services/projectsHelper';
import {
    createQuest,
    CreateQuestData,
    deleteQuest as dbDeleteQuest,
    updateQuest as dbUpdateQuest,
    getQuestsByProject,
    markQuestDoing,
    markQuestDone,
    markQuestTodo,
    Quest,
    QuestDifficulty,
    QuestStatus,
    UpdateQuestData,
} from '@/services/questsHelper';

// ============================================================================
// TYPES
// ============================================================================

export interface ProjectWithQuests extends Project {
  quests: Quest[];
}

export interface LevelProgress {
  currentXPInLevel: number;
  xpNeededForNextLevel: number;
  percentage: number;
}

interface GameContextType {
  // State
  profile: Profile | null;
  levelProgress: LevelProgress;
  projects: ProjectWithQuests[];
  inventory: InventoryItemWithDrop[];
  activeProjectId: string | null;
  isLoading: boolean;

  // Actions
  setActiveProjectId: (id: string | null) => void;
  refreshData: () => Promise<void>;
  
  // Quest actions
  moveQuest: (questId: string, newStatus: QuestStatus) => Promise<void>;
  addQuest: (projectId: string, data: Omit<CreateQuestData, 'project_id'>) => Promise<string>;
  updateQuest: (questId: string, data: UpdateQuestData) => Promise<boolean>;
  deleteQuest: (questId: string) => Promise<boolean>;
  
  // Player actions
  addXP: (amount: number) => Promise<{ leveledUp: boolean; newLevel: number }>;
  addGalleons: (amount: number) => Promise<number>;
  
  // Reward actions
  rewardQuestCompletion: (difficulty: QuestDifficulty) => Promise<void>;
}

// Alias for backward compatibility
type InventoryItemWithDrop = InventoryItemWithDetails;

// XP rewards by difficulty
const XP_REWARDS: Record<QuestDifficulty, number> = {
  Easy: 25,
  Normal: 50,
  Hard: 100,
  Boss: 200,
};

// Galleon rewards by difficulty
const GALLEON_REWARDS: Record<QuestDifficulty, number> = {
  Easy: 5,
  Normal: 10,
  Hard: 25,
  Boss: 50,
};

// ============================================================================
// CONTEXT
// ============================================================================

const GameContext = createContext<GameContextType | undefined>(undefined);

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}

// ============================================================================
// PROVIDER
// ============================================================================

interface GameProviderProps {
  children: ReactNode;
}

export function GameProvider({ children }: GameProviderProps) {
  // State
  const [profile, setProfile] = useState<Profile | null>(null);
  const [levelProgress, setLevelProgress] = useState<LevelProgress>({
    currentXPInLevel: 0,
    xpNeededForNextLevel: 100,
    percentage: 0,
  });
  const [projects, setProjects] = useState<ProjectWithQuests[]>([]);
  const [inventory, setInventory] = useState<InventoryItemWithDrop[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ========================================================================
  // DATA LOADING
  // ========================================================================

  const loadProfile = useCallback(async () => {
    try {
      const userProfile = await ensureProfile('Wizard');
      setProfile(userProfile);
      
      const progress = await getLevelProgress();
      setLevelProgress(progress);
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  }, []);

  const loadProjects = useCallback(async () => {
    try {
      const allProjects = await getAllProjects();
      const projectsWithQuests: ProjectWithQuests[] = await Promise.all(
        allProjects.map(async (project) => {
          const quests = await getQuestsByProject(project.id);
          return { ...project, quests };
        })
      );
      setProjects(projectsWithQuests);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  }, []);

  const loadInventory = useCallback(async () => {
    try {
      const items = await getInventoryWithDetails();
      setInventory(items);
    } catch (error) {
      console.error('Error loading inventory:', error);
    }
  }, []);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([loadProfile(), loadProjects(), loadInventory()]);
    setIsLoading(false);
  }, [loadProfile, loadProjects, loadInventory]);

  // Initial load
  useEffect(() => {
    refreshData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ========================================================================
  // QUEST ACTIONS
  // ========================================================================

  const moveQuest = useCallback(async (questId: string, newStatus: QuestStatus) => {
    try {
      // Find the quest to check its current status
      let quest: Quest | undefined;
      for (const project of projects) {
        quest = project.quests.find(q => q.id === questId);
        if (quest) break;
      }

      if (!quest) {
        console.error('Quest not found:', questId);
        return;
      }

      const oldStatus = quest.status;

      // Move the quest
      if (newStatus === 'todo') {
        await markQuestTodo(questId);
      } else if (newStatus === 'doing') {
        await markQuestDoing(questId);
      } else if (newStatus === 'done') {
        await markQuestDone(questId);
        
        // Reward XP and galleons only when completing (not when already done)
        if (oldStatus !== 'done') {
          await rewardQuestCompletion(quest.difficulty);
        }
      }

      // Reload projects to reflect changes
      await loadProjects();
    } catch (error) {
      console.error('Error moving quest:', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, loadProjects]);

  const addQuest = useCallback(async (projectId: string, data: Omit<CreateQuestData, 'project_id'>) => {
    try {
      const questId = await createQuest({ ...data, project_id: projectId });
      await loadProjects();
      return questId;
    } catch (error) {
      console.error('Error adding quest:', error);
      throw error;
    }
  }, [loadProjects]);

  const updateQuest = useCallback(async (questId: string, data: UpdateQuestData) => {
    try {
      const success = await dbUpdateQuest(questId, data);
      await loadProjects();
      return success;
    } catch (error) {
      console.error('Error updating quest:', error);
      return false;
    }
  }, [loadProjects]);

  const deleteQuest = useCallback(async (questId: string) => {
    try {
      const success = await dbDeleteQuest(questId);
      await loadProjects();
      return success;
    } catch (error) {
      console.error('Error deleting quest:', error);
      return false;
    }
  }, [loadProjects]);

  // ========================================================================
  // PLAYER ACTIONS
  // ========================================================================

  const addXP = useCallback(async (amount: number) => {
    try {
      const result = await dbAddXP(amount);
      await loadProfile();
      return { leveledUp: result.leveledUp, newLevel: result.newLevel };
    } catch (error) {
      console.error('Error adding XP:', error);
      return { leveledUp: false, newLevel: profile?.level || 1 };
    }
  }, [loadProfile, profile?.level]);

  const addGalleons = useCallback(async (amount: number) => {
    try {
      const newBalance = await dbAddGalleons(amount);
      await loadProfile();
      return newBalance;
    } catch (error) {
      console.error('Error adding galleons:', error);
      return profile?.galleons || 0;
    }
  }, [loadProfile, profile?.galleons]);

  // ========================================================================
  // REWARD ACTIONS
  // ========================================================================

  const rewardQuestCompletion = useCallback(async (difficulty: QuestDifficulty) => {
    try {
      // Award XP
      const xpReward = XP_REWARDS[difficulty];
      await dbAddXP(xpReward);

      // Award Galleons
      const galleonReward = GALLEON_REWARDS[difficulty];
      await dbAddGalleons(galleonReward);

      // Random chance for loot drop (higher difficulty = higher chance)
      const dropChances: Record<QuestDifficulty, number> = {
        Easy: 0.1,
        Normal: 0.2,
        Hard: 0.4,
        Boss: 0.8,
      };
      
      if (Math.random() < dropChances[difficulty]) {
        await addRandomDrop();
        await loadInventory();
      }

      // Reload profile to reflect changes
      await loadProfile();

      console.log(`🎉 Quest completed! +${xpReward} XP, +${galleonReward} Galleons`);
    } catch (error) {
      console.error('Error rewarding quest completion:', error);
    }
  }, [loadProfile, loadInventory]);

  // ========================================================================
  // CONTEXT VALUE
  // ========================================================================

  const value: GameContextType = {
    // State
    profile,
    levelProgress,
    projects,
    inventory,
    activeProjectId,
    isLoading,

    // Actions
    setActiveProjectId,
    refreshData,
    
    // Quest actions
    moveQuest,
    addQuest,
    updateQuest,
    deleteQuest,
    
    // Player actions
    addXP,
    addGalleons,
    
    // Reward actions
    rewardQuestCompletion,
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}
