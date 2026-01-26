/**
 * =============================================================================
 * PROFILE SCREEN - Player Profile & Settings
 * =============================================================================
 * 
 * Displays and allows editing of the player's profile including:
 * - Profile picture (avatar selection)
 * - Wizard name (editable)
 * - Hogwarts house (dropdown selection)
 * - Level and XP progress bar
 * - Galleons balance
 * 
 * =============================================================================
 */

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    Alert,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

import { useGame } from '@/context/GameContext';
import { HogwartsHouse } from '@/services/profileHelper';

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
  maroonDark: '#4A0000',
  slate400: '#94A3B8',
  slate500: '#64748B',
  slate600: '#475569',
  slate700: '#334155',
  slate800: '#1E293B',
  slate900: '#0F172A',
  slate950: '#020617',
};

// House configuration with colors and icons
const HOUSE_CONFIG: Record<HogwartsHouse, { icon: string; color: string; bgColor: string }> = {
  Gryffindor: { icon: '🦁', color: '#AE0001', bgColor: 'rgba(174, 0, 1, 0.2)' },
  Slytherin: { icon: '🐍', color: '#1A472A', bgColor: 'rgba(26, 71, 42, 0.2)' },
  Ravenclaw: { icon: '🦅', color: '#0E1A40', bgColor: 'rgba(14, 26, 64, 0.2)' },
  Hufflepuff: { icon: '🦡', color: '#FFCC00', bgColor: 'rgba(255, 204, 0, 0.2)' },
};

