/**
 * =============================================================================
 * HOME SCREEN - Character Sheet / Dashboard
 * =============================================================================
 * 
 * The main landing screen displaying the player's character sheet and dashboard.
 * Shows player profile information including level, XP progress, house affiliation,
 * and galleon balance. Also provides quick access to active questlines and displays
 * a timeline of recently completed quests.
 * 
 * Features:
 * - Player card with house badge, level, XP bar, and currency display
 * - Questlines section showing all projects with completion progress
 * - Recent Chronicles timeline showing recently completed quests
 * - Navigation to questlines list and individual project details
 * 
 * =============================================================================
 */

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
    ensureProfile,
    getLevelProgress,
    Profile
} from '@/services/profileHelper';
import { getAllProjects, Project } from '@/services/projectsHelper';
import { getDoneQuests, getQuestsByProject, Quest } from '@/services/questsHelper';

// ============================================================================
// THEME CONSTANTS
// ============================================================================

const COLORS = {
  // Harry Potter inspired colors
  gold: '#D4A84B',
  goldLight: '#F4D675',
  amber50: '#FFFBEB',
  amber100: '#FEF3C7',
  amber200: '#FDE68A',
  amber400: '#FBBF24',
  amber500: '#F59E0B',
  amber600: '#D97706',
  maroon: '#740001',
  maroonDark: '#4A0000',
  // Slate colors
  slate400: '#94A3B8',
  slate500: '#64748B',
  slate600: '#475569',
  slate700: '#334155',
  slate800: '#1E293B',
  slate900: '#0F172A',
  slate950: '#020617',
};

// House icons mapping
const HOUSE_ICONS: Record<string, string> = {
  Gryffindor: '🦁',
  Slytherin: '🐍',
  Ravenclaw: '🦅',
  Hufflepuff: '🦡',
};

// ============================================================================
// TYPES
// ============================================================================

interface ProjectWithQuests extends Project {
  quests: Quest[];
  completedCount: number;
  totalCount: number;
}

interface RecentQuest extends Quest {
  projectTitle: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function HomeScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [levelProgress, setLevelProgress] = useState({
    currentXPInLevel: 0,
    xpNeededForNextLevel: 100,
    percentage: 0,
  });
  const [projects, setProjects] = useState<ProjectWithQuests[]>([]);
  const [recentQuests, setRecentQuests] = useState<RecentQuest[]>([]);

  const loadData = useCallback(async () => {
    try {
      // Ensure profile exists
      const userProfile = await ensureProfile('Wizard');
      setProfile(userProfile);

      // Get level progress
      const progress = await getLevelProgress();
      setLevelProgress(progress);

      // Get all projects with their quests
      const allProjects = await getAllProjects();
      const projectsWithQuests: ProjectWithQuests[] = await Promise.all(
        allProjects.map(async (project) => {
          const quests = await getQuestsByProject(project.id);
          const completedCount = quests.filter(q => q.status === 'done').length;
          return {
            ...project,
            quests,
            completedCount,
            totalCount: quests.length,
          };
        })
      );
      setProjects(projectsWithQuests);

      // Get recent completed quests
      const doneQuests = await getDoneQuests();
      const recentWithProject: RecentQuest[] = doneQuests.slice(0, 5).map(quest => {
        const project = projectsWithQuests.find(p => p.id === quest.project_id);
        return {
          ...quest,
          projectTitle: project?.title || 'No Project',
        };
      });
      setRecentQuests(recentWithProject);
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

  const getProgress = (current: number, max: number) => {
    if (max === 0) return 0;
    return Math.min(100, (current / max) * 100);
  };

  const handleOpenProject = (projectId: string) => {
    router.push(`/project/${projectId}` as any);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.slate950, COLORS.slate900]}
        style={styles.gradient}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Character Sheet</Text>
            <Text style={styles.headerSubtitle}>
              {profile?.name || 'Wizard'} • Level {profile?.level || 1} {profile?.house || 'Gryffindor'}
            </Text>
          </View>

          {/* Player Stats Card */}
          <View style={styles.playerCardWrapper}>
            <View style={styles.glowEffect} />
            <LinearGradient
              colors={[COLORS.maroon, COLORS.maroonDark]}
              style={styles.playerCard}
            >
              {/* House Badge */}
              <View style={styles.houseBadge}>
                <Text style={styles.houseIcon}>
                  {profile?.profile_picture && profile.profile_picture !== 'default' 
                    ? profile.profile_picture 
                    : HOUSE_ICONS[profile?.house || 'Gryffindor']}
                </Text>
                <View style={styles.levelBadge}>
                  <Text style={styles.levelBadgeText}>Lvl {profile?.level || 1}</Text>
                </View>
              </View>

              {/* Player Info */}
              <View style={styles.playerInfo}>
                <View>
                  <Text style={styles.playerName}>{profile?.name || 'Wizard'}</Text>
                  <View style={styles.galleonsRow}>
                    <Ionicons name="logo-bitcoin" size={12} color={COLORS.amber400} />
                    <Text style={styles.galleonsText}>{profile?.galleons || 0} G</Text>
                  </View>
                </View>

                {/* XP Bar */}
                <View style={styles.xpSection}>
                  <View style={styles.xpTextRow}>
                    <Text style={styles.xpLabel}>EXPERIENCE</Text>
                    <Text style={styles.xpValue}>
                      {levelProgress.currentXPInLevel} / {levelProgress.xpNeededForNextLevel}
                    </Text>
                  </View>
                  <View style={styles.xpBarBackground}>
                    <View
                      style={[
                        styles.xpBarFill,
                        { width: `${getProgress(levelProgress.currentXPInLevel, levelProgress.xpNeededForNextLevel)}%` }
                      ]}
                    />
                  </View>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Questlines Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Questlines</Text>
              <Pressable style={styles.viewAllButton} onPress={() => router.push('/questlines' as any)}>
                <Text style={styles.viewAllText}>VIEW ALL</Text>
              </Pressable>
            </View>

            <View style={styles.questlinesList}>
              {projects.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No questlines yet. Create your first project!</Text>
                </View>
              ) : (
                projects.map((project) => (
                  <Pressable
                    key={project.id}
                    style={styles.questlineCard}
                    onPress={() => handleOpenProject(project.id)}
                  >
                    <View style={[styles.questlineIcon, { backgroundColor: project.color || COLORS.slate800 }]}>
                      <Ionicons name="document-text-outline" size={20} color={COLORS.slate400} />
                    </View>
                    <View style={styles.questlineContent}>
                      <View style={styles.questlineHeader}>
                        <Text style={styles.questlineTitle} numberOfLines={1}>{project.title}</Text>
                        <Text style={styles.questlineCount}>
                          {project.completedCount}/{project.totalCount}
                        </Text>
                      </View>
                      <View style={styles.questlineProgressBg}>
                        <View
                          style={[
                            styles.questlineProgressFill,
                            { width: `${getProgress(project.completedCount, project.totalCount)}%` }
                          ]}
                        />
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={COLORS.slate600} />
                  </Pressable>
                ))
              )}
            </View>
          </View>

          {/* Recent Chronicles Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Chronicles</Text>
            <View style={styles.timeline}>
              {recentQuests.length === 0 ? (
                <Text style={styles.timelineEmpty}>No deeds recorded yet.</Text>
              ) : (
                recentQuests.map((quest) => (
                  <View key={quest.id} style={styles.timelineItem}>
                    <View style={styles.timelineDot} />
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineTitle}>{quest.title}</Text>
                      <Text style={styles.timelineSubtitle}>{quest.projectTitle}</Text>
                      <Text style={styles.timelineDate}>
                        {quest.completed_at ? new Date(quest.completed_at).toLocaleDateString() : ''}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>

          {/* Bottom spacing */}
          <View style={{ height: 100 }} />
        </ScrollView>
      </LinearGradient>
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
    paddingBottom: 24,
  },

