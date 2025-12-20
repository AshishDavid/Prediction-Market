import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Button } from 'react-native';
import { auth, db } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
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
        router.replace('/login');
    }

    if (loading) return <BackgroundLayout style={styles.center}><ActivityIndicator color="#69F0AE" /></BackgroundLayout>;
    if (!profile) return null;

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
