import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { db } from '../../lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { getRankName } from '../../utils/reputation';
import { Ionicons } from '@expo/vector-icons';
import BackgroundLayout from '../../components/BackgroundLayout';

export default function PublicProfile() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [profile, setProfile] = useState(null);
    const [portfolio, setPortfolio] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            fetchData();
        }
    }, [id]);

    async function fetchData() {
        try {
            setLoading(true);
            const profileRef = doc(db, 'profiles', id);
            const profileSnap = await getDoc(profileRef);

            if (profileSnap.exists()) {
                setProfile(profileSnap.data());
            }

            const predsRef = collection(db, 'predictions');
            const q = query(predsRef, where('user_id', '==', id));
            const querySnapshot = await getDocs(q);

            const preds = await Promise.all(querySnapshot.docs.map(async (pDoc) => {
                const data = pDoc.data();
                const marketSnap = await getDoc(doc(db, 'markets', data.market_id));
                return {
                    id: pDoc.id,
                    ...data,
                    market: marketSnap.exists() ? marketSnap.data() : null
                };
            }));

            preds.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
            setPortfolio(preds);

        } catch (e) {
            console.error('[PublicProfile] Error:', e);
        } finally {
            setLoading(false);
        }
    }

    if (loading) return <BackgroundLayout style={styles.center}><ActivityIndicator color="#5EEAD4" /></BackgroundLayout>;
    if (!profile) return <BackgroundLayout style={styles.center}><Text style={{ color: '#fff', fontFamily: 'Inter_600SemiBold' }}>User not found</Text></BackgroundLayout>;

    return (
        <BackgroundLayout>
            <Stack.Screen
                options={{
                    headerTitle: '',
                    headerTransparent: true,
                    headerShadowVisible: false,
                    headerBackVisible: true,
                    headerTintColor: '#fff',
                    headerLeft: () => (
                        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={24} color="#fff" />
                        </TouchableOpacity>
                    )
                }}
            />

            <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{profile.username ? profile.username[0].toUpperCase() : '?'}</Text>
                    </View>
                    <Text style={styles.username}>@{profile.username}</Text>

                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{getRankName(profile.reputation)}</Text>
                    </View>

                    <Text style={styles.reputationScore}>{Math.round(profile.reputation)}</Text>
                    <Text style={styles.reputationLabel}>Reputation Score (Brier)</Text>
                </View>

                <View style={styles.portfolioSection}>
                    <Text style={styles.sectionTitle}>Recent Activity</Text>
                    {portfolio.length === 0 ? (
                        <Text style={styles.emptyText}>No active predictions.</Text>
                    ) : (
                        portfolio.map((item) => (
                            <TouchableOpacity
                                key={item.id}
                                style={styles.predCard}
                                onPress={() => router.push(`/market/${item.market_id}`)}
                            >
                                <View style={styles.predHeader}>
                                    <Text style={styles.marketQuestion} numberOfLines={2}>
                                        {item.market?.question || 'Unknown Market'}
                                    </Text>
                                    <View style={[
                                        styles.voteBadge,
                                        { backgroundColor: item.vote === 'YES' ? 'rgba(105, 240, 174, 0.2)' : 'rgba(255, 82, 82, 0.2)' }
                                    ]}>
                                        <Text style={[
                                            styles.voteText,
                                            { color: item.vote === 'YES' ? '#5EEAD4' : '#FB7185' }
                                        ]}>
                                            {item.vote}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.predFooter}>
                                    <Text style={styles.predDate}>
                                        {new Date(item.updated_at).toLocaleDateString()}
                                    </Text>
                                    {item.probability !== undefined && (
                                        <Text style={styles.predProb}>
                                            {Math.round(item.probability)}% prob
                                        </Text>
                                    )}
                                </View>
                            </TouchableOpacity>
                        ))
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
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    backButton: {
        padding: 8,
        marginLeft: 10,
    },
    scrollContent: {
        paddingTop: 100,
        paddingBottom: 40,
        paddingHorizontal: 20,
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 2,
        borderColor: '#5EEAD4',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: '#5EEAD4',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 5,
    },
    avatarText: {
        color: '#fff',
        fontSize: 40,
        fontFamily: 'Inter_700Bold',
    },
    username: {
        fontSize: 28,
        fontFamily: 'Inter_700Bold',
        marginBottom: 10,
        color: '#fff',
    },
    badge: {
        backgroundColor: 'rgba(105, 240, 174, 0.1)',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(105, 240, 174, 0.3)',
    },
    badgeText: {
        color: '#5EEAD4',
        fontFamily: 'Inter_600SemiBold',
        fontSize: 14,
        letterSpacing: 0.5,
    },
    reputationScore: {
        fontSize: 48,
        fontFamily: 'Inter_900Black',
        color: '#fff',
        marginBottom: 4,
    },
    reputationLabel: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
    },
    portfolioSection: {
        width: '100%',
        maxWidth: 600,
        alignSelf: 'center',
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'Inter_700Bold',
        marginBottom: 20,
        color: '#fff',
        letterSpacing: 1,
    },
    emptyText: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontStyle: 'italic',
        textAlign: 'center',
        marginTop: 20,
        fontFamily: 'Inter_400Regular',
    },
    predCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    predHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    marketQuestion: {
        flex: 1,
        fontSize: 16,
        fontFamily: 'Inter_600SemiBold',
        color: '#fff',
        marginRight: 10,
        lineHeight: 22,
    },
    voteBadge: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    voteText: {
        fontFamily: 'Inter_700Bold',
        fontSize: 12,
        letterSpacing: 0.5,
    },
    predFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    predDate: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.4)',
        fontFamily: 'Inter_400Regular',
    },
    predProb: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.8)',
        fontFamily: 'Inter_600SemiBold',
    }
});
