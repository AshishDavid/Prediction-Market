import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons'; // Built-in with Expo
import { BottomTabBar } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { Colors } from '../../constants/theme';

const DESKTOP_BREAKPOINT = 1024;
const SIDEBAR_WIDTH = 240;

const NAV_ITEMS = [
    { name: 'index', label: 'Home', icon: 'home-outline', iconActive: 'home' },
    { name: 'markets', label: 'Markets', icon: 'stats-chart-outline', iconActive: 'stats-chart' },
    { name: 'leaderboard', label: 'Rankings', icon: 'trophy-outline', iconActive: 'trophy' },
    { name: 'profile', label: 'Profile', icon: 'person-outline', iconActive: 'person' },
];

// Desktop-width navigation: a persistent left sidebar instead of a bottom bar.
function Sidebar({ state, navigation }) {
    return (
        <View style={styles.sidebar}>
            <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={styles.brand}>
                <Ionicons name="pulse" size={26} color={Colors.dark.accent} />
                <Text style={styles.brandText}>Pulse</Text>
            </View>

            <View style={styles.sidebarNav}>
                {state.routes.map((route, index) => {
                    const item = NAV_ITEMS.find((n) => n.name === route.name);
                    if (!item) return null;
                    const isFocused = state.index === index;

                    const onPress = () => {
                        const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                        if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
                    };

                    return (
                        <Pressable
                            key={route.key}
                            onPress={onPress}
                            style={({ hovered, pressed }) => [
                                styles.sidebarItem,
                                isFocused && styles.sidebarItemActive,
                                !isFocused && (hovered || pressed) && styles.sidebarItemHover,
                            ]}
                        >
                            <Ionicons
                                name={isFocused ? item.iconActive : item.icon}
                                size={20}
                                color={isFocused ? Colors.dark.accent : Colors.dark.tabIconDefault}
                            />
                            <Text style={[styles.sidebarLabel, isFocused && styles.sidebarLabelActive]}>
                                {item.label}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}

function GlassBackground() {
    return <BlurView intensity={45} tint="dark" style={[StyleSheet.absoluteFill, styles.glassOverlay]} />;
}

export default function TabLayout() {
    const { width } = useWindowDimensions();
    const isDesktop = width >= DESKTOP_BREAKPOINT;

    return (
        <Tabs
            tabBar={(props) => (isDesktop ? <Sidebar {...props} /> : <BottomTabBar {...props} />)}
            screenOptions={{
                headerShown: true,
                headerTransparent: true,
                headerBackground: GlassBackground,
                tabBarActiveTintColor: Colors.dark.accent,
                tabBarInactiveTintColor: Colors.dark.tabIconDefault,
                tabBarStyle: {
                    borderTopWidth: 0,
                    elevation: 0,
                    paddingTop: 8,
                    backgroundColor: 'transparent',
                    minHeight: 60, // Ensure it's not too small on desktop
                },
                tabBarBackground: GlassBackground,
                tabBarLabelStyle: {
                    fontFamily: 'Inter_600SemiBold',
                    fontSize: 11,
                },
                headerTitleStyle: {
                    fontFamily: 'Inter_700Bold',
                    fontSize: 20,
                    color: '#fff',
                },
                sceneStyle: isDesktop ? { marginLeft: SIDEBAR_WIDTH } : undefined,
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

const styles = StyleSheet.create({
    sidebar: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: SIDEBAR_WIDTH,
        borderRightWidth: 1,
        borderRightColor: Colors.dark.border,
        paddingTop: 32,
        paddingHorizontal: 16,
        overflow: 'hidden',
        backgroundColor: 'rgba(6,7,13,0.6)',
    },
    glassOverlay: {
        backgroundColor: 'rgba(6,7,13,0.55)',
        borderTopWidth: 1,
        borderTopColor: Colors.dark.border,
    },
    brand: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 12,
        marginBottom: 32,
    },
    brandText: {
        color: '#fff',
        fontSize: 20,
        fontFamily: 'Inter_700Bold',
        letterSpacing: -0.5,
    },
    sidebarNav: {
        gap: 4,
    },
    sidebarItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 12,
    },
    sidebarItemHover: {
        backgroundColor: Colors.dark.surface,
    },
    sidebarItemActive: {
        backgroundColor: Colors.dark.surfaceElevated,
    },
    sidebarLabel: {
        color: Colors.dark.textSecondary,
        fontSize: 15,
        fontFamily: 'Inter_600SemiBold',
    },
    sidebarLabelActive: {
        color: '#fff',
    },
});
