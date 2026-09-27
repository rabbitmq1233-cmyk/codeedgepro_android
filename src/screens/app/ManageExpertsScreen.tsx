import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../services/api';
import { LoadingScreen } from '../../components';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../config/theme';
import type { Expert, ProjectExpert } from '../../types';

// ManageExpertsScreen — assign/remove experts on a project.
// WHY this screen is mandatory: POST /chats/:id/messages requires
// expert_ids (min 1). Without assigning experts to a project first,
// the chat screen has nothing to select and can never send.
export function ManageExpertsScreen({ route }: any) {
  const { projectId } = route.params;
  const [assigned, setAssigned] = useState<ProjectExpert[]>([]);
  const [catalog, setCatalog] = useState<Expert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const [project, experts] = await Promise.all([
        apiClient.getProjectDetails(projectId),
        apiClient.getExperts(),
      ]);
      setAssigned((project.experts || []).filter((e) => e.is_active));
      setCatalog(experts);
    } catch (error) {
      console.error('Failed to load experts:', error);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const assignedIds = new Set(assigned.map((e) => e.expert_id));
  const available = catalog.filter((e) => !assignedIds.has(e.id));

  const addExpert = async (expert: Expert) => {
    setBusyId(expert.id);
    try {
      await apiClient.addExpertToProject(projectId, expert.id);
      await load();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to add expert');
    } finally {
      setBusyId(null);
    }
  };

  const removeExpert = async (expertId: string) => {
    setBusyId(expertId);
    try {
      await apiClient.removeExpertFromProject(projectId, expertId);
      await load();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to remove expert');
    } finally {
      setBusyId(null);
    }
  };

  if (isLoading) return <LoadingScreen message="Loading experts..." />;

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={available}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <>
          <Text style={styles.sectionTitle}>Assigned ({assigned.length})</Text>
          {assigned.length === 0 && (
            <Text style={styles.emptyText}>
              No experts assigned — chat is disabled until you add at least one.
            </Text>
          )}
          {assigned.map((exp) => (
            <View key={exp.expert_id} style={styles.card}>
              <View style={styles.cardInfo}>
                <Text style={styles.expertName}>{exp.expert_name}</Text>
                <Text style={styles.expertDomain}>{exp.domain}</Text>
              </View>
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => removeExpert(exp.expert_id)}
                disabled={busyId === exp.expert_id}
              >
                {busyId === exp.expert_id ? (
                  <ActivityIndicator size="small" color={COLORS.error} />
                ) : (
                  <Ionicons name="remove-circle-outline" size={24} color={COLORS.error} />
                )}
              </TouchableOpacity>
            </View>
          ))}
          <Text style={styles.sectionTitle}>Available ({available.length})</Text>
        </>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.cardInfo}>
            <Text style={styles.expertName}>{item.name}</Text>
            <Text style={styles.expertDomain}>
              {item.domain} · ⭐ {item.avg_rating?.toFixed(1) || 'N/A'} · {item.total_topics} topics
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => addExpert(item)}
            disabled={busyId === item.id}
          >
            {busyId === item.id ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Ionicons name="add-circle-outline" size={24} color={COLORS.primary} />
            )}
          </TouchableOpacity>
        </View>
      )}
      ListEmptyComponent={
        <Text style={styles.emptyText}>All catalog experts are already assigned.</Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxxl },
  sectionTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.small,
  },
  cardInfo: { flex: 1 },
  expertName: { fontSize: FONTS.sizes.md, fontWeight: '600', color: COLORS.textPrimary },
  expertDomain: { fontSize: FONTS.sizes.sm, color: COLORS.textTertiary, marginTop: 2 },
  addBtn: { padding: SPACING.xs },
  removeBtn: { padding: SPACING.xs },
  emptyText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textTertiary,
    marginBottom: SPACING.md,
  },
});
