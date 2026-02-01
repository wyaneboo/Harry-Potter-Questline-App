/**
 * =============================================================================
 * PROJECT DETAIL SCREEN - [id].tsx
 * =============================================================================
 *
 * WHAT IS THIS FILE?
 * This is the main screen for viewing and managing quests within a specific
 * project/questline. The "[id]" in the filename means this is a DYNAMIC ROUTE -
 * the actual project ID comes from the URL (like /project/abc123).
 *
 * WHAT DOES IT DO?
 * - Displays a Kanban board with 3 columns: TODO, DOING, DONE
 * - Shows all quests belonging to this project
 * - Allows creating new quests via a modal form
 * - Allows editing/deleting existing quests
 * - Supports DRAG-AND-DROP to move quests between columns
 * - Quick action buttons to start/complete quests without opening modal
 *
 * HOW IS IT ORGANIZED?
 * 1. IMPORTS (lines ~40-70): External libraries and our own code
 * 2. CONSTANTS (lines ~75-85): Colors and configuration
 * 3. MAIN COMPONENT (lines ~90-405): ProjectDetailScreen - the main screen
 * 4. SUB-COMPONENTS (lines ~410-595): DraggableColumn and DraggableQuestCard
 * 5. STYLES (lines ~600+): Visual styling for all components
 *
 * KEY TYPESCRIPT CONCEPTS USED:
 *
 * 1. useState<Type>(initialValue)
 *    - Creates a "state" variable that causes re-render when changed
 *    - The <Type> tells TypeScript what type of data it holds
 *    - Example: useState<Quest[]>([]) = array of quests, starts empty
 *
 * 2. useCallback(fn, deps)
 *    - "Remembers" a function so it doesn't get recreated each render
 *    - deps = dependencies - function recreates only when these change
 *
 * 3. async/await
 *    - For "waiting" on operations that take time (like database calls)
 *    - async function can use await to pause until result is ready
 *
 * 4. Gesture Handlers
 *    - Special functions that detect user touches (tap, pan/drag, etc.)
 *    - Pan gesture = dragging motion
 *    - Tap gesture = single touch
 *
 * 5. Animated Values (useSharedValue)
 *    - Special values that can change smoothly for animations
 *    - Used for drag position, scale effects, etc.
 *
 * =============================================================================
 */

// LIBRARY IMPORTS - External packages we're using
import { Ionicons } from "@expo/vector-icons"; // Icon library
import { LinearGradient } from "expo-linear-gradient"; // Gradient backgrounds
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router"; // Navigation
import { useCallback, useRef, useState } from "react"; // React hooks

// REACT NATIVE COMPONENTS - The building blocks for our UI
import {
  Alert,
  ImageBackground, // Get screen size
  Modal, // Full-screen overlay
  Pressable, // Touchable button
  ScrollView, // Scrollable container
  StyleSheet, // CSS-like styling
  Text, // Display text
  TextInput, // Text input field
  View,
} from "react-native";

// GESTURE HANDLING - For detecting touch gestures (drag-and-drop)
import {
  Gesture, // Create gesture definitions
  GestureDetector, // Wrapper that detects gestures on children
  GestureHandlerRootView, // Required wrapper at the root
} from "react-native-gesture-handler";

// ANIMATIONS - For smooth, performant animations
import Animated, {
  runOnJS, // Run JavaScript from animation thread
  useAnimatedStyle, // Create animated styles
  useSharedValue, // Create animated values
  withSpring, // Spring animation (bouncy)
  withTiming, // Timing animation (linear)
} from "react-native-reanimated";

// OUR OWN CODE - Custom hooks and database helpers
import { CompletionAnimation } from "@/components/ui/CompletionAnimation";
import { QuestReward, useGame } from "@/context/GameContext"; // Game state (XP, level)
import { getProjectById, Project } from "@/services/projectsHelper"; // Project database operations
import {
  createQuest, // Create new quest in database
  deleteQuest, // Delete quest from database
  getQuestsByProject, // Get all quests for a project
  Quest, // Type definition for quest data
  QuestDifficulty, // 'Easy' | 'Normal' | 'Hard' | 'Boss'
  QuestStatus, // 'todo' | 'doing' | 'done'
  updateQuest, // Update quest in database
} from "@/services/questsHelper";

