import { View, FlatList, StyleSheet, ActivityIndicator, Text, Alert, TouchableOpacity, Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { auth, db } from '../../lib/firebase';
import {
    collection,
    query,
    where,
    getDocs,
    addDoc,
    orderBy,
    onSnapshot
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import MarketCard from '../../components/MarketCard';
import { useRouter, useFocusEffect, useNavigation } from 'expo-router';
import React, { useCallback, useState, useEffect, createElement } from 'react';
import { Ionicons } from '@expo/vector-icons';
import BackgroundLayout from '../../components/BackgroundLayout';

export default function MarketList() {
    // ... (logic remains exactly the same, omitting unchanged lines for brevity in diffs usually, but here replacing full file structure for safety)
    const [markets, setMarkets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    const [modalVisible, setModalVisible] = useState(false);
    const [newQuestion, setNewQuestion] = useState('');
    const [newSource, setNewSource] = useState('');
    const [newCategory, setNewCategory] = useState('General');

    const [closeDate, setCloseDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [mode, setMode] = useState('date');

    const [creating, setCreating] = useState(false);

    const [selectedCategory, setSelectedCategory] = useState("All");
    const [activeTab, setActiveTab] = useState('active');

    const router = useRouter();
    const navigation = useNavigation();



    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setIsAdmin(user?.email === 'davidashishx@gmail.com');
        });
        return unsubscribe;
    }, []);

    useEffect(() => {
        navigation.setOptions({
            headerRight: () => isAdmin ? (
                <TouchableOpacity onPress={() => {
                    setModalVisible(true);
                }} style={{ marginRight: 16 }}>
                    <Ionicons name="add-circle" size={28} color="#69F0AE" />
                </TouchableOpacity>
            ) : null,
        });
    }, [navigation, isAdmin]);

    useEffect(() => {
        setLoading(true);
        const marketsRef = collection(db, 'markets');
        // Real-time listener for markets list
        const unsubscribe = onSnapshot(marketsRef, (snapshot) => {
            const rawDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Client-side sort since index might be missing
            rawDocs.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

            const processed = rawDocs.map(m => ({
                ...m,
                avg_probability: m.probability !== undefined ? m.probability : 50,
                vote_count: m.vote_count || 0
            }));

            setMarkets(processed);
            setLoading(false);
            setRefreshing(false);
        }, (error) => {
            console.error("Error fetching markets:", error);
            setLoading(false);
            setRefreshing(false);
        });

        return () => unsubscribe();
    }, []);

    const handleRefresh = useCallback(() => {
        setRefreshing(true);
        // Listener handles data, artificial delay for UX
        setTimeout(() => setRefreshing(false), 1000);
    }, []);

    const categories = ["All", "Macroeconomics", "Stock Market", "Technology", "Cryptocurrency", "Politics", "Sports"];

    const filteredMarkets = markets.filter(m => {
        const categoryMatch = selectedCategory === "All" || m.category === selectedCategory || (m.category === 'General' && selectedCategory === 'All');
        const isResolved = m.outcome !== null;
        const tabMatch = activeTab === 'active' ? !isResolved : isResolved;
        return categoryMatch && tabMatch;
    });

    async function handleCreateMarket() {
        if (!newQuestion.trim()) {
            Alert.alert('Required', 'Please enter a question');
            return;
        }
        setCreating(true);
        try {
            // Check for duplicates
            const qCheck = query(collection(db, 'markets'), where('question', '==', newQuestion.trim()));
            const checkSnap = await getDocs(qCheck);
            if (!checkSnap.empty) {
                Alert.alert('Duplicate', 'This market already exists!');
                return;
            }

            const closeTimeISO = closeDate.toISOString();
            await addDoc(collection(db, 'markets'), {
                question: newQuestion.trim(),
                description: newSource || 'User Created',
                close_time: closeTimeISO,
                question: newQuestion.trim(),
                description: newSource || 'User Created',
                close_time: closeTimeISO,
                category: newCategory,
                outcome: null,
                created_at: new Date().toISOString()
            });

            Alert.alert('Success', 'Market created!');
            setModalVisible(false);
            setNewQuestion('');
            setNewSource('');
            // Listener updates automatically
        } catch (error) {
            console.error('[MarketCreate] Failed:', error);
            Alert.alert('Create Failed', `Error: ${error.message}`);
        } finally {
            setCreating(false);
        }
    }

    if (loading && !refreshing && markets.length === 0) {
        return (
            <BackgroundLayout style={styles.center}>
                <ActivityIndicator size="large" color="#69F0AE" />
            </BackgroundLayout>
        );
    }

    return (
        <BackgroundLayout>
            <View style={styles.container}>
                {/* Tab Switcher */}
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tabBtn, activeTab === 'active' && styles.activeTabBtn]}
                        onPress={() => setActiveTab('active')}
                    >
                        <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>Active</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tabBtn, activeTab === 'resolved' && styles.activeTabBtn]}
                        onPress={() => setActiveTab('resolved')}
                    >
                        <Text style={[styles.tabText, activeTab === 'resolved' && styles.activeTabText]}>Resolved</Text>
                    </TouchableOpacity>
                </View>

                {/* Category Filter */}
                <View style={styles.categoryHeader}>
                    <View style={styles.responsiveContent}>
                        <FlatList
                            horizontal
                            data={categories}
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ paddingHorizontal: 16 }}
                            keyExtractor={item => item}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    onPress={() => setSelectedCategory(item)}
                                    style={{
                                        paddingHorizontal: 16,
                                        paddingVertical: 8,
                                        borderRadius: 20,
                                        marginRight: 8,
                                        backgroundColor: selectedCategory === item ? '#69F0AE' : 'rgba(255,255,255,0.1)',
                                        borderWidth: 1,
                                        borderColor: selectedCategory === item ? '#69F0AE' : 'rgba(255,255,255,0.1)',
                                    }}
                                >
                                    <Text style={{
                                        color: selectedCategory === item ? '#141E30' : 'rgba(255,255,255,0.6)',
                                        fontFamily: 'Inter_600SemiBold',
                                        fontSize: 14,
                                    }}>
                                        {item}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>

                <View style={styles.listContainer}>
                    <FlatList
                        data={filteredMarkets}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => <MarketCard market={item} isAdmin={isAdmin} />}
                        contentContainerStyle={styles.list}
                        style={styles.responsiveContent}
                        ListEmptyComponent={
                            <TouchableOpacity onPress={() => setModalVisible(true)} style={{ padding: 20, alignItems: 'center' }}>
                                <Text style={styles.emptyText}>No markets found. Tap (+) to add one!</Text>
                            </TouchableOpacity>
                        }
                        onRefresh={handleRefresh} // Pull to refresh
                        refreshing={refreshing}
                        tintColor="#fff"
                    />
                </View>

                {/* Create Market Modal */}
                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={modalVisible}
                    onRequestClose={() => setModalVisible(false)}
                >
                    <KeyboardAvoidingView
                        behavior={Platform.OS === "ios" ? "padding" : "height"}
                        style={styles.modalOverlay}
                    >
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>New Market</Text>
                                <TouchableOpacity onPress={() => setModalVisible(false)}>
                                    <Ionicons name="close" size={24} color="#666" />
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.label}>Question</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Will it rain tomorrow?"
                                placeholderTextColor="#999"
                                value={newQuestion}
                                onChangeText={setNewQuestion}
                                multiline
                            />

                            <Text style={styles.label}>Source / Description</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Weather.com"
                                placeholderTextColor="#999"
                                value={newSource}
                                onChangeText={setNewSource}
                            />

                            <Text style={styles.label}>Category</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                                {categories.filter(c => c !== 'All').map(cat => (
                                    <TouchableOpacity
                                        key={cat}
                                        onPress={() => setNewCategory(cat)}
                                        style={{
                                            paddingHorizontal: 12,
                                            paddingVertical: 6,
                                            borderRadius: 16,
                                            backgroundColor: newCategory === cat ? '#69F0AE' : 'rgba(255,255,255,0.1)',
                                            borderWidth: 1,
                                            borderColor: newCategory === cat ? '#69F0AE' : 'rgba(255,255,255,0.1)',
                                        }}
                                    >
                                        <Text style={{
                                            color: newCategory === cat ? '#141E30' : 'rgba(255,255,255,0.6)',
                                            fontSize: 12,
                                            fontFamily: 'Inter_600SemiBold',
                                        }}>{cat}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.label}>Close Date & Time (Local)</Text>

                            {/* Date Picker Logic Simplified for brevity but kept functional */}
                            {Platform.OS === 'web' ? (
                                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                                    <View style={{ flex: 1 }}>
                                        {createElement('input', {
                                            type: 'date',
                                            value: closeDate.toISOString().split('T')[0],
                                            onChange: (e) => {
                                                if (e.target.value) {
                                                    const [y, m, d] = e.target.value.split('-').map(Number);
                                                    const dObj = new Date(closeDate); dObj.setFullYear(y, m - 1, d); setCloseDate(dObj);
                                                }
                                            },
                                            style: { width: '100%', padding: 10, borderRadius: 8, backgroundColor: '#f0f0f0', border: 'none' }
                                        })}
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        {createElement('input', {
                                            type: 'time',
                                            value: closeDate.toTimeString().split(' ')[0].substring(0, 5),
                                            onChange: (e) => {
                                                if (e.target.value) {
                                                    const [h, min] = e.target.value.split(':').map(Number);
                                                    const dObj = new Date(closeDate); dObj.setHours(h, min); setCloseDate(dObj);
                                                }
                                            },
                                            style: { width: '100%', padding: 10, borderRadius: 8, backgroundColor: '#f0f0f0', border: 'none' }
                                        })}
                                    </View>
                                </View>
                            ) : (
                                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                                    <TouchableOpacity onPress={() => { setMode('date'); setShowDatePicker(true); }} style={styles.dateBtn}>
                                        <Text>{closeDate.toLocaleDateString()}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => { setMode('time'); setShowDatePicker(true); }} style={styles.dateBtn}>
                                        <Text>{closeDate.toLocaleTimeString()}</Text>
                                    </TouchableOpacity>
                                    {showDatePicker && (
                                        <DateTimePicker
                                            value={closeDate}
                                            mode={mode}
                                            is24Hour={true}
                                            display="default"
                                            onChange={(e, d) => { setShowDatePicker(Platform.OS === 'ios'); if (d) setCloseDate(d); }}
                                        />
                                    )}
                                </View>
                            )}

                            <TouchableOpacity
                                style={[styles.createBtn, creating && styles.disabledBtn]}
                                onPress={handleCreateMarket}
                                disabled={creating}
                            >
                                <Text style={styles.createBtnText}>{creating ? 'Creating...' : 'Create Market'}</Text>
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                </Modal>
            </View>
        </BackgroundLayout>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    categoryHeader: {
        paddingVertical: 12,
        backgroundColor: 'transparent',
        marginBottom: 8,
    },
    listContainer: {
        flex: 1,
    },
    responsiveContent: {
        width: '100%',
        maxWidth: 800,
        alignSelf: 'center',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingTop: 10,
        gap: 12,
        marginBottom: 8,
    },
    tabBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    activeTabBtn: {
        backgroundColor: '#69F0AE',
        borderColor: '#69F0AE',
    },
    tabText: {
        fontFamily: 'Inter_600SemiBold',
        color: 'rgba(255,255,255,0.6)',
    },
    activeTabText: {
        color: '#141E30',
    },
    list: {
        padding: 16,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 50,
        color: 'rgba(255,255,255,0.4)',
        fontSize: 16,
        fontFamily: 'Inter_400Regular',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)', // Darker overlay
        justifyContent: Platform.OS === 'web' ? 'center' : 'flex-end',
        alignItems: Platform.OS === 'web' ? 'center' : 'stretch',
    },
    modalContent: {
        backgroundColor: '#1E2A38', // Dark Modal
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        borderRadius: Platform.OS === 'web' ? 20 : 0,
        padding: 24,
        width: Platform.OS === 'web' ? '90%' : '100%',
        maxWidth: Platform.OS === 'web' ? 500 : '100%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontFamily: 'Inter_700Bold',
        color: '#fff',
    },
    label: {
        fontSize: 14,
        fontFamily: 'Inter_600SemiBold',
        marginBottom: 8,
        color: 'rgba(255,255,255,0.8)',
    },
    input: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        padding: 12,
        borderRadius: 12,
        fontSize: 16,
        marginBottom: 20,
        color: '#fff',
        fontFamily: 'Inter_400Regular',
    },
    createBtn: {
        backgroundColor: '#69F0AE',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 10,
    },
    disabledBtn: {
        opacity: 0.7,
    },
    createBtnText: {
        color: '#141E30',
        fontSize: 16,
        fontFamily: 'Inter_700Bold',
    },
    dateBtn: {
        flex: 1,
        backgroundColor: '#f0f0f0',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center'
    }
});
