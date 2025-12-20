import React, { useEffect, useState, useLayoutEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, RefreshControl, Dimensions, Alert, Modal } from 'react-native';
import { useLocalSearchParams, useNavigation, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, runTransaction, setDoc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import BackgroundLayout from '../../components/BackgroundLayout';

const SCREEN_WIDTH = Dimensions.get('window').width;

const MarketChart = ({ marketId, currentProb }) => {
    const [dataPoints, setDataPoints] = useState([]);

    useEffect(() => {
        // Simulated data generation with more points for smoothness
        const generateChartData = () => {
            const points = [];
            const now = new Date();
            const hoursBack = 24;
            const pointsCount = 40; // More points for smoother curve

            let price = 50;

            for (let i = 0; i <= pointsCount; i++) {
                const time = new Date(now.getTime() - (hoursBack - (i / pointsCount) * hoursBack) * 3600 * 1000);

                if (i === pointsCount) {
                    price = currentProb;
                } else {
                    const volatility = 5; // Reduced volatility for smoother look
                    const change = (Math.random() - 0.5) * volatility;
                    price += change;
                    price = Math.max(10, Math.min(90, price));
                }
                points.push({ time, price });
            }
            setDataPoints(points);
        };

        generateChartData();
    }, [marketId, currentProb]);

    if (dataPoints.length === 0) return null;

    const width = SCREEN_WIDTH - 40;
    const height = 180; // Taller chart
    const padding = 10;
    const maxPrice = 100;
    const minPrice = 0;

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

    const isBullish = currentProb >= 50;
    const chartColor = isBullish ? '#69F0AE' : '#FF5252';

    return (
        <View style={styles.chartContainer}>
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
    const [targetOutcome, setTargetOutcome] = useState(null); // true (YES) or false (NO)
    const [userVote, setUserVote] = useState(null);
    const [_, setForceUpdate] = useState(0);

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

    // New Function to open Modal
    const initiateResolve = (outcome) => {
        setTargetOutcome(outcome);
        setResolveModalVisible(true);
    };

    // Actual Resolution Logic moved here
    const performResolution = async () => {
        setResolving(true);
        try {
            const marketRef = doc(db, 'markets', id);

            // 1. Update Market Outcome
            await updateDoc(marketRef, {
                outcome: targetOutcome, // true = YES, false = NO
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
                const isWinner = (targetOutcome && pData.vote === 'YES') || (!targetOutcome && pData.vote === 'NO');

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

    if (loading) return <BackgroundLayout style={styles.center}><ActivityIndicator color="#69F0AE" /></BackgroundLayout>;
    if (!market) return <BackgroundLayout style={styles.center}><Text style={{ color: '#fff', fontFamily: 'Inter_600SemiBold' }}>Market not found</Text></BackgroundLayout>;

    const isClosed = new Date(market.close_time) < new Date();
    const isAdmin = auth.currentUser?.email === 'davidashishx@gmail.com';

    // Derived Stats
    const yesPercent = Math.round(prob);
    const noPercent = 100 - yesPercent;

    // Confidence
    const confidence = Math.round(Math.abs(prob - 50) * 2);

    // Trend
    const trend = prob - 50;
    const trendLabel = trend > 0 ? `+${trend.toFixed(1)}%` : `${trend.toFixed(1)}%`;
    const trendColor = trend > 0 ? '#69F0AE' : (trend < 0 ? '#FF5252' : 'rgba(255,255,255,0.6)');

    return (
        <BackgroundLayout>
            {/* Custom Header */}
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
                <Text style={styles.headerTitle} numberOfLines={1}>Market Details</Text>
                <View style={{ width: 40 }} />
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
                        <Text style={styles.mainPrice}>{yesPercent}%</Text>
                        <Text style={styles.priceLabel}>chance of YES</Text>
                    </View>

                    <MarketChart marketId={id} currentProb={prob} />

                    {/* Detailed Stats Row */}
                    <View style={styles.statsGrid}>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>YES</Text>
                            <Text style={[styles.statValue, { color: '#69F0AE' }]}>{yesPercent}%</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>NO</Text>
                            <Text style={[styles.statValue, { color: '#FF5252' }]}>{noPercent}%</Text>
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

                    {isAdmin && (
                        <View style={{ alignItems: 'center', marginBottom: 30, marginTop: -10 }}>
                            <Text style={styles.statLabel}>TOTAL VOTES</Text>
                            <Text style={styles.statValue}>{market.vote_count || 0}</Text>
                        </View>
                    )}

                    {/* Outcome Cards (Voting) */}
                    {!isClosed && !market.outcome && (
                        <View style={styles.actionContainer}>
                            <TouchableOpacity
                                style={[
                                    styles.outcomeCard,
                                    {
                                        borderColor: userVote === 'YES' ? '#69F0AE' : 'rgba(105, 240, 174, 0.5)',
                                        borderWidth: userVote === 'YES' ? 2 : 1,
                                        backgroundColor: userVote === 'YES' ? 'rgba(105, 240, 174, 0.1)' : 'transparent'
                                    }
                                ]}
                                onPress={() => handleVote('YES')}
                            >
                                <Text style={[styles.outcomeTitle, { color: '#69F0AE' }]}>{userVote === 'YES' ? 'VOTED YES' : 'Vote YES'}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.outcomeCard,
                                    {
                                        borderColor: userVote === 'NO' ? '#FF5252' : 'rgba(255, 82, 82, 0.5)',
                                        borderWidth: userVote === 'NO' ? 2 : 1,
                                        backgroundColor: userVote === 'NO' ? 'rgba(255, 82, 82, 0.1)' : 'transparent'
                                    }
                                ]}
                                onPress={() => handleVote('NO')}
                            >
                                <Text style={[styles.outcomeTitle, { color: '#FF5252' }]}>{userVote === 'NO' ? 'VOTED NO' : 'Vote NO'}</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Admin Resolution Panel */}
                    {isAdmin && !market.outcome && (
                        <View style={styles.adminPanel}>
                            <Text style={styles.adminTitle}>Admin Resolution</Text>
                            <View style={styles.adminButtons}>
                                <TouchableOpacity
                                    style={[styles.adminBtn, { backgroundColor: 'rgba(105, 240, 174, 0.2)' }]}
                                    onPress={() => initiateResolve(true)}
                                >
                                    <Text style={{ color: '#69F0AE', fontFamily: 'Inter_700Bold' }}>Resolve YES</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.adminBtn, { backgroundColor: 'rgba(255, 82, 82, 0.2)' }]}
                                    onPress={() => initiateResolve(false)}
                                >
                                    <Text style={{ color: '#FF5252', fontFamily: 'Inter_700Bold' }}>Resolve NO</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {market.outcome !== undefined && market.outcome !== null && (
                        <View style={styles.resolutionBanner}>
                            <Text style={styles.resolutionText}>
                                Market Resolved: {market.outcome ? 'YES' : 'NO'}
                            </Text>
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
                                <Text style={{ fontWeight: '700', color: targetOutcome ? '#69F0AE' : '#FF5252' }}>
                                    {targetOutcome ? ' YES' : ' NO'}
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

                                <TouchableOpacity
                                    style={[styles.modalBtn, styles.confirmBtn]}
                                    onPress={performResolution}
                                    disabled={resolving}
                                >
                                    {resolving ? <ActivityIndicator color="#141E30" /> : <Text style={[styles.btnText, { color: '#141E30' }]}>Confirm</Text>}
                                </TouchableOpacity>
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
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 60,
        paddingBottom: 20,
        backgroundColor: 'transparent',
        zIndex: 10,
        position: 'absolute', // Make it absolute to overlay content
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
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 16,
        padding: 20,
        marginBottom: 30,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    statItem: {
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.5)',
        fontFamily: 'Inter_700Bold',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 16,
        fontFamily: 'Inter_700Bold',
        color: '#fff',
    },
    actionContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 16,
    },
    outcomeCard: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: 'center',
    },
    outcomeTitle: {
        fontSize: 18,
        fontFamily: 'Inter_700Bold',
        marginBottom: 4,
    },
    outcomeSubtitle: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.5)',
        fontFamily: 'Inter_400Regular',
        textAlign: 'center',
    },
    adminPanel: {
        marginTop: 40,
        padding: 20,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
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
        backgroundColor: '#1E2A38',
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
    confirmBtn: {
        backgroundColor: '#69F0AE',
    },
    btnText: {
        fontFamily: 'Inter_600SemiBold',
        color: '#fff',
        fontSize: 16,
    }
});
