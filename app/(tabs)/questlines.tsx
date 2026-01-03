import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { createProject, getAllProjects, Project } from '@/services/projectsHelper';
import { getQuestsByProject, Quest } from '@/services/questsHelper';

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
  amber600: '#D97706',
  slate400: '#94A3B8',
  slate500: '#64748B',
  slate600: '#475569',
  slate700: '#334155',
  slate800: '#1E293B',
  slate900: '#0F172A',
  slate950: '#020617',
  // Status colors
  todo: '#64748B',
  doing: '#F59E0B',
  done: '#22C55E',
};

// Project color options
const PROJECT_COLORS = [
  '#740001', // Gryffindor Maroon
  '#1A472A', // Slytherin Green
  '#0E1A40', // Ravenclaw Blue
  '#FFD700', // Hufflepuff Gold
  '#5C4033', // Brown
  '#4A0080', // Purple
  '#1E3A5F', // Navy
  '#5C1D1D', // Dark Red
];

// ============================================================================
// TYPES
// ============================================================================

interface ProjectWithQuests extends Project {
  quests: Quest[];
  completedCount: number;
  todoCount: number;
  doingCount: number;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function QuestlinesScreen() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectWithQuests[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formColor, setFormColor] = useState(PROJECT_COLORS[0]);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const allProjects = await getAllProjects();
      const projectsWithQuests: ProjectWithQuests[] = await Promise.all(
        allProjects.map(async (project) => {
          const quests = await getQuestsByProject(project.id);
          return {
            ...project,
            quests,
            completedCount: quests.filter(q => q.status === 'done').length,
            todoCount: quests.filter(q => q.status === 'todo').length,
            doingCount: quests.filter(q => q.status === 'doing').length,
          };
        })
      );
      setProjects(projectsWithQuests);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleOpenProject = (projectId: string) => {
    router.push(`/project/${projectId}` as any);
  };

  const getProgress = (completed: number, total: number) => {
    if (total === 0) return 0;
    return Math.min(100, (completed / total) * 100);
  };

  const openAddModal = () => {
    setFormTitle('');
    setFormDescription('');
    setFormColor(PROJECT_COLORS[0]);
    setIsModalOpen(true);
  };

