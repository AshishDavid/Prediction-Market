import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { auth, db, authState } from '../lib/firebase';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updateProfile,
    signOut
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import BackgroundLayout from '../components/BackgroundLayout';
import GradientButton from '../components/GradientButton';
import { Colors, Radius } from '../constants/theme';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const router = useRouter();

    const [errorMsg, setErrorMsg] = useState('');

    async function handleAuth() {
        setErrorMsg('');

        if (!email || !password) {
            setErrorMsg('Please enter both email and password.');
            return;
        }

        if (isSignUp) {
            if (password.length < 8) {
                setErrorMsg('Password must be at least 8 characters long.');
                return;
            }

            const disposableDomains = [
                'mailinator.com', 'temp-mail.org', 'guerrillamail.com',
                '10minutemail.com', 'trashmail.com', 'sharklasers.com',
                'getnada.com', 'dispostable.com', 'yopmail.com'
            ];
            const domain = email.split('@')[1]?.toLowerCase();
            if (disposableDomains.includes(domain)) {
                setErrorMsg('Disposable emails are not allowed.');
                return;
            }

            if (!username.trim()) {
                setErrorMsg('Please enter a username.');
                return;
            }

            // Check for unique username
            setLoading(true);
            try {
                const profilesRef = collection(db, 'profiles');
                const q = query(profilesRef, where('username', '==', username.trim()));
                const snapshot = await getDocs(q);

                if (!snapshot.empty) {
                    setLoading(false);
                    setErrorMsg('Username is already taken. Please choose another.');
                    return;
                }
            } catch (e) {
                console.error('Username check failed:', e);
                setLoading(false);
                setErrorMsg('Failed to validate username. Please try again.');
                return;
            }
        }

        setLoading(true);
        if (isSignUp) authState.isSigningUp = true;

        try {
            if (isSignUp) {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                // Set Display Name
                await updateProfile(user, { displayName: username });
                await ensureProfile(user, username);
                await signOut(auth);

                // Flag reset after sign out
                authState.isSigningUp = false;

                Alert.alert('Success', 'Account created successfully! Please sign in.');
                setIsSignUp(false);
            } else {
                await signInWithEmailAndPassword(auth, email, password);
                // Firebase automatically updates auth state
            }
        } catch (error) {
            console.error('[Auth] Error:', error.code, error.message);

            let msg = error.message;
            if (error.code === 'auth/email-already-in-use') {
                msg = 'Email address already in use.';
            } else if (error.code === 'auth/invalid-email') {
                msg = 'Invalid email address.';
            } else if (error.code === 'auth/weak-password') {
                msg = 'Password is too weak.';
            } else if (error.code === 'auth/invalid-credential') {
                msg = 'Invalid email or password.';
            }

            setErrorMsg(msg);
            Alert.alert('Error', msg);
            // Ensure flag is reset on error
            if (isSignUp) authState.isSigningUp = false;
        } finally {
            setLoading(false);
        }
    }

    async function ensureProfile(user, manualUsername) {
        try {
            const userRef = doc(db, 'profiles', user.uid);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                await setDoc(userRef, {
                    username: manualUsername || user.displayName || email.split('@')[0],
                    reputation: 1000,
                    is_admin: user.email === 'davidashishx@gmail.com',
                    created_at: new Date().toISOString()
                });
            }
        } catch (e) {
            console.error('[Profile] Firestore error:', e);
        }
    }

    return (
        <BackgroundLayout>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.responsiveContent}>
                        {/* Logo or Icon */}
                        <View style={styles.iconContainer}>
                            <View style={styles.iconCircle}>
                                <Ionicons name="pulse" size={60} color={Colors.dark.accent} />
                            </View>
                        </View>

                        <Text style={styles.header}>
                            {isSignUp ? 'Join Pulse' : 'Welcome Back'}
                        </Text>

                        <Text style={styles.subHeader}>
                            {isSignUp ? 'Start predicting today.' : 'Sign in to manage your portfolio.'}
                        </Text>

                        <View style={styles.form}>
                            {isSignUp && (
                                <View style={styles.inputContainer}>
                                    <Text style={styles.label}>USERNAME</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={username}
                                        onChangeText={setUsername}
                                        autoCapitalize="none"
                                        placeholder="Trader123"
                                        placeholderTextColor="rgba(255,255,255,0.4)"
                                    />
                                </View>
                            )}

                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>EMAIL</Text>
                                <TextInput
                                    style={styles.input}
                                    value={email}
                                    onChangeText={setEmail}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    placeholder="name@example.com"
                                    placeholderTextColor="rgba(255,255,255,0.4)"
                                />
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>PASSWORD</Text>
                                <TextInput
                                    style={styles.input}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry
                                    placeholder="Minimum 8 characters"
                                    placeholderTextColor="rgba(255,255,255,0.4)"
                                />
                            </View>

                            {errorMsg ? (
                                <View style={styles.errorBox}>
                                    <Ionicons name="alert-circle" size={16} color="#FB7185" />
                                    <Text style={styles.errorText}>{errorMsg}</Text>
                                </View>
                            ) : null}

                            <GradientButton
                                title={isSignUp ? 'Create Account' : 'Log In'}
                                onPress={handleAuth}
                                loading={loading}
                                style={styles.primaryBtn}
                            />

                            <TouchableOpacity
                                style={styles.secondaryBtn}
                                onPress={() => {
                                    setIsSignUp(!isSignUp);
                                    setErrorMsg('');
                                }}
                            >
                                <Text style={styles.secondaryBtnText}>
                                    {isSignUp ? 'Already have an account? Log in' : 'New here? Create an account'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </BackgroundLayout>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingVertical: 40,
        paddingHorizontal: 20,
    },
    responsiveContent: {
        width: '100%',
        maxWidth: 400,
        alignSelf: 'center',
        padding: 32,
        borderRadius: Radius.xl,
        backgroundColor: Colors.dark.surface,
        borderWidth: 1,
        borderColor: Colors.dark.border,
        borderTopColor: Colors.dark.surfaceHighlight,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.4,
        shadowRadius: 32,
        elevation: 10,
    },
    iconContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    iconCircle: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: 'rgba(94, 234, 212, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(94, 234, 212, 0.25)',
        shadowColor: Colors.dark.glowTeal,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 24,
        elevation: 8,
    },
    header: {
        fontSize: 32,
        fontFamily: 'Inter_900Black',
        color: '#ffffff',
        textAlign: 'center',
        marginBottom: 8,
        letterSpacing: -1,
    },
    subHeader: {
        fontSize: 16,
        fontFamily: 'Inter_400Regular',
        color: 'rgba(255, 255, 255, 0.6)',
        textAlign: 'center',
        marginBottom: 32,
    },
    form: {
        width: '100%',
    },
    inputContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 12,
        fontFamily: 'Inter_700Bold',
        color: Colors.dark.accent,
        marginBottom: 8,
        marginLeft: 4,
        letterSpacing: 1,
    },
    input: {
        fontSize: 16,
        fontFamily: 'Inter_600SemiBold',
        backgroundColor: 'rgba(0, 0, 0, 0.25)',
        borderRadius: Radius.md,
        paddingVertical: 14,
        paddingHorizontal: 16,
        color: '#ffffff',
        borderWidth: 1,
        borderColor: Colors.dark.border,
    },
    primaryBtn: {
        marginTop: 10,
    },
    secondaryBtn: {
        marginTop: 20,
        alignItems: 'center',
        padding: 10,
    },
    secondaryBtnText: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontFamily: 'Inter_600SemiBold',
        fontSize: 14,
    },
    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 82, 82, 0.1)',
        padding: 12,
        borderRadius: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 82, 82, 0.3)',
        gap: 8,
    },
    errorText: {
        color: '#FB7185',
        fontFamily: 'Inter_600SemiBold',
        fontSize: 14,
        flex: 1,
    }
});
