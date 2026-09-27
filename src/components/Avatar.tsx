import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS } from '../config/theme';

interface AvatarProps {
  name: string;
  size?: number;
  backgroundColor?: string;
}

export function Avatar({ name, size = 48, backgroundColor = COLORS.primary }: AvatarProps) {
  const initial = name?.charAt(0)?.toUpperCase() || '?';

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
        },
      ]}
    >
      <Text style={[styles.text, { fontSize: size * 0.4 }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: COLORS.textInverse,
    fontWeight: 'bold',
  },
});