// ============================================================================
// THEME CONSTANTS
// ============================================================================

/**
 * COLORS object - Central color definitions for consistent styling.
 * Using an object makes colors reusable and easy to change in one place.
 */
const COLORS = {
  gold: "#D4A84B",
  goldLight: "#F4D675",
  amber50: "#FFFBEB",
  amber100: "#FEF3C7",
  amber200: "#FDE68A",
  amber400: "#FBBF24",
  amber500: "#F59E0B",
  amber600: "#D97706",
  maroon: "#740001",
  slate400: "#94A3B8",
  slate500: "#64748B",
  slate600: "#475569",
  slate700: "#334155",
  slate800: "#1E293B",
  slate900: "#0F172A",
  slate950: "#020617",
  // Difficulty colors
  easy: "#22C55E",
  normal: "#3B82F6",
  hard: "#F59E0B",
  boss: "#A855F7",
  // Status colors
  todo: "#64748B",
  doing: "#F59E0B",
  done: "#22C55E",
  danger: "#EF4444",
};

/**
 * DIFFICULTY_CONFIG - Maps difficulty levels to display labels and colors.
 * Record<QuestDifficulty, {...}> ensures only valid difficulty keys are used.
 */
const DIFFICULTY_CONFIG: Record<
  QuestDifficulty,
  { label: string; color: string }
> = {
  Easy: { label: "Novice", color: COLORS.easy },
  Normal: { label: "Adept", color: COLORS.normal },
  Hard: { label: "Master", color: COLORS.hard },
  Boss: { label: "Legendary", color: COLORS.boss },
};

/**
 * Screen dimensions for layout calculations.
 * Dimensions.get('window') returns { width, height } of the device screen.
 */
const COLUMN_WIDTH = 280;

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * ProjectDetailScreen Component
 *
 * This is the MAIN screen for managing quests within a single project.
 * It displays a Kanban board with three columns and allows CRUD operations on quests.
 *
 * "export default" means this is the primary export from this file.
 * React Navigation uses this default export as the screen component.
 */
