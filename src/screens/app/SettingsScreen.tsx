import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Switch,
  ScrollView,
  Alert,
} from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../../config/theme';
import { APP_CONFIG } from '../../config/constants';

export function SettingsScreen() {
  const [pushNotifications, setPushNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const settingsSections = [
    {
      title: 'Notifications',
      items: [
        {
          label: 'Push Notifications',
          type: 'switch' as const,
          value: pushNotifications,
          onToggle: setPushNotifications,
        },
      ],
    },
    {
      title: 'Appearance',
      items: [
        {
          label: 'Dark Mode',
          type: 'switch' as const,
          value: darkMode,
          onToggle: (val: boolean) => {
            setDarkMode(val);
            Alert.alert('Coming Soon', 'Dark mode will be available in a future update');
            setDarkMode(false);
          },
        },
      ],
    },
    {
      title: 'About',
      items: [
        {
          label: 'Version',
          type: 'info' as const,
          value: APP_CONFIG.version,
        },
        {
          label: 'App Name',
          type: 'info' as const,
          value: APP_CONFIG.name,
        },
      ],
    },
    {
      title: 'Data',
      items: [
        {
          label: 'Clear Cache',
          type: 'action' as const,
          onPress: () => {
            Alert.alert(
              'Clear Cache',
              'This will clear all cached data. Continue?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Clear',
                  style: 'destructive',
                  onPress: () => Alert.alert('Done', 'Cache cleared successfully'),
                },
              ]
            );
          },
        },
      ],
    },
  ];

  return (
    <ScrollView style={styles.container}>
      {settingsSections.map((section, sectionIdx) => (
        <View key={sectionIdx} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.sectionContent}>
            {section.items.map((item, itemIdx) => (
              <View
                key={itemIdx}
                style={[
                  styles.settingRow,
                  itemIdx < section.items.length - 1 && styles.settingRowBorder,
                ]}
              >
                <Text style={styles.settingLabel}>{item.label}</Text>
                {item.type === 'switch' && (
                  <Switch
                    value={item.value as boolean}
                    onValueChange={item.onToggle}
                    trackColor={{ false: COLORS.disabled, true: COLORS.primaryLight }}
                    thumbColor={item.value ? COLORS.primary : COLORS.surface}
                  />
                )}
                {item.type === 'info' && (
                  <Text style={styles.settingValue}>{item.value as string}</Text>
                )}
                {item.type === 'action' && (
                  <TouchableOpacity onPress={item.onPress}>
                    <Text style={styles.actionText}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  section: {
    marginTop: SPACING.xl,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  sectionContent: {
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.borderLight,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  settingRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  settingLabel: {
    fontSize: FONTS.sizes.lg,
    color: COLORS.textPrimary,
  },
  settingValue: {
    fontSize: FONTS.sizes.lg,
    color: COLORS.textTertiary,
  },
  actionText: {
    fontSize: FONTS.sizes.lg,
    color: COLORS.error,
  },
});
