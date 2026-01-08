/**
 * =============================================================================
 * KANBAN COMPONENTS - React Native Kanban Board
 * =============================================================================
 * 
 * WHAT IS THIS FILE?
 * This file provides the Kanban board components for the quest management system.
 * Uses tap-based action buttons to move quests between columns (no drag-and-drop).
 * 
 * MAIN COMPONENTS:
 * 
 * 1. KanbanColumn - A scrollable column container (Todo, Doing, Done)
 *    - Displays quests grouped by status
 *    - Shows column header with status dot, title, and quest count
 * 
 * 2. QuestCard - Individual quest card displayed within columns
 *    - Shows title, description, difficulty badge, due date, XP reward
 *    - Has quick action buttons (play, back, checkmark) to move between statuses
 * 
 * =============================================================================
 * 
 * TYPESCRIPT/REACT NATIVE CONCEPTS FOR BEGINNERS:
 * 
 * 1. INTERFACE - Defines "shape" of an object (what properties it must have)
 *    Example: interface Quest { title: string; } means Quest objects need a "title"
 * 
 * 2. TYPE ANNOTATION (:) - Tells TypeScript what type a variable should be
 *    Example: const name: string = "Harry" means "name" must be text
 * 
 * 3. OPTIONAL (?) - Property that may or may not exist
 *    Example: onPress?: () => void means onPress can be undefined
 * 
 * 4. Record<Key, Value> - An object with Keys mapped to Values
 *    Example: Record<string, number> = { "apple": 1, "banana": 2 }
 * 
 * 5. () => void - A function that takes nothing and returns nothing
 *    Example: onClick: () => void = function that just does an action
 * 
 * 6. JSX/TSX - HTML-like syntax for building UI components
 *    Example: <View style={styles.container}> is like <div class="container">
 * 
 * 7. CONDITIONAL RENDERING (&&) - Only render if condition is true
 *    Example: {quest.details && <Text>{quest.details}</Text>}
 *    This means: "If quest.details exists, show it"
 * 
 * 8. TERNARY OPERATOR (? :) - Inline if/else statement
 *    Example: {quests.length === 0 ? <Empty /> : <QuestList />}
 *    This means: "If no quests, show Empty, otherwise show QuestList"
 * 
 * =============================================================================
 */

// =============================================================================
// IMPORTS
// =============================================================================

/**
 * Ionicons - Icon library for displaying icons like play, check, arrow, etc.
 * The icons are referenced by name: "play", "checkmark", "arrow-back"
 */
import { Ionicons } from '@expo/vector-icons';

/**
 * React - The core React library. Required for JSX/TSX to work.
 */
import React from 'react';

/**
 * React Native Components - The building blocks for mobile UI:
 * - Pressable: A button/touchable element (like HTML <button>)
 * - ScrollView: A scrollable container for lists
 * - StyleSheet: For creating CSS-like styles in JavaScript
 * - Text: For displaying text (like HTML <p> or <span>)
 * - View: A container (like HTML <div>)
 * - ViewStyle: TypeScript type for style objects
 */
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

/**
 * Import types from our database helper:
 * - Quest: The data shape for a quest object
 * - QuestDifficulty: Union type 'Easy' | 'Normal' | 'Hard' | 'Boss'
 * - QuestStatus: Union type 'todo' | 'doing' | 'done'
 * 
 * UNION TYPE means the value can be ONE of the listed options.
 * Example: QuestStatus can only be 'todo', 'doing', or 'done' - nothing else!
 */
import { Quest, QuestDifficulty, QuestStatus } from '@/services/questsHelper';

// =============================================================================
// THEME CONSTANTS - Color definitions used throughout the components
// =============================================================================

/**
 * COLORS object - A collection of all colors used in this file.
 * Using a constant object makes it easy to:
 * 1. Change colors in one place
 * 2. Keep colors consistent across components
 * 3. Reference colors by meaningful names (COLORS.gold vs '#D4A84B')
 */
