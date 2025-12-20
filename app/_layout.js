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

        const inLogin = segments[0] === 'login';

        if (!user && !inLogin) {
            router.replace('/login');
        } else if (user && inLogin) {
            // Only redirect to Tabs if we are NOT in the middle of a signup flow
            if (!authState.isSigningUp) {
                router.replace('/(tabs)');
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
