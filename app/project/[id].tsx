import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
    Alert,
    Dimensions,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import {
    Gesture,
    GestureDetector,
    GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

import { useGame } from '@/context/GameContext';
import { getProjectById, Project } from '@/services/projectsHelper';
import {
    createQuest,
    deleteQuest,
    getQuestsByProject,
    Quest,
    QuestDifficulty,
    QuestStatus,
    updateQuest,
} from '@/services/questsHelper';

// ============================================================================
// THEME CONSTANTS
// ============================================================================

const COLORS = {
  gold: '#D4A84B',
  goldLight: '#F4D675',
  amber50: '#FFFBEB',
  amber100: '#FEF3C7',
  amber200: '#FDE68A',
  amber400: '#FBBF24',
  amber500: '#F59E0B',
  amber600: '#D97706',
  maroon: '#740001',
  slate400: '#94A3B8',
  slate500: '#64748B',
  slate600: '#475569',
  slate700: '#334155',
  slate800: '#1E293B',
  slate900: '#0F172A',
  slate950: '#020617',
  // Difficulty colors
  easy: '#22C55E',
  normal: '#3B82F6',
  hard: '#F59E0B',
  boss: '#A855F7',
  // Status colors
  todo: '#64748B',
  doing: '#F59E0B',
  done: '#22C55E',
  danger: '#EF4444',
};

const DIFFICULTY_CONFIG: Record<QuestDifficulty, { label: string; color: string }> = {
  Easy: { label: 'Novice', color: COLORS.easy },
  Normal: { label: 'Adept', color: COLORS.normal },
  Hard: { label: 'Master', color: COLORS.hard },
  Boss: { label: 'Legendary', color: COLORS.boss },
};

const SCREEN_WIDTH = Dimensions.get('window').width;
const COLUMN_WIDTH = 280;

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ProjectDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { moveQuest: contextMoveQuest } = useGame();
  
  const [project, setProject] = useState<Project | null>(null);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [draggingQuest, setDraggingQuest] = useState<Quest | null>(null);
  
  // Scroll position for column detection
  const scrollX = useRef(0);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuest, setEditingQuest] = useState<Quest | null>(null);
  
  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formDetails, setFormDetails] = useState('');
  const [formDifficulty, setFormDifficulty] = useState<QuestDifficulty>('Normal');

  const loadData = useCallback(async () => {
    if (!id) return;
    
    try {
      setIsLoading(true);
      const projectData = await getProjectById(id);
      setProject(projectData);
      
      if (projectData) {
        const projectQuests = await getQuestsByProject(id);
        setQuests(projectQuests);
      }
    } catch (error) {
      console.error('Error loading project:', error);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const openAddModal = () => {
    setEditingQuest(null);
    setFormTitle('');
    setFormDetails('');
    setFormDifficulty('Normal');
    setIsModalOpen(true);
  };

  const openEditModal = (quest: Quest) => {
    setEditingQuest(quest);
    setFormTitle(quest.title);
    setFormDetails(quest.details || '');
    setFormDifficulty(quest.difficulty);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formTitle.trim()) {
      Alert.alert('Error', 'Quest title is required');
      return;
    }

    try {
      if (editingQuest) {
        await updateQuest(editingQuest.id, {
          title: formTitle,
          details: formDetails,
          difficulty: formDifficulty,
        });
      } else {
        await createQuest({
          project_id: id,
          title: formTitle,
          details: formDetails,
          difficulty: formDifficulty,
        });
      }
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      console.error('Error saving quest:', error);
      Alert.alert('Error', 'Failed to save quest');
    }
  };

  const handleDelete = () => {
    if (!editingQuest) return;
    
    Alert.alert(
      'Banish Quest',
      'Are you sure you want to banish this quest?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Banish',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteQuest(editingQuest.id);
              setIsModalOpen(false);
              loadData();
            } catch (error) {
              console.error('Error deleting quest:', error);
            }
          },
        },
      ]
    );
  };

  const handleMoveQuest = async (quest: Quest, newStatus: QuestStatus) => {
    try {
      await contextMoveQuest(quest.id, newStatus);
      loadData();
    } catch (error) {
      console.error('Error moving quest:', error);
    }
  };

  const handleDragEnd = (quest: Quest, dropX: number) => {
    // Calculate which column based on position
    const adjustedX = dropX + scrollX.current;
    const columnIndex = Math.floor(adjustedX / (COLUMN_WIDTH + 16));
    const statuses: QuestStatus[] = ['todo', 'doing', 'done'];
    const newStatus = statuses[Math.max(0, Math.min(2, columnIndex))];
    
    if (newStatus !== quest.status) {
      handleMoveQuest(quest, newStatus);
    }
    setDraggingQuest(null);
  };

  const getQuestsByStatus = (status: QuestStatus) => {
    return quests.filter(q => q.status === status);
  };

  if (!project) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[COLORS.slate950, COLORS.slate900]} style={styles.gradient}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>
              {isLoading ? 'Loading...' : 'Project not found'}
            </Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <LinearGradient colors={[COLORS.slate950, COLORS.slate900]} style={styles.gradient}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={COLORS.slate400} />
            </Pressable>
            <View>
              <Text style={styles.headerTitle} numberOfLines={1}>{project.title}</Text>
              <Text style={styles.headerSubtitle}>QUEST BOARD • DRAG TO MOVE</Text>
            </View>
          </View>
          <Pressable onPress={openAddModal} style={styles.addButton}>
            <Ionicons name="add" size={24} color={COLORS.amber50} />
          </Pressable>
        </View>

        {/* Drag hint */}
        {draggingQuest && (
          <View style={styles.dragHint}>
            <Ionicons name="move" size={16} color={COLORS.amber400} />
            <Text style={styles.dragHintText}>Drop in a column to move</Text>
          </View>
        )}

        {/* Kanban Columns */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.columnsContainer}
          snapToInterval={COLUMN_WIDTH + 16}
          decelerationRate="fast"
          onScroll={(e) => { scrollX.current = e.nativeEvent.contentOffset.x; }}
          scrollEventThrottle={16}
        >
          <DraggableColumn
            title="TODO"
            status="todo"
            quests={getQuestsByStatus('todo')}
            onQuestPress={openEditModal}
            onMoveQuest={handleMoveQuest}
            onDragStart={setDraggingQuest}
            onDragEnd={handleDragEnd}
            isDragging={!!draggingQuest}
          />
          <DraggableColumn
            title="DOING"
            status="doing"
            quests={getQuestsByStatus('doing')}
            onQuestPress={openEditModal}
            onMoveQuest={handleMoveQuest}
            onDragStart={setDraggingQuest}
            onDragEnd={handleDragEnd}
            isDragging={!!draggingQuest}
          />
          <DraggableColumn
            title="DONE"
            status="done"
            quests={getQuestsByStatus('done')}
            onQuestPress={openEditModal}
            onMoveQuest={handleMoveQuest}
            onDragStart={setDraggingQuest}
            onDragEnd={handleDragEnd}
            isDragging={!!draggingQuest}
          />
          <View style={{ width: 24 }} />
        </ScrollView>

        {/* Add/Edit Modal */}
        <Modal
          visible={isModalOpen}
          animationType="slide"
          transparent
          onRequestClose={() => setIsModalOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingQuest ? 'Edit Quest' : 'New Quest'}
                </Text>
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
                  placeholder="e.g. Brew Polyjuice Potion"
                  placeholderTextColor={COLORS.slate600}
                />
              </View>

              {/* Details Input */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>DETAILS</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formDetails}
                  onChangeText={setFormDetails}
                  placeholder="Describe the task..."
                  placeholderTextColor={COLORS.slate600}
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Difficulty Selector */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>DIFFICULTY</Text>
                <View style={styles.difficultySelector}>
                  {(['Easy', 'Normal', 'Hard', 'Boss'] as QuestDifficulty[]).map((diff) => (
                    <Pressable
                      key={diff}
                      style={[
                        styles.difficultyOption,
                        formDifficulty === diff && {
                          backgroundColor: DIFFICULTY_CONFIG[diff].color,
                          borderColor: DIFFICULTY_CONFIG[diff].color,
                        },
                      ]}
                      onPress={() => setFormDifficulty(diff)}
                    >
                      <Text
                        style={[
                          styles.difficultyText,
                          formDifficulty === diff && styles.difficultyTextActive,
                        ]}
                      >
                        {DIFFICULTY_CONFIG[diff].label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.modalActions}>
                <Pressable style={styles.saveButton} onPress={handleSave}>
                  <Text style={styles.saveButtonText}>Save Quest</Text>
                </Pressable>
                {editingQuest && (
                  <Pressable style={styles.deleteButton} onPress={handleDelete}>
                    <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        </Modal>
      </LinearGradient>
    </GestureHandlerRootView>
  );
}

// ============================================================================
// DRAGGABLE COLUMN COMPONENT
// ============================================================================

interface DraggableColumnProps {
  title: string;
  status: QuestStatus;
  quests: Quest[];
  onQuestPress: (quest: Quest) => void;
  onMoveQuest: (quest: Quest, newStatus: QuestStatus) => void;
  onDragStart: (quest: Quest) => void;
  onDragEnd: (quest: Quest, dropX: number) => void;
  isDragging: boolean;
}

function DraggableColumn({ 
  title, 
  status, 
  quests, 
  onQuestPress, 
  onMoveQuest,
  onDragStart,
  onDragEnd,
  isDragging,
}: DraggableColumnProps) {
  const statusColors: Record<QuestStatus, string> = {
    todo: COLORS.todo,
    doing: COLORS.doing,
    done: COLORS.done,
  };

  return (
    <View style={[
      styles.column,
      isDragging && styles.columnDropTarget,
    ]}>
      <View style={styles.columnHeader}>
        <View style={[styles.columnDot, { backgroundColor: statusColors[status] }]} />
        <Text style={styles.columnTitle}>{title}</Text>
        <Text style={styles.columnCount}>{quests.length}</Text>
      </View>
      <ScrollView
        style={styles.columnContent}
        contentContainerStyle={styles.columnContentContainer}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        {quests.length === 0 ? (
          <View style={[styles.emptyColumn, isDragging && styles.emptyColumnActive]}>
            <Text style={styles.emptyColumnText}>
              {isDragging ? 'Drop here' : 'Empty'}
            </Text>
          </View>
        ) : (
          quests.map((quest) => (
            <DraggableQuestCard
              key={quest.id}
              quest={quest}
              onPress={() => onQuestPress(quest)}
              onMoveQuest={onMoveQuest}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

// ============================================================================
// DRAGGABLE QUEST CARD COMPONENT
// ============================================================================

interface DraggableQuestCardProps {
  quest: Quest;
  onPress: () => void;
  onMoveQuest: (quest: Quest, newStatus: QuestStatus) => void;
  onDragStart: (quest: Quest) => void;
  onDragEnd: (quest: Quest, dropX: number) => void;
}

function DraggableQuestCard({ 
  quest, 
  onPress, 
  onMoveQuest,
  onDragStart,
  onDragEnd,
}: DraggableQuestCardProps) {
  const config = DIFFICULTY_CONFIG[quest.difficulty];
  
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const zIndex = useSharedValue(0);
  const opacity = useSharedValue(1);
  const isDragging = useSharedValue(false);

  const panGesture = Gesture.Pan()
    .activateAfterLongPress(200)
    .onStart(() => {
      isDragging.value = true;
      scale.value = withSpring(1.05);
      zIndex.value = 1000;
      opacity.value = 0.9;
      runOnJS(onDragStart)(quest);
    })
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      const dropX = event.absoluteX;
      runOnJS(onDragEnd)(quest, dropX);
      
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      scale.value = withSpring(1);
      zIndex.value = 0;
      opacity.value = withTiming(1);
      isDragging.value = false;
    });

  const tapGesture = Gesture.Tap()
    .onEnd(() => {
      runOnJS(onPress)();
    });

  const composedGesture = Gesture.Exclusive(panGesture, tapGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    zIndex: zIndex.value,
    opacity: opacity.value,
  }));

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[styles.questCard, animatedStyle]}>
        <View style={styles.questCardHeader}>
          <View style={[styles.difficultyBadge, { backgroundColor: config.color }]}>
            <Text style={styles.difficultyBadgeText}>{quest.difficulty}</Text>
          </View>
          <Ionicons name="reorder-three" size={18} color={COLORS.slate600} />
        </View>
        <Text style={styles.questCardTitle}>{quest.title}</Text>
        {quest.details && (
          <Text style={styles.questCardDetails} numberOfLines={2}>
            {quest.details}
          </Text>
        )}
        {/* Quick Actions */}
        <View style={styles.questCardActions}>
          {quest.status !== 'todo' && (
            <Pressable
              style={styles.actionButton}
              onPress={() => onMoveQuest(quest, 'todo')}
            >
              <Ionicons name="arrow-back" size={14} color={COLORS.slate500} />
            </Pressable>
          )}
          {quest.status === 'todo' && (
            <Pressable
              style={[styles.actionButton, { backgroundColor: COLORS.doing + '20' }]}
              onPress={() => onMoveQuest(quest, 'doing')}
            >
              <Ionicons name="play" size={14} color={COLORS.doing} />
            </Pressable>
          )}
          {quest.status === 'doing' && (
            <Pressable
              style={[styles.actionButton, { backgroundColor: COLORS.done + '20' }]}
              onPress={() => onMoveQuest(quest, 'done')}
            >
              <Ionicons name="checkmark" size={14} color={COLORS.done} />
            </Pressable>
          )}
        </View>
      </Animated.View>
    </GestureDetector>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.slate500,
    fontSize: 16,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate800,
    backgroundColor: 'rgba(2, 6, 23, 0.9)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.amber50,
    maxWidth: 200,
  },
  headerSubtitle: {
    fontSize: 10,
    color: COLORS.slate500,
    letterSpacing: 1,
    marginTop: 2,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: COLORS.amber500,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Drag hint
  dragHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(251, 191, 36, 0.2)',
  },
  dragHintText: {
    fontSize: 12,
    color: COLORS.amber400,
    fontWeight: '600',
  },

  // Columns
  columnsContainer: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    gap: 16,
  },
  column: {
    width: COLUMN_WIDTH,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.slate800,
    overflow: 'hidden',
  },
  columnDropTarget: {
    borderColor: COLORS.amber500,
    backgroundColor: 'rgba(251, 191, 36, 0.05)',
  },
  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate800,
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
    color: COLORS.amber50,
    letterSpacing: 1,
    flex: 1,
  },
  columnCount: {
    fontSize: 12,
    color: COLORS.slate500,
    fontFamily: 'monospace',
  },
  columnContent: {
    flex: 1,
    maxHeight: 500,
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
  emptyColumnActive: {
    borderColor: COLORS.amber500,
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
  },
  emptyColumnText: {
    color: COLORS.slate700,
    fontSize: 12,
  },

  // Quest Card
  questCard: {
    backgroundColor: COLORS.slate900,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.slate800,
    gap: 8,
  },
  questCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  difficultyBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  questCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.amber50,
  },
  questCardDetails: {
    fontSize: 12,
    color: COLORS.slate400,
    lineHeight: 18,
  },
  questCardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  actionButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: COLORS.slate800,
    justifyContent: 'center',
    alignItems: 'center',
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
    borderColor: COLORS.slate800,
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
  difficultySelector: {
    flexDirection: 'row',
    gap: 8,
  },
  difficultyOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.slate800,
    borderWidth: 1,
    borderColor: COLORS.slate700,
    alignItems: 'center',
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.slate400,
  },
  difficultyTextActive: {
    color: '#fff',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  saveButton: {
    flex: 1,
    backgroundColor: COLORS.amber500,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  deleteButton: {
    width: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.danger,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
