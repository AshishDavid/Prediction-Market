import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
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

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const router = useRouter();

    const [errorMsg, setErrorMsg] = useState('');

    async function handleAuth() {
        // console.log('[Auth] Button pressed. mode:', isSignUp ? 'SignUp' : 'SignIn', 'email:', email);
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

            // NEW: Check for unique username
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
                // console.log('[Auth] Calling Firebase signUp...');
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                // Set Display Name
                await updateProfile(user, { displayName: username });

                // console.log('[Auth] signUp Success. User:', user.uid);
                await ensureProfile(user, username);

                await signOut(auth);
                // Flag reset after sign out to allow future redirects
                authState.isSigningUp = false;

                Alert.alert('Success', 'Account created successfully! Please sign in.');
                setIsSignUp(false);
            } else {
                // console.log('[Auth] Calling Firebase signIn...');
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
            // console.log('[Profile] Ensuring profile for:', user.uid);
            const userRef = doc(db, 'profiles', user.uid);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                console.log('[Profile] Creating new Firestore profile...');
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
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.responsiveContent}>
                    {/* Logo or Icon */}
                    <View style={styles.iconContainer}>
                        <Ionicons name="trending-up" size={64} color="#00C853" />
                    </View>

                    <Text style={styles.header}>
                        {isSignUp ? 'Create your account' : 'Welcome to Markets'}
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
                                    placeholderTextColor="#ccc"
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
                                placeholderTextColor="#ccc"
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
                                placeholderTextColor="#ccc"
                            />
                        </View>

                        {errorMsg ? (
                            <Text style={styles.errorText}>{errorMsg}</Text>
                        ) : null}

                        <TouchableOpacity
                            style={[styles.primaryBtn, loading && styles.btnDisabled]}
                            onPress={handleAuth}
                            disabled={loading}
                        >
                            <Text style={styles.primaryBtnText}>
                                {loading ? 'Please wait...' : isSignUp ? 'Sign Up' : 'Log In'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.secondaryBtn}
                            onPress={() => setIsSignUp(!isSignUp)}
                        >
                            <Text style={styles.secondaryBtnText}>
                                {isSignUp ? 'Already have an account? Log in' : 'New here? Create an account'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingVertical: 40,
    },
    responsiveContent: {
        width: '100%',
        maxWidth: 450,
        alignSelf: 'center',
        paddingHorizontal: 30,
    },
    iconContainer: {
        alignItems: 'center',
        marginBottom: 30,
    },
    header: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
        marginBottom: 8,
    },
    subHeader: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 40,
    },
    form: {
        width: '100%',
    },
    inputContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#999',
        marginBottom: 8,
        letterSpacing: 1,
    },
    input: {
        fontSize: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        paddingVertical: 8,
        color: '#333',
    },
    primaryBtn: {
        backgroundColor: '#00C853',
        borderRadius: 30,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 20,
        elevation: 2,
        shadowColor: '#00C853',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
    },
    btnDisabled: {
        opacity: 0.7,
    },
    primaryBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    secondaryBtn: {
        marginTop: 20,
        alignItems: 'center',
        padding: 10,
    },
    secondaryBtnText: {
        color: '#00C853',
        fontWeight: '600',
    },
    errorText: {
        color: '#D50000',
        textAlign: 'center',
        marginBottom: 10,
        fontWeight: '600',
        fontSize: 14,
    }
});