// Avatar options for profile picture
const AVATAR_OPTIONS = [
  'default', '🧙', '🧙‍♀️', '🧝', '🧝‍♀️', '🧛', '🧛‍♀️', '🦸', '🦸‍♀️', '🧚', '🧚‍♀️', '🦹', '🦹‍♀️'
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ProfileScreen() {
  const { profile, levelProgress, updateProfile, refreshData } = useGame();
  
  // Modal states
  const [showNameModal, setShowNameModal] = useState(false);
  const [showHouseModal, setShowHouseModal] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  
  // Form state
  const [editName, setEditName] = useState('');

  // Refresh data when screen gains focus
  useFocusEffect(
    useCallback(() => {
      refreshData();
    }, [refreshData])
  );

  // Calculate XP progress percentage
  const xpPercentage = Math.min(100, levelProgress.percentage);

  // Handle name save
  const handleSaveName = async () => {
    if (!editName.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }
    await updateProfile({ name: editName.trim() });
    setShowNameModal(false);
  };

  // Handle house change
  const handleSelectHouse = async (house: HogwartsHouse) => {
    await updateProfile({ house });
    setShowHouseModal(false);
  };

  // Handle avatar change
  const handleSelectAvatar = async (avatar: string) => {
    await updateProfile({ profile_picture: avatar });
    setShowAvatarModal(false);
  };

  // Open name modal with current name
  const openNameModal = () => {
    setEditName(profile?.name || '');
    setShowNameModal(true);
  };

  // Get current house config
  const currentHouse = (profile?.house || 'Gryffindor') as HogwartsHouse;
  const houseConfig = HOUSE_CONFIG[currentHouse];
  
  // Get profile picture display
  const profilePic = profile?.profile_picture || 'default';
  const avatarDisplay = profilePic === 'default' ? '🧙' : profilePic;

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
            <Text style={styles.headerTitle}>Profile</Text>
            <Text style={styles.headerSubtitle}>WIZARD CREDENTIALS</Text>
          </View>

          {/* Profile Card */}
          <View style={styles.profileCard}>
            {/* Avatar Section */}
            <Pressable style={styles.avatarSection} onPress={() => setShowAvatarModal(true)}>
              <View style={[styles.avatarContainer, { borderColor: houseConfig.color }]}>
                <Text style={styles.avatarText}>{avatarDisplay}</Text>
                <View style={styles.avatarEditBadge}>
                  <Ionicons name="pencil" size={12} color={COLORS.amber50} />
                </View>
              </View>
            </Pressable>

            {/* Name Section */}
            <Pressable style={styles.nameSection} onPress={openNameModal}>
              <Text style={styles.nameText}>{profile?.name || 'Wizard'}</Text>
              <Ionicons name="pencil" size={14} color={COLORS.slate500} />
            </Pressable>

            {/* House Badge */}
            <Pressable 
              style={[styles.houseBadge, { backgroundColor: houseConfig.bgColor, borderColor: houseConfig.color }]}
              onPress={() => setShowHouseModal(true)}
            >
              <Text style={styles.houseIcon}>{houseConfig.icon}</Text>
              <Text style={[styles.houseText, { color: houseConfig.color }]}>{currentHouse}</Text>
              <Ionicons name="chevron-down" size={14} color={houseConfig.color} />
            </Pressable>
          </View>

          {/* Stats Card */}
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>WIZARD STATS</Text>
            
            {/* Level */}
            <View style={styles.statRow}>
              <View style={styles.statLabel}>
                <Ionicons name="star" size={16} color={COLORS.amber400} />
                <Text style={styles.statLabelText}>Level</Text>
              </View>
              <Text style={styles.levelValue}>{profile?.level || 1}</Text>
            </View>

            {/* XP Progress */}
            <View style={styles.xpSection}>
              <View style={styles.xpHeader}>
                <Text style={styles.xpLabel}>EXPERIENCE</Text>
                <Text style={styles.xpValue}>
                  {levelProgress.currentXPInLevel} / {levelProgress.xpNeededForNextLevel} XP
                </Text>
              </View>
              <View style={styles.xpBarBg}>
                <View style={[styles.xpBarFill, { width: `${xpPercentage}%` }]} />
              </View>
              <Text style={styles.xpHint}>
                {levelProgress.xpNeededForNextLevel - levelProgress.currentXPInLevel} XP until next level
              </Text>
            </View>

            {/* Galleons */}
            <View style={styles.statRow}>
              <View style={styles.statLabel}>
                <Ionicons name="logo-bitcoin" size={16} color={COLORS.amber400} />
                <Text style={styles.statLabelText}>Galleons</Text>
              </View>
              <Text style={styles.galleonsValue}>{profile?.galleons || 0} G</Text>
            </View>
          </View>

          {/* Total XP Card */}
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="sparkles" size={16} color={COLORS.amber500} />
              <Text style={styles.infoText}>Total XP Earned: {profile?.xp || 0}</Text>
            </View>
          </View>

          {/* Bottom Spacing */}
          <View style={{ height: 100 }} />
        </ScrollView>
      </LinearGradient>

      {/* Name Edit Modal */}
      <Modal
        visible={showNameModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowNameModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Name</Text>
              <Pressable onPress={() => setShowNameModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.slate400} />
              </Pressable>
            </View>
            <TextInput
              style={styles.modalInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Enter wizard name..."
              placeholderTextColor={COLORS.slate600}
              autoFocus
            />
            <Pressable style={styles.saveButton} onPress={handleSaveName}>
              <Text style={styles.saveButtonText}>Save</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* House Select Modal */}
      <Modal
        visible={showHouseModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowHouseModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select House</Text>
              <Pressable onPress={() => setShowHouseModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.slate400} />
              </Pressable>
            </View>
            <View style={styles.houseList}>
              {(Object.keys(HOUSE_CONFIG) as HogwartsHouse[]).map((house) => (
                <Pressable
                  key={house}
                  style={[
                    styles.houseOption,
                    { 
                      backgroundColor: HOUSE_CONFIG[house].bgColor,
                      borderColor: currentHouse === house ? HOUSE_CONFIG[house].color : 'transparent',
                    }
                  ]}
                  onPress={() => handleSelectHouse(house)}
                >
                  <Text style={styles.houseOptionIcon}>{HOUSE_CONFIG[house].icon}</Text>
                  <Text style={[styles.houseOptionText, { color: HOUSE_CONFIG[house].color }]}>
                    {house}
                  </Text>
                  {currentHouse === house && (
                    <Ionicons name="checkmark-circle" size={20} color={HOUSE_CONFIG[house].color} />
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Avatar Select Modal */}
      <Modal
        visible={showAvatarModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAvatarModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Avatar</Text>
              <Pressable onPress={() => setShowAvatarModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.slate400} />
              </Pressable>
            </View>
            <View style={styles.avatarGrid}>
              {AVATAR_OPTIONS.map((avatar, index) => (
                <Pressable
                  key={index}
                  style={[
                    styles.avatarOption,
                    profilePic === avatar && styles.avatarOptionSelected,
                  ]}
                  onPress={() => handleSelectAvatar(avatar)}
                >
                  <Text style={styles.avatarOptionText}>
                    {avatar === 'default' ? '🧙' : avatar}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </Modal>
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
    fontSize: 12,
    color: COLORS.slate500,
    letterSpacing: 2,
    marginTop: 4,
  },

  // Profile Card
  profileCard: {
    marginHorizontal: 24,
    marginTop: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  avatarSection: {
    marginBottom: 16,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.slate800,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarText: {
    fontSize: 48,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.amber500,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.slate900,
  },
  nameSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  nameText: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.amber50,
  },
  houseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  houseIcon: {
    fontSize: 20,
  },
  houseText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Stats Card
  statsCard: {
    marginHorizontal: 24,
    marginTop: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  statsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.slate500,
    letterSpacing: 2,
    marginBottom: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  statLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statLabelText: {
    fontSize: 14,
    color: COLORS.slate400,
  },
  levelValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.amber400,
  },
  galleonsValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.amber400,
  },

  // XP Section
  xpSection: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  xpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  xpLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.slate500,
    letterSpacing: 1,
  },
  xpValue: {
    fontSize: 10,
    color: COLORS.slate400,
  },
  xpBarBg: {
    height: 8,
    backgroundColor: COLORS.slate800,
    borderRadius: 4,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: COLORS.amber400,
    borderRadius: 4,
  },
  xpHint: {
    fontSize: 10,
    color: COLORS.slate600,
    marginTop: 6,
    textAlign: 'right',
  },

  // Info Card
  infoCard: {
    marginHorizontal: 24,
    marginTop: 16,
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.2)',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.amber400,
    fontWeight: '600',
  },

  // Modal Styles
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
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.amber50,
  },
  modalInput: {
    backgroundColor: COLORS.slate800,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: COLORS.amber50,
    borderWidth: 1,
    borderColor: COLORS.slate700,
    marginBottom: 16,
  },
  saveButton: {
    backgroundColor: COLORS.amber500,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.amber50,
  },

  // House List
  houseList: {
    gap: 12,
  },
  houseOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 2,
  },
  houseOptionIcon: {
    fontSize: 28,
  },
  houseOptionText: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },

  // Avatar Grid
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  avatarOption: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.slate800,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarOptionSelected: {
    borderColor: COLORS.amber400,
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
  },
  avatarOptionText: {
    fontSize: 28,
  },
});
