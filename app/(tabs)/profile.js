```
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Button, Alert } from 'react-native';
import { auth, db } from '../../lib/firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs, deleteDoc, runTransaction, increment } from 'firebase/firestore';
import { getRankName, RANKS } from '../../utils/reputation';
import { useRouter } from 'expo-router';
import { ScrollView, TouchableOpacity, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BackgroundLayout from '../../components/BackgroundLayout';

export default function Profile() {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [rankModalVisible, setRankModalVisible] = useState(false);
    const router = useRouter();

    useEffect(() => {
        fetchProfile();
    }, []);

    async function fetchProfile() {
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) {
                router.replace('/login');
                return;
            }

            const profileRef = doc(db, 'profiles', currentUser.uid);
            const profileSnap = await getDoc(profileRef);

            if (profileSnap.exists()) {
                setProfile(profileSnap.data());
            }
        } catch (error) {
            console.error('[Profile] Error:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleLogout() {
        await auth.signOut();
        router.replace('/');
    }

    async function handlePruneGhosts() {
        if (!profile?.is_admin) return;
        setLoading(true);
        try {
            console.log('Starting Prune...');
            // 1. Get All Profiles
            const profilesSnap = await getDocs(collection(db, 'profiles'));
            const userIds = new Set(profilesSnap.docs.map(d => d.id));

            // 2. Get All Predictions
            const predsSnap = await getDocs(collection(db, 'predictions'));
            const orphans = [];
            predsSnap.forEach(doc => {
                 if (!userIds.has(doc.data().user_id)) orphans.push(doc);
            });

            console.log(`Found ${ orphans.length } orphans.`);

            if (orphans.length === 0) {
                Alert.alert('Clean', 'No ghost votes found.');
                setLoading(false);
                return;
            }

            // 3. Delete & Update Counters
            for (const orphan of orphans) {
                const data = orphan.data();
                await runTransaction(db, async (transaction) => {
                    // Delete Prediction
                    transaction.delete(orphan.ref);

                    // Update Market
                    if (data.market_id) {
                        const marketRef = doc(db, 'markets', data.market_id);
                        const fieldToDecrement = data.vote === 'YES' ? 'yes_votes' : 'no_votes';
                        transaction.update(marketRef, {
                            [fieldToDecrement]: increment(-1),
                            vote_count: increment(-1)
                        });
                    }
                });
            }

            Alert.alert('Success', `Deleted ${ orphans.length } ghost votes and updated markets.`);

        } catch (e) {
            console.error('Prune failed:', e);
            Alert.alert('Error', e.message);
        } finally {
            setLoading(false);
        }
    }

    if (loading) return <BackgroundLayout style={styles.center}><ActivityIndicator color="#69F0AE" /></BackgroundLayout>;
    if (!profile) {
        return (
            <BackgroundLayout style={[styles.center, { padding: 20 }]}>
                <Ionicons name="alert-circle-outline" size={60} color="#FF5252" />
                <Text style={[styles.username, { marginTop: 20, textAlign: 'center' }]}>Profile Not Found</Text>
                <Text style={{ color: '#fff', textAlign: 'center', marginBottom: 20, opacity: 0.7 }}>
                    Your account data might have been deleted. Please log out and sign up again.
                </Text>
                <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                    <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>
            </BackgroundLayout>
        );
    }

    return (
        <BackgroundLayout>
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.scrollContent}
            >
                <View style={styles.responsiveContent}>
                    <View style={styles.header}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{profile.username ? profile.username[0].toUpperCase() : '?'}</Text>
                        </View>
                        <Text style={styles.username}>@{profile.username}</Text>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{getRankName(profile.reputation)}</Text>
                        </View>
                        <Text style={styles.reputationScore}>{Math.round(profile.reputation)}</Text>
                        <Text style={styles.reputationLabel}>Reputation Score</Text>

                        <TouchableOpacity
                            style={styles.rankGuideBtn}
                            onPress={() => setRankModalVisible(true)}
                        >
                            <Ionicons name="list-outline" size={16} color="rgba(255,255,255,0.6)" />
                            <Text style={styles.rankGuideText}>View Rank Progression</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.stats}>
                        {/* Placeholder for future growth */}
                    </View>

                    <TouchableOpacity
                        style={styles.logoutBtn}
                        onPress={handleLogout}
                    >
                        <Text style={styles.logoutBtnText}>Logout</Text>
                    </TouchableOpacity>

                    {profile.is_admin && (
                        <View style={styles.adminSection}>
                            <Text style={styles.sectionTitle}>Admin Tools</Text>
                            <TouchableOpacity onPress={handlePruneGhosts} style={styles.adminButton}>
                                <Ionicons name="bug-outline" size={20} color="#fff" />
                                <Text style={styles.adminBtnText}>Prune Ghost Votes</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                <Modal
                    visible={rankModalVisible}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setRankModalVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Rank Progression</Text>
                                <TouchableOpacity onPress={() => setRankModalVisible(false)}>
                                    <Ionicons name="close" size={24} color="#fff" />
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.modalSubtext}>Earn points to climb the ranks!</Text>

                            <FlatList
                                data={RANKS}
                                keyExtractor={(item) => item}
                                showsVerticalScrollIndicator={false}
                                renderItem={({ item, index }) => {
                                    const minScore = 1000 + (index * 25);
                                    const isCurrent = getRankName(profile.reputation) === item;
                                    return (
                                        <View style={[styles.rankRow, isCurrent && styles.activeRankRow]}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                                <Text style={[styles.rankIndex, isCurrent && { color: '#69F0AE' }]}>#{index + 1}</Text>
                                                <Text style={[styles.rankName, isCurrent && { color: '#fff', fontSize: 16 }]}>{item}</Text>
                                            </View>
                                            <Text style={[styles.rankPoints, isCurrent && { color: '#69F0AE' }]}>{minScore}+ pts</Text>
                                        </View>
                                    );
                                }}
                            />
                        </View>
                    </View>
                </Modal>
            </ScrollView>
        </BackgroundLayout>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    scrollContent: {
        padding: 20,
    },
    responsiveContent: {
        width: '100%',
        maxWidth: 600,
        alignSelf: 'center',
        alignItems: 'center',
    },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        alignItems: 'center',
        marginBottom: 40,
        marginTop: 40,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 2,
        borderColor: '#69F0AE',
    },
    avatarText: {
        color: '#fff',
        fontSize: 40,
        fontFamily: 'Inter_700Bold',
    },
    username: {
        fontSize: 24,
        fontFamily: 'Inter_700Bold',
        marginBottom: 12,
        color: '#fff',
    },
    badge: {
        backgroundColor: 'rgba(105, 240, 174, 0.1)',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(105, 240, 174, 0.3)',
    },
    badgeText: {
        color: '#69F0AE',
        fontFamily: 'Inter_700Bold',
        fontSize: 14,
    },
    reputationScore: {
        fontSize: 48,
        fontFamily: 'Inter_900Black',
        color: '#fff',
    },
    reputationLabel: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
    },
    logoutBtn: {
        marginTop: 40,
        backgroundColor: 'rgba(255, 82, 82, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255, 82, 82, 0.5)',
        paddingVertical: 16,
        paddingHorizontal: 60,
        borderRadius: 30,
    },
    logoutBtnText: {
        color: '#FF5252',
        fontFamily: 'Inter_700Bold',
        fontSize: 16,
    },
    logoutButton: { // This style is for the "Profile Not Found" screen
        marginTop: 20,
        backgroundColor: 'rgba(255, 82, 82, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255, 82, 82, 0.5)',
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 25,
    },
    logoutText: { // This style is for the "Profile Not Found" screen
        color: '#FF5252',
        fontWeight: 'bold',
        fontSize: 16,
    },
    adminSection: {
        marginTop: 40,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
        width: '100%',
        alignItems: 'center',
    },
    sectionTitle: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 16,
        fontFamily: 'Inter_700Bold',
        marginBottom: 15,
    },
    adminButton: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 171, 0, 0.2)',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        borderWidth: 1,
        borderColor: '#FFAB00',
        width: '80%',
        maxWidth: 300,
    },
    adminBtnText: {
        color: '#FFAB00',
        fontWeight: 'bold',
        fontSize: 16,
        fontFamily: 'Inter_700Bold',
    },
    rankGuideBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 16,
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 20,
        gap: 8
    },
    rankGuideText: {
        color: 'rgba(255,255,255,0.6)',
        fontFamily: 'Inter_600SemiBold',
        fontSize: 12
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '90%',
        maxWidth: 500,
        height: '70%',
        backgroundColor: '#1E2A38',
        borderRadius: 20,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    modalTitle: {
        fontSize: 20,
        fontFamily: 'Inter_700Bold',
        color: '#fff',
    },
    modalSubtext: {
        color: 'rgba(255,255,255,0.5)',
        fontFamily: 'Inter_400Regular',
        fontSize: 14,
        marginBottom: 20,
    },
    rankRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    activeRankRow: {
        backgroundColor: 'rgba(105, 240, 174, 0.1)',
        marginHorizontal: -10,
        paddingHorizontal: 10,
        borderRadius: 8,
        borderBottomWidth: 0,
    },
    rankIndex: {
        color: 'rgba(255,255,255,0.3)',
        fontSize: 12,
        fontFamily: 'Inter_600SemiBold',
        width: 30
    },
    rankName: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
        fontFamily: 'Inter_600SemiBold',
    },
    rankPoints: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 12,
        fontFamily: 'Inter_400Regular',
    },
    rulesBox: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: 12,
        borderRadius: 12,
        marginBottom: 20,
    },
    ruleText: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
        marginBottom: 4,
    }
});
