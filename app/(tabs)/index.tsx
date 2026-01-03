import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  ensureProfile,
  getLevelProgress,
  Profile
} from '@/services/profileHelper';
import { getDoingQuests, getTodoQuests, Quest } from '@/services/questsHelper';

// ============================================================================
// THEME CONSTANTS
// ============================================================================

const COLORS = {
  // Harry Potter inspired colors
  gold: '#D4A84B',
  goldLight: '#F4D675',
  maroon: '#740001',
  maroonDark: '#4A0000',
  parchment: '#F5E6C8',
  darkBlue: '#0E1A40',
  navyBlue: '#1A1A2E',
  accent: '#C5A572',
  // Status colors
  success: '#4CAF50',
  warning: '#FF9800',
  danger: '#F44336',
  // Difficulty colors
  easy: '#4CAF50',
  normal: '#2196F3',
  hard: '#FF9800',
  boss: '#9C27B0',
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function HomeScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [levelProgress, setLevelProgress] = useState({
    currentXPInLevel: 0,
    xpNeededForNextLevel: 100,
    percentage: 0,
  });
  const [todoQuests, setTodoQuests] = useState<Quest[]>([]);
  const [doingQuests, setDoingQuests] = useState<Quest[]>([]);

  const loadData = useCallback(async () => {
    try {
      // Ensure profile exists
      const userProfile = await ensureProfile('Wizard');
      setProfile(userProfile);

      // Get level progress
      const progress = await getLevelProgress();
      setLevelProgress(progress);

      // Get quests
      const todo = await getTodoQuests();
      const doing = await getDoingQuests();
      setTodoQuests(todo.slice(0, 3)); // Show only first 3
      setDoingQuests(doing.slice(0, 3));
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }, []);

  // Reload data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.navyBlue, COLORS.darkBlue]}
        style={styles.gradient}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section */}
          <View style={styles.header}>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.nameText}>{profile?.name || 'Wizard'}</Text>
          </View>

          {/* Profile Card */}
          <View style={styles.profileCard}>
            <LinearGradient
              colors={[COLORS.maroon, COLORS.maroonDark]}
              style={styles.profileGradient}
            >
              {/* Level Badge */}
              <View style={styles.levelBadge}>
                <Text style={styles.levelNumber}>{profile?.level || 1}</Text>
                <Text style={styles.levelLabel}>LEVEL</Text>
              </View>

              {/* XP Progress */}
              <View style={styles.xpContainer}>
                <View style={styles.xpTextRow}>
                  <Text style={styles.xpLabel}>Experience</Text>
                  <Text style={styles.xpValue}>
                    {levelProgress.currentXPInLevel} / {levelProgress.xpNeededForNextLevel} XP
                  </Text>
                </View>
                <View style={styles.xpBarBackground}>
                  <View 
                    style={[
                      styles.xpBarFill, 
                      { width: `${Math.min(levelProgress.percentage, 100)}%` }
                    ]} 
                  />
                </View>
              </View>

              {/* Galleons */}
              <View style={styles.galleonsContainer}>
                <Text style={styles.galleonsIcon}>🪙</Text>
                <Text style={styles.galleonsValue}>{profile?.galleons || 0}</Text>
                <Text style={styles.galleonsLabel}>Galleons</Text>
              </View>
            </LinearGradient>
          </View>

          {/* Active Quests Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔥 Active Quests</Text>
            {doingQuests.length > 0 ? (
              doingQuests.map((quest) => (
                <QuestCard key={quest.id} quest={quest} />
              ))
            ) : (
              <EmptyState message="No active quests. Start one from your todo list!" />
            )}
          </View>

          {/* Todo Quests Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📜 Todo Quests</Text>
            {todoQuests.length > 0 ? (
              todoQuests.map((quest) => (
                <QuestCard key={quest.id} quest={quest} />
              ))
            ) : (
              <EmptyState message="All caught up! Create a new quest to continue your adventure." />
            )}
          </View>

          {/* Bottom spacing */}
          <View style={{ height: 100 }} />
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function QuestCard({ quest }: { quest: Quest }) {
  const difficultyColors: Record<string, string> = {
    Easy: COLORS.easy,
    Normal: COLORS.normal,
    Hard: COLORS.hard,
    Boss: COLORS.boss,
  };

  return (
    <Pressable style={styles.questCard}>
      <View style={styles.questHeader}>
        <View style={[
          styles.difficultyBadge, 
          { backgroundColor: difficultyColors[quest.difficulty] || COLORS.normal }
        ]}>
          <Text style={styles.difficultyText}>{quest.difficulty}</Text>
        </View>
        {quest.status === 'doing' && (
          <View style={styles.activeIndicator}>
            <Text style={styles.activeText}>IN PROGRESS</Text>
          </View>
        )}
      </View>
      <Text style={styles.questTitle}>{quest.title}</Text>
      {quest.details && (
        <Text style={styles.questDetails} numberOfLines={2}>
          {quest.details}
        </Text>
      )}
    </Pressable>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateText}>{message}</Text>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 60,
  },

  // Header
  header: {
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 16,
    color: COLORS.accent,
    opacity: 0.8,
  },
  nameText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.gold,
  },

  // Profile Card
  profileCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  profileGradient: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },

  // Level Badge
  levelBadge: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.gold,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.goldLight,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  levelNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.maroonDark,
  },
  levelLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.maroonDark,
    opacity: 0.8,
  },

  // XP Bar
  xpContainer: {
    flex: 1,
  },
  xpTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  xpLabel: {
    fontSize: 14,
    color: COLORS.parchment,
    fontWeight: '600',
  },
  xpValue: {
    fontSize: 14,
    color: COLORS.gold,
    fontWeight: '600',
  },
  xpBarBackground: {
    height: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 5,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: COLORS.gold,
    borderRadius: 5,
  },

  // Galleons
  galleonsContainer: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  galleonsIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  galleonsValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.goldLight,
  },
  galleonsLabel: {
    fontSize: 10,
    color: COLORS.parchment,
    opacity: 0.8,
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.gold,
    marginBottom: 16,
  },

  // Quest Card
  questCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(212, 168, 75, 0.2)',
  },
  questHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  difficultyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  difficultyText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  activeIndicator: {
    backgroundColor: COLORS.warning,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  questTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.parchment,
    marginBottom: 4,
  },
  questDetails: {
    fontSize: 14,
    color: COLORS.accent,
    opacity: 0.8,
  },

  // Empty State
  emptyState: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(212, 168, 75, 0.1)',
    borderStyle: 'dashed',
  },
  emptyStateText: {
    color: COLORS.accent,
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
  },
});