const COLORS = {
  gold: '#D4A84B',
  goldLight: '#F4D675',
  amber50: '#FFFBEB',
  amber100: '#FEF3C7',
  amber400: '#FBBF24',
  amber500: '#F59E0B',
  amber900: '#78350F',
  slate300: '#CBD5E1',
  slate400: '#94A3B8',
  slate500: '#64748B',
  slate600: '#475569',
  slate700: '#334155',
  slate800: '#1E293B',
  slate900: '#0F172A',
  // Difficulty colors
  easy: '#22C55E',      // Green for easy quests
  normal: '#3B82F6',    // Blue for normal quests
  hard: '#F59E0B',      // Orange/amber for hard quests
  boss: '#A855F7',      // Purple for boss quests
  // Status colors
  todo: '#64748B',      // Gray for not started
  doing: '#F59E0B',     // Amber for in progress
  done: '#22C55E',      // Green for completed
  red400: '#F87171',
  red900: '#7F1D1D',
  green400: '#4ADE80',
  green900: '#14532D',
};

/**
 * DIFFICULTY_CONFIG - Configuration for each difficulty level.
 * 
 * Record<QuestDifficulty, {...}> means:
 * - Keys must be 'Easy', 'Normal', 'Hard', or 'Boss' (QuestDifficulty type)
 * - Values must have { label, color, bgColor } properties
 * 
 * This maps each difficulty to its display settings.
 */
const DIFFICULTY_CONFIG: Record<QuestDifficulty, { label: string; color: string; bgColor: string }> = {
  Easy: { label: 'Easy', color: COLORS.slate400, bgColor: 'rgba(51, 65, 85, 0.3)' },
  Normal: { label: 'Normal', color: COLORS.amber400, bgColor: 'rgba(120, 53, 15, 0.1)' },
  Hard: { label: 'Hard', color: COLORS.red400, bgColor: 'rgba(127, 29, 29, 0.1)' },
  Boss: { label: 'Boss', color: COLORS.boss, bgColor: 'rgba(88, 28, 135, 0.1)' },
};

// =============================================================================
// KANBAN COLUMN COMPONENT
// =============================================================================

/**
 * INTERFACE - KanbanColumnProps
 * 
 * This defines what "props" (properties/inputs) the KanbanColumn component accepts.
 * Props are like function parameters - they let parent components pass data in.
 * 
 * Required props:
 * - id: The column status ('todo', 'doing', or 'done')
 * - title: Display title for the column header
 * - quests: Array of Quest objects to display
 * 
 * Optional props (marked with ?):
 * - onQuestPress: Function called when a quest card is tapped
 * - onMoveQuest: Function called when quick action button is pressed
 * - style: Additional styling to apply to the column
 */
interface KanbanColumnProps {
  id: QuestStatus;                                            // Column status identifier
  title: string;                                               // Column header title
  quests: Quest[];                                             // Array of quests to show
  onQuestPress?: (quest: Quest) => void;                       // Called when quest is tapped
  onMoveQuest?: (quest: Quest, newStatus: QuestStatus) => void; // Called to move quest
  style?: ViewStyle;                                           // Optional extra styles
}

/**
 * KanbanColumn Component
 * 
 * A vertical column containing quests of a specific status.
 * Each column shows:
 * - Header with status dot, title, and quest count
 * - Scrollable list of QuestCard components
 * - Empty state if no quests
 * 
 * DESTRUCTURING: { id, title, quests, ... } extracts properties from props object.
 * Instead of writing props.id, props.title, we can just write id, title.
 */
