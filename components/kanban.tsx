/**
 * =============================================================================
 * KANBAN COMPONENTS - React Native Kanban Board
 * =============================================================================
 * 
 * Provides Kanban board functionality for the quest management system.
 * Converted from web dnd-kit version to React Native with tap-based actions.
 * Instead of drag-and-drop, uses action buttons to move quests between columns.
 * 
 * Main Components:
 * 
 * - KanbanColumn: A scrollable column container that displays quests grouped by
 *   status (Todo, Doing, Done). Shows column header with status indicator and
 *   quest count badge. Renders QuestCard components for each quest.
 * 
 * - QuestCard: Individual quest card displaying title, description, difficulty
 *   badge, due date, and XP reward. Includes quick action buttons to move quests
 *   between statuses (start, complete, revert) without opening the detail view.
 * 
 * =============================================================================
 */

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
    ViewStyle,
} from 'react-native';

import { Quest, QuestDifficulty, QuestStatus } from '@/services/questsHelper';

// ============================================================================
// THEME CONSTANTS
// ============================================================================

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
  easy: '#22C55E',
  normal: '#3B82F6',
  hard: '#F59E0B',
  boss: '#A855F7',
  // Status colors
  todo: '#64748B',
  doing: '#F59E0B',
  done: '#22C55E',
  red400: '#F87171',
  red900: '#7F1D1D',
  green400: '#4ADE80',
  green900: '#14532D',
};

const DIFFICULTY_CONFIG: Record<QuestDifficulty, { label: string; color: string; bgColor: string }> = {
  Easy: { label: 'Easy', color: COLORS.slate400, bgColor: 'rgba(51, 65, 85, 0.3)' },
  Normal: { label: 'Normal', color: COLORS.amber400, bgColor: 'rgba(120, 53, 15, 0.1)' },
  Hard: { label: 'Hard', color: COLORS.red400, bgColor: 'rgba(127, 29, 29, 0.1)' },
  Boss: { label: 'Boss', color: COLORS.boss, bgColor: 'rgba(88, 28, 135, 0.1)' },
};

// ============================================================================
// KANBAN COLUMN COMPONENT
// ============================================================================

interface KanbanColumnProps {
  id: QuestStatus;
  title: string;
  quests: Quest[];
  onQuestPress?: (quest: Quest) => void;
  onMoveQuest?: (quest: Quest, newStatus: QuestStatus) => void;
  style?: ViewStyle;
}

