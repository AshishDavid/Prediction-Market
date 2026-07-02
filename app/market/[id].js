import React, { useEffect, useState, useLayoutEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, RefreshControl, Dimensions, Alert, Modal } from 'react-native';
import { useLocalSearchParams, useNavigation, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, collection, addDoc, serverTimestamp, query, where, orderBy, getDocs, updateDoc, runTransaction, setDoc, onSnapshot, writeBatch, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import BackgroundLayout from '../../components/BackgroundLayout';
import GradientButton from '../../components/GradientButton';
import { Colors, Radius } from '../../constants/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;

// Shared helpers for multi-choice markets — derive vote-share percents from the
// raw `votes` map on read, rather than storing a derived scalar (there's no single
// "probability" for N options the way there is for binary).
function computeOptionStats(market) {
    if (!market || market.type !== 'multi' || !Array.isArray(market.options) || market.options.length === 0) return [];
    const votes = market.votes || {};
    const total = market.options.reduce((sum, o) => sum + (votes[o.id] || 0), 0);
    return market.options.map(o => {
        const count = votes[o.id] || 0;
        const percent = total > 0 ? Math.round((count / total) * 100) : Math.round(100 / market.options.length);
        return { id: o.id, label: o.label, votes: count, percent };
    });
}

function getLeadingOption(market) {
    const stats = computeOptionStats(market);
    if (stats.length === 0) return null;
    return stats.reduce((best, cur) => (cur.votes > best.votes ? cur : best), stats[0]);
}

const MarketChart = ({ marketId, market, currentProb }) => {
    const [historyPoints, setHistoryPoints] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(true);

    useEffect(() => {
        const historyRef = collection(db, 'markets', marketId, 'history');
        const q = query(historyRef, orderBy('timestamp', 'asc'));
        const unsub = onSnapshot(q, (snap) => {
            setHistoryPoints(snap.docs.map(d => d.data()));
            setLoadingHistory(false);
        }, (err) => {
            console.error('[MarketChart] history query failed:', err);
            setLoadingHistory(false);
        });
        return () => unsub();
    }, [marketId]);

    const isMulti = market?.type === 'multi';
    const leading = isMulti ? getLeadingOption(market) : null;

    // Real trend line: for multi, track only the currently-leading option's
    // percent over time (overlaying 2-4 series in a compact sparkline is a
    // legibility problem, not a data problem — v1 scope is one line).
    const rawPoints = useMemo(() => {
        return historyPoints.map(h => {
            const time = h.timestamp?.toDate ? h.timestamp.toDate() : new Date();
            if (isMulti) {
                const votes = h.votes || {};
                const total = Object.values(votes).reduce((a, b) => a + b, 0);
                const price = total > 0 && leading
                    ? (votes[leading.id] || 0) / total * 100
                    : (100 / (market?.options?.length || 2));
                return { time, price };
            }
            return { time, price: h.probability };
        });
    }, [historyPoints, isMulti, leading?.id, market?.options?.length]);

    if (loadingHistory) return null;

    const width = SCREEN_WIDTH - 40;
    const height = 180;
    const padding = 10;
    const maxPrice = 100;
    const minPrice = 0;

    // 0 history points: nothing to draw yet.
    if (rawPoints.length === 0) {
        return (
            <View style={styles.chartContainer}>
                <View style={{ width, height, justifyContent: 'center', alignItems: 'center' }}>
                    <View style={{ width: '100%', height: 1, backgroundColor: 'rgba(255,255,255,0.15)' }} />
                    <Text style={styles.chartEmptyText}>No votes yet</Text>
                </View>
            </View>
        );
    }

    // 1 history point: duplicate it so the existing curve math (which divides
    // by dataPoints.length - 1) degenerates into a flat horizontal line instead
    // of dividing by zero.
    const dataPoints = rawPoints.length === 1 ? [rawPoints[0], rawPoints[0]] : rawPoints;

    const xScale = (index) => (index / (dataPoints.length - 1)) * (width - 2 * padding) + padding;
    const yScale = (price) => height - padding - ((price - minPrice) / (maxPrice - minPrice)) * (height - 2 * padding);

    // Smooth Curve Generation (Catmull-Rom to Bezier)
    const getPath = () => {
        let path = `M ${xScale(0)} ${yScale(dataPoints[0].price)}`;

        for (let i = 0; i < dataPoints.length - 1; i++) {
            const p0 = dataPoints[i === 0 ? 0 : i - 1];
            const p1 = dataPoints[i];
            const p2 = dataPoints[i + 1];
            const p3 = dataPoints[i + 2] || p2;

            const x0 = xScale(i === 0 ? 0 : i - 1);
            const y0 = yScale(p0.price);
            const x1 = xScale(i);
            const y1 = yScale(p1.price);
            const x2 = xScale(i + 1);
            const y2 = yScale(p2.price);
            const x3 = xScale(i + 2 >= dataPoints.length ? dataPoints.length - 1 : i + 2);
            const y3 = yScale(p3.price);

            const cp1x = x1 + (x2 - x0) / 6;
            const cp1y = y1 + (y2 - y0) / 6;
            const cp2x = x2 - (x3 - x1) / 6;
            const cp2y = y2 - (y3 - y1) / 6;

            path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;
        }
        return path;
    };

    const pathData = getPath();
    const fillPathData = `
        ${pathData}
        L ${width - padding} ${height}
        L ${padding} ${height}
        Z
    `;

    const currentValue = isMulti ? (leading?.percent ?? 0) : currentProb;
    const isBullish = currentValue >= 50;
    const chartColor = isMulti ? Colors.dark.accent : (isBullish ? '#5EEAD4' : '#FB7185');

    return (
        <View style={styles.chartContainer}>
            {isMulti && leading && (
                <Text style={styles.chartLegend}>Tracking: {leading.label}</Text>
            )}
            <Svg width={width} height={height}>
                <Defs>
                    <LinearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor={chartColor} stopOpacity="0.3" />
                        <Stop offset="1" stopColor={chartColor} stopOpacity="0" />
                    </LinearGradient>
                </Defs>
                <Path d={fillPathData} fill="url(#gradient)" />
                <Path
                    d={pathData}
                    stroke={chartColor}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                />
            </Svg>
        </View>
    );
};

export default function MarketDetail() {
    const { id } = useLocalSearchParams();
    const navigation = useNavigation();

    useLayoutEffect(() => {
        navigation.setOptions({
            headerShown: false,
        });
    }, [navigation]);

    const [market, setMarket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [prob, setProb] = useState(50);
    const [resolving, setResolving] = useState(false);

    // Resolution Modal State
    const [resolveModalVisible, setResolveModalVisible] = useState(false);
    const [targetOutcome, setTargetOutcome] = useState(null); // true/false (binary) or option id string (multi)
    const [userVote, setUserVote] = useState(null);
    const [_, setForceUpdate] = useState(0);

    // Danger Zone (reset / delete) confirmation modal state
    const [dangerAction, setDangerAction] = useState(null); // null | 'reset' | 'delete'
    const [dangerProcessing, setDangerProcessing] = useState(false);

    useLayoutEffect(() => {
        navigation.setOptions({
            headerTitle: '',
            headerTransparent: true,
            headerTintColor: '#fff',
            headerStyle: { backgroundColor: 'transparent' },
            headerLeft: () => (
                <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 0, paddingRight: 20 }}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
            ),
        });
    }, [navigation]);

    useEffect(() => {
        const checkUserVote = () => {
            if (auth.currentUser) {
                const q = query(
                    collection(db, 'predictions'),
                    where('market_id', '==', id),
                    where('user_id', '==', auth.currentUser.uid)
                );
                return onSnapshot(q, (snapshot) => {
                    if (!snapshot.empty) {
                        setUserVote(snapshot.docs[0].data().vote);
                    } else {
                        setUserVote(null);
                    }
                });
            }
            return () => { };
        };

        const unsubAuth = auth.onAuthStateChanged((user) => {
            if (user) checkUserVote();
            else setUserVote(null);
        });

        // Initial check if already loaded
        let unsubVote = () => { };
        if (auth.currentUser) {
            unsubVote = checkUserVote() || (() => { });
        }

        return () => {
            unsubAuth();
            if (unsubVote) unsubVote();
        };
    }, [id]);

    // Listen for market updates
    useEffect(() => {
        setLoading(true);
        const docRef = doc(db, 'markets', id);

        // Real-time listener for market updates (syncs graph for all users)
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setMarket({ id: docSnap.id, ...data });

                // Update probability from the live document (calculated by the last voter)
                if (data.probability !== undefined) {
                    setProb(data.probability);
                }
            } else {
                console.log("No such market!");
            }
            setLoading(false);
            setRefreshing(false);
        }, (error) => {
            console.error("Error listening to market:", error);
            setLoading(false);
            setRefreshing(false);
        });

        return () => unsubscribe();
    }, [id]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        // Listener handles data, just artificial delay for UX or re-verify auth
        setTimeout(() => setRefreshing(false), 1000);
    }, []);

    // Timer to Auto-Close at Deadline
    useEffect(() => {
        if (!market?.close_time) return;
        const closeTime = new Date(market.close_time).getTime();
        const timeLeft = closeTime - Date.now();

        if (timeLeft > 0) {
            const timer = setTimeout(() => {
                setForceUpdate(n => n + 1); // Force re-render to update 'isClosed'
            }, timeLeft);
            return () => clearTimeout(timer);
        }
    }, [market?.close_time]);

    const handleVote = async (choice) => {
        try {
            const user = auth.currentUser;
            if (!user) {
                router.push('/login');
                return;
            }

            // Double Check Deadline
            if (new Date(market.close_time) < new Date()) {
                Alert.alert('Market Closed', 'Voting has ended for this market.');
                return;
            }

            await runTransaction(db, async (transaction) => {
                const marketRef = doc(db, 'markets', id);
                // Use deterministic ID for transaction safety
                const predRef = doc(db, 'predictions', `${user.uid}_${id}`);
                const historyRef = doc(collection(db, 'markets', id, 'history'));

                const marketDoc = await transaction.get(marketRef);
                if (!marketDoc.exists()) {
                    throw new Error("Market does not exist!");
                }

                const predDoc = await transaction.get(predRef);
                const mData = marketDoc.data();

                // Initialize counters if missing (migration safety)
                let newYes = mData.yes_votes || 0;
                let newNo = mData.no_votes || 0;

                if (predDoc.exists()) {
                    const currentVote = predDoc.data().vote;
                    if (currentVote === choice) {
                        throw new Error(`ALREADY_VOTED:${choice}`);
                    }

                    // Swap Vote
                    if (choice === 'YES') {
                        newYes++;
                        newNo--;
                    } else {
                        newYes--;
                        newNo++;
                    }

                    transaction.update(predRef, {
                        vote: choice,
                        updated_at: new Date().toISOString()
                    });
                } else {
                    // New Vote
                    if (choice === 'YES') {
                        newYes++;
                    } else {
                        newNo++;
                    }

                    transaction.set(predRef, {
                        market_id: id,
                        user_id: user.uid,
                        vote: choice,
                        probability: prob, // Entry price
                        created_at: serverTimestamp(),
                        updated_at: new Date().toISOString()
                    });
                }

                // Recalculate Probability
                const newTotal = newYes + newNo;
                // Limit between 1 and 99
                const newProb = Math.max(1, Math.min(99, 50 + (newYes - newNo) * 5));

                transaction.update(marketRef, {
                    yes_votes: newYes,
                    no_votes: newNo,
                    vote_count: newTotal,
                    probability: newProb
                });
                transaction.set(historyRef, { timestamp: serverTimestamp(), probability: newProb });
            });

            // Refresh UI not strictly necessary with onSnapshot, but safe to do
            Alert.alert('Vote Submitted', `You voted ${choice}.`);

        } catch (e) {
            console.error('Error voting:', e);
            if (e.message && e.message.includes('ALREADY_VOTED')) {
                const choice = e.message.split(':')[1];
                Alert.alert('Already Voted', `You already voted ${choice} on this market.`);
            } else {
                Alert.alert('Error', 'Could not submit vote. Please try again.');
            }
        }
    };

    const handleVoteMulti = async (optionId) => {
        try {
            const user = auth.currentUser;
            if (!user) {
                router.push('/login');
                return;
            }

            if (new Date(market.close_time) < new Date()) {
                Alert.alert('Market Closed', 'Voting has ended for this market.');
                return;
            }

            await runTransaction(db, async (transaction) => {
                const marketRef = doc(db, 'markets', id);
                const predRef = doc(db, 'predictions', `${user.uid}_${id}`);
                const historyRef = doc(collection(db, 'markets', id, 'history'));

                const marketDoc = await transaction.get(marketRef);
                if (!marketDoc.exists()) {
                    throw new Error("Market does not exist!");
                }

                const predDoc = await transaction.get(predRef);
                const mData = marketDoc.data();

                const votes = { ...(mData.votes || {}) };
                (mData.options || []).forEach(opt => {
                    if (!(opt.id in votes)) votes[opt.id] = 0;
                });

                if (predDoc.exists()) {
                    const currentVote = predDoc.data().vote;
                    if (currentVote === optionId) {
                        throw new Error(`ALREADY_VOTED:${optionId}`);
                    }
                    if (currentVote in votes) votes[currentVote] = Math.max(0, votes[currentVote] - 1);
                    votes[optionId] = (votes[optionId] || 0) + 1;

                    transaction.update(predRef, {
                        vote: optionId,
                        updated_at: new Date().toISOString()
                    });
                } else {
                    votes[optionId] = (votes[optionId] || 0) + 1;

                    transaction.set(predRef, {
                        market_id: id,
                        user_id: user.uid,
                        vote: optionId,
                        created_at: serverTimestamp(),
                        updated_at: new Date().toISOString()
                    });
                }

                const newTotal = Object.values(votes).reduce((a, b) => a + b, 0);

                transaction.update(marketRef, {
                    votes,
                    vote_count: newTotal
                });
                transaction.set(historyRef, { timestamp: serverTimestamp(), votes });
            });

            Alert.alert('Vote Submitted', 'Your vote has been recorded.');
        } catch (e) {
            console.error('Error voting:', e);
            if (e.message && e.message.includes('ALREADY_VOTED')) {
                Alert.alert('Already Voted', 'You already voted for this option on this market.');
            } else {
                Alert.alert('Error', 'Could not submit vote. Please try again.');
            }
        }
    };

    // New Function to open Modal
    const initiateResolve = (outcome) => {
        setTargetOutcome(outcome);
        setResolveModalVisible(true);
    };

    // Actual Resolution Logic moved here — generalized for binary (targetOutcome is
    // boolean) and multi-choice (targetOutcome is the winning option's id string).
    const performResolution = async () => {
        setResolving(true);
        try {
            const marketRef = doc(db, 'markets', id);
            const isMulti = market.type === 'multi';

            // 1. Update Market Outcome
            await updateDoc(marketRef, {
                outcome: targetOutcome, // boolean (binary) or option id (multi)
                resolved_at: serverTimestamp()
            });

            // 2. Calculated Payouts with Time Decay
            const startTime = new Date(market.created_at);
            const closeTime = new Date(market.close_time);
            const totalDuration = closeTime.getTime() - startTime.getTime();

            const q = query(collection(db, 'predictions'), where('market_id', '==', id));
            const querySnapshot = await getDocs(q);

            for (const pDoc of querySnapshot.docs) {
                const pData = pDoc.data();
                const isWinner = isMulti
                    ? pData.vote === targetOutcome
                    : ((targetOutcome && pData.vote === 'YES') || (!targetOutcome && pData.vote === 'NO'));

                // Time Decay Calculation
                let points = 10;
                if (pData.created_at && totalDuration > 0) {
                    const voteTime = pData.created_at.toDate ? pData.created_at.toDate() : new Date(pData.created_at);
                    const elapsed = voteTime.getTime() - startTime.getTime();
                    // Fraction of value remaining (1.0 at start, 0.0 at end)
                    const fraction = 1 - (Math.max(0, elapsed) / totalDuration);
                    points = Math.max(1, Math.round(10 * Math.max(0, fraction)));
                }

                const change = isWinner ? points : -points;

                const userRef = doc(db, 'profiles', pData.user_id);
                try {
                    const userSnap = await getDoc(userRef);
                    if (userSnap.exists()) {
                        const currentRep = userSnap.data().reputation || 1000;
                        await updateDoc(userRef, {
                            reputation: currentRep + change
                        });
                        console.log(`[Resolution] User ${pData.user_id}: ${change > 0 ? '+' : ''}${change} Rep (${isWinner ? 'WIN' : 'LOSE'})`);
                    }
                } catch (err) {
                    console.error(`[Resolution] Failed to update user ${pData.user_id}:`, err);
                }
            }

            setResolveModalVisible(false);
            Alert.alert('Success', 'Market resolved!');
            router.back();

        } catch (error) {
            console.error('Resolution Error:', error);
            Alert.alert('Error', 'Failed to resolve market');
        } finally {
            setResolving(false);
        }
    };

    async function performDangerAction() {
        if (!isAdmin || !dangerAction) return;
        setDangerProcessing(true);
        try {
            // Both reset and delete first clear out this market's predictions and history.
            const predsQ = query(collection(db, 'predictions'), where('market_id', '==', id));
            const predsSnapshot = await getDocs(predsQ);
            const historySnapshot = await getDocs(collection(db, 'markets', id, 'history'));

            const batch = writeBatch(db);
            predsSnapshot.forEach(doc => batch.delete(doc.ref));
            historySnapshot.forEach(doc => batch.delete(doc.ref));
            await batch.commit();

            if (dangerAction === 'reset') {
                const isMulti = market.type === 'multi';
                const resetFields = {
                    outcome: null,
                    updated_at: new Date().toISOString()
                };
                if (isMulti) {
                    const votes = {};
                    (market.options || []).forEach(opt => { votes[opt.id] = 0; });
                    resetFields.votes = votes;
                    resetFields.vote_count = 0;
                } else {
                    resetFields.yes_votes = 0;
                    resetFields.no_votes = 0;
                    resetFields.vote_count = 0;
                    resetFields.probability = 50;
                }
                await updateDoc(doc(db, 'markets', id), resetFields);
            } else {
                await deleteDoc(doc(db, 'markets', id));
            }

            setDangerAction(null);
            router.replace('/(tabs)');
        } catch (e) {
            console.error(`${dangerAction === 'reset' ? 'Reset' : 'Delete'} failed:`, e);
            setDangerProcessing(false);
        }
    }

    if (loading) return <BackgroundLayout style={styles.center}><ActivityIndicator color="#5EEAD4" /></BackgroundLayout>;
    if (!market) return <BackgroundLayout style={styles.center}><Text style={{ color: '#fff', fontFamily: 'Inter_600SemiBold' }}>Market not found</Text></BackgroundLayout>;

    const isClosed = new Date(market.close_time) < new Date();
    const isAdmin = auth.currentUser?.email === 'davidashishx@gmail.com';
    const isMulti = market.type === 'multi';

    // Derived Stats (binary)
    const yesPercent = Math.round(prob);
    const noPercent = 100 - yesPercent;

    // Confidence
    const confidence = Math.round(Math.abs(prob - 50) * 2);

    // Trend
    const trend = prob - 50;
    const trendLabel = trend > 0 ? `+${trend.toFixed(1)}%` : `${trend.toFixed(1)}%`;
    const trendColor = trend > 0 ? '#5EEAD4' : (trend < 0 ? '#FB7185' : 'rgba(255,255,255,0.6)');

    // Derived Stats (multi)
    const optionStats = isMulti ? computeOptionStats(market) : [];
    const leadingOption = isMulti ? getLeadingOption(market) : null;

    const resolvedLabel = market.outcome === undefined || market.outcome === null
        ? null
        : (isMulti
            ? (market.options?.find(o => o.id === market.outcome)?.label || market.outcome)
            : (market.outcome ? 'YES' : 'NO'));

    return (
        <BackgroundLayout>
            {/* Custom Header */}
            <View style={styles.customHeader}>
                <TouchableOpacity
                    onPress={() => {
                        if (router.canGoBack()) {
                            router.back();
                        } else {
                            router.replace('/(tabs)');
                        }
                    }}
                    style={styles.backButton}
                >
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.container}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
            >
                <View style={styles.wrapper}>
                    <Text style={styles.question}>{market.question}</Text>
                    <Text style={styles.category}>{market.category?.toUpperCase() || 'GENERAL'}</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: -20, marginBottom: 20, fontFamily: 'Inter_600SemiBold' }}>
                        Ends: {new Date(market.close_time).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </Text>

                    <View style={styles.priceContainer}>
                        {isMulti ? (
                            <>
                                <Text style={styles.mainPrice}>{leadingOption?.percent ?? 0}%</Text>
                                <Text style={styles.priceLabel}>leading: {leadingOption?.label || '—'}</Text>
                            </>
                        ) : (
                            <>
                                <Text style={styles.mainPrice}>{yesPercent}%</Text>
                                <Text style={styles.priceLabel}>chance of YES</Text>
                            </>
                        )}
                    </View>

                    <MarketChart marketId={id} market={market} currentProb={prob} />

                    {/* Detailed Stats Row */}
                    {isMulti ? (
                        <View style={styles.multiStatsGrid}>
                            {optionStats.map(opt => (
                                <View key={opt.id} style={styles.multiStatRow}>
                                    <Text style={styles.multiStatLabel} numberOfLines={1}>{opt.label}</Text>
                                    <View style={styles.multiStatBarTrack}>
                                        <View style={[styles.multiStatBarFill, { width: `${opt.percent}%`, backgroundColor: opt.id === leadingOption?.id ? Colors.dark.accent : Colors.dark.borderStrong }]} />
                                    </View>
                                    <Text style={styles.multiStatPercent}>{opt.percent}%</Text>
                                </View>
                            ))}
                        </View>
                    ) : (
                        <View style={styles.statsGrid}>
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>YES</Text>
                                <Text style={[styles.statValue, { color: '#5EEAD4' }]}>{yesPercent}%</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>NO</Text>
                                <Text style={[styles.statValue, { color: '#FB7185' }]}>{noPercent}%</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>CONFIDENCE</Text>
                                <Text style={styles.statValue}>{confidence}%</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>TREND (24H)</Text>
                                <Text style={[styles.statValue, { color: trendColor }]}>{trendLabel}</Text>
                            </View>
                        </View>
                    )}

                    {isAdmin && (
                        <View style={{ alignItems: 'center', marginBottom: 30, marginTop: -10 }}>
                            <Text style={styles.statLabel}>TOTAL VOTES</Text>
                            <Text style={styles.statValue}>{market.vote_count || 0}</Text>
                        </View>
                    )}

                    {/* Outcome Cards (Voting) */}
                    {!isClosed && !market.outcome && (
                        isMulti ? (
                            <View style={styles.actionContainerWrap}>
                                {(market.options || []).map(opt => {
                                    const isVoted = userVote === opt.id;
                                    return (
                                        <TouchableOpacity
                                            key={opt.id}
                                            style={[
                                                styles.outcomeCardMulti,
                                                {
                                                    borderColor: isVoted ? Colors.dark.accent : Colors.dark.border,
                                                    borderWidth: isVoted ? 2 : 1,
                                                    backgroundColor: isVoted ? 'rgba(94, 234, 212, 0.1)' : Colors.dark.surface
                                                }
                                            ]}
                                            onPress={() => handleVoteMulti(opt.id)}
                                        >
                                            <Text style={[styles.outcomeTitle, { color: isVoted ? Colors.dark.accent : '#fff', fontSize: 15 }]} numberOfLines={2}>
                                                {opt.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        ) : (
                            <View style={styles.actionContainer}>
                                <TouchableOpacity
                                    style={[
                                        styles.outcomeCard,
                                        {
                                            borderColor: userVote === 'YES' ? '#5EEAD4' : 'rgba(105, 240, 174, 0.5)',
                                            borderWidth: userVote === 'YES' ? 2 : 1,
                                            backgroundColor: userVote === 'YES' ? 'rgba(105, 240, 174, 0.1)' : 'transparent'
                                        }
                                    ]}
                                    onPress={() => handleVote('YES')}
                                >
                                    <Text style={[styles.outcomeTitle, { color: '#5EEAD4' }]}>{userVote === 'YES' ? 'VOTED YES' : 'Vote YES'}</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles.outcomeCard,
                                        {
                                            borderColor: userVote === 'NO' ? '#FB7185' : 'rgba(255, 82, 82, 0.5)',
                                            borderWidth: userVote === 'NO' ? 2 : 1,
                                            backgroundColor: userVote === 'NO' ? 'rgba(255, 82, 82, 0.1)' : 'transparent'
                                        }
                                    ]}
                                    onPress={() => handleVote('NO')}
                                >
                                    <Text style={[styles.outcomeTitle, { color: '#FB7185' }]}>{userVote === 'NO' ? 'VOTED NO' : 'Vote NO'}</Text>
                                </TouchableOpacity>
                            </View>
                        )
                    )}

                    {/* Admin Resolution Panel */}
                    {isAdmin && !market.outcome && (
                        <View style={styles.adminPanel}>
                            <Text style={styles.adminTitle}>Admin Resolution</Text>
                            {isMulti ? (
                                <View style={styles.actionContainerWrap}>
                                    {(market.options || []).map(opt => (
                                        <TouchableOpacity
                                            key={opt.id}
                                            style={[styles.adminBtnMulti, { backgroundColor: 'rgba(94, 234, 212, 0.15)', borderWidth: 1, borderColor: 'rgba(94, 234, 212, 0.4)' }]}
                                            onPress={() => initiateResolve(opt.id)}
                                        >
                                            <Text style={{ color: Colors.dark.accent, fontFamily: 'Inter_700Bold' }} numberOfLines={1}>Resolve: {opt.label}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            ) : (
                                <View style={styles.adminButtons}>
                                    <TouchableOpacity
                                        style={[styles.adminBtn, { backgroundColor: 'rgba(105, 240, 174, 0.2)' }]}
                                        onPress={() => initiateResolve(true)}
                                    >
                                        <Text style={{ color: '#5EEAD4', fontFamily: 'Inter_700Bold' }}>Resolve YES</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.adminBtn, { backgroundColor: 'rgba(255, 82, 82, 0.2)' }]}
                                        onPress={() => initiateResolve(false)}
                                    >
                                        <Text style={{ color: '#FB7185', fontFamily: 'Inter_700Bold' }}>Resolve NO</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    )}

                    {resolvedLabel !== null && (
                        <View style={styles.resolutionBanner}>
                            <Text style={styles.resolutionText}>
                                Market Resolved: {resolvedLabel}
                            </Text>
                        </View>
                    )}

                    {/* Admin Danger Zone */}
                    {isAdmin && (
                        <View style={styles.dangerPanel}>
                            <Text style={styles.dangerTitle}>Danger Zone</Text>
                            <View style={styles.adminButtons}>
                                <TouchableOpacity
                                    style={[styles.adminBtn, { backgroundColor: 'rgba(251, 191, 36, 0.15)', borderWidth: 1, borderColor: 'rgba(251, 191, 36, 0.4)' }]}
                                    onPress={() => setDangerAction('reset')}
                                >
                                    <Text style={{ color: '#FBBF24', fontFamily: 'Inter_700Bold' }}>Reset Market</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.adminBtn, { backgroundColor: 'rgba(251, 113, 133, 0.15)', borderWidth: 1, borderColor: 'rgba(251, 113, 133, 0.4)' }]}
                                    onPress={() => setDangerAction('delete')}
                                >
                                    <Text style={{ color: '#FB7185', fontFamily: 'Inter_700Bold' }}>Delete Market</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>

                {/* Confirm Resolution Modal */}
                <Modal
                    visible={resolveModalVisible}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setResolveModalVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Confirm Resolution</Text>
                            <Text style={styles.modalText}>
                                Are you sure you want to resolve this market as
                                <Text style={{ fontWeight: '700', color: Colors.dark.accent }}>
                                    {' '}{isMulti ? (market.options?.find(o => o.id === targetOutcome)?.label || targetOutcome) : (targetOutcome ? 'YES' : 'NO')}
                                </Text>?
                            </Text>
                            <Text style={styles.modalSubtext}>This action cannot be undone.</Text>

                            <View style={styles.modalActions}>
                                <TouchableOpacity
                                    style={[styles.modalBtn, styles.cancelBtn]}
                                    onPress={() => setResolveModalVisible(false)}
                                >
                                    <Text style={styles.btnText}>Cancel</Text>
                                </TouchableOpacity>

                                <GradientButton
                                    title="Confirm"
                                    onPress={performResolution}
                                    loading={resolving}
                                    style={{ flex: 1 }}
                                    textStyle={{ fontSize: 16, fontFamily: 'Inter_600SemiBold' }}
                                />
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* Confirm Reset/Delete Modal */}
                <Modal
                    visible={dangerAction !== null}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setDangerAction(null)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>
                                {dangerAction === 'reset' ? 'Reset Market' : 'Delete Market'}
                            </Text>
                            <Text style={styles.modalText}>
                                {dangerAction === 'reset'
                                    ? 'This will clear all votes, reset probability to 50%, and remove the outcome.'
                                    : 'This will permanently delete this market and all of its votes.'}
                            </Text>
                            <Text style={styles.modalSubtext}>This action cannot be undone.</Text>

                            <View style={styles.modalActions}>
                                <TouchableOpacity
                                    style={[styles.modalBtn, styles.cancelBtn]}
                                    onPress={() => setDangerAction(null)}
                                    disabled={dangerProcessing}
                                >
                                    <Text style={styles.btnText}>Cancel</Text>
                                </TouchableOpacity>

                                <GradientButton
                                    title={dangerAction === 'reset' ? 'Reset' : 'Delete'}
                                    variant="danger"
                                    onPress={performDangerAction}
                                    loading={dangerProcessing}
                                    style={{ flex: 1 }}
                                    textStyle={{ fontSize: 16, fontFamily: 'Inter_600SemiBold' }}
                                />
                            </View>
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
    wrapper: {
        padding: 20,
        paddingTop: 100, // Space for transparent header
        paddingBottom: 40,
    },
    customHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 50, // Reduced from 60 to move it up slightly
        paddingBottom: 10,
        backgroundColor: 'transparent',
        zIndex: 10,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'Inter_700Bold',
        color: '#fff',
        maxWidth: 200,
        textAlign: 'center',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    question: {
        fontSize: 24,
        fontFamily: 'Inter_700Bold',
        color: '#fff',
        marginBottom: 8,
        lineHeight: 32,
    },
    category: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.6)',
        fontFamily: 'Inter_700Bold',
        letterSpacing: 1,
        marginBottom: 30,
    },
    priceContainer: {
        marginBottom: 20,
    },
    mainPrice: {
        fontSize: 56,
        fontFamily: 'Inter_900Black',
        color: '#fff',
    },
    priceLabel: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.6)',
        fontFamily: 'Inter_400Regular',
    },
    chartContainer: {
        marginVertical: 20,
        alignItems: 'center',
    },
    chartLegend: {
        color: Colors.dark.textSecondary,
        fontFamily: 'Inter_600SemiBold',
        fontSize: 12,
        marginBottom: 8,
    },
    chartEmptyText: {
        color: Colors.dark.textTertiary,
        fontFamily: 'Inter_600SemiBold',
        fontSize: 12,
        marginTop: 12,
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: Colors.dark.surface,
        borderRadius: Radius.lg,
        padding: 20,
        marginBottom: 30,
        borderWidth: 1,
        borderColor: Colors.dark.border,
        borderTopColor: Colors.dark.surfaceHighlight,
    },
    statItem: {
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 10,
        color: Colors.dark.textSecondary,
        fontFamily: 'Inter_700Bold',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 16,
        fontFamily: 'Inter_700Bold',
        color: '#fff',
    },
    multiStatsGrid: {
        backgroundColor: Colors.dark.surface,
        borderRadius: Radius.lg,
        padding: 20,
        marginBottom: 30,
        borderWidth: 1,
        borderColor: Colors.dark.border,
        borderTopColor: Colors.dark.surfaceHighlight,
        gap: 14,
    },
    multiStatRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    multiStatLabel: {
        color: '#fff',
        fontFamily: 'Inter_600SemiBold',
        fontSize: 13,
        width: 90,
    },
    multiStatBarTrack: {
        flex: 1,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,0.08)',
        overflow: 'hidden',
    },
    multiStatBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    multiStatPercent: {
        color: Colors.dark.textSecondary,
        fontFamily: 'Inter_700Bold',
        fontSize: 13,
        width: 40,
        textAlign: 'right',
    },
    actionContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 16,
    },
    actionContainerWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    outcomeCard: {
        flex: 1,
        backgroundColor: Colors.dark.surface,
        padding: 20,
        borderRadius: Radius.lg,
        borderWidth: 1,
        alignItems: 'center',
    },
    outcomeCardMulti: {
        width: '48%',
        padding: 18,
        borderRadius: Radius.lg,
        alignItems: 'center',
    },
    outcomeTitle: {
        fontSize: 18,
        fontFamily: 'Inter_700Bold',
        marginBottom: 4,
    },
    outcomeSubtitle: {
        fontSize: 12,
        color: Colors.dark.textSecondary,
        fontFamily: 'Inter_400Regular',
        textAlign: 'center',
    },
    adminPanel: {
        marginTop: 40,
        padding: 20,
        backgroundColor: Colors.dark.surface,
        borderRadius: Radius.lg,
        borderWidth: 1,
        borderColor: Colors.dark.border,
    },
    adminTitle: {
        fontSize: 16,
        fontFamily: 'Inter_700Bold',
        color: '#fff',
        marginBottom: 16,
    },
    adminButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    adminBtn: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    adminBtnMulti: {
        width: '48%',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    dangerPanel: {
        marginTop: 20,
        padding: 20,
        backgroundColor: Colors.dark.surface,
        borderRadius: Radius.lg,
        borderWidth: 1,
        borderColor: 'rgba(251, 113, 133, 0.25)',
    },
    dangerTitle: {
        fontSize: 16,
        fontFamily: 'Inter_700Bold',
        color: Colors.dark.danger,
        marginBottom: 16,
    },
    resolutionBanner: {
        marginTop: 30,
        padding: 16,
        backgroundColor: 'rgba(255, 215, 0, 0.2)',
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FFD700',
    },
    resolutionText: {
        color: '#FFD700',
        fontFamily: 'Inter_700Bold',
        fontSize: 16,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '80%',
        backgroundColor: '#161F32',
        borderRadius: 20,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    modalTitle: {
        fontSize: 20,
        fontFamily: 'Inter_700Bold',
        color: '#fff',
        marginBottom: 12,
    },
    modalText: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.8)',
        lineHeight: 24,
        marginBottom: 24,
        fontFamily: 'Inter_400Regular',
    },
    modalSubtext: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.5)',
        marginBottom: 24,
        fontStyle: 'italic',
        fontFamily: 'Inter_400Regular',
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    modalBtn: {
        flex: 1,
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    cancelBtn: {
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    btnText: {
        fontFamily: 'Inter_600SemiBold',
        color: '#fff',
        fontSize: 16,
    }
});
