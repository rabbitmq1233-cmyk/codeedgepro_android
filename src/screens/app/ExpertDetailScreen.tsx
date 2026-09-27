import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { apiClient } from '../../services/api';
import type { Expert, ExpertTopicsResponse } from '../../types';

export function ExpertDetailScreen({ route }: any) {
  const { expertId } = route.params;
  const [expert, setExpert] = useState<Expert | null>(null);
  const [topics, setTopics] = useState<ExpertTopicsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadExpertDetails();
  }, [expertId]);

  const loadExpertDetails = async () => {
    try {
      setIsLoading(true);
      const [expertData, topicsData] = await Promise.all([
        apiClient.getExpertDetails(expertId),
        apiClient.getExpertTopics(expertId),
      ]);
      setExpert(expertData);
      setTopics(topicsData);
    } catch (error) {
      console.error('Failed to load expert details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!expert) {
    return (
      <View style={styles.centerContainer}>
        <Text>Expert not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.name}>{expert.name}</Text>
        <Text style={styles.version}>{expert.domain}</Text>
        <View style={styles.ratingContainer}>
          <Text style={styles.rating}>⭐ {expert.avg_rating?.toFixed(1) || 'N/A'}</Text>
          <Text style={styles.coverage}>Depth: {expert.avg_depth_level?.toFixed(1)}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.description}>{expert.description}</Text>
      </View>

      {topics && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Topics Covered ({topics.topics?.length || 0})</Text>
          {topics.topics?.map((topic, idx: number) => (
            <View key={idx} style={styles.topicItem}>
              <Text style={styles.topicName}>{topic.topic}</Text>
              <View style={styles.topicMeta}>
                <Text style={styles.topicCoverage}>Chunks: {topic.chunk_count}</Text>
                <Text style={styles.topicDepth}>Depth: {topic.depth_level}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Statistics</Text>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Total Chunks:</Text>
          <Text style={styles.statValue}>{expert.total_chunks?.toLocaleString()}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Total Topics:</Text>
          <Text style={styles.statValue}>{expert.total_topics}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Created:</Text>
          <Text style={styles.statValue}>
            {expert.created_at ? new Date(expert.created_at).toLocaleDateString() : 'N/A'}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 16, backgroundColor: '#f9f9f9', borderBottomWidth: 1, borderBottomColor: '#eee' },
  name: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  version: { fontSize: 12, color: '#999', marginBottom: 12 },
  ratingContainer: { flexDirection: 'row', gap: 12 },
  rating: { fontSize: 14, fontWeight: '600' },
  coverage: { fontSize: 14, color: '#666' },
  section: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  description: { fontSize: 14, color: '#666', lineHeight: 20 },
  text: { fontSize: 14, color: '#666', lineHeight: 20 },
  topicItem: { marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  topicName: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  topicMeta: { flexDirection: 'row', gap: 12 },
  topicCoverage: { fontSize: 12, color: '#999' },
  topicDepth: { fontSize: 12, color: '#999' },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  statLabel: { fontSize: 14, fontWeight: '600', color: '#666' },
  statValue: { fontSize: 14, color: '#000' },
  actionButton: { margin: 16, paddingVertical: 12, backgroundColor: '#007AFF', borderRadius: 8, alignItems: 'center' },
  actionButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
