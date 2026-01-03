import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { getInventoryWithDetails, InventoryItemWithDetails } from '@/services/inventoryHelper';
import { getProfile, Profile } from '@/services/profileHelper';

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
  amber900: '#78350F',
  blue400: '#60A5FA',
  blue900: '#1E3A8A',
  purple400: '#C084FC',
  purple900: '#581C87',
  green400: '#4ADE80',
  orange400: '#FB923C',
  slate400: '#94A3B8',
  slate500: '#64748B',
  slate600: '#475569',
  slate700: '#334155',
  slate800: '#1E293B',
  slate900: '#0F172A',
  slate950: '#020617',
};

// Rarity configurations
const RARITY_CONFIG: Record<string, { textColor: string; borderColor: string; bgColor: string }> = {
  common: {
    textColor: COLORS.slate400,
    borderColor: 'rgba(100, 116, 139, 0.5)',
    bgColor: 'rgba(30, 41, 59, 0.5)',
  },
  rare: {
    textColor: COLORS.blue400,
    borderColor: 'rgba(96, 165, 250, 0.5)',
    bgColor: 'rgba(30, 58, 138, 0.2)',
  },
  epic: {
    textColor: COLORS.purple400,
    borderColor: 'rgba(192, 132, 252, 0.5)',
    bgColor: 'rgba(88, 28, 135, 0.2)',
  },
  legendary: {
    textColor: COLORS.amber400,
    borderColor: 'rgba(251, 191, 36, 0.5)',
    bgColor: 'rgba(120, 53, 15, 0.2)',
  },
  mythic: {
    textColor: COLORS.orange400,
    borderColor: 'rgba(251, 146, 60, 0.5)',
    bgColor: 'rgba(154, 52, 18, 0.2)',
  },
};

// Item icon mapping
const ITEM_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Scroll: 'document-text-outline',
  Feather: 'leaf-outline',
  Gem: 'diamond-outline',
  FlaskConical: 'beaker-outline',
  Coins: 'logo-bitcoin',
  Star: 'star-outline',
  Book: 'book-outline',
  Key: 'key-outline',
  Shield: 'shield-outline',
  Wand: 'flash-outline',
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function VaultScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [inventory, setInventory] = useState<InventoryItemWithDetails[]>([]);

  const loadData = useCallback(async () => {
    try {
      const userProfile = await getProfile();
      setProfile(userProfile);

      const items = await getInventoryWithDetails();
      setInventory(items);
    } catch (error) {
      console.error('Error loading vault data:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const getRarityConfig = (rarity: string) => {
    return RARITY_CONFIG[rarity] || RARITY_CONFIG.common;
  };

  const getItemIcon = (iconName: string | null): keyof typeof Ionicons.glyphMap => {
    if (iconName && ITEM_ICONS[iconName]) {
      return ITEM_ICONS[iconName];
    }
    return 'cube-outline';
  };

  // Create grid with empty slots for visual fullness
  const gridItems = [
    ...inventory,
    ...Array(Math.max(0, 12 - inventory.length)).fill(null),
  ];

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
            <Text style={styles.headerTitle}>The Vault</Text>
            <Text style={styles.headerSubtitle}>Inventory & Artifacts</Text>
          </View>

          {/* Currency Display */}
          <View style={styles.currencyContainer}>
            <View style={styles.currencyBadge}>
              <Ionicons name="logo-bitcoin" size={20} color={COLORS.amber400} />
              <Text style={styles.currencyValue}>{profile?.galleons || 0}</Text>
              <Text style={styles.currencyLabel}>GALLEONS</Text>
            </View>
          </View>

          {/* Inventory Grid */}
          <View style={styles.grid}>
            {gridItems.map((item, index) => {
              if (!item) {
                // Empty slot
                return (
                  <View key={`empty-${index}`} style={styles.emptySlot}>
                    <View style={styles.emptyDot} />
                  </View>
                );
              }

              const rarityConfig = getRarityConfig(item.rarity);
              const iconName = getItemIcon(item.icon);

              return (
                <View
                  key={item.id}
                  style={[
                    styles.itemSlot,
                    {
                      borderColor: rarityConfig.borderColor,
                      backgroundColor: rarityConfig.bgColor,
                    },
                  ]}
                >
                  <View style={styles.itemQuantity}>
                    <Text style={styles.itemQuantityText}>x{item.qty}</Text>
                  </View>
                  <Ionicons
                    name={iconName}
                    size={28}
                    color={rarityConfig.textColor}
                    style={styles.itemIcon}
                  />
                  <Text
                    style={[styles.itemName, { color: rarityConfig.textColor }]}
                    numberOfLines={2}
                  >
                    {item.name}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Empty state message */}
          {inventory.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="cube-outline" size={48} color={COLORS.slate700} />
              <Text style={styles.emptyStateTitle}>Vault is Empty</Text>
              <Text style={styles.emptyStateText}>
                Complete quests to earn magical artifacts and treasures!
              </Text>
            </View>
          )}

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

  // Currency
  currencyContainer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  currencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.slate900,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
    borderRadius: 50,
    paddingHorizontal: 20,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  currencyValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.amber100,
  },
  currencyLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.amber600,
    letterSpacing: 1,
  },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 24,
    gap: 12,
  },
  itemSlot: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
    position: 'relative',
  },
  itemQuantity: {
    position: 'absolute',
    top: 6,
    right: 8,
  },
  itemQuantityText: {
    fontSize: 10,
    color: COLORS.slate500,
    fontFamily: 'monospace',
  },
  itemIcon: {
    marginBottom: 6,
  },
  itemName: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    opacity: 0.8,
    lineHeight: 12,
  },
  emptySlot: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(30, 41, 59, 0.5)',
    backgroundColor: 'rgba(15, 23, 42, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.slate800,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 48,
    marginTop: 32,
    gap: 12,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.slate500,
    marginTop: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: COLORS.slate600,
    textAlign: 'center',
    lineHeight: 20,
  },
});