export function KanbanColumn({
  id,
  title,
  quests,
  onQuestPress,
  onMoveQuest,
  style,
}: KanbanColumnProps) {
  const statusColors: Record<QuestStatus, string> = {
    todo: COLORS.todo,
    doing: COLORS.doing,
    done: COLORS.done,
  };

  return (
    <View style={[styles.column, style]}>
      {/* Column Header */}
      <View style={styles.columnHeader}>
        <View style={[styles.columnDot, { backgroundColor: statusColors[id] }]} />
        <Text style={styles.columnTitle}>{title}</Text>
        <View style={styles.columnCountBadge}>
          <Text style={styles.columnCount}>{quests.length}</Text>
        </View>
      </View>

      {/* Column Content */}
      <ScrollView
        style={styles.columnContent}
        contentContainerStyle={styles.columnContentContainer}
        showsVerticalScrollIndicator={false}
      >
        {quests.length === 0 ? (
          <View style={styles.emptyColumn}>
            <Text style={styles.emptyColumnText}>Empty</Text>
          </View>
        ) : (
          quests.map((quest) => (
            <QuestCard
              key={quest.id}
              quest={quest}
              onPress={() => onQuestPress?.(quest)}
              onMoveQuest={onMoveQuest}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

// ============================================================================
// QUEST CARD COMPONENT
// ============================================================================

interface QuestCardProps {
  quest: Quest;
  onPress?: () => void;
  onMoveQuest?: (quest: Quest, newStatus: QuestStatus) => void;
  isOverlay?: boolean;
}

export function QuestCard({ quest, onPress, onMoveQuest, isOverlay }: QuestCardProps) {
  const config = DIFFICULTY_CONFIG[quest.difficulty];
  const dueDate = quest.due_at
    ? new Date(quest.due_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : null;

  return (
    <Pressable
      style={[
        styles.questCard,
        isOverlay && styles.questCardOverlay,
        quest.status === 'done' && !isOverlay && styles.questCardDone,
      ]}
      onPress={onPress}
    >
      {/* Title Row */}
      <View style={styles.questCardHeader}>
        <Text style={[styles.questCardTitle, isOverlay && styles.questCardTitleOverlay]} numberOfLines={2}>
          {quest.title}
        </Text>
        <Ionicons name="reorder-three" size={16} color={COLORS.slate600} />
      </View>

      {/* Description */}
      {quest.details && (
        <Text style={styles.questCardDescription} numberOfLines={3}>
          {quest.details}
        </Text>
      )}

      {/* Tags Row */}
      <View style={styles.tagsRow}>
        <View style={[styles.difficultyBadge, { backgroundColor: config.bgColor, borderColor: config.color + '30' }]}>
          <Ionicons name="skull-outline" size={8} color={config.color} />
          <Text style={[styles.difficultyText, { color: config.color }]}>{config.label}</Text>
        </View>
        {dueDate && (
          <View style={styles.dateBadge}>
            <Ionicons name="calendar-outline" size={8} color={COLORS.slate400} />
            <Text style={styles.dateText}>{dueDate}</Text>
          </View>
        )}
      </View>

      {/* Footer Row */}
      <View style={styles.questCardFooter}>
        <View style={styles.xpBadge}>
          <Ionicons name="sparkles" size={10} color={COLORS.amber500} />
          <Text style={styles.xpText}>
            {getXPReward(quest.difficulty)} XP
          </Text>
        </View>

        {quest.status === 'done' && (
          <View style={styles.completedBadge}>
            <Text style={styles.completedText}>Completed</Text>
          </View>
        )}

        {/* Quick Action Buttons */}
        {onMoveQuest && quest.status !== 'done' && (
          <View style={styles.actionButtons}>
            {quest.status === 'todo' && (
              <Pressable
                style={[styles.actionButton, { backgroundColor: COLORS.doing + '20' }]}
                onPress={() => onMoveQuest(quest, 'doing')}
              >
                <Ionicons name="play" size={12} color={COLORS.doing} />
              </Pressable>
            )}
            {quest.status === 'doing' && (
              <>
                <Pressable
                  style={styles.actionButton}
                  onPress={() => onMoveQuest(quest, 'todo')}
                >
                  <Ionicons name="arrow-back" size={12} color={COLORS.slate500} />
                </Pressable>
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

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getXPReward(difficulty: QuestDifficulty): number {
  const rewards: Record<QuestDifficulty, number> = {
    Easy: 25,
    Normal: 50,
    Hard: 100,
    Boss: 200,
  };
  return rewards[difficulty];
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // Column
  column: {
    width: 280,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.slate800,
    overflow: 'hidden',
    maxHeight: '100%',
  },
  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(30, 41, 59, 0.5)',
    gap: 8,
  },
  columnDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  columnTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.slate300,
    letterSpacing: 2,
    textTransform: 'uppercase',
    flex: 1,
  },
  columnCountBadge: {
    backgroundColor: COLORS.slate900,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.slate800,
  },
  columnCount: {
    fontSize: 10,
    color: COLORS.slate600,
    fontFamily: 'monospace',
  },
  columnContent: {
    flex: 1,
  },
  columnContentContainer: {
    padding: 12,
    gap: 12,
  },
  emptyColumn: {
    height: 100,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.slate800,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyColumnText: {
    color: COLORS.slate700,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Quest Card
  questCard: {
    backgroundColor: 'rgba(251, 244, 227, 0.05)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(120, 53, 15, 0.2)',
    gap: 10,
  },
  questCardOverlay: {
    transform: [{ scale: 1.05 }, { rotate: '2deg' }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    borderColor: 'rgba(251, 191, 36, 0.6)',
    backgroundColor: COLORS.slate800,
  },
  questCardDone: {
    opacity: 0.6,
  },
  questCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
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
  questCardDescription: {
    fontSize: 12,
    color: COLORS.slate400,
    lineHeight: 18,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
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
  questCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 10,
    marginTop: 2,
  },
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
  actionButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  actionButton: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: COLORS.slate800,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
