import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../lib/firebase';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Colors, Radius } from '../constants/theme';

export default function MarketCard({ market, isAdmin }) {
    const { id, question, close_time } = market;
    const isMulti = market.type === 'multi';

    const probability = market.avg_probability !== undefined && market.avg_probability !== null
        ? Math.round(market.avg_probability)
        : 50;

    // Leading option for multi-choice markets — recomputed straight from the raw
    // votes map, same derivation used on the detail page.
    const leadingOption = useMemo(() => {
        if (!isMulti || !Array.isArray(market.options) || market.options.length === 0) return null;
        const votes = market.votes || {};
        const total = market.options.reduce((sum, o) => sum + (votes[o.id] || 0), 0);
        return market.options.reduce((best, o) => {
            const count = votes[o.id] || 0;
            const percent = total > 0 ? Math.round((count / total) * 100) : Math.round(100 / market.options.length);
            return !best || count > best.votes ? { id: o.id, label: o.label, votes: count, percent } : best;
        }, null);
    }, [isMulti, market.options, market.votes]);

    const voteCount = market.vote_count || 0;
    const isClosed = new Date(close_time) < new Date();
    const isHigh = probability > 50;
    const trendColor = isMulti ? Colors.dark.accent : (isHigh ? Colors.dark.accent : Colors.dark.danger);
    const gradientId = `spark-${id}`;

    // Generate simplified sparkline path (binary only — decorative, not real
    // history; multi-choice markets skip the sparkline in favor of the leading
    // option's label + percent, see render below)
    const { linePath, fillPath } = useMemo(() => {
        if (isMulti) return { linePath: '', fillPath: '' };
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

        const coords = points.map((val, index) => ({
            x: (index / (points.length - 1)) * width,
            y: height - ((val - min) / range) * height,
        }));

        const line = coords.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');
        const fill = `${line} L ${width},${height} L 0,${height} Z`;

        return { linePath: line, fillPath: fill };
    }, [probability, isMulti]);

    return (
        <Link href={`/market/${id}`} asChild>
            <Pressable style={({ hovered, pressed }) => [
                styles.card,
                hovered && styles.cardHovered,
                pressed && styles.cardPressed,
            ]}>
                <View style={styles.topRow}>
                    <View style={styles.infoCol}>
                        <Text style={styles.question} numberOfLines={2}>{question}</Text>
                        <View style={styles.metaRow}>
                            <View style={[styles.statusDot, { backgroundColor: isClosed ? Colors.dark.textTertiary : Colors.dark.accent }]} />
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
                    {isMulti ? (
                        <View style={styles.multiCol}>
                            <Text style={styles.multiLabel} numberOfLines={1}>{leadingOption?.label || '—'}</Text>
                            <Text style={[styles.probText, { color: trendColor }]}>
                                {leadingOption?.percent ?? 0}%
                            </Text>
                        </View>
                    ) : (
                        <>
                            <View style={styles.chartCol}>
                                <Svg width="80" height="40">
                                    <Defs>
                                        <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                            <Stop offset="0" stopColor={trendColor} stopOpacity={0.35} />
                                            <Stop offset="1" stopColor={trendColor} stopOpacity={0} />
                                        </LinearGradient>
                                    </Defs>
                                    <Path d={fillPath} fill={`url(#${gradientId})`} />
                                    <Path
                                        d={linePath}
                                        stroke={trendColor}
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
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
                        </>
                    )}
                </View>
            </Pressable>
        </Link>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.dark.surface,
        paddingVertical: 16,
        paddingHorizontal: 16,
        marginBottom: 12,
        borderRadius: Radius.lg,
        borderWidth: 1,
        borderColor: Colors.dark.border,
        borderTopColor: Colors.dark.surfaceHighlight,
        marginHorizontal: 16, // Add margin if full width list
        // @ts-ignore web-only transition, harmless no-op on native
        transitionDuration: '150ms',
    },
    cardHovered: {
        backgroundColor: Colors.dark.surfaceElevated,
        borderColor: Colors.dark.borderStrong,
    },
    cardPressed: {
        backgroundColor: Colors.dark.surfacePressed,
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
        gap: 6,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    metaText: {
        fontSize: 12,
        color: Colors.dark.textSecondary,
        fontFamily: 'Inter_600SemiBold',
        letterSpacing: 0.5,
    },
    dateText: {
        fontSize: 10,
        color: Colors.dark.textTertiary,
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
    multiCol: {
        alignItems: 'flex-end',
        maxWidth: 110,
    },
    multiLabel: {
        fontSize: 11,
        color: Colors.dark.textSecondary,
        fontFamily: 'Inter_600SemiBold',
        marginBottom: 2,
    },
    probText: {
        fontSize: 18,
        fontFamily: 'Inter_700Bold',
    }
});
