import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Text,
  ActivityIndicator,
} from 'react-native';
import { apiClient } from '../../services/api';

export function SearchScreen(): any {
  const [searchText, setSearchText] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!searchText.trim()) return;

    try {
      setIsLoading(true);
      setHasSearched(true);
      const data = await apiClient.searchChats(searchText);
      setResults(data);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderResult = ({ item }: any) => (
    <View style={styles.resultCard}>
      <Text style={styles.resultTitle}>{item.title}</Text>
      <Text style={styles.resultSnippet} numberOfLines={2}>
        {item.snippet}
      </Text>
      <Text style={styles.resultScore}>Relevance: {(item.relevance_score * 100).toFixed(0)}%</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search chats, experts, topics..."
          value={searchText}
          onChangeText={setSearchText}
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch} disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.searchButtonText}>🔍</Text>
          )}
        </TouchableOpacity>
      </View>

      {hasSearched && (
        <FlatList
          data={results}
          renderItem={renderResult}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.resultsList}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No results found</Text>
            </View>
          }
        />
      )}

      {!hasSearched && (
        <View style={styles.emptyContainer}>
          <Text style={styles.placeholderText}>Search your chats and experts</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  searchContainer: { flexDirection: 'row', padding: 12, gap: 8 },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  searchButton: { backgroundColor: '#007AFF', paddingHorizontal: 12, borderRadius: 8, justifyContent: 'center' },
  searchButtonText: { fontSize: 18 },
  resultsList: { padding: 12, gap: 12 },
  resultCard: { backgroundColor: '#f9f9f9', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#eee' },
  resultTitle: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  resultSnippet: { fontSize: 12, color: '#666', marginBottom: 8 },
  resultScore: { fontSize: 11, color: '#999' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#999' },
  placeholderText: { fontSize: 16, color: '#ccc' },
});