export default function ProjectDetailScreen() {
  // ---------------------------------------------------------------------------
  // NAVIGATION HOOKS
  // ---------------------------------------------------------------------------

  /**
   * useRouter() - Hook from expo-router for navigation.
   * Provides methods like router.back() to go to previous screen.
   */
  const router = useRouter();

  /**
   * useLocalSearchParams() - Gets URL parameters from the route.
   * <{ id: string }> tells TypeScript the shape of the params object.
   * For route "/project/abc123", id would be "abc123".
   */
  const { id } = useLocalSearchParams<{ id: string }>();

  /**
   * useGame() - Custom hook from our GameContext.
   * Provides moveQuest function that handles XP rewards when completing quests.
   * The ": contextMoveQuest" renames it to avoid conflicts with local functions.
   */
  const { moveQuest: contextMoveQuest } = useGame();

  // ---------------------------------------------------------------------------
  // STATE VARIABLES - Using useState Hook
  // ---------------------------------------------------------------------------

  /**
   * useState<Type>(initialValue) - Creates a "state" variable.
   *
   * State is SPECIAL because:
   * - When state changes, the component RE-RENDERS (redraws the UI)
   * - State persists between re-renders (regular variables reset)
   *
   * Returns [currentValue, setterFunction]:
   * - currentValue: The current state value
   * - setterFunction: Function to update the state
   *
   * <Project | null> means the type can be either a Project object OR null.
   */
  const [project, setProject] = useState<Project | null>(null); // Current project data
  const [quests, setQuests] = useState<Quest[]>([]); // Array of quests
  const [isLoading, setIsLoading] = useState(true); // Loading state (boolean)
  const [draggingQuest, setDraggingQuest] = useState<Quest | null>(null); // Currently dragged quest

  /**
   * useRef() - Creates a "reference" that persists between renders.
   * Unlike state, changing a ref does NOT cause re-render.
   * Used here to track scroll position without triggering re-renders.
   */
  const scrollX = useRef(0);

  // Modal State - Controls the add/edit quest popup
  const [isModalOpen, setIsModalOpen] = useState(false); // Is modal visible?
  const [editingQuest, setEditingQuest] = useState<Quest | null>(null); // Quest being edited (null = adding new)

  // Form State - Values entered in the add/edit form
  const [formTitle, setFormTitle] = useState("");
  const [formDetails, setFormDetails] = useState("");
  const [formDifficulty, setFormDifficulty] =
    useState<QuestDifficulty>("Normal");

  // Animation State
  const [isCompletionVisible, setIsCompletionVisible] = useState(false);
  const [rewardDetails, setRewardDetails] = useState<QuestReward | null>(null);

  // ---------------------------------------------------------------------------
  // DATA LOADING FUNCTION
  // ---------------------------------------------------------------------------

  /**
   * useCallback(fn, dependencies) - "Remembers" a function.
   *
   * Without useCallback, a new function is created every render.
   * This can cause performance issues, especially when passed as props.
   *
   * The function only gets recreated when dependencies change.
   * Here, [id] means: recreate only when the project ID changes.
   *
   * async/await EXPLAINED:
   * - async: Marks function as "asynchronous" (can wait for slow operations)
   * - await: Pauses execution until the operation completes
   * - try/catch/finally: Error handling
   *   - try: Attempt these operations
   *   - catch: If error occurs, run this code
   *   - finally: Always run this code, error or not
   */
  const loadData = useCallback(async () => {
    if (!id) return; // Early return if no ID

    try {
      setIsLoading(true); // Show loading state
      const projectData = await getProjectById(id); // Wait for database query
      setProject(projectData); // Update state with result

      if (projectData) {
        const projectQuests = await getQuestsByProject(id);
        setQuests(projectQuests);
      }
    } catch (error) {
      console.error("Error loading project:", error); // Log errors for debugging
    } finally {
      setIsLoading(false); // Hide loading state (always runs)
    }
  }, [id]);

  /**
   * useFocusEffect - Hook that runs code when screen gains focus.
   *
   * Unlike useEffect (runs on mount), this runs EVERY TIME you navigate
   * to this screen. Useful for refreshing data when returning from another screen.
   *
   * The callback inside MUST be wrapped in useCallback.
   */
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  // ---------------------------------------------------------------------------
  // MODAL HANDLERS - Functions for opening/closing the add/edit modal
  // ---------------------------------------------------------------------------

  /**
   * Opens the modal in "Add" mode.
   * Clears all form fields and sets editingQuest to null.
   */
  const openAddModal = () => {
    setEditingQuest(null); // No quest = Add mode
    setFormTitle("");
    setFormDetails("");
    setFormDifficulty("Normal");
    setIsModalOpen(true);
  };

  const openEditModal = (quest: Quest) => {
    setEditingQuest(quest);
    setFormTitle(quest.title);
    setFormDetails(quest.details || "");
    setFormDifficulty(quest.difficulty);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formTitle.trim()) {
      Alert.alert("Error", "Quest title is required");
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
      console.error("Error saving quest:", error);
      Alert.alert("Error", "Failed to save quest");
    }
  };

  const handleDelete = () => {
    if (!editingQuest) return;

    Alert.alert("Banish Quest", "Are you sure you want to banish this quest?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Banish",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteQuest(editingQuest.id);
            setIsModalOpen(false);
            loadData();
          } catch (error) {
            console.error("Error deleting quest:", error);
          }
        },
      },
    ]);
  };

  const handleMoveQuest = async (quest: Quest, newStatus: QuestStatus) => {
    try {
      const reward = await contextMoveQuest(quest.id, newStatus);
      if (newStatus === "done" && quest.status !== "done" && reward) {
        setRewardDetails(reward);
        setIsCompletionVisible(true);
      }
      loadData();
    } catch (error) {
      console.error("Error moving quest:", error);
    }
  };

  const handleDragEnd = (quest: Quest, dropX: number) => {
    // Calculate which column based on position
    const adjustedX = dropX + scrollX.current;
    const columnIndex = Math.floor(adjustedX / (COLUMN_WIDTH + 16));
    const statuses: QuestStatus[] = ["todo", "doing", "done"];
    const newStatus = statuses[Math.max(0, Math.min(2, columnIndex))];

    if (newStatus !== quest.status) {
      handleMoveQuest(quest, newStatus);
    }
    setDraggingQuest(null);
  };

  const getQuestsByStatus = (status: QuestStatus) => {
    return quests.filter((q) => q.status === status);
  };

  if (!project) {
    return (
      <View style={styles.container}>
        <ImageBackground
          source={require("@/assets/images/parchment-bg.png")}
          style={styles.gradient}
        >
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>
              {isLoading ? "Loading..." : "Project not found"}
            </Text>
          </View>
        </ImageBackground>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <LinearGradient
        colors={[COLORS.slate950, COLORS.slate900]}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={COLORS.slate400} />
            </Pressable>
            <View>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {project.title}
              </Text>
              <Text style={styles.headerSubtitle}>
                QUEST BOARD • DRAG TO MOVE
              </Text>
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
          onScroll={(e) => {
            scrollX.current = e.nativeEvent.contentOffset.x;
          }}
          scrollEventThrottle={16}
        >
          <DraggableColumn
            title="TODO"
            status="todo"
            quests={getQuestsByStatus("todo")}
            onQuestPress={openEditModal}
            onMoveQuest={handleMoveQuest}
            onDragStart={setDraggingQuest}
            onDragEnd={handleDragEnd}
            isDragging={!!draggingQuest}
          />
          <DraggableColumn
            title="DOING"
            status="doing"
            quests={getQuestsByStatus("doing")}
            onQuestPress={openEditModal}
            onMoveQuest={handleMoveQuest}
            onDragStart={setDraggingQuest}
            onDragEnd={handleDragEnd}
            isDragging={!!draggingQuest}
          />
          <DraggableColumn
            title="DONE"
            status="done"
            quests={getQuestsByStatus("done")}
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
                  {editingQuest ? "Edit Quest" : "New Quest"}
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
                  {(
                    ["Easy", "Normal", "Hard", "Boss"] as QuestDifficulty[]
                  ).map((diff) => (
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
                          formDifficulty === diff &&
                            styles.difficultyTextActive,
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
                    <Ionicons
                      name="trash-outline"
                      size={20}
                      color={COLORS.danger}
                    />
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        </Modal>

        {/* Completion Animation */}
        <CompletionAnimation
          visible={isCompletionVisible}
          onComplete={() => {
            setIsCompletionVisible(false);
            setRewardDetails(null);
          }}
          xp={rewardDetails?.xp}
          galleons={rewardDetails?.galleons}
          drop={rewardDetails?.drop}
        />
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
    <ImageBackground
      source={require("@/assets/images/parchment-bg.png")}
      style={[styles.column, isDragging && styles.columnDropTarget]}
      imageStyle={{ opacity: 0.95, borderRadius: 16 }}
    >
      <View style={styles.columnHeader}>
        <View
          style={[styles.columnDot, { backgroundColor: statusColors[status] }]}
        />
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
          <View style={styles.emptyColumn}>
            <Text style={styles.emptyColumnText}>No spells cast</Text>
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
    </ImageBackground>
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
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.questCard, animatedStyle]}>
        {/* Helper: Main body pressable for editing */}
        <Pressable onPress={onPress} style={styles.questCardBody}>
          <View style={styles.questCardHeader}>
            <View
              style={[
                styles.difficultyBadge,
                { backgroundColor: config.color },
              ]}
            >
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
        </Pressable>

        {/* Quick Actions Footer - Separate from body pressable */}
        <View style={styles.questCardActions}>
          {quest.status !== "todo" && (
            <Pressable
              style={styles.actionButton}
              onPress={() => onMoveQuest(quest, "todo")}
            >
              <Ionicons name="arrow-back" size={14} color={COLORS.slate500} />
            </Pressable>
          )}
          {quest.status === "todo" && (
            <Pressable
              style={[
                styles.actionButton,
                { backgroundColor: COLORS.doing + "20" },
              ]}
              onPress={() => onMoveQuest(quest, "doing")}
            >
              <Ionicons name="play" size={14} color={COLORS.doing} />
            </Pressable>
          )}
          {quest.status === "doing" && (
            <Pressable
              style={[
                styles.actionButton,
                { backgroundColor: COLORS.done + "20" },
              ]}
              onPress={() => onMoveQuest(quest, "done")}
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
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: COLORS.slate500,
    fontSize: 16,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate800,
    backgroundColor: "rgba(2, 6, 23, 0.9)",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
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
    justifyContent: "center",
    alignItems: "center",
  },

  // Drag hint
  dragHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 8,
    backgroundColor: "rgba(251, 191, 36, 0.1)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(251, 191, 36, 0.2)",
  },
  dragHintText: {
    fontSize: 12,
    color: COLORS.amber400,
    fontWeight: "600",
  },

  // Columns
  columnsContainer: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    gap: 16,
  },
  column: {
    width: COLUMN_WIDTH,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.slate800,
    overflow: "hidden",
  },
  columnDropTarget: {
    borderColor: COLORS.amber500,
    backgroundColor: "rgba(251, 191, 36, 0.05)",
  },
  columnHeader: {
    flexDirection: "row",
    alignItems: "center",
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
    fontWeight: "700",
    color: "#4A0404", // Dark Maroon
    letterSpacing: 1,
    flex: 1,
  },
  columnCount: {
    fontSize: 12,
    color: "#5C5C5C", // Dark Grey
    fontFamily: "monospace",
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
    borderStyle: "dashed",
    borderColor: "rgba(92, 92, 92, 0.3)", // Darker border
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyColumnActive: {
    borderColor: COLORS.amber500,
    backgroundColor: "rgba(251, 191, 36, 0.1)",
  },
  emptyColumnText: {
    color: "#5C5C5C", // Dark Grey
    fontSize: 12,
  },

  // Quest Card styles
  questCard: {
    backgroundColor: "rgba(255, 255, 255, 0.4)", // Semi-transparent white
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(120, 53, 15, 0.3)",
    overflow: "hidden", // Ensure inner pressable respects border radius
  },

  questCardBody: {
    padding: 14,
    gap: 10,
  },

  questCardOverlay: {
    transform: [{ scale: 1.05 }, { rotate: "2deg" }],
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  questCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  difficultyBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  questCardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2A2A2A", // Dark Slate
  },
  questCardDetails: {
    fontSize: 12,
    color: "#4B5563", // Slate 600
    lineHeight: 18,
  },
  questCardActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 4,
  },
  actionButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: COLORS.slate800,
    justifyContent: "center",
    alignItems: "center",
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "flex-end",
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.amber50,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 10,
    fontWeight: "700",
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
    textAlignVertical: "top",
  },
  difficultySelector: {
    flexDirection: "row",
    gap: 8,
  },
  difficultyOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.slate800,
    borderWidth: 1,
    borderColor: COLORS.slate700,
    alignItems: "center",
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.slate400,
  },
  difficultyTextActive: {
    color: "#fff",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  saveButton: {
    flex: 1,
    backgroundColor: COLORS.amber500,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  deleteButton: {
    width: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.danger,
    justifyContent: "center",
    alignItems: "center",
  },
});
