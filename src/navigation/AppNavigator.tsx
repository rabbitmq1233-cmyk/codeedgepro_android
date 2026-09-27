import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, HEADER_STYLE } from '../config/theme';
import type {
  AppTabParamList,
  ExpertsStackParamList,
  ProjectsStackParamList,
  ProfileStackParamList,
} from '../types';

// Screens
import { ExpertListScreen } from '../screens/app/ExpertListScreen';
import { ExpertDetailScreen } from '../screens/app/ExpertDetailScreen';
import { ProjectListScreen } from '../screens/app/ProjectListScreen';
import { CreateProjectScreen } from '../screens/app/CreateProjectScreen';
import { ChatListScreen } from '../screens/app/ChatListScreen';
import { CreateChatScreen } from '../screens/app/CreateChatScreen';
import { ChatDetailScreen } from '../screens/app/ChatDetailScreen';
import { ManageExpertsScreen } from '../screens/app/ManageExpertsScreen';
import { ProfileScreen } from '../screens/app/ProfileScreen';
import { SearchScreen } from '../screens/app/SearchScreen';
import { SettingsScreen } from '../screens/app/SettingsScreen';

const ExpertsStack = createNativeStackNavigator<ExpertsStackParamList>();
const ProjectsStack = createNativeStackNavigator<ProjectsStackParamList>();
const ProfileStackNav = createNativeStackNavigator<ProfileStackParamList>();
const Tab = createBottomTabNavigator<AppTabParamList>();

function ExpertsStackScreen() {
  return (
    <ExpertsStack.Navigator screenOptions={HEADER_STYLE}>
      <ExpertsStack.Screen
        name="ExpertList"
        component={ExpertListScreen}
        options={{ title: 'Experts' }}
      />
      <ExpertsStack.Screen
        name="ExpertDetail"
        component={ExpertDetailScreen}
        options={{ title: 'Expert Details' }}
      />
    </ExpertsStack.Navigator>
  );
}

function ProjectsStackScreen() {
  return (
    <ProjectsStack.Navigator screenOptions={HEADER_STYLE}>
      <ProjectsStack.Screen
        name="ProjectList"
        component={ProjectListScreen}
        options={{ title: 'Projects' }}
      />
      <ProjectsStack.Screen
        name="CreateProject"
        component={CreateProjectScreen}
        options={{ title: 'New Project', presentation: 'modal' }}
      />
      <ProjectsStack.Screen
        name="ChatList"
        component={ChatListScreen}
        options={({ route }) => ({ title: route.params?.projectName || 'Chats' })}
      />
      <ProjectsStack.Screen
        name="CreateChat"
        component={CreateChatScreen}
        options={{ title: 'New Chat', presentation: 'modal' }}
      />
      <ProjectsStack.Screen
        name="ChatDetail"
        component={ChatDetailScreen}
        options={({ route }) => ({ title: route.params?.chatTitle || 'Chat' })}
      />
      <ProjectsStack.Screen
        name="ManageExperts"
        component={ManageExpertsScreen}
        options={{ title: 'Manage Experts' }}
      />
    </ProjectsStack.Navigator>
  );
}

function ProfileStackScreen() {
  return (
    <ProfileStackNav.Navigator screenOptions={HEADER_STYLE}>
      <ProfileStackNav.Screen
        name="ProfileScreen"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
      <ProfileStackNav.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </ProfileStackNav.Navigator>
  );
}

export function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'ExpertsTab') {
            iconName = focused ? 'bulb' : 'bulb-outline';
          } else if (route.name === 'ProjectsTab') {
            iconName = focused ? 'folder' : 'folder-outline';
          } else if (route.name === 'SearchTab') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'ProfileTab') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'ellipse';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.tabActive,
        tabBarInactiveTintColor: COLORS.tabInactive,
        tabBarStyle: {
          borderTopColor: COLORS.borderLight,
        },
      })}
    >
      <Tab.Screen
        name="ExpertsTab"
        component={ExpertsStackScreen}
        options={{ title: 'Experts' }}
      />
      <Tab.Screen
        name="ProjectsTab"
        component={ProjectsStackScreen}
        options={{ title: 'Projects' }}
      />
      <Tab.Screen
        name="SearchTab"
        component={SearchScreen}
        options={{
          title: 'Search',
          headerShown: true,
          ...HEADER_STYLE,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackScreen}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
}
