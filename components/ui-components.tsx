/**
 * =============================================================================
 * UI COMPONENTS - Reusable React Native Components
 * =============================================================================
 * 
 * WHAT IS THIS FILE?
 * A collection of Harry Potter themed, reusable UI components.
 * These are the "building blocks" used throughout the app.
 * 
 * WHY REUSABLE COMPONENTS?
 * - Consistent styling across the app
 * - Write once, use everywhere
 * - Easy to update (change in one place, affects all uses)
 * - Reduces code duplication
 * 
 * COMPONENTS IN THIS FILE:
 * 
 * 1. Button - Themed button with variants (primary, secondary, ghost, danger)
 * 2. MagicalCard - Card container with optional glow effect
 * 3. Header - Page header with title, subtitle, and action slot
 * 4. Modal - Bottom sheet popup with title and close button
 * 5. Input - Text input field with optional label
 * 6. Textarea - Multi-line text input
 * 7. Select - Segmented button group for single-option selection
 * 8. Badge - Small status indicator with icon
 * 9. Divider - Horizontal line separator
 * 10. EmptyState - Placeholder for empty lists
 * 
 * =============================================================================
 * 
 * KEY TYPESCRIPT/REACT CONCEPTS:
 * 
 * 1. PROPS PATTERN
 *    Each component defines an interface for its "props" (inputs).
 *    This ensures type safety - TypeScript will error if you pass wrong types.
 * 
 * 2. OPTIONAL PROPS (?)
 *    Props marked with ? are optional: label?: string
 *    If not passed, they'll be undefined.
 * 
 * 3. DEFAULT VALUES (= value)
 *    Optional props can have defaults: variant = 'primary'
 *    If not passed, they use the default.
 * 
 * 4. SPREAD OPERATOR ({...props})
 *    Passes all remaining props to a child component.
 *    Useful for "passing through" native component props.
 * 
 * 5. EXTENDING INTERFACES
 *    "extends TextInputProps" means our interface includes all
 *    of React Native's TextInput props PLUS our custom ones.
 * 
 * 6. UNION TYPES ('a' | 'b' | 'c')
 *    A value that can be ONE of several specific strings.
 *    Example: ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
 * 
 * 7. CONDITIONAL STYLING (condition && style)
 *    Applies style ONLY if condition is true.
 *    Example: pressed && styles.buttonPressed
 * 
 * 8. EXPORT
 *    "export" makes the component available to other files.
 *    "export const COLORS" also exports the colors for reuse.
 * 
 * =============================================================================
 */

// Ionicons - Icon library with many built-in icons
import { Ionicons } from '@expo/vector-icons';

// React and ReactNode type (for "children" prop)
import React, { ReactNode } from 'react';

// React Native components and types
import {
    Pressable, // Touchable button component
    Modal as RNModal, // Renamed to avoid conflict with our Modal
    ScrollView, // Scrollable container
    StyleSheet, // For creating styles
    Text, // Text display
    TextInput, // Text input field
    TextInputProps, // Type for TextInput's props
    View, // Container component
    ViewStyle, // Type for style objects
} from 'react-native';

// ============================================================================
// THEME CONSTANTS - Exported for use in other components
// ============================================================================

/**
 * COLORS - Central color palette for the entire app.
 * 
 * Using "export const" makes this available to import in other files:
 * import { COLORS } from '@/components/ui-components';
 * 
 * Color naming follows a pattern:
 * - Base name: amber, slate, etc.
 * - Number: lightness level (50=very light, 900=very dark)
 */
