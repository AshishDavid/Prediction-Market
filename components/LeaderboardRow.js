import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

import { getRankName } from '../utils/reputation';

export default function LeaderboardRow({ user, rank, onPress }) {
    const rankName = getRankName(user.reputation || 50);
    return (
        <TouchableOpacity style={styles.row} onPress={onPress}>
            <Text style={styles.rank}>#{rank}</Text>
            <View style={styles.info}>
                <Text style={styles.username}>{user.username || 'Anonymous'}</Text>
                <Text style={styles.rankLabel}>{rankName}</Text>
            </View>
            <Text style={styles.reputation}>{Math.round(user.reputation)} Pts</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        marginBottom: 8,
        borderRadius: 12,
        marginHorizontal: 16,
    },
    rank: {
        fontSize: 16,
        fontFamily: 'Inter_700Bold',
        color: '#fff',
        width: 40,
    },
    info: {
        flex: 1,
    },
    username: {
        fontSize: 16,
        fontFamily: 'Inter_600SemiBold',
        color: '#fff',
    },
    reputation: {
        fontSize: 16,
        fontFamily: 'Inter_700Bold',
        color: '#69F0AE', // Brighter green
    },
    rankLabel: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.6)',
        marginTop: 2,
        fontFamily: 'Inter_400Regular',
    },
});