  const handleCreateProject = async () => {
    if (!formTitle.trim()) {
      Alert.alert('Error', 'Questline title is required');
      return;
    }

    try {
      await createProject({
        title: formTitle.trim(),
        description: formDescription.trim() || undefined,
        color: formColor,
      });
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      console.error('Error creating project:', error);
      Alert.alert('Error', 'Failed to create questline');
    }
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
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>Questlines</Text>
              <Text style={styles.headerSubtitle}>All your magical adventures</Text>
            </View>
            <Pressable onPress={openAddModal} style={styles.addButton}>
              <Ionicons name="add" size={24} color={COLORS.amber50} />
            </Pressable>
          </View>

          {/* Stats Overview */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{projects.length}</Text>
              <Text style={styles.statLabel}>TOTAL</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: COLORS.doing }]}>
                {projects.reduce((sum, p) => sum + p.doingCount, 0)}
              </Text>
              <Text style={styles.statLabel}>ACTIVE</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: COLORS.done }]}>
                {projects.reduce((sum, p) => sum + p.completedCount, 0)}
              </Text>
              <Text style={styles.statLabel}>DONE</Text>
            </View>
          </View>

          {/* Projects List */}
          <View style={styles.projectsList}>
            {projects.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="book-outline" size={48} color={COLORS.slate700} />
                <Text style={styles.emptyStateTitle}>No Questlines Yet</Text>
                <Text style={styles.emptyStateText}>
                  Tap the + button to start your first adventure!
                </Text>
              </View>
            ) : (
              projects.map((project) => (
                <Pressable
                  key={project.id}
                  style={styles.projectCard}
                  onPress={() => handleOpenProject(project.id)}
                >
                  <View style={styles.projectHeader}>
                    <View style={[styles.projectIcon, { backgroundColor: project.color || COLORS.slate800 }]}>
                      <Ionicons name="document-text-outline" size={24} color={COLORS.amber400} />
                    </View>
                    <View style={styles.projectInfo}>
                      <Text style={styles.projectTitle}>{project.title}</Text>
                      {project.description && (
                        <Text style={styles.projectDescription} numberOfLines={1}>
                          {project.description}
                        </Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={COLORS.slate600} />
                  </View>

                  {/* Quest Status Pills */}
                  <View style={styles.statusPills}>
                    <View style={[styles.pill, { backgroundColor: 'rgba(100, 116, 139, 0.2)' }]}>
                      <View style={[styles.pillDot, { backgroundColor: COLORS.todo }]} />
                      <Text style={styles.pillText}>{project.todoCount} Todo</Text>
                    </View>
                    <View style={[styles.pill, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                      <View style={[styles.pillDot, { backgroundColor: COLORS.doing }]} />
                      <Text style={styles.pillText}>{project.doingCount} Doing</Text>
                    </View>
                    <View style={[styles.pill, { backgroundColor: 'rgba(34, 197, 94, 0.1)' }]}>
                      <View style={[styles.pillDot, { backgroundColor: COLORS.done }]} />
                      <Text style={styles.pillText}>{project.completedCount} Done</Text>
                    </View>
                  </View>

                  {/* Progress Bar */}
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${getProgress(project.completedCount, project.quests.length)}%` }
                        ]}
                      />
                    </View>
                    <Text style={styles.progressText}>
                      {project.completedCount}/{project.quests.length}
                    </Text>
                  </View>
                </Pressable>
              ))
            )}
          </View>

          {/* Bottom spacing */}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Add Modal */}
        <Modal
          visible={isModalOpen}
          animationType="slide"
          transparent
          onRequestClose={() => setIsModalOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>New Questline</Text>
                <Pressable onPress={() => setIsModalOpen(false)}>
                  <Ionicons name="close" size={24} color={COLORS.slate400} />
                </Pressable>
              </View>

              {/* Title Input */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>TITLE</Text>
                <TextInput
                  style={styles.input}
                  value={formTitle}
                  onChangeText={setFormTitle}
                  placeholder="e.g. Learn Potions"
                  placeholderTextColor={COLORS.slate600}
                />
              </View>

              {/* Description Input */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>DESCRIPTION (OPTIONAL)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formDescription}
                  onChangeText={setFormDescription}
                  placeholder="Describe your questline..."
                  placeholderTextColor={COLORS.slate600}
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Color Picker */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>COLOR</Text>
                <View style={styles.colorPicker}>
                  {PROJECT_COLORS.map((color) => (
                    <Pressable
                      key={color}
                      style={[
                        styles.colorOption,
                        { backgroundColor: color },
                        formColor === color && styles.colorOptionActive,
                      ]}
                      onPress={() => setFormColor(color)}
                    >
                      {formColor === color && (
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      )}
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Save Button */}
              <Pressable style={styles.saveButton} onPress={handleCreateProject}>
                <Text style={styles.saveButtonText}>Create Questline</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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

  // Stats
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginTop: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.amber50,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.slate500,
    letterSpacing: 1,
    marginTop: 4,
  },

  // Projects List
  projectsList: {
    paddingHorizontal: 24,
    marginTop: 24,
    gap: 16,
  },
  projectCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 14,
  },
  projectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  projectIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  projectInfo: {
    flex: 1,
  },
  projectTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.amber50,
  },
  projectDescription: {
    fontSize: 12,
    color: COLORS.slate400,
    marginTop: 2,
  },

  // Status Pills
  statusPills: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.slate400,
  },

  // Progress
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.slate800,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.amber500,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.slate500,
    fontFamily: 'monospace',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    padding: 48,
    gap: 12,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.slate500,
  },
  emptyStateText: {
    fontSize: 14,
    color: COLORS.slate600,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Header additions
  headerLeft: {
    flex: 1,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.amber500,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.amber500,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.slate900,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.2)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.amber50,
  },

  // Form
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.amber500,
    letterSpacing: 1,
    marginBottom: 8,
    opacity: 0.8,
  },
  input: {
    backgroundColor: COLORS.slate800,
    borderRadius: 12,
    padding: 14,
    color: COLORS.amber50,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.slate700,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },

  // Color Picker
  colorPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorOptionActive: {
    borderColor: '#fff',
  },

  // Save Button
  saveButton: {
    backgroundColor: COLORS.amber500,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