export const COLORS = {
  // Primary colors - Gold/Amber theme
  gold: '#D4A84B',
  goldLight: '#F4D675',
  amber50: '#FFFBEB',     // Lightest amber (almost white)
  amber100: '#FEF3C7',
  amber200: '#FDE68A',
  amber300: '#FCD34D',
  amber400: '#FBBF24',
  amber500: '#F59E0B',    // Mid amber
  amber600: '#D97706',
  amber900: '#78350F',    // Darkest amber (brown)
  
  // Maroon - Gryffindor theme
  maroon: '#740001',
  maroonDark: '#4A0000',
  
  // Slate - Neutral grays with blue tint
  slate300: '#CBD5E1',    // Light gray
  slate400: '#94A3B8',
  slate500: '#64748B',    // Mid gray
  slate600: '#475569',
  slate700: '#334155',
  slate800: '#1E293B',    // Dark gray
  slate900: '#0F172A',
  slate950: '#020617',    // Almost black
  
  // Status colors - For feedback
  success: '#22C55E',     // Green for success
  warning: '#F59E0B',     // Amber for warning
  danger: '#EF4444',      // Red for danger/error
  
  // Red variants
  red200: '#FECACA',
  red700: '#B91C1C',
  red900: '#7F1D1D',
};

// ============================================================================
// BUTTON COMPONENT
// ============================================================================

/**
 * ButtonVariant - The different "styles" a button can have.
 * 
 * This is a UNION TYPE - the value must be EXACTLY one of these strings.
 * Using 'type' creates a type alias (a shorthand for a type).
 */
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

/**
 * ButtonProps - What props the Button component accepts.
 * 
 * Required:
 * - children: What to display inside the button (text or components)
 * 
 * Optional:
 * - onPress: Function to call when pressed
 * - variant: Visual style (default: 'primary')
 * - disabled: Whether button is disabled
 * - style: Additional styles to apply
 * - fullWidth: Whether to take full width
 */
interface ButtonProps {
  children: ReactNode;              // Button content (text, icons, etc.)
  onPress?: () => void;             // Press handler
  variant?: ButtonVariant;          // Visual variant
  disabled?: boolean;               // Disabled state
  style?: ViewStyle;                // Custom styles
  fullWidth?: boolean;              // Take full container width
}

/**
 * Button Component
 * 
 * A themed button with different visual variants.
 * 
 * USAGE:
 * <Button onPress={handleClick}>Click Me</Button>
 * <Button variant="danger" onPress={handleDelete}>Delete</Button>
 * <Button variant="ghost" disabled>Disabled</Button>
 * 
 * DESTRUCTURING WITH DEFAULTS:
 * { variant = 'primary', disabled = false } means:
 * - If variant is not passed, use 'primary'
 * - If disabled is not passed, use false
 */
