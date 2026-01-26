/**
 * =============================================================================
 * GAME CONTEXT - React Native Context for Game State
 * =============================================================================
 * 
 * WHAT IS THIS FILE?
 * This file provides "global state" for the entire app using React Context.
 * Think of it as a central "data store" that any component can access.
 * 
 * WHY DO WE NEED THIS?
 * Without Context, we'd have to pass data through every component (prop drilling).
 * With Context, any component can directly access or modify game state.
 * 
 * HOW DOES IT WORK?
 * 1. GameProvider wraps the entire app in _layout.tsx
 * 2. useGame() hook lets any component access the state/actions
 * 3. When state changes, all components using that state re-render
 * 
 * MAIN PARTS:
 * 
 * - GameProvider: Wrapper component that provides state to children
 * - useGame: Custom hook to access the context from any component
 * 
 * STATE PROVIDED:
 * - profile: Player info (name, level, XP, galleons)
 * - levelProgress: XP progress toward next level
 * - projects: All projects with their quests
 * - inventory: Player's collected items
 * - isLoading: Whether data is being loaded
 * 
 * ACTIONS PROVIDED:
 * - moveQuest: Change quest status (auto-rewards when completing)
 * - addQuest/updateQuest/deleteQuest: Quest CRUD
 * - addXP/addGalleons: Give rewards to player
 * - refreshData: Reload all data from database
 * 
 * =============================================================================
 * 
 * KEY TYPESCRIPT/REACT CONCEPTS:
 * 
 * 1. createContext<Type>() - Creates a "context" (shared state container)
 * 
 * 2. useContext(Context) - Hook to read value from a context
 * 
 * 3. Context.Provider - Component that passes value to all descendants
 * 
 * 4. ReactNode - Type for anything React can render (components, strings, etc.)
 * 
 * 5. Promise<Type> - Represents an async operation that will return Type
 * 
 * 6. Omit<Type, 'key'> - Creates new type without specified key
 *    Example: Omit<CreateQuestData, 'project_id'> = CreateQuestData minus project_id
 * 
 * 7. useEffect(() => {}, []) - Runs code when component mounts (loads)
 *    Empty array [] means "run only once when mounted"
 * 
 * =============================================================================
 */

import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

