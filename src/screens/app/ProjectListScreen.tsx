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
import type { Project } from '../../types';

export function ProjectListScreen({ navigation }: any) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Reload when screen gains focus (e.g. after creating a project)
  useFocusEffect(
    useCallback(() => {
      loadProjects();
    }, [])
  );

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.getProjects();
      setProjects(data);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    try {
      const data = await apiClient.getProjects();
      setProjects(data);
    } finally {
      setIsRefreshing(false);
    }
  };

  const navigateToCreate = () => {
    navigation.navigate('CreateProject');
  };

  const renderProject = ({ item }: { item: Project }) => (
    <TouchableOpacity
      style={styles.projectCard}
      onPress={() =>
        navigation.navigate('ChatList', {
          projectId: item.id,
          projectName: item.name,
        })
      }
    >
      <View style={styles.cardHeader}>
        <Ionicons name="folder" size={20} color={COLORS.primary} />
        <Text style={styles.projectName}>{item.name}</Text>
      </View>
      {item.description ? (
        <Text style={styles.projectDesc} numberOfLines={2}>
          {item.description}
        </Text>
      ) : null}
      <View style={styles.projectMeta}>
        <View style={styles.metaItem}>
          <Ionicons name="bulb-outline" size={14} color={COLORS.textTertiary} />
          <Text style={styles.metaText}>{item.experts?.length ?? 0} Experts</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="git-branch-outline" size={14} color={COLORS.textTertiary} />
          <Text style={styles.metaText}>{item.repo_connected ? 'Repo linked' : 'No repo'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (isLoading && projects.length === 0) {
    return <LoadingScreen message="Loading projects..." />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={projects}
        renderItem={renderProject}
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
            title="No projects yet"
            subtitle="Create your first project to start chatting with AI experts"
            actionLabel="Create Project"
            onAction={navigateToCreate}
          />
        }
      />
      {projects.length > 0 && (
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
  projectCard: {
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
    marginBottom: SPACING.xs,
  },
  projectName: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
    flex: 1,
  },
  projectDesc: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    marginLeft: 28, // align with text after icon
  },
  projectMeta: {
    flexDirection: 'row',
    gap: SPACING.xl,
    marginLeft: 28,
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