  // Header
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.amber50,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.amber400,
    opacity: 0.8,
    marginTop: 4,
  },

  // Player Card
  playerCardWrapper: {
    marginHorizontal: 24,
    marginTop: 24,
    position: 'relative',
  },
  glowEffect: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.amber500,
    opacity: 0.1,
    borderRadius: 20,
    transform: [{ scale: 1.05 }],
  },
  playerCard: {
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  houseBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.slate900,
    borderWidth: 2,
    borderColor: COLORS.amber400,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.amber400,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  houseIcon: {
    fontSize: 36,
  },
  levelBadge: {
    position: 'absolute',
    bottom: -8,
    backgroundColor: COLORS.amber600,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.amber400,
  },
  levelBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.amber50,
  },
  playerInfo: {
    flex: 1,
    gap: 12,
  },
  playerName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.amber50,
  },
  galleonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  galleonsText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.amber400,
    opacity: 0.8,
  },
  xpSection: {
    gap: 6,
  },
  xpTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  xpLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.amber200,
    opacity: 0.6,
    letterSpacing: 1,
  },
  xpValue: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.amber200,
    opacity: 0.6,
  },
  xpBarBackground: {
    height: 6,
    backgroundColor: COLORS.slate800,
    borderRadius: 3,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.slate700,
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: COLORS.amber400,
    borderRadius: 3,
    shadowColor: COLORS.amber400,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },

  // Sections
  section: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.amber50,
  },
  viewAllButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  viewAllText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.slate500,
    letterSpacing: 1,
  },

  // Questlines
  questlinesList: {
    gap: 12,
  },
  questlineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: 12,
    paddingRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 12,
  },
  questlineIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.slate700,
  },
  questlineContent: {
    flex: 1,
  },
  questlineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  questlineTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.amber50,
    flex: 1,
  },
  questlineCount: {
    fontSize: 10,
    color: COLORS.slate500,
    fontFamily: 'monospace',
    marginLeft: 8,
  },
  questlineProgressBg: {
    height: 4,
    backgroundColor: COLORS.slate900,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 8,
  },
  questlineProgressFill: {
    height: '100%',
    backgroundColor: COLORS.slate600,
    borderRadius: 2,
  },

  // Empty State
  emptyState: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderStyle: 'dashed',
  },
  emptyStateText: {
    color: COLORS.slate500,
    fontSize: 14,
    textAlign: 'center',
  },

  // Timeline
  timeline: {
    marginTop: 16,
    marginLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.slate800,
    paddingLeft: 20,
    gap: 24,
  },
  timelineEmpty: {
    color: COLORS.slate500,
    fontSize: 12,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  timelineItem: {
    position: 'relative',
  },
  timelineDot: {
    position: 'absolute',
    left: -29,
    top: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.slate900,
    borderWidth: 2,
    borderColor: 'rgba(217, 119, 6, 0.5)',
  },
  timelineContent: {
    gap: 2,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.amber100,
  },
  timelineSubtitle: {
    fontSize: 10,
    color: COLORS.slate500,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  timelineDate: {
    fontSize: 10,
    color: COLORS.slate600,
    marginTop: 2,
  },
});
