import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Text,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../services/api';
import { LoadingScreen, EmptyState } from '../../components';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../config/theme';
import type { Chat } from '../../types';
import { format } from 'date-fns';

export function ChatListScreen({ route, navigation }: any) {
  const { projectId } = route.params;
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadChats();
    }, [projectId])
  );

  const loadChats = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.getProjectChats(projectId);
      setChats(data);
    } catch (error) {
      console.error('Failed to load chats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    try {
      const data = await apiClient.getProjectChats(projectId);
      setChats(data);
    } finally {
      setIsRefreshing(false);
    }
  };

  const navigateToCreate = () => {
    navigation.navigate('CreateChat', { projectId });
  };

  const renderChat = ({ item }: { item: Chat }) => (
    <TouchableOpacity
      style={styles.chatCard}
      onPress={() =>
        navigation.navigate('ChatDetail', {
          chatId: item.id,
          chatTitle: item.title,
        })
      }
    >
      <View style={styles.cardHeader}>
        <Ionicons name="chatbubble" size={18} color={COLORS.primary} />
        <Text style={styles.chatTitle} numberOfLines={1}>
          {item.title}
        </Text>
      </View>
      <View style={styles.chatMeta}>
        <View style={styles.metaItem}>
          <Ionicons name="chatbubbles-outline" size={14} color={COLORS.textTertiary} />
          <Text style={styles.metaText}>{item.message_count} messages</Text>
        </View>
        <Text style={styles.metaText}>
          {format(new Date(item.created_at), 'MMM d, yyyy')}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (isLoading && chats.length === 0) {
    return <LoadingScreen message="Loading chats..." />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={chats}
        renderItem={renderChat}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            title="No chats yet"
            subtitle="Start a new chat to ask your AI experts questions"
            actionLabel="New Chat"
            onAction={navigateToCreate}
          />
        }
      />
      {chats.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={navigateToCreate}>
          <Ionicons name="add" size={28} color={COLORS.textInverse} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  list: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  chatCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.small,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  chatTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
    flex: 1,
  },
  chatMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginLeft: 26, // align with text after icon
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  metaText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textTertiary,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: RADIUS.round,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.large,
  },
});
