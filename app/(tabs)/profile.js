
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Button, Alert } from 'react-native';
import { auth, db } from '../../lib/firebase';
import { doc, getDoc, setDoc, collection, query, where, orderBy, getDocs, onSnapshot, deleteDoc, runTransaction, increment, writeBatch, addDoc, serverTimestamp } from 'firebase/firestore';
import { getRankName, RANKS } from '../../utils/reputation';
import { useRouter } from 'expo-router';
import { ScrollView, TouchableOpacity, Modal, FlatList, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useHeaderHeight } from '@react-navigation/elements';
import BackgroundLayout from '../../components/BackgroundLayout';
import { Colors, Radius } from '../../constants/theme';

export default function Profile() {
    const headerHeight = useHeaderHeight();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [rankModalVisible, setRankModalVisible] = useState(false);
    const router = useRouter();

    // Pending Questions (automation-drafted markets awaiting admin review)
    const [pendingModalVisible, setPendingModalVisible] = useState(false);
    const [pendingMarkets, setPendingMarkets] = useState([]);
    const [processingIds, setProcessingIds] = useState(new Set());
    const [acceptingAll, setAcceptingAll] = useState(false);

    useEffect(() => {
        fetchProfile();
    }, []);

    useEffect(() => {
        if (!profile?.is_admin) return;
        const q = query(collection(db, 'pending_markets'), orderBy('created_at', 'asc'));
        const unsub = onSnapshot(q, (snap) => {
            setPendingMarkets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }, (err) => {
            console.error('[Profile] pending_markets listener failed:', err);
        });
        return () => unsub();
    }, [profile?.is_admin]);

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
        if (Platform.OS === 'web') {
            window.location.href = '/';
        }
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

            console.log(`Found ${orphans.length} orphans.`);

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
                        const marketDoc = await transaction.get(marketRef);

                        // If market doesn't exist, we just skip updating it (already deleted?)
                        if (marketDoc.exists()) {
                            const marketData = marketDoc.data();
                            let yes = marketData.yes_votes || 0;
                            let no = marketData.no_votes || 0;

                            if (data.vote === 'YES') yes = Math.max(0, yes - 1);
                            else if (data.vote === 'NO') no = Math.max(0, no - 1);

                            const total = yes + no;
                            // Calculate new probability (Standard logic: yes / total) or keep existing if total=0 (50%)
                            const newProb = total > 0 ? (yes / total) * 100 : 50;

                            transaction.update(marketRef, {
                                yes_votes: yes,
                                no_votes: no,
                                vote_count: total,
                                probability: newProb
                            });
                        }
                    }
                });
            }

            Alert.alert('Success', `Deleted ${orphans.length} ghost votes and updated markets.`);

        } catch (e) {
            console.error('Prune failed:', e);
            Alert.alert('Error', e.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleRecalcStats() {
        if (!profile?.is_admin) return;
        setLoading(true);
        try {
            console.log('Recalculating Stats...');
            const marketsRef = collection(db, 'markets');
            const marketsSnap = await getDocs(marketsRef);

            const predsRef = collection(db, 'predictions');
            const predsSnap = await getDocs(predsRef);

            const stats = {};
            predsSnap.forEach(p => {
                const d = p.data();
                if (!stats[d.market_id]) stats[d.market_id] = { yes: 0, no: 0 };
                if (d.vote === 'YES') stats[d.market_id].yes++;
                else if (d.vote === 'NO') stats[d.market_id].no++;
            });

            const batch = writeBatch(db);
            let count = 0;

            console.log(`Processing ${marketsSnap.size} markets...`);

            // Cannot use forEach with await directly if we were doing async inside, but batch is sync prep.
            marketsSnap.docs.forEach(mDoc => {
                const mId = mDoc.id;
                const current = mDoc.data();
                const s = stats[mId] || { yes: 0, no: 0 };
                const total = s.yes + s.no;
                const prob = total > 0 ? (s.yes / total) * 100 : 50;

                if (current.yes_votes !== s.yes || current.no_votes !== s.no || current.probability !== prob) {
                    batch.update(mDoc.ref, {
                        yes_votes: s.yes,
                        no_votes: s.no,
                        vote_count: total,
                        probability: prob,
                        updated_at: new Date().toISOString()
                    });
                    count++;
                }
            });

            if (count > 0) {
                await batch.commit();
                Alert.alert('Success', `Updated stats for ${count} markets.`);
            } else {
                Alert.alert('Clean', 'All market stats are correct.');
            }

        } catch (e) {
            console.error('Recalc failed:', e);
            Alert.alert('Error', e.message);
        } finally {
            setLoading(false);
        }
    }

    // Turn an accepted draft into a real, live market — same doc shape the
    // manual "New Market" modal writes (app/(tabs)/markets.js), just sourced
    // from the pending draft instead of the form.
    async function acceptPending(item) {
        setProcessingIds(prev => new Set(prev).add(item.id));
        try {
            const closeTime = new Date(Date.now() + (item.close_time_days || 7) * 24 * 60 * 60 * 1000).toISOString();
            const base = {
                question: item.question,
                description: item.description || 'Auto-generated',
                close_time: closeTime,
                category: item.category || 'General',
                outcome: null,
                created_at: new Date().toISOString()
            };

            if (item.type === 'multi' && Array.isArray(item.options) && item.options.length >= 2) {
                const votes = {};
                item.options.forEach(o => { votes[o.id] = 0; });
                await addDoc(collection(db, 'markets'), { ...base, type: 'multi', options: item.options, votes, vote_count: 0 });
            } else {
                await addDoc(collection(db, 'markets'), base);
            }

            await deleteDoc(doc(db, 'pending_markets', item.id));
        } catch (e) {
            console.error('[Profile] Accept pending failed:', e);
            Alert.alert('Error', 'Could not accept this question.');
        } finally {
            setProcessingIds(prev => {
                const next = new Set(prev);
                next.delete(item.id);
                return next;
            });
        }
    }

    async function rejectPending(item) {
        setProcessingIds(prev => new Set(prev).add(item.id));
        try {
            await deleteDoc(doc(db, 'pending_markets', item.id));
        } catch (e) {
            console.error('[Profile] Reject pending failed:', e);
            Alert.alert('Error', 'Could not reject this question.');
        } finally {
            setProcessingIds(prev => {
                const next = new Set(prev);
                next.delete(item.id);
                return next;
            });
        }
    }

    async function acceptAllPending() {
        setAcceptingAll(true);
        try {
            for (const item of pendingMarkets) {
                await acceptPending(item);
            }
        } finally {
            setAcceptingAll(false);
        }
    }

    if (loading) return <BackgroundLayout style={styles.center}><ActivityIndicator color="#5EEAD4" /></BackgroundLayout>;
    if (!profile) {
        return (
            <BackgroundLayout style={[styles.center, { padding: 20 }]}>
                <Ionicons name="alert-circle-outline" size={60} color="#FB7185" />
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
                contentContainerStyle={[styles.scrollContent, { paddingTop: headerHeight + 20 }]}
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

                            <TouchableOpacity onPress={handleRecalcStats} style={[styles.adminButton, { marginTop: 10, backgroundColor: 'rgba(105, 240, 174, 0.2)', borderColor: '#5EEAD4' }]}>
                                <Ionicons name="refresh-outline" size={20} color="#fff" />
                                <Text style={[styles.adminBtnText, { color: '#5EEAD4' }]}>Recalculate Stats</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => setPendingModalVisible(true)}
                                style={[styles.adminButton, { marginTop: 10, backgroundColor: 'rgba(94, 234, 212, 0.15)', borderColor: '#5EEAD4' }]}
                            >
                                <Ionicons name="mail-unread-outline" size={20} color="#5EEAD4" />
                                <Text style={[styles.adminBtnText, { color: '#5EEAD4' }]}>Review Pending Questions ({pendingMarkets.length})</Text>
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
                                                <Text style={[styles.rankIndex, isCurrent && { color: '#5EEAD4' }]}>#{index + 1}</Text>
                                                <Text style={[styles.rankName, isCurrent && { color: '#fff', fontSize: 16 }]}>{item}</Text>
                                            </View>
                                            <Text style={[styles.rankPoints, isCurrent && { color: '#5EEAD4' }]}>{minScore}+ pts</Text>
                                        </View>
                                    );
                                }}
                            />
                        </View>
                    </View>
                </Modal>

                {/* Pending Questions Review Modal (admin only) */}
                <Modal
                    visible={pendingModalVisible}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setPendingModalVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Pending Questions</Text>
                                <TouchableOpacity onPress={() => setPendingModalVisible(false)}>
                                    <Ionicons name="close" size={24} color="#fff" />
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.modalSubtext}>
                                Drafted by the trending-question automation. Accept to publish as a live market, reject to discard.
                            </Text>

                            {pendingMarkets.length > 1 && (
                                <TouchableOpacity
                                    onPress={acceptAllPending}
                                    disabled={acceptingAll}
                                    style={[styles.pendingAcceptAllBtn, acceptingAll && { opacity: 0.6 }]}
                                >
                                    <Ionicons name="checkmark-done-outline" size={18} color={Colors.dark.onAccent} />
                                    <Text style={styles.pendingAcceptAllText}>
                                        {acceptingAll ? 'Accepting...' : `Accept All (${pendingMarkets.length})`}
                                    </Text>
                                </TouchableOpacity>
                            )}

                            <FlatList
                                data={pendingMarkets}
                                keyExtractor={(item) => item.id}
                                showsVerticalScrollIndicator={false}
                                ListEmptyComponent={
                                    <Text style={styles.pendingEmptyText}>No pending questions right now.</Text>
                                }
                                renderItem={({ item }) => {
                                    const isProcessing = processingIds.has(item.id) || acceptingAll;
                                    return (
                                        <View style={styles.pendingCard}>
                                            <View style={styles.pendingBadgeRow}>
                                                <View style={styles.pendingBadge}>
                                                    <Text style={styles.pendingBadgeText}>{item.category || 'General'}</Text>
                                                </View>
                                                <View style={[styles.pendingBadge, item.type === 'multi' && styles.pendingBadgeMulti]}>
                                                    <Text style={styles.pendingBadgeText}>
                                                        {item.type === 'multi' ? `${item.options?.length || 0} options` : 'Binary'}
                                                    </Text>
                                                </View>
                                            </View>
                                            <Text style={styles.pendingQuestion}>{item.question}</Text>
                                            {item.type === 'multi' && Array.isArray(item.options) && (
                                                <Text style={styles.pendingOptions}>
                                                    {item.options.map(o => o.label).join(' • ')}
                                                </Text>
                                            )}
                                            <View style={styles.pendingActions}>
                                                <TouchableOpacity
                                                    onPress={() => rejectPending(item)}
                                                    disabled={isProcessing}
                                                    style={[styles.pendingActionBtn, styles.pendingRejectBtn]}
                                                >
                                                    <Ionicons name="close" size={18} color={Colors.dark.danger} />
                                                    <Text style={[styles.pendingActionText, { color: Colors.dark.danger }]}>Reject</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    onPress={() => acceptPending(item)}
                                                    disabled={isProcessing}
                                                    style={[styles.pendingActionBtn, styles.pendingAcceptBtn]}
                                                >
                                                    <Ionicons name="checkmark" size={18} color={Colors.dark.accent} />
                                                    <Text style={[styles.pendingActionText, { color: Colors.dark.accent }]}>Accept</Text>
                                                </TouchableOpacity>
                                            </View>
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
        borderColor: '#5EEAD4',
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
        color: '#5EEAD4',
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
        color: '#FB7185',
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
        color: '#FB7185',
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
        backgroundColor: '#161F32',
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
    },
    pendingAcceptAllBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: Colors.dark.accent,
        borderRadius: Radius.pill,
        paddingVertical: 12,
        marginBottom: 16,
    },
    pendingAcceptAllText: {
        color: Colors.dark.onAccent,
        fontFamily: 'Inter_700Bold',
        fontSize: 14,
    },
    pendingEmptyText: {
        color: Colors.dark.textTertiary,
        fontFamily: 'Inter_400Regular',
        fontSize: 14,
        textAlign: 'center',
        marginTop: 40,
    },
    pendingCard: {
        backgroundColor: Colors.dark.surface,
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: Colors.dark.border,
        padding: 14,
        marginBottom: 12,
    },
    pendingBadgeRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 8,
    },
    pendingBadge: {
        backgroundColor: Colors.dark.surfaceElevated,
        borderRadius: Radius.pill,
        paddingHorizontal: 10,
        paddingVertical: 3,
    },
    pendingBadgeMulti: {
        backgroundColor: 'rgba(94, 234, 212, 0.15)',
    },
    pendingBadgeText: {
        color: Colors.dark.textSecondary,
        fontSize: 11,
        fontFamily: 'Inter_600SemiBold',
    },
    pendingQuestion: {
        color: '#fff',
        fontSize: 15,
        fontFamily: 'Inter_600SemiBold',
        lineHeight: 20,
        marginBottom: 4,
    },
    pendingOptions: {
        color: Colors.dark.textSecondary,
        fontSize: 12,
        fontFamily: 'Inter_400Regular',
        marginBottom: 10,
    },
    pendingActions: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 10,
    },
    pendingActionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: Radius.sm,
        borderWidth: 1,
    },
    pendingRejectBtn: {
        backgroundColor: 'rgba(251, 113, 133, 0.1)',
        borderColor: 'rgba(251, 113, 133, 0.4)',
    },
    pendingAcceptBtn: {
        backgroundColor: 'rgba(94, 234, 212, 0.1)',
        borderColor: 'rgba(94, 234, 212, 0.4)',
    },
    pendingActionText: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 13,
    }
});