export function KanbanColumn({
  id,
  title,
  quests,
  onQuestPress,
  onMoveQuest,
  style,
}: KanbanColumnProps) {
  /**
   * statusColors - Maps each status to its color.
   * This lets us dynamically set the header dot color based on column status.
   * statusColors[id] gives us the color for the current column.
   */
  const statusColors: Record<QuestStatus, string> = {
    todo: COLORS.todo,
    doing: COLORS.doing,
    done: COLORS.done,
  };

  /**
   * COMPONENT RETURN - The JSX/TSX that defines what to render.
   * 
   * [styles.column, style] - Merges base styles with optional custom styles.
   * This is array syntax for combining multiple style objects.
   */
  return (
    <View style={[styles.column, style]}>
      {/* 
        Column Header 
        Shows: colored dot | title | count badge 
      */}
      <View style={styles.columnHeader}>
        {/* Status dot - color based on column status */}
        <View style={[styles.columnDot, { backgroundColor: statusColors[id] }]} />
        {/* Column title */}
        <Text style={styles.columnTitle}>{title}</Text>
        {/* Quest count badge */}
        <View style={styles.columnCountBadge}>
          <Text style={styles.columnCount}>{quests.length}</Text>
        </View>
      </View>

      {/* 
        Column Content - Scrollable area containing quest cards
        contentContainerStyle - Styles for the scrollable content inside
        showsVerticalScrollIndicator - Hides the scrollbar
      */}
      <ScrollView
        style={styles.columnContent}
        contentContainerStyle={styles.columnContentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* 
          TERNARY OPERATOR - Conditional rendering
          If no quests: show empty state
          If has quests: map through and render each as a QuestCard
        */}
        {quests.length === 0 ? (
          // Empty state - dashed border box with "Empty" text
          <View style={styles.emptyColumn}>
            <Text style={styles.emptyColumnText}>Empty</Text>
          </View>
        ) : (
          // Quest list - map each quest to a QuestCard component
          // .map() loops through the array and returns a component for each item
          quests.map((quest) => (
            <QuestCard
              key={quest.id}  // key is required for list items in React
              quest={quest}
              onPress={() => onQuestPress?.(quest)}  // ?. means "call only if exists"
              onMoveQuest={onMoveQuest}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

// =============================================================================
// QUEST CARD COMPONENT
// =============================================================================

/**
 * INTERFACE - QuestCardProps
 * 
 * Props for the QuestCard component:
 * - quest: The quest data to display
 * - onPress: Called when card is tapped (optional)
 * - onMoveQuest: Called when action button is pressed (optional)
 * - isOverlay: Special styling for overlay state (optional)
 */
interface QuestCardProps {
  quest: Quest;
  onPress?: () => void;
  onMoveQuest?: (quest: Quest, newStatus: QuestStatus) => void;
  isOverlay?: boolean;
}

/**
 * QuestCard Component
 * 
 * Displays a single quest with:
 * - Title and description
 * - Difficulty badge (Easy, Normal, Hard, Boss)
 * - Due date (if set)
 * - XP reward
 * - Quick action buttons based on current status:
 *   - TODO: Play button (→ doing)
 *   - DOING: Back button (→ todo) and Check button (→ done)
 *   - DONE: Just shows "Completed" badge
 */
export function QuestCard({ quest, onPress, onMoveQuest, isOverlay }: QuestCardProps) {
  /**
   * config - Gets the difficulty configuration for this quest's difficulty.
   * Example: If quest.difficulty is 'Hard', config will be:
   * { label: 'Hard', color: '#F87171', bgColor: 'rgba(127, 29, 29, 0.1)' }
   */
  const config = DIFFICULTY_CONFIG[quest.difficulty];
  
  /**
   * dueDate - Format the due date for display.
   * Only formats if quest.due_at exists (truthy).
   * toLocaleDateString converts date to readable format like "Jan 15"
   */
  const dueDate = quest.due_at
    ? new Date(quest.due_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : null;

  return (
    <Pressable
      style={[
        styles.questCard,
        // CONDITIONAL STYLES - Apply these only if conditions are true
        isOverlay && styles.questCardOverlay,  // Special overlay styling
        quest.status === 'done' && !isOverlay && styles.questCardDone,  // Dimmed for done
      ]}
      onPress={onPress}
    >
      {/* Header row: Title + reorder icon */}
      <View style={styles.questCardHeader}>
        <Text style={[styles.questCardTitle, isOverlay && styles.questCardTitleOverlay]} numberOfLines={2}>
          {quest.title}
        </Text>
        <Ionicons name="reorder-three" size={16} color={COLORS.slate600} />
      </View>

      {/* Description - Only shows if quest.details exists */}
      {quest.details && (
        <Text style={styles.questCardDescription} numberOfLines={3}>
          {quest.details}
        </Text>
      )}

      {/* Tags row: Difficulty badge + Due date badge */}
      <View style={styles.tagsRow}>
        {/* Difficulty badge - color based on difficulty level */}
        <View style={[styles.difficultyBadge, { backgroundColor: config.bgColor, borderColor: config.color + '30' }]}>
          <Ionicons name="skull-outline" size={8} color={config.color} />
          <Text style={[styles.difficultyText, { color: config.color }]}>{config.label}</Text>
        </View>
        
        {/* Due date badge - only shows if dueDate exists */}
        {dueDate && (
          <View style={styles.dateBadge}>
            <Ionicons name="calendar-outline" size={8} color={COLORS.slate400} />
            <Text style={styles.dateText}>{dueDate}</Text>
          </View>
        )}
      </View>

      {/* Footer row: XP badge + Completed badge + Action buttons */}
      <View style={styles.questCardFooter}>
        {/* XP reward badge */}
        <View style={styles.xpBadge}>
          <Ionicons name="sparkles" size={10} color={COLORS.amber500} />
          <Text style={styles.xpText}>
            {getXPReward(quest.difficulty)} XP
          </Text>
        </View>

        {/* Completed badge - only shows for done quests */}
        {quest.status === 'done' && (
          <View style={styles.completedBadge}>
            <Text style={styles.completedText}>Completed</Text>
          </View>
        )}

        {/* 
          Quick Action Buttons
          Only render if onMoveQuest exists AND quest is not done
          Different buttons shown based on current status
        */}
        {onMoveQuest && quest.status !== 'done' && (
          <View style={styles.actionButtons}>
            {/* TODO status: Show "Start" button to move to DOING */}
            {quest.status === 'todo' && (
              <Pressable
                style={[styles.actionButton, { backgroundColor: COLORS.doing + '20' }]}
                onPress={() => onMoveQuest(quest, 'doing')}
              >
                <Ionicons name="play" size={12} color={COLORS.doing} />
              </Pressable>
            )}
            
            {/* DOING status: Show "Back" and "Complete" buttons */}
            {quest.status === 'doing' && (
              <>
                {/* Back button - move to TODO */}
                <Pressable
                  style={styles.actionButton}
                  onPress={() => onMoveQuest(quest, 'todo')}
                >
                  <Ionicons name="arrow-back" size={12} color={COLORS.slate500} />
                </Pressable>
                {/* Complete button - move to DONE */}
                <Pressable
                  style={[styles.actionButton, { backgroundColor: COLORS.done + '20' }]}
                  onPress={() => onMoveQuest(quest, 'done')}
                >
                  <Ionicons name="checkmark" size={12} color={COLORS.done} />
                </Pressable>
              </>
            )}
          </View>
        )}
      </View>
    </Pressable>
  );
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * getXPReward - Returns the XP reward for a given difficulty level.
 * 
 * This is a simple lookup function:
 * - Easy = 25 XP
 * - Normal = 50 XP
 * - Hard = 100 XP
 * - Boss = 200 XP
 * 
 * @param difficulty - The quest difficulty level
 * @returns The XP reward as a number
 */
function getXPReward(difficulty: QuestDifficulty): number {
  const rewards: Record<QuestDifficulty, number> = {
    Easy: 25,
    Normal: 50,
    Hard: 100,
    Boss: 200,
  };
  return rewards[difficulty];
}

// =============================================================================
// STYLES
// =============================================================================

/**
 * StyleSheet.create() - Creates a stylesheet object.
 * 
 * This is similar to CSS but uses JavaScript objects.
 * Benefits:
 * - Better performance (styles are validated at compile time)
 * - Type checking (TypeScript catches invalid style properties)
 * - Code completion in your editor
 * 
 * STYLE PROPERTIES EXPLAINED:
 * - flexDirection: 'row' = horizontal layout (like CSS flex-direction)
 * - alignItems: 'center' = vertically center children
 * - justifyContent: 'space-between' = spread items with space between
 * - paddingHorizontal: shorthand for paddingLeft + paddingRight
 * - borderRadius: rounds corners (higher = more rounded)
 * - gap: space between children (like CSS gap)
 */
const styles = StyleSheet.create({
  // Column container
  column: {
    width: 280,                              // Fixed column width
    backgroundColor: 'rgba(15, 23, 42, 0.6)', // Semi-transparent dark background
    borderRadius: 16,                         // Rounded corners
    borderWidth: 1,                           // Border thickness
    borderColor: COLORS.slate800,             // Border color
    overflow: 'hidden',                       // Clip content that exceeds bounds
    maxHeight: '100%',                        // Don't exceed parent height
  },
  
  // Column header (title row)
  columnHeader: {
    flexDirection: 'row',          // Horizontal layout
    alignItems: 'center',          // Vertically center
    paddingHorizontal: 16,         // Left/right padding
    paddingVertical: 14,           // Top/bottom padding
    borderBottomWidth: 1,          // Line below header
    borderBottomColor: 'rgba(30, 41, 59, 0.5)',
    gap: 8,                        // Space between children
  },
  
  // Status indicator dot
  columnDot: {
    width: 8,
    height: 8,
    borderRadius: 4,  // Makes it circular (half of width/height)
  },
  
  // Column title text
  columnTitle: {
    fontSize: 12,
    fontWeight: '700',             // Bold
    color: COLORS.slate300,
    letterSpacing: 2,              // Space between letters
    textTransform: 'uppercase',    // ALL CAPS
    flex: 1,                       // Take remaining space
  },
  
  // Count badge container
  columnCountBadge: {
    backgroundColor: COLORS.slate900,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.slate800,
  },
  
  // Count badge text
  columnCount: {
    fontSize: 10,
    color: COLORS.slate600,
    fontFamily: 'monospace',  // Fixed-width font
  },
  
  // Scrollable content area
  columnContent: {
    flex: 1,  // Fill remaining vertical space
  },
  
  // Content container (inside ScrollView)
  columnContentContainer: {
    padding: 12,
    gap: 12,  // Space between quest cards
  },
  
  // Empty column state
  emptyColumn: {
    height: 100,
    borderWidth: 2,
    borderStyle: 'dashed',         // Dashed border line
    borderColor: COLORS.slate800,
    borderRadius: 12,
    justifyContent: 'center',      // Center content vertically
    alignItems: 'center',          // Center content horizontally
  },
  
  emptyColumnText: {
    color: COLORS.slate700,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Quest Card styles
  questCard: {
    backgroundColor: 'rgba(251, 244, 227, 0.05)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(120, 53, 15, 0.2)',
    gap: 10,  // Space between card sections
  },
  
  // Overlay state (when dragging)
  questCardOverlay: {
    transform: [{ scale: 1.05 }, { rotate: '2deg' }],  // Slightly enlarged and rotated
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    borderColor: 'rgba(251, 191, 36, 0.6)',
    backgroundColor: COLORS.slate800,
  },
  
  // Done state (dimmed)
  questCardDone: {
    opacity: 0.6,  // Semi-transparent
  },
  
  // Card header row
  questCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  
  // Quest title text
  questCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.amber50,
    flex: 1,
    marginRight: 8,
    lineHeight: 18,
  },
  
  questCardTitleOverlay: {
    color: COLORS.amber100,
  },
  
  // Description text
  questCardDescription: {
    fontSize: 12,
    color: COLORS.slate400,
    lineHeight: 18,
  },
  
  // Tags row (difficulty + date)
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',  // Wrap to next line if needed
    gap: 6,
  },
  
  // Difficulty badge
  difficultyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
  },
  
  difficultyText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  
  // Date badge
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: 'rgba(51, 65, 85, 0.3)',
    borderWidth: 1,
    borderColor: COLORS.slate700,
  },
  
  dateText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.slate400,
    textTransform: 'uppercase',
  },
  
  // Card footer row
  questCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 10,
    marginTop: 2,
  },
  
  // XP badge
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  
  xpText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.amber500,
    opacity: 0.8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  
  // Completed badge
  completedBadge: {
    backgroundColor: 'rgba(20, 83, 45, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.5)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  
  completedText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.green400,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  // Action buttons container
  actionButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  
  // Individual action button
  actionButton: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: COLORS.slate800,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
