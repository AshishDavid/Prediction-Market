import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons'; // Built-in with Expo

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: true,
                tabBarActiveTintColor: '#69F0AE',
                tabBarInactiveTintColor: '#B0BEC5',
                borderTopWidth: 0,
                elevation: 0,
                // height: 60, // Removed to allow auto-sizing for safe areas
                paddingTop: 8,
                // paddingBottom: 8, // Let safe area handle bottom padding
                backgroundColor: '#141E30',
                minHeight: 60, // Ensure it's not too small on desktop
                headerStyle: {
                    backgroundColor: '#141E30',
                    elevation: 0,
                    shadowOpacity: 0,
                    borderBottomWidth: 0,
                },
                headerTitleStyle: {
                    fontFamily: 'Inter_700Bold',
                    fontSize: 20,
                    color: '#fff',
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    headerShown: false,
                    tabBarLabel: 'Home',
                    tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="markets"
                options={{
                    title: 'Markets',
                    tabBarLabel: 'Markets',
                    tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart-outline" size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="leaderboard"
                options={{
                    title: 'Rankings',
                    tabBarLabel: 'Rank',
                    tabBarIcon: ({ color, size }) => <Ionicons name="trophy-outline" size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarLabel: 'Profile',
                    tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
                }}
            />
        </Tabs>
    );
}
