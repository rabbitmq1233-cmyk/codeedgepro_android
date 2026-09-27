import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from 'react-native';
import { apiClient } from '../../services/api';
import type { Expert } from '../../types';

export function ExpertListScreen({ navigation }: any) {
  const [experts, setExperts] = useState<Expert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(0);

  useEffect(() => {
    loadExperts();
  }, []);

  const loadExperts = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.getExperts(0, 20);
      setExperts(data);
    } catch (error) {
      console.error('Failed to load experts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    try {
      const data = await apiClient.getExperts(0, 20);
      setExperts(data);
    } finally {
      setIsRefreshing(false);
    }
  };

  const filteredExperts = experts.filter((e) =>
    e.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const renderExpert = ({ item }: { item: Expert }) => (
    <TouchableOpacity
      style={styles.expertCard}
      onPress={() => navigation.navigate('ExpertDetail', { expertId: item.id })}
    >
      <View>
        <Text style={styles.expertName}>{item.name}</Text>
        <Text style={styles.expertDesc} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.expertMeta}>
          <Text style={styles.rating}>⭐ {item.rating?.toFixed(1) || 'N/A'}</Text>
          <Text style={styles.version}>{item.version}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search experts..."
        value={searchText}
        onChangeText={setSearchText}
      />
      <FlatList
        data={filteredExperts}
        renderItem={renderExpert}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No experts found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  searchInput: {
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    fontSize: 14,
  },
  list: { padding: 16, gap: 12 },
  expertCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#eee',
  },
  expertName: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  expertDesc: { fontSize: 13, color: '#666', marginBottom: 8 },
  expertMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  rating: { fontSize: 12, fontWeight: '600' },
  version: { fontSize: 12, color: '#999' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 40 },
  emptyText: { fontSize: 16, color: '#999' },
});
