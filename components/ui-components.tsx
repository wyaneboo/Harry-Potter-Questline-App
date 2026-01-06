/**
 * =============================================================================
 * UI COMPONENTS - Reusable React Native Components
 * =============================================================================
 * 
 * A collection of Harry Potter themed, reusable UI components for the questline
 * app. Converted from web Tailwind version to React Native with StyleSheet.
 * 
 * Main Components:
 * 
 * - Button: Themed button with primary, secondary, ghost, and danger variants.
 *   Supports disabled state and press animations.
 * 
 * - MagicalCard: Card container with optional magical glow effect and press
 *   support. Used as a base container for content sections.
 * 
 * - Header: Page header component with title, optional subtitle, and right-side
 *   action element slot.
 * 
 * - Modal: Bottom sheet modal with slide animation, title header, close button,
 *   and scrollable content area.
 * 
 * - Input: Styled text input with optional label. Themed with dark background
 *   and gold accent colors.
 * 
 * - Textarea: Multi-line text input extending Input with configurable row height.
 * 
 * - Select: Segmented button group for single-option selection. Displays options
 *   as horizontally arranged, pressable buttons.
 * 
 * - Badge: Small status indicator with icon support and multiple color variants
 *   (default, success, warning, danger, gold).
 * 
 * - Divider: Horizontal separator line for visual content separation.
 * 
 * - EmptyState: Placeholder view for empty lists with icon, title, and message.
 * 
 * =============================================================================
 */

import { Ionicons } from '@expo/vector-icons';
import React, { ReactNode } from 'react';
import {
    Pressable,
    Modal as RNModal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TextInputProps,
    View,
    ViewStyle,
} from 'react-native';

// ============================================================================
// THEME CONSTANTS
// ============================================================================

export const COLORS = {
  // Primary colors
  gold: '#D4A84B',
  goldLight: '#F4D675',
  amber50: '#FFFBEB',
  amber100: '#FEF3C7',
  amber200: '#FDE68A',
  amber300: '#FCD34D',
  amber400: '#FBBF24',
  amber500: '#F59E0B',
  amber600: '#D97706',
  amber900: '#78350F',
  // Maroon (Gryffindor)
  maroon: '#740001',
  maroonDark: '#4A0000',
  // Slate
  slate300: '#CBD5E1',
  slate400: '#94A3B8',
  slate500: '#64748B',
  slate600: '#475569',
  slate700: '#334155',
  slate800: '#1E293B',
  slate900: '#0F172A',
  slate950: '#020617',
  // Status
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  // Red
  red200: '#FECACA',
  red700: '#B91C1C',
  red900: '#7F1D1D',
};

// ============================================================================
// BUTTON COMPONENT
// ============================================================================

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps {
  children: ReactNode;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: ViewStyle;
  fullWidth?: boolean;
}

export function Button({
  children,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
  fullWidth = false,
}: ButtonProps) {
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
      style={({ pressed }) => [
        styles.button,
        variantStyles[variant],
        fullWidth && styles.buttonFullWidth,
        pressed && styles.buttonPressed,
        disabled && styles.buttonDisabled,
        style,
      ]}
    >
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

interface MagicalCardProps {
  children: ReactNode;
  glow?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

export function MagicalCard({ children, glow = false, onPress, style }: MagicalCardProps) {
  const cardStyle = [
    styles.magicalCard,
    glow && styles.magicalCardGlow,
    style,
  ];

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

interface HeaderProps {
  title: string;
  subtitle?: string;
  rightElement?: ReactNode;
}

export function Header({ title, subtitle, rightElement }: HeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>{title}</Text>
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

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ visible, onClose, title, children }: ModalProps) {
  return (
    <RNModal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <Pressable onPress={onClose} style={styles.modalCloseButton}>
              <Ionicons name="close" size={20} color={COLORS.slate500} />
            </Pressable>
          </View>
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

interface InputProps extends TextInputProps {
  label?: string;
}

export function Input({ label, style, ...props }: InputProps) {
  return (
    <View style={styles.inputContainer}>
      {label && <Text style={styles.inputLabel}>{label}</Text>}
      <TextInput
        style={[styles.input, style]}
        placeholderTextColor={COLORS.slate600}
        {...props}
      />
    </View>
  );
}

// ============================================================================
// TEXTAREA COMPONENT
// ============================================================================

interface TextareaProps extends TextInputProps {
  label?: string;
  rows?: number;
}

export function Textarea({ label, rows = 3, style, ...props }: TextareaProps) {
  return (
    <View style={styles.inputContainer}>
      {label && <Text style={styles.inputLabel}>{label}</Text>}
      <TextInput
        style={[styles.input, styles.textarea, { minHeight: rows * 24 }, style]}
        placeholderTextColor={COLORS.slate600}
        multiline
        textAlignVertical="top"
        {...props}
      />
    </View>
  );
}

// ============================================================================
// SELECT COMPONENT (Picker-like)
// ============================================================================

interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps {
  label?: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
}

export function Select({ label, options, value, onChange }: SelectProps) {
  return (
    <View style={styles.inputContainer}>
      {label && <Text style={styles.inputLabel}>{label}</Text>}
      <View style={styles.selectOptions}>
        {options.map((option) => (
          <Pressable
            key={option.value}
            style={[
              styles.selectOption,
              value === option.value && styles.selectOptionActive,
            ]}
            onPress={() => onChange(option.value)}
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

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'gold';

interface BadgeProps {
  children: string;
  variant?: BadgeVariant;
  icon?: keyof typeof Ionicons.glyphMap;
}

export function Badge({ children, variant = 'default', icon }: BadgeProps) {
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
      {icon && <Ionicons name={icon} size={10} color={colors.text} />}
      <Text style={[styles.badgeText, { color: colors.text }]}>{children}</Text>
    </View>
  );
}

// ============================================================================
// DIVIDER COMPONENT
// ============================================================================

export function Divider() {
  return <View style={styles.divider} />;
}

// ============================================================================
// EMPTY STATE COMPONENT
// ============================================================================

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
}

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

const styles = StyleSheet.create({
  // Button
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 4,
    borderWidth: 1,
    gap: 8,
  },
  buttonFullWidth: {
    width: '100%',
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Magical Card
  magicalCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
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

  // Header
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
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
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
    maxHeight: '80%',
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
    padding: 4,
  },
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    padding: 20,
  },

  // Input
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

  // Select (as segmented buttons)
  selectOptions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
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

  // Badge
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

  // Divider
  divider: {
    height: 1,
    backgroundColor: COLORS.slate800,
    marginVertical: 16,
  },

  // Empty State
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
