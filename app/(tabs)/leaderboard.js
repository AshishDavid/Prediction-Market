import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, ActivityIndicator, TextInput, TouchableOpacity } from 'react-native';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, limit, getDocs, where, onSnapshot } from 'firebase/firestore';
import LeaderboardRow from '../../components/LeaderboardRow';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import BackgroundLayout from '../../components/BackgroundLayout';

export default function Leaderboard() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const router = useRouter();

    useEffect(() => {
        let unsubscribe;
        // Debounce search input to avoid rapid subscription changes
        const timer = setTimeout(() => {
            setLoading(true);
            const profilesRef = collection(db, 'profiles');
            let q;

            if (searchQuery.trim()) {
                // Search Mode
                const term = searchQuery.trim();
                q = query(
                    profilesRef,
                    where('username', '>=', term),
                    where('username', '<=', term + '\uf8ff'),
                    limit(20)
                );
            } else {
                // Leaderboard Mode
                q = query(profilesRef, orderBy('reputation', 'desc'), limit(50));
            }

            // Real-time listener
            unsubscribe = onSnapshot(q, (snapshot) => {
                let data = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                // Client-sort for tie-breaking by seniority (created_at asc)
                data.sort((a, b) => {
                    const repDiff = (b.reputation || 0) - (a.reputation || 0);
                    if (repDiff !== 0) return repDiff;
                    return new Date(a.created_at || 0) - new Date(b.created_at || 0);
                });

                // Assign Ranks with Ties
                for (let i = 0; i < data.length; i++) {
                    if (i > 0 && (data[i].reputation || 0) === (data[i - 1].reputation || 0)) {
                        data[i].rank = data[i - 1].rank;
                    } else {
                        data[i].rank = i + 1;
                    }
                }

                setUsers(data);
                setLoading(false);
            }, (error) => {
                console.error('Leaderboard error:', error);
                setLoading(false);
            });

        }, 500);

        return () => {
            clearTimeout(timer);
            if (unsubscribe) unsubscribe();
        };
    }, [searchQuery]);

    return (
        <BackgroundLayout>
            <View style={styles.container}>
                <View style={styles.responsiveContent}>
                    {/* Search Bar */}
                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={20} color="rgba(255,255,255,0.6)" style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search users..."
                            placeholderTextColor="rgba(255,255,255,0.4)"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoCapitalize="none"
                        />
                    </View>

                    {loading ? (
                        <ActivityIndicator style={{ marginTop: 20 }} color="#69F0AE" />
                    ) : (
                        <FlatList
                            data={users}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item, index }) => (
                                <LeaderboardRow
                                    user={item}
                                    rank={item.rank}
                                    onPress={() => router.push(`/user/${item.id}`)}
                                />
                            )}
                            contentContainerStyle={styles.listContent}
                        />
                    )}
                </View>
            </View>
        </BackgroundLayout>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    listContent: {
        paddingVertical: 10,
    },
    responsiveContent: {
        width: '100%',
        maxWidth: 800,
        alignSelf: 'center',
        flex: 1, // Ensure it takes full height
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        margin: 16,
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 48,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#fff',
        height: '100%',
        fontFamily: 'Inter_400Regular',
    },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
