// ============================================================
// CodeEdgePro - App Constants
// ============================================================

export const APP_CONFIG = {
  name: 'CodeEdgePro',
  version: '1.0.0',
  tagline: 'Expert Knowledge at Your Fingertips',
} as const;

export const API_CONFIG = {
  baseUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080/api/v1',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
} as const;

export const PAGINATION = {
  defaultPage: 0,
  defaultLimit: 20,
  messagesLimit: 50,
} as const;

export const SECURE_STORE_KEYS = {
  accessToken: 'accessToken',
  refreshToken: 'refreshToken',
  userProfile: 'userProfile',
} as const;

export const SCREEN_NAMES = {
  // Auth
  Login: 'Login',
  Register: 'Register',

  // App Tabs
  ExpertsTab: 'ExpertsTab',
  ProjectsTab: 'ProjectsTab',
  SearchTab: 'SearchTab',
  ProfileTab: 'ProfileTab',

  // Experts Stack
  ExpertList: 'ExpertList',
  ExpertDetail: 'ExpertDetail',

  // Projects Stack
  ProjectList: 'ProjectList',
  CreateProject: 'CreateProject',
  ChatList: 'ChatList',
  CreateChat: 'CreateChat',
  ChatDetail: 'ChatDetail',

  // Profile Stack
  ProfileScreen: 'ProfileScreen',
  Settings: 'Settings',
} as const;