export function Button({
  children,
  onPress,
  variant = 'primary',           // Default variant
  disabled = false,              // Default not disabled
  style,
  fullWidth = false,
}: ButtonProps) {
  /**
   * variantStyles - Maps each variant to its background/border colors.
   * Record<ButtonVariant, ViewStyle> ensures all variants have styles.
   */
  const variantStyles: Record<ButtonVariant, ViewStyle> = {
    primary: {
      backgroundColor: COLORS.amber600,
      borderColor: COLORS.amber400,
    },
    secondary: {
      backgroundColor: COLORS.slate800,
      borderColor: COLORS.slate600,
    },
    ghost: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
    },
    danger: {
      backgroundColor: 'rgba(127, 29, 29, 0.5)',
      borderColor: COLORS.red700,
    },
  };

  /**
   * textColors - Text color for each variant.
   */
  const textColors: Record<ButtonVariant, string> = {
    primary: COLORS.amber50,
    secondary: COLORS.slate300,
    ghost: COLORS.amber400,
    danger: COLORS.red200,
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      /**
       * DYNAMIC STYLES WITH FUNCTION
       * 
       * style can be a function that receives press state.
       * This lets us change styles based on whether button is pressed.
       * 
       * The array combines multiple style objects:
       * [base, variant, conditional, conditional, custom]
       * 
       * "pressed && styles.buttonPressed" - Only applies if pressed is true
       */
      style={({ pressed }) => [
        styles.button,                              // Base styles
        variantStyles[variant],                     // Variant-specific colors
        fullWidth && styles.buttonFullWidth,        // Full width if enabled
        pressed && styles.buttonPressed,            // Press feedback
        disabled && styles.buttonDisabled,          // Dimmed if disabled
        style,                                      // Custom overrides
      ]}
    >
      {/* 
        CONDITIONAL RENDERING
        If children is a string, wrap it in Text component.
        Otherwise, render children directly (could be icons, etc.)
        
        typeof children === 'string' checks the type at runtime.
      */}
      {typeof children === 'string' ? (
        <Text style={[styles.buttonText, { color: textColors[variant] }]}>
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

// ============================================================================
// MAGICAL CARD COMPONENT
// ============================================================================

/**
 * MagicalCardProps - Props for the card container component.
 */
interface MagicalCardProps {
  children: ReactNode;     // Card content
  glow?: boolean;          // Enable magical glow effect
  onPress?: () => void;    // Make card pressable
  style?: ViewStyle;       // Custom styles
}

/**
 * MagicalCard Component
 * 
 * A styled card container with optional glow effect.
 * If onPress is provided, the card becomes pressable.
 * 
 * USAGE:
 * <MagicalCard>Content here</MagicalCard>
 * <MagicalCard glow>Important content</MagicalCard>
 * <MagicalCard onPress={handlePress}>Clickable card</MagicalCard>
 */
export function MagicalCard({ children, glow = false, onPress, style }: MagicalCardProps) {
  /**
   * Combine styles: base + glow (if enabled) + custom
   */
  const cardStyle = [
    styles.magicalCard,
    glow && styles.magicalCardGlow,
    style,
  ];

  /**
   * CONDITIONAL COMPONENT TYPE
   * 
   * If onPress exists, render as Pressable (touchable).
   * Otherwise, render as plain View.
   */
  if (onPress) {
    return (
      <Pressable style={cardStyle} onPress={onPress}>
        {children}
      </Pressable>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

// ============================================================================
// HEADER COMPONENT
// ============================================================================

/**
 * HeaderProps - Props for page headers.
 */
interface HeaderProps {
  title: string;              // Main title
  subtitle?: string;          // Optional subtitle
  rightElement?: ReactNode;   // Optional right-side content (buttons, etc.)
}

/**
 * Header Component
 * 
 * Page header with title, optional subtitle, and optional right element.
 * 
 * USAGE:
 * <Header title="My Page" />
 * <Header title="Quests" subtitle="Your adventures" />
 * <Header title="Projects" rightElement={<Button>Add</Button>} />
 */
export function Header({ title, subtitle, rightElement }: HeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>{title}</Text>
          {/* Conditional rendering: only show subtitle if it exists */}
          {subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
        </View>
        {rightElement}
      </View>
    </View>
  );
}

// ============================================================================
// MODAL COMPONENT
// ============================================================================

/**
 * ModalProps - Props for the modal/popup component.
 */
interface ModalProps {
  visible: boolean;        // Whether modal is shown
  onClose: () => void;     // Function to close modal
  title: string;           // Modal title
  children: ReactNode;     // Modal content
}

/**
 * Modal Component
 * 
 * Bottom sheet modal with slide animation.
 * 
 * USAGE:
 * <Modal
 *   visible={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   title="Edit Quest"
 * >
 *   <Input label="Title" value={title} onChangeText={setTitle} />
 *   <Button onPress={handleSave}>Save</Button>
 * </Modal>
 * 
 * NOTE: We rename React Native's Modal to RNModal to avoid conflict
 * with our custom Modal component.
 */
export function Modal({ visible, onClose, title, children }: ModalProps) {
  return (
    <RNModal
      visible={visible}
      animationType="slide"       // Slides up from bottom
      transparent               // Background is transparent/see-through
      onRequestClose={onClose}  // Called when back button pressed (Android)
    >
      {/* Dark semi-transparent overlay */}
      <View style={styles.modalOverlay}>
        {/* White content container */}
        <View style={styles.modalContent}>
          {/* Header row with title and close button */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <Pressable onPress={onClose} style={styles.modalCloseButton}>
              <Ionicons name="close" size={20} color={COLORS.slate500} />
            </Pressable>
          </View>
          {/* Scrollable content area */}
          <ScrollView
            style={styles.modalBody}
            contentContainerStyle={styles.modalBodyContent}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </RNModal>
  );
}

// ============================================================================
// INPUT COMPONENT
// ============================================================================

/**
 * InputProps - Extends React Native's TextInputProps with our additions.
 * 
 * "extends TextInputProps" means InputProps has ALL properties of
 * TextInputProps (value, onChangeText, placeholder, etc.) PLUS
 * our custom "label" property.
 */
interface InputProps extends TextInputProps {
  label?: string;  // Optional label above the input
}

/**
 * Input Component
 * 
 * Styled text input with optional label.
 * 
 * USAGE:
 * <Input label="TITLE" value={title} onChangeText={setTitle} />
 * <Input placeholder="Enter name..." />
 * 
 * SPREAD OPERATOR {...props}:
 * Passes all remaining props to the TextInput.
 * This means you can use any TextInput prop (value, placeholder, etc.)
 * without us explicitly listing them.
 */
export function Input({ label, style, ...props }: InputProps) {
  return (
    <View style={styles.inputContainer}>
      {/* Only render label if it exists */}
      {label && <Text style={styles.inputLabel}>{label}</Text>}
      <TextInput
        style={[styles.input, style]}
        placeholderTextColor={COLORS.slate600}
        {...props}  // Pass through all other props (value, onChangeText, etc.)
      />
    </View>
  );
}

// ============================================================================
// TEXTAREA COMPONENT
// ============================================================================

/**
 * TextareaProps - Multi-line input props.
 */
interface TextareaProps extends TextInputProps {
  label?: string;
  rows?: number;  // Number of visible rows (affects height)
}

/**
 * Textarea Component
 * 
 * Multi-line text input (like HTML <textarea>).
 * 
 * USAGE:
 * <Textarea label="DESCRIPTION" rows={4} value={desc} onChangeText={setDesc} />
 */
export function Textarea({ label, rows = 3, style, ...props }: TextareaProps) {
  return (
    <View style={styles.inputContainer}>
      {label && <Text style={styles.inputLabel}>{label}</Text>}
      <TextInput
        style={[styles.input, styles.textarea, { minHeight: rows * 24 }, style]}
        placeholderTextColor={COLORS.slate600}
        multiline                    // Allow multiple lines
        textAlignVertical="top"      // Start text at top (not center)
        {...props}
      />
    </View>
  );
}

// ============================================================================
// SELECT COMPONENT (Segmented Buttons)
// ============================================================================

/**
 * SelectOption - Shape of each option in the select.
 */
interface SelectOption {
  label: string;   // Display text
  value: string;   // Value when selected
}

/**
 * SelectProps - Props for the select component.
 */
interface SelectProps {
  label?: string;                          // Optional label
  options: SelectOption[];                 // Array of options
  value: string;                           // Currently selected value
  onChange: (value: string) => void;       // Called when selection changes
}

/**
 * Select Component
 * 
 * Segmented button group for single-option selection.
 * Unlike a dropdown, all options are visible as buttons.
 * 
 * USAGE:
 * <Select
 *   label="DIFFICULTY"
 *   options={[
 *     { label: 'Easy', value: 'easy' },
 *     { label: 'Normal', value: 'normal' },
 *     { label: 'Hard', value: 'hard' },
 *   ]}
 *   value={difficulty}
 *   onChange={setDifficulty}
 * />
 */
export function Select({ label, options, value, onChange }: SelectProps) {
  return (
    <View style={styles.inputContainer}>
      {label && <Text style={styles.inputLabel}>{label}</Text>}
      <View style={styles.selectOptions}>
        {/* Map through options and render a button for each */}
        {options.map((option) => (
          <Pressable
            key={option.value}  // React requires unique key for list items
            style={[
              styles.selectOption,
              // Apply active styles if this option is selected
              value === option.value && styles.selectOptionActive,
            ]}
            onPress={() => onChange(option.value)}  // Call onChange with this value
          >
            <Text
              style={[
                styles.selectOptionText,
                value === option.value && styles.selectOptionTextActive,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// ============================================================================
// BADGE COMPONENT
// ============================================================================

/**
 * BadgeVariant - Different visual styles for badges.
 */
type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'gold';

/**
 * BadgeProps - Props for the badge component.
 * 
 * "keyof typeof Ionicons.glyphMap" is a clever TypeScript trick:
 * - Ionicons.glyphMap is an object with all icon names as keys
 * - keyof typeof gets all those keys as a type
 * - So icon can only be valid Ionicon names (with autocomplete!)
 */
interface BadgeProps {
  children: string;                           // Badge text
  variant?: BadgeVariant;                     // Color variant
  icon?: keyof typeof Ionicons.glyphMap;      // Optional icon name
}

/**
 * Badge Component
 * 
 * Small status indicator with optional icon.
 * 
 * USAGE:
 * <Badge>Status</Badge>
 * <Badge variant="success">Completed</Badge>
 * <Badge variant="danger" icon="warning-outline">Error</Badge>
 */
export function Badge({ children, variant = 'default', icon }: BadgeProps) {
  /**
   * variantStyles - Colors for each variant.
   */
  const variantStyles: Record<BadgeVariant, { bg: string; border: string; text: string }> = {
    default: { bg: 'rgba(51, 65, 85, 0.3)', border: COLORS.slate700, text: COLORS.slate400 },
    success: { bg: 'rgba(34, 197, 94, 0.1)', border: 'rgba(34, 197, 94, 0.3)', text: COLORS.success },
    warning: { bg: 'rgba(251, 191, 36, 0.1)', border: 'rgba(251, 191, 36, 0.3)', text: COLORS.warning },
    danger: { bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.3)', text: COLORS.danger },
    gold: { bg: 'rgba(212, 168, 75, 0.1)', border: 'rgba(212, 168, 75, 0.3)', text: COLORS.gold },
  };

  const colors = variantStyles[variant];

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: colors.bg, borderColor: colors.border },
      ]}
    >
      {/* Only render icon if provided */}
      {icon && <Ionicons name={icon} size={10} color={colors.text} />}
      <Text style={[styles.badgeText, { color: colors.text }]}>{children}</Text>
    </View>
  );
}

// ============================================================================
// DIVIDER COMPONENT
// ============================================================================

/**
 * Divider Component
 * 
 * Simple horizontal line for visual separation.
 * 
 * USAGE:
 * <Text>Section 1</Text>
 * <Divider />
 * <Text>Section 2</Text>
 */
export function Divider() {
  return <View style={styles.divider} />;
}

// ============================================================================
// EMPTY STATE COMPONENT
// ============================================================================

/**
 * EmptyStateProps - Props for the empty state placeholder.
 */
interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;  // Icon to display
  title: string;                           // Main message
  message?: string;                        // Optional subtitle
}

/**
 * EmptyState Component
 * 
 * Placeholder to show when a list is empty.
 * 
 * USAGE:
 * {items.length === 0 ? (
 *   <EmptyState
 *     icon="book-outline"
 *     title="No Quests Yet"
 *     message="Add your first quest to get started!"
 *   />
 * ) : (
 *   <QuestList items={items} />
 * )}
 */
export function EmptyState({ icon = 'cube-outline', title, message }: EmptyStateProps) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name={icon} size={48} color={COLORS.slate700} />
      <Text style={styles.emptyStateTitle}>{title}</Text>
      {message && <Text style={styles.emptyStateMessage}>{message}</Text>}
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

/**
 * StyleSheet.create() - Creates a stylesheet object.
 * 
 * BENEFITS:
 * - Performance: Styles are validated once at creation
 * - Type safety: TypeScript catches invalid properties
 * - Code completion: Editor suggests valid style properties
 * 
 * COMMON PROPERTIES:
 * - flexDirection: 'row' (horizontal) or 'column' (vertical, default)
 * - alignItems: Cross-axis alignment ('center', 'flex-start', 'flex-end')
 * - justifyContent: Main-axis alignment ('center', 'space-between', etc.)
 * - padding/margin: Spacing (paddingHorizontal, marginVertical, etc.)
 * - borderRadius: Rounded corners
 * - backgroundColor: Background color
 */
const styles = StyleSheet.create({
  // ========== BUTTON STYLES ==========
  button: {
    flexDirection: 'row',       // Horizontal layout (icon + text)
    alignItems: 'center',       // Vertically center
    justifyContent: 'center',   // Horizontally center
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 4,
    borderWidth: 1,
    gap: 8,                     // Space between children
  },
  buttonFullWidth: {
    width: '100%',
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],  // Slightly shrink when pressed
    opacity: 0.9,
  },
  buttonDisabled: {
    opacity: 0.5,               // Dimmed when disabled
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',          // Bold
  },

  // ========== MAGICAL CARD STYLES ==========
  magicalCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',  // Semi-transparent dark
    borderWidth: 1,
    borderColor: COLORS.slate700,
    borderRadius: 12,
    padding: 16,
  },
  magicalCardGlow: {
    shadowColor: COLORS.amber400,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },

  // ========== HEADER STYLES ==========
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,             // Space for status bar
    paddingBottom: 16,
    backgroundColor: 'rgba(2, 6, 23, 0.8)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(30, 41, 59, 0.5)',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.amber50,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.slate400,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: 4,
  },

  // ========== MODAL STYLES ==========
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',  // Dark backdrop
    justifyContent: 'flex-end',              // Align to bottom
  },
  modalContent: {
    backgroundColor: COLORS.slate900,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
    maxHeight: '80%',                         // Don't exceed 80% of screen
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate800,
    backgroundColor: 'rgba(2, 6, 23, 0.5)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.amber50,
  },
  modalCloseButton: {
    padding: 4,                               // Increase touch target
  },
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    padding: 20,
  },

  // ========== INPUT STYLES ==========
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.amber500,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    opacity: 0.8,
  },
  input: {
    backgroundColor: COLORS.slate950,
    borderWidth: 1,
    borderColor: COLORS.slate700,
    borderRadius: 8,
    padding: 14,
    color: COLORS.amber50,
    fontSize: 16,
  },
  textarea: {
    minHeight: 80,
  },

  // ========== SELECT STYLES ==========
  selectOptions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',           // Wrap to next line if needed
  },
  selectOption: {
    flex: 1,
    minWidth: 80,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: COLORS.slate800,
    borderWidth: 1,
    borderColor: COLORS.slate700,
    alignItems: 'center',
  },
  selectOptionActive: {
    backgroundColor: COLORS.amber500,
    borderColor: COLORS.amber400,
  },
  selectOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.slate400,
  },
  selectOptionTextActive: {
    color: '#fff',
  },

  // ========== BADGE STYLES ==========
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ========== DIVIDER STYLES ==========
  divider: {
    height: 1,
    backgroundColor: COLORS.slate800,
    marginVertical: 16,
  },

  // ========== EMPTY STATE STYLES ==========
  emptyState: {
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.slate500,
  },
  emptyStateMessage: {
    fontSize: 14,
    color: COLORS.slate600,
    textAlign: 'center',
    lineHeight: 20,
  },
});
