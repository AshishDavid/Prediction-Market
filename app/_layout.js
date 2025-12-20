import { Stack, useRouter, useSegments } from 'expo-router';
import { TouchableOpacity, Text, StyleSheet, View, ActivityIndicator } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { auth, authState } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold, Inter_900Black } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

export default function Layout() {
    const [user, setUser] = useState(null);
    const [initialized, setInitialized] = useState(false);
    const segments = useSegments();
    const router = useRouter();

    const [fontsLoaded] = useFonts({
        Inter_400Regular,
        Inter_600SemiBold,
        Inter_700Bold,
        Inter_900Black,
    });

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            console.log('[Layout] Auth State Change:', firebaseUser ? firebaseUser.uid : 'No User');
            setUser(firebaseUser);
            if (!initialized) setInitialized(true);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (fontsLoaded && initialized) {
            SplashScreen.hideAsync();
        }
    }, [fontsLoaded, initialized]);

    useEffect(() => {
        if (!initialized) return;

        const inAuthGroup = segments[0] === '(tabs)';
        const inLogin = segments[0] === 'login';
        const inLanding = segments.length === 0 || segments[0] === 'index';

        console.log(`[Layout] User: ${user?.uid}, Segments: ${JSON.stringify(segments)}, InAuth: ${inAuthGroup}, InLanding: ${inLanding}`);

        if (!user) {
            // If logged out and trying to access protected routes, redirect to Landing
            if (inAuthGroup) {
                console.log('[Layout] Not authenticated, redirecting to Landing');
                router.replace('/');
            }
            // If logged out and on an unknown route (not login, not landing), redirect to Landing
            else if (!inLogin && !inLanding) {
                router.replace('/');
            }
        } else {
            // If logged in and on public routes (Login or Landing), redirect to Dashboard
            if (inLogin || inLanding) {
                // Only redirect to Tabs if we are NOT in the middle of a signup flow
                // AND double check auth.currentUser to avoid stale state redirects after logout
                if (!authState.isSigningUp && auth.currentUser) {
                    console.log('[Layout] Authenticated on public route, redirecting to Dashboard');
                    router.replace('/(tabs)');
                }
            }
        }
    }, [user, initialized, segments]);

    if (!initialized || !fontsLoaded) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#141E30' }}>
                <ActivityIndicator size="large" color="#69F0AE" />
            </View>
        );
    }

    return (
        <Stack
            screenOptions={{
                headerStyle: {
                    backgroundColor: '#141E30',
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                    fontFamily: 'Inter_700Bold',
                },
                headerShadowVisible: false,
                contentStyle: { backgroundColor: '#141E30' }
            }}
        >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="market/[id]" options={{ title: '', headerBackTitle: 'Back' }} />
            <Stack.Screen name="user/[id]" options={{ title: '', headerBackTitle: 'Back', headerTransparent: true }} />
            <Stack.Screen name="login" options={{ title: 'Login', headerShown: false }} />
        </Stack>
    );
}