// Database helper imports - each provides functions for a specific data type
import { addRandomDrop, getInventoryWithDetails, InventoryItemWithDetails } from '@/services/inventoryHelper';
import {
    addGalleons as dbAddGalleons, // Renamed to avoid conflict with our wrapper function
    addXP as dbAddXP,
    updateProfile as dbUpdateProfile,
    ensureProfile,
    getLevelProgress,
    Profile,
    ProfileData,
} from '@/services/profileHelper';
import { getAllProjects, Project } from '@/services/projectsHelper';
import {
    createQuest,
    CreateQuestData,
    deleteQuest as dbDeleteQuest,
    updateQuest as dbUpdateQuest,
    getQuestById,
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
// TYPE DEFINITIONS
// ============================================================================

/**
 * ProjectWithQuests - Extends the base Project type with a quests array.
 * 
 * "extends Project" means this type has ALL properties of Project
 * PLUS the additional "quests" property.
 * 
 * This is useful because the database stores projects and quests separately,
 * but in the UI we often want them together.
 */
export interface ProjectWithQuests extends Project {
  quests: Quest[];  // Array of quests belonging to this project
}

/**
 * LevelProgress - Information about XP progress toward next level.
 * Used to display progress bars in the UI.
 */
export interface LevelProgress {
  currentXPInLevel: number;      // XP earned in current level
  xpNeededForNextLevel: number;  // Total XP needed to level up
  percentage: number;            // Progress as 0-100 percentage
}

/**
 * GameContextType - Defines ALL state and actions the context provides.
 * 
 * This interface is the "contract" - it specifies exactly what
 * useGame() will return. Any component using useGame() can rely
 * on these properties/functions being available.
 * 
 * Properties:
 * - State values (read-only data)
 * - Action functions (modify state or database)
 * 
 * Function return types:
 * - () => void: Function that returns nothing
 * - () => Promise<void>: Async function that returns nothing
 * - () => Promise<boolean>: Async function that returns true/false
 */
interface GameContextType {
  // ----- STATE -----
  profile: Profile | null;           // Player profile (null if not loaded yet)
  levelProgress: LevelProgress;      // XP progress data
  projects: ProjectWithQuests[];     // All projects with their quests
  inventory: InventoryItemWithDrop[];// Player's collected items
  activeProjectId: string | null;    // Currently selected project ID
  isLoading: boolean;                // True while data is loading

  // ----- GENERAL ACTIONS -----
  setActiveProjectId: (id: string | null) => void;  // Select a project
  refreshData: () => Promise<void>;                  // Reload all data
  
  // ----- QUEST ACTIONS -----
  // moveQuest: Change status and give rewards if completing
  moveQuest: (questId: string, newStatus: QuestStatus) => Promise<void>;
  // addQuest: Create new quest in a project
  // Omit<CreateQuestData, 'project_id'> means "all of CreateQuestData except project_id"
  // because we pass project_id separately
  addQuest: (projectId: string, data: Omit<CreateQuestData, 'project_id'>) => Promise<string>;
  updateQuest: (questId: string, data: UpdateQuestData) => Promise<boolean>;
  deleteQuest: (questId: string) => Promise<boolean>;
  
  // ----- PLAYER REWARD ACTIONS -----
  // Returns object with leveledUp flag and new level
  addXP: (amount: number) => Promise<{ leveledUp: boolean; newLevel: number }>;
  // Returns new galleon balance
  addGalleons: (amount: number) => Promise<number>;
  
  // ----- COMBINED REWARD ACTION -----
  rewardQuestCompletion: (difficulty: QuestDifficulty) => Promise<void>;
  
  // ----- PROFILE ACTIONS -----
  updateProfile: (data: ProfileData) => Promise<boolean>;
}

// Type alias for backward compatibility
type InventoryItemWithDrop = InventoryItemWithDetails;

/**
 * XP_REWARDS - XP given for each difficulty level.
 * Record<QuestDifficulty, number> ensures all difficulties have a reward.
 */
const XP_REWARDS: Record<QuestDifficulty, number> = {
  Easy: 25,
  Normal: 50,
  Hard: 100,
  Boss: 200,
};

/**
 * GALLEON_REWARDS - Gold coins given for each difficulty level.
 */
const GALLEON_REWARDS: Record<QuestDifficulty, number> = {
  Easy: 5,
  Normal: 10,
  Hard: 25,
  Boss: 50,
};

// ============================================================================
// CONTEXT CREATION
// ============================================================================

/**
 * createContext<Type | undefined>(undefined)
 * 
 * Creates a React Context. The context is like a "channel" that can
 * broadcast data to any component that subscribes to it.
 * 
 * We use "GameContextType | undefined" because:
 * - Initially (before Provider), the context has no value (undefined)
 * - After Provider wraps the app, it has the full GameContextType value
 */
const GameContext = createContext<GameContextType | undefined>(undefined);

/**
 * useGame() - Custom Hook
 * 
 * This is the hook that components use to access the game state.
 * 
 * CUSTOM HOOKS:
 * - Functions that start with "use" (convention)
 * - Can use other hooks (useState, useContext, etc.)
 * - Encapsulate reusable logic
 * 
 * WHY THE ERROR CHECK?
 * If someone uses useGame() outside of a GameProvider,
 * the context will be undefined, and we want to throw
 * a helpful error message instead of crashing mysteriously.
 */
export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

/**
 * GameProviderProps - Props for the GameProvider component.
 * 
 * ReactNode is the type for "anything React can render":
 * - Components (<MyComponent />)
 * - Strings ("Hello")
 * - Numbers (42)
 * - Arrays ([<A />, <B />])
 * - null/undefined
 * 
 * "children" is a special prop - it's whatever you put BETWEEN
 * the opening and closing tags of a component:
 * 
 * <GameProvider>
 *   <App />    <-- This is "children"
 * </GameProvider>
 */
interface GameProviderProps {
  children: ReactNode;
}

/**
 * GameProvider Component
 * 
 * This component WRAPS the entire app and provides state to all descendants.
 * 
 * HOW IT WORKS:
 * 1. Manages all state using useState hooks
 * 2. Defines action functions using useCallback
 * 3. Loads data on mount using useEffect
 * 4. Passes everything through Context.Provider
 * 
 * USAGE (in _layout.tsx):
 * <GameProvider>
 *   <App />
 * </GameProvider>
 * 
 * Now ANY component inside can call useGame() to access state.
 */
export function GameProvider({ children }: GameProviderProps) {
  // ==========================================================================
  // STATE DECLARATIONS
  // ==========================================================================
  
  /**
   * All the state variables this provider manages.
   * Each useState returns [value, setValue] pair.
   */
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

  // ==========================================================================
  // DATA LOADING FUNCTIONS
  // ==========================================================================

  /**
   * loadProfile - Fetches player profile from database.
   * 
   * ensureProfile('Wizard') creates a default profile if none exists,
   * then returns the profile. This ensures we always have a profile.
   */
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

  /**
   * loadProjects - Fetches all projects and their quests.
   * 
   * Promise.all() runs multiple async operations in PARALLEL.
   * This is faster than running them one by one (sequentially).
   * 
   * .map(async (project) => {...}) transforms each project into
   * a ProjectWithQuests by fetching its quests.
   */
  const loadProjects = useCallback(async () => {
    try {
      const allProjects = await getAllProjects();
      const projectsWithQuests: ProjectWithQuests[] = await Promise.all(
        allProjects.map(async (project) => {
          const quests = await getQuestsByProject(project.id);
          return { ...project, quests };  // Spread operator: copy all project props, add quests
        })
      );
      setProjects(projectsWithQuests);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  }, []);

  /**
   * loadInventory - Fetches player's collected items.
   */
  const loadInventory = useCallback(async () => {
    try {
      const items = await getInventoryWithDetails();
      setInventory(items);
    } catch (error) {
      console.error('Error loading inventory:', error);
    }
  }, []);

  /**
   * refreshData - Reloads ALL data from the database.
   * Called on mount and whenever we need a full refresh.
   * 
   * Promise.all() runs all three load functions in parallel,
   * then waits for ALL of them to complete before continuing.
   */
  const refreshData = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([loadProfile(), loadProjects(), loadInventory()]);
    setIsLoading(false);
  }, [loadProfile, loadProjects, loadInventory]);

  /**
   * useEffect - Side Effect Hook
   * 
   * Runs code when component mounts or when dependencies change.
   * 
   * Here: Empty dependency array [] means "run once when mounted".
   * This loads initial data when the app starts.
   * 
   * The eslint comment disables a warning about missing dependencies.
   * We intentionally want this to run only once.
   */
  useEffect(() => {
    refreshData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ==========================================================================
  // QUEST ACTION FUNCTIONS
  // ==========================================================================

  /**
   * moveQuest - Changes a quest's status and handles rewards.
   * 
   * LOGIC:
   * 1. Fetch quest from database (not state - avoids stale data)
   * 2. Update status based on newStatus
   * 3. If completing (moving to 'done'), give rewards
   * 4. Reload projects to reflect changes
   * 
   * @param questId - The quest to move
   * @param newStatus - Target status ('todo', 'doing', or 'done')
   */
  const moveQuest = useCallback(async (questId: string, newStatus: QuestStatus) => {
    try {
      // Fetch fresh quest data to avoid stale state issues
      const quest = await getQuestById(questId);

      if (!quest) {
        console.error('Quest not found:', questId);
        return;
      }

      const oldStatus = quest.status;

      // Update the quest status in database
      if (newStatus === 'todo') {
        await markQuestTodo(questId);
      } else if (newStatus === 'doing') {
        await markQuestDoing(questId);
      } else if (newStatus === 'done') {
        await markQuestDone(questId);
        
        // Only give rewards when COMPLETING (not when already done)
        if (oldStatus !== 'done') {
          await rewardQuestCompletion(quest.difficulty);
        }
      }

      // Reload projects to reflect the change in UI
      await loadProjects();
    } catch (error) {
      console.error('Error moving quest:', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadProjects]);

  /**
   * addQuest - Creates a new quest in a project.
   * 
   * Omit<CreateQuestData, 'project_id'> means the data parameter
   * contains everything EXCEPT project_id (we pass that separately).
   * The spread operator {...data, project_id: projectId} combines them.
   */
  const addQuest = useCallback(async (projectId: string, data: Omit<CreateQuestData, 'project_id'>) => {
    try {
      const questId = await createQuest({ ...data, project_id: projectId });
      await loadProjects();  // Refresh to show new quest
      return questId;
    } catch (error) {
      console.error('Error adding quest:', error);
      throw error;  // Re-throw so caller knows it failed
    }
  }, [loadProjects]);

  /**
   * updateQuest - Modifies an existing quest.
   */
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

  /**
   * deleteQuest - Removes a quest from the database.
   */
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

  // ==========================================================================
  // PLAYER REWARD FUNCTIONS
  // ==========================================================================

  /**
   * addXP - Gives XP to the player (may cause level up).
   * Returns whether player leveled up and new level.
   */
  const addXP = useCallback(async (amount: number) => {
    try {
      const result = await dbAddXP(amount);
      await loadProfile();  // Refresh to show new XP
      return { leveledUp: result.leveledUp, newLevel: result.newLevel };
    } catch (error) {
      console.error('Error adding XP:', error);
      return { leveledUp: false, newLevel: profile?.level || 1 };
    }
  }, [loadProfile, profile?.level]);

  /**
   * addGalleons - Gives gold coins to the player.
   * Returns the new balance.
   */
  const addGalleons = useCallback(async (amount: number) => {
    try {
      const newBalance = await dbAddGalleons(amount);
      await loadProfile();  // Refresh to show new balance
      return newBalance;
    } catch (error) {
      console.error('Error adding galleons:', error);
      return profile?.galleons || 0;
    }
  }, [loadProfile, profile?.galleons]);

  // ==========================================================================
  // COMBINED REWARD FUNCTION
  // ==========================================================================

  /**
   * rewardQuestCompletion - Called when a quest is completed.
   * 
   * REWARDS:
   * 1. XP based on difficulty (Easy=25, Normal=50, Hard=100, Boss=200)
   * 2. Galleons based on difficulty
   * 3. Random chance for loot drop (higher difficulty = better odds)
   */
  const rewardQuestCompletion = useCallback(async (difficulty: QuestDifficulty) => {
    try {
      // Award XP
      const xpReward = XP_REWARDS[difficulty];
      await dbAddXP(xpReward);

      // Award Galleons
      const galleonReward = GALLEON_REWARDS[difficulty];
      await dbAddGalleons(galleonReward);

      // Random chance for loot drop
      const dropChances: Record<QuestDifficulty, number> = {
        Easy: 0.1,     // 10% chance
        Normal: 0.2,   // 20% chance
        Hard: 0.4,     // 40% chance
        Boss: 0.8,     // 80% chance
      };
      
      // Math.random() returns 0-1, so this checks if random < chance
      if (Math.random() < dropChances[difficulty]) {
        await addRandomDrop();  // Give random item
        await loadInventory();  // Refresh inventory
      }

      // Reload profile to reflect XP/galleon changes
      await loadProfile();

      console.log(`🎉 Quest completed! +${xpReward} XP, +${galleonReward} Galleons`);
    } catch (error) {
      console.error('Error rewarding quest completion:', error);
    }
  }, [loadProfile, loadInventory]);

  // ==========================================================================
  // PROFILE ACTIONS
  // ==========================================================================

  /**
   * updateProfile - Updates the user's profile information.
   * Used for changing name, house, profile picture, etc.
   */
  const updateProfile = useCallback(async (data: ProfileData) => {
    try {
      const success = await dbUpdateProfile(data);
      await loadProfile(); // Refresh to show changes
      return success;
    } catch (error) {
      console.error('Error updating profile:', error);
      return false;
    }
  }, [loadProfile]);

  // ==========================================================================
  // CONTEXT VALUE - What we provide to all children
  // ==========================================================================

  /**
   * value - The object we pass to the Provider.
   * 
   * This contains ALL state and actions that components can access
   * through the useGame() hook.
   * 
   * GameContextType ensures we include everything the interface requires.
   */
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
    
    // Profile actions
    updateProfile,
  };

  /**
   * THE RENDER
   * 
   * Context.Provider is a special component that:
   * 1. Takes a "value" prop (what to share)
   * 2. Makes that value available to all descendants
   * 3. Renders its children normally
   * 
   * Any component inside can call useGame() to get this value.
   */
  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}
