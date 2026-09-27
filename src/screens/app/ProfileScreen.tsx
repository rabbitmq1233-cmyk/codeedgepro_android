import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { apiClient } from '../../services/api';

export function ProfileScreen(): any {
  const { user, logout } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.roleContainer}>
          <Text style={styles.roleLabel}>Role:</Text>
          <Text style={styles.role}>{user?.role?.toUpperCase()}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.logoutButton, isLoading && styles.buttonDisabled]}
        onPress={handleLogout}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.logoutButtonText}>Logout</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  profileCard: { alignItems: 'center', paddingVertical: 40 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: { fontSize: 32, color: '#fff', fontWeight: 'bold' },
  name: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  email: { fontSize: 14, color: '#666', marginBottom: 16 },
  roleContainer: { flexDirection: 'row', gap: 8 },
  roleLabel: { fontSize: 14, fontWeight: '600', color: '#666' },
  role: { fontSize: 14, fontWeight: '600', color: '#007AFF' },
  logoutButton: { backgroundColor: '#e74c3c', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 40 },
  buttonDisabled: { opacity: 0.6 },
  logoutButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
