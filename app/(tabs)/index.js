import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../../lib/firebase';
import {
    collection,
    query,
    where,
    getDocs,
    getDoc,
    doc,
    orderBy,
    limit
} from 'firebase/firestore';
import BackgroundLayout from '../../components/BackgroundLayout';
import GradientButton from '../../components/GradientButton';
import { Colors, Radius } from '../../constants/theme';

export default function HomeScreen() {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [portfolio, setPortfolio] = useState([]);
    const [featuredMarket, setFeaturedMarket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useFocusEffect(
        useCallback(() => {
            loadData(featuredMarket === null && portfolio.length === 0);
        }, [])
    );

    async function loadData(showLoading = false) {
        if (showLoading) setLoading(true);
        try {
            const currentUser = auth.currentUser;
            setUser(currentUser);

            // 0. Get Featured Market (Latest unresolved)
            const marketsRef = collection(db, 'markets');
            let featSnapshot;

            try {
                // Try optimal query first (Requires Index)
                const featQuery = query(
                    marketsRef,
                    where('outcome', '==', null),
                    orderBy('created_at', 'desc'),
                    limit(1)
                );
                featSnapshot = await getDocs(featQuery);
            } catch (e) {
                console.warn('[Home] Index missing, falling back to simple query');
                // Fallback: Get recent active markets and sort client-side
                const fallbackQuery = query(
                    marketsRef,
                    where('outcome', '==', null),
                    limit(10) // Fetch a few to find the latest
                );
                const fallbackSnap = await getDocs(fallbackQuery);
                // Sort client-side
                const sortedDocs = fallbackSnap.docs.sort((a, b) => {
                    return new Date(b.data().created_at) - new Date(a.data().created_at);
                });
                // Mock a snapshot structure for the logic below
                featSnapshot = { empty: sortedDocs.length === 0, docs: sortedDocs };
            }

            if (!featSnapshot.empty) {
                const marketDoc = featSnapshot.docs[0];
                const marketData = { id: marketDoc.id, ...marketDoc.data() };

                if (marketData.type === 'multi') {
                    // Multi-choice markets have no single `probability` field —
                    // derive the leading option's vote-share percent instead.
                    const votes = marketData.votes || {};
                    const options = marketData.options || [];
                    const total = options.reduce((sum, o) => sum + (votes[o.id] || 0), 0);
                    const leading = options.reduce((best, o) => {
                        const count = votes[o.id] || 0;
                        return !best || count > best.count ? { ...o, count } : best;
                    }, null);
                    const leadingPercent = leading && total > 0
                        ? Math.round((leading.count / total) * 100)
                        : Math.round(100 / (options.length || 2));

                    setFeaturedMarket({ ...marketData, avg_probability: leadingPercent, leadingLabel: leading?.label || null });
                } else {
                    // Use the pre-calculated probability from the market document
                    const prob = marketData.probability !== undefined ? marketData.probability : 50;
                    setFeaturedMarket({ ...marketData, avg_probability: prob });
                }
            }

            if (currentUser) {
                // 1. Get Profile
                const profileSnap = await getDoc(doc(db, 'profiles', currentUser.uid));
                if (profileSnap.exists()) {
                    setProfile(profileSnap.data());
                }

                // 2. Get Portfolio (Faking the JOIN)
                const predsRef = collection(db, 'predictions');
                const portQuery = query(
                    predsRef,
                    where('user_id', '==', currentUser.uid)
                );
                const portSnapshot = await getDocs(portQuery);

                const predictions = await Promise.all(portSnapshot.docs.map(async (pDoc) => {
                    const predData = pDoc.data();
                    // Fetch the associated market document
                    const marketSnap = await getDoc(doc(db, 'markets', predData.market_id));
                    return {
                        id: pDoc.id,
                        ...predData,
                        markets: marketSnap.exists() ? { id: marketSnap.id, ...marketSnap.data() } : null
                    };
                }));

                const validPredictions = predictions.filter(p => p.markets !== null);

                // Sort client-side since compound index might be missing
                validPredictions.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

                setPortfolio(validPredictions);
            }
        } catch (e) {
            console.error('[Home] Firestore Error:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadData(false);
    }, []);

    // Featured Fallback
    const displayFeatured = featuredMarket || {
        question: "Loading active markets...",
        avg_probability: null,
        id: null
    };

    // Stats
    const featProb = displayFeatured.avg_probability !== null && displayFeatured.avg_probability !== undefined
        ? `${Math.round(displayFeatured.avg_probability)}%`
        : 'N/A';

    const isFeatUp = displayFeatured.avg_probability !== null
        ? displayFeatured.avg_probability > 50
        : null;

    const featTrendLabel = displayFeatured.type === 'multi'
        ? (displayFeatured.leadingLabel || 'WAITING')
        : (isFeatUp === null ? 'WAITING' : (isFeatUp ? 'BULLISH' : 'BEARISH'));

    return (
        <BackgroundLayout>
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
                }
            >
                <View style={styles.responsiveContent}>
                    <View style={styles.header}>
                        <Text style={styles.greeting}>Welcome back,</Text>
                        <Text style={styles.username}>
                            {profile?.username || user?.email?.split('@')[0] || 'Trader'}
                        </Text>
                    </View>

                    {/* Featured Card */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Ionicons name="flame" size={14} color={Colors.dark.accent} />
                            <Text style={styles.trendingLabel}>TRENDING NOW</Text>
                        </View>
                        <Text style={styles.marketQuestion} numberOfLines={2}>{displayFeatured.question}</Text>

                        <View style={styles.statsRow}>
                            <View>
                                <Text style={styles.probLabel}>CROWD BELIEVES</Text>
                                <Text style={styles.probValue}>{featProb}</Text>
                            </View>
                            <View style={styles.chartPlaceholder}>
                                <Text
                                    style={{
                                        color: isFeatUp === null ? Colors.dark.textSecondary : (isFeatUp ? Colors.dark.accent : Colors.dark.danger),
                                        fontFamily: 'Inter_700Bold',
                                        fontSize: 16
                                    }}
                                    numberOfLines={1}
                                >
                                    {featTrendLabel}
                                </Text>
                            </View>
                        </View>

                        {displayFeatured.id && (
                            <Link href={`/market/${displayFeatured.id}`} asChild>
                                <GradientButton title="Vote" style={styles.actionBtn} textStyle={styles.actionBtnText} />
                            </Link>
                        )}
                    </View>

                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Portfolio</Text>
                    </View>

                    {loading && !refreshing ? (
                        <ActivityIndicator color="#5EEAD4" />
                    ) : portfolio.length === 0 ? (
                        <View style={[styles.card, { alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed' }]}>
                            <Text style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'Inter_400Regular', marginBottom: 10 }}>
                                Your active predictions will appear here.
                            </Text>
                            <Link href="/(tabs)/markets" asChild>
                                <TouchableOpacity style={{ padding: 10, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20 }}>
                                    <Text style={{ color: '#fff', fontFamily: 'Inter_600SemiBold' }}>Find a Market</Text>
                                </TouchableOpacity>
                            </Link>
                        </View>
                    ) : (
                        portfolio.map((item) => {
                            const marketData = item.markets;
                            if (!marketData) return null;

                            const isYes = item.vote === 'YES';
                            const isClosed = new Date(marketData.close_time) < new Date();
                            const isResolved = marketData.outcome !== null && marketData.outcome !== undefined;

                            let statusLabel = isClosed ? 'CLOSED' : 'OPEN';
                            let statusColor = isClosed ? 'rgba(255,255,255,0.5)' : '#5EEAD4';

                            if (isResolved) {
                                const outcomeYes = marketData.outcome === true;
                                const userWon = (isYes && outcomeYes) || (!isYes && !outcomeYes);
                                statusLabel = userWon ? 'WON' : 'LOST';
                                statusColor = userWon ? '#FFD700' : '#FB7185';
                            }

                            return (
                                <Link key={item.id} href={`/market/${marketData.id}`} asChild>
                                    <TouchableOpacity style={styles.positionCard}>
                                        <View style={{ flex: 1, paddingRight: 8 }}>
                                            <Text style={styles.positionTitle} numberOfLines={2}>
                                                {marketData.question}
                                            </Text>
                                            <View style={{ flexDirection: 'row', marginTop: 6, alignItems: 'center' }}>
                                                <Text style={[styles.positionDate, { marginRight: 8 }]}>
                                                    {new Date(item.updated_at).toLocaleDateString()}
                                                </Text>
                                                <View style={{ backgroundColor: statusColor, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                                    <Text style={{ color: '#08201C', fontSize: 10, fontFamily: 'Inter_700Bold' }}>{statusLabel}</Text>
                                                </View>
                                            </View>
                                        </View>
                                        <View style={[styles.badge, { backgroundColor: isYes ? 'rgba(105, 240, 174, 0.2)' : 'rgba(255, 82, 82, 0.2)' }]}>
                                            <Text style={[styles.badgeText, { color: isYes ? '#5EEAD4' : '#FB7185' }]}>
                                                {isYes ? 'YES' : 'NO'}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                </Link>
                            );
                        })
                    )}
                </View>
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
        padding: 16,
    },
    responsiveContent: {
        width: '100%',
        maxWidth: 800, // Centered layout for desktop
        alignSelf: 'center',
    },
    header: {
        marginTop: 20,
        marginBottom: 30,
    },
    greeting: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.6)',
        fontFamily: 'Inter_400Regular',
    },
    username: {
        fontSize: 28,
        fontFamily: 'Inter_700Bold',
        color: '#fff',
    },
    card: {
        backgroundColor: Colors.dark.surface,
        borderRadius: Radius.xl,
        padding: 24,
        marginBottom: 32,
        borderWidth: 1,
        borderColor: Colors.dark.border,
        borderTopColor: Colors.dark.surfaceHighlight,
        shadowColor: Colors.dark.glowTeal,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 24,
    },
    cardHeader: {
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    trendingLabel: {
        fontSize: 12,
        fontFamily: 'Inter_700Bold',
        color: Colors.dark.accent,
        letterSpacing: 1,
    },
    marketQuestion: {
        fontSize: 22,
        fontFamily: 'Inter_600SemiBold',
        color: '#fff',
        marginBottom: 20,
        lineHeight: 30,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 20,
    },
    probLabel: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.5)',
        fontFamily: 'Inter_700Bold',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    probValue: {
        fontSize: 36,
        fontFamily: 'Inter_700Bold',
        color: '#fff',
    },
    chartPlaceholder: {
        justifyContent: 'flex-end',
    },
    actionBtn: {},
    actionBtnText: {
        fontSize: 14,
    },
    sectionHeader: {
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'Inter_700Bold',
        color: '#fff',
    },
    positionCard: {
        backgroundColor: Colors.dark.surface,
        padding: 16,
        marginBottom: 10,
        borderRadius: Radius.lg,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.dark.border,
        borderTopColor: Colors.dark.surfaceHighlight,
    },
    positionTitle: {
        fontSize: 16,
        fontFamily: 'Inter_600SemiBold',
        color: '#fff',
        maxWidth: 200,
    },
    positionDate: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.4)',
        marginTop: 4,
        fontFamily: 'Inter_400Regular',
    },
    badge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    badgeText: {
        fontSize: 12,
        fontFamily: 'Inter_700Bold',
    }
});
