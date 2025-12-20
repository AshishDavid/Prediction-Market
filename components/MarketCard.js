import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../lib/firebase';
import Svg, { Path } from 'react-native-svg';

export default function MarketCard({ market, isAdmin }) {
    const { id, question, close_time } = market;
    const probability = market.avg_probability !== undefined && market.avg_probability !== null
        ? Math.round(market.avg_probability)
        : 50;

    const voteCount = market.vote_count || 0;
    const isClosed = new Date(close_time) < new Date();
    const isHigh = probability > 50;
    const trendColor = isHigh ? '#69F0AE' : '#FF5252'; // Lighter Green vs Red for Dark Mode

    // Generate simplified sparkline path
    const sparklinePath = useMemo(() => {
        // Mock data points based on current probability
        const points = [
            probability - 10 + Math.random() * 5,
            probability - 5 + Math.random() * 5,
            probability - 2 + Math.random() * 5,
            probability
        ];

        const width = 80;
        const height = 40;
        const min = Math.min(...points) - 5;
        const max = Math.max(...points) + 5;
        const range = max - min || 1;

        // Scale simplified X and Y
        return points.map((val, index) => {
            const x = (index / (points.length - 1)) * width;
            const y = height - ((val - min) / range) * height;
            return `${index === 0 ? 'M' : 'L'} ${x},${y}`;
        }).join(' ');
    }, [probability]);

    return (
        <Link href={`/market/${id}`} asChild>
            <TouchableOpacity style={styles.card}>
                <View style={styles.topRow}>
                    <View style={styles.infoCol}>
                        <Text style={styles.question} numberOfLines={2}>{question}</Text>
                        <View style={styles.metaRow}>
                            <Text style={styles.metaText}>{isClosed ? 'CLOSED' : 'OPEN'}</Text>
                            {isAdmin && (
                                <>
                                    <Text style={styles.dot}>•</Text>
                                    <Text style={styles.metaText}>{voteCount} Votes</Text>
                                </>
                            )}
                        </View>
                        <Text style={styles.dateText}>
                            Ends: {close_time ? new Date(close_time.endsWith('Z') || close_time.includes('+') ? close_time : close_time + 'Z').toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                        </Text>
                    </View>
                    <View style={styles.chartCol}>
                        <Svg width="80" height="40">
                            <Path
                                d={sparklinePath}
                                stroke={trendColor}
                                strokeWidth="2"
                                fill="none"
                            />
                        </Svg>
                    </View>
                    <View style={styles.probCol}>
                        <Text style={[styles.probText, { color: trendColor }]}>
                            {probability}%
                        </Text>
                        <Ionicons
                            name={isHigh ? "arrow-up" : "arrow-down"}
                            size={12}
                            color={trendColor}
                            style={{ marginTop: 2 }}
                        />
                    </View>
                </View>
            </TouchableOpacity>
        </Link>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        paddingVertical: 16,
        paddingHorizontal: 16,
        marginBottom: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        marginHorizontal: 16, // Add margin if full width list
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    infoCol: {
        flex: 1,
        paddingRight: 10,
    },
    question: {
        fontSize: 16,
        fontFamily: 'Inter_600SemiBold',
        color: '#fff',
        marginBottom: 6,
        lineHeight: 22,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    metaText: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.5)',
        fontFamily: 'Inter_600SemiBold',
        letterSpacing: 0.5,
    },
    dateText: {
        fontSize: 10,
        color: 'rgba(255, 255, 255, 0.4)',
        marginTop: 4,
        fontFamily: 'Inter_400Regular',
    },
    dot: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.3)',
        marginHorizontal: 4,
    },
    chartCol: {
        width: 80,
        height: 40,
        marginRight: 10,
        justifyContent: 'center',
    },
    probCol: {
        alignItems: 'flex-end',
        minWidth: 50,
    },
    probText: {
        fontSize: 18,
        fontFamily: 'Inter_700Bold',
    }
});
