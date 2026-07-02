import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { getRankName } from '../utils/reputation';
import { Colors, Radius } from '../constants/theme';

const MEDALS = {
    1: { color: Colors.dark.gold, bg: 'rgba(255, 215, 0, 0.12)' },
    2: { color: Colors.dark.silver, bg: 'rgba(203, 213, 225, 0.12)' },
    3: { color: Colors.dark.bronze, bg: 'rgba(240, 178, 122, 0.12)' },
};

export default function LeaderboardRow({ user, rank, position, onPress }) {
    const rankName = getRankName(user.reputation || 50);
    // Medal by rendered position (top 3 rows), not by rank number — ties at the
    // top (e.g. everyone starting at the same reputation) would otherwise paint
    // the whole list gold.
    const medal = position !== undefined ? MEDALS[position + 1] : undefined;

    return (
        <Pressable
            style={({ hovered, pressed }) => [
                styles.row,
                hovered && styles.rowHovered,
                pressed && styles.rowPressed,
                medal && { borderColor: medal.bg },
            ]}
            onPress={onPress}
        >
            <View style={[styles.rankBadge, medal && { backgroundColor: medal.bg }]}>
                {medal ? (
                    <Ionicons name="medal" size={18} color={medal.color} />
                ) : (
                    <Text style={styles.rank}>#{rank}</Text>
                )}
            </View>
            <View style={styles.info}>
                <Text style={styles.username}>{user.username || 'Anonymous'}</Text>
                <Text style={styles.rankLabel}>{rankName}</Text>
            </View>
            <Text style={[styles.reputation, medal && { color: medal.color }]}>
                {Math.round(user.reputation)} Pts
            </Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: Colors.dark.border,
        backgroundColor: Colors.dark.surface,
        marginBottom: 8,
        borderRadius: Radius.md,
        marginHorizontal: 16,
        gap: 12,
        // @ts-ignore web-only transition, harmless no-op on native
        transitionDuration: '150ms',
    },
    rowHovered: {
        backgroundColor: Colors.dark.surfaceElevated,
    },
    rowPressed: {
        backgroundColor: Colors.dark.surfacePressed,
    },
    rankBadge: {
        width: 36,
        height: 36,
        borderRadius: Radius.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rank: {
        fontSize: 15,
        fontFamily: 'Inter_700Bold',
        color: Colors.dark.textSecondary,
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
        color: Colors.dark.accent,
    },
    rankLabel: {
        fontSize: 12,
        color: Colors.dark.textSecondary,
        marginTop: 2,
        fontFamily: 'Inter_400Regular',
    },
});
