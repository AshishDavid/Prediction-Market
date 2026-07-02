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
import { useHeaderHeight } from '@react-navigation/elements';
import { LinearGradient } from 'expo-linear-gradient';
import BackgroundLayout from '../../components/BackgroundLayout';
import GradientButton from '../../components/GradientButton';
import { Colors, Gradients, Radius } from '../../constants/theme';

function Chip({ label, active, onPress, style }) {
    if (active) {
        return (
            <TouchableOpacity onPress={onPress} style={style}>
                <LinearGradient colors={Gradients.accentButton} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={chipStyles.chip}>
                    <Text style={chipStyles.activeText}>{label}</Text>
                </LinearGradient>
            </TouchableOpacity>
        );
    }
    return (
        <TouchableOpacity onPress={onPress} style={[chipStyles.chip, chipStyles.inactive, style]}>
            <Text style={chipStyles.inactiveText}>{label}</Text>
        </TouchableOpacity>
    );
}

const chipStyles = StyleSheet.create({
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: Radius.pill,
    },
    inactive: {
        backgroundColor: Colors.dark.surface,
        borderWidth: 1,
        borderColor: Colors.dark.border,
    },
    activeText: {
        color: Colors.dark.onAccent,
        fontFamily: 'Inter_600SemiBold',
        fontSize: 14,
    },
    inactiveText: {
        color: Colors.dark.textSecondary,
        fontFamily: 'Inter_600SemiBold',
        fontSize: 14,
    },
});

export default function MarketList() {
    const headerHeight = useHeaderHeight();
    const [markets, setMarkets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    const [modalVisible, setModalVisible] = useState(false);
    const [newQuestion, setNewQuestion] = useState('');
    const [newSource, setNewSource] = useState('');
    const [newCategory, setNewCategory] = useState('General');
    const [newType, setNewType] = useState('binary'); // 'binary' | 'multi'
    const [newOptions, setNewOptions] = useState(['', '']); // 2-4 option labels, only used when newType === 'multi'

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
                    <Ionicons name="add-circle" size={28} color="#5EEAD4" />
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

    function updateOption(index, text) {
        setNewOptions(prev => prev.map((o, i) => (i === index ? text : o)));
    }

    function addOption() {
        setNewOptions(prev => (prev.length >= 4 ? prev : [...prev, '']));
    }

    function removeOption(index) {
        setNewOptions(prev => (prev.length <= 2 ? prev : prev.filter((_, i) => i !== index)));
    }

    async function handleCreateMarket() {
        if (!newQuestion.trim()) {
            Alert.alert('Required', 'Please enter a question');
            return;
        }
        const trimmedOptions = newOptions.map(o => o.trim()).filter(Boolean);
        if (newType === 'multi' && trimmedOptions.length < 2) {
            Alert.alert('Required', 'Please enter at least 2 options');
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
            const base = {
                question: newQuestion.trim(),
                description: newSource || 'User Created',
                close_time: closeTimeISO,
                category: newCategory,
                outcome: null,
                created_at: new Date().toISOString()
            };

            if (newType === 'multi') {
                const options = trimmedOptions.map((label, i) => ({ id: String.fromCharCode(97 + i), label }));
                const votes = {};
                options.forEach(o => { votes[o.id] = 0; });
                await addDoc(collection(db, 'markets'), { ...base, type: 'multi', options, votes, vote_count: 0 });
            } else {
                await addDoc(collection(db, 'markets'), base);
            }

            Alert.alert('Success', 'Market created!');
            setModalVisible(false);
            setNewQuestion('');
            setNewSource('');
            setNewType('binary');
            setNewOptions(['', '']);
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
                <ActivityIndicator size="large" color="#5EEAD4" />
            </BackgroundLayout>
        );
    }

    return (
        <BackgroundLayout>
            <View style={[styles.container, { paddingTop: headerHeight }]}>
                {/* Tab Switcher */}
                <View style={styles.tabContainer}>
                    <Chip label="Active" active={activeTab === 'active'} onPress={() => setActiveTab('active')} />
                    <Chip label="Resolved" active={activeTab === 'resolved'} onPress={() => setActiveTab('resolved')} />
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
                                <Chip
                                    label={item}
                                    active={selectedCategory === item}
                                    onPress={() => setSelectedCategory(item)}
                                    style={{ marginRight: 8 }}
                                />
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
                                    <Ionicons name="close" size={24} color="rgba(255,255,255,0.6)" />
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.label}>Question</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Will it rain tomorrow?"
                                placeholderTextColor="rgba(255,255,255,0.4)"
                                value={newQuestion}
                                onChangeText={setNewQuestion}
                                multiline
                            />

                            <Text style={styles.label}>Source / Description</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Weather.com"
                                placeholderTextColor="rgba(255,255,255,0.4)"
                                value={newSource}
                                onChangeText={setNewSource}
                            />

                            <Text style={styles.label}>Type</Text>
                            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                                <Chip label="Binary (Yes/No)" active={newType === 'binary'} onPress={() => setNewType('binary')} />
                                <Chip label="Multi Choice" active={newType === 'multi'} onPress={() => setNewType('multi')} />
                            </View>

                            {newType === 'multi' && (
                                <>
                                    <Text style={styles.label}>Options (2-4)</Text>
                                    {newOptions.map((opt, i) => (
                                        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                            <TextInput
                                                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                                                placeholder={`Option ${i + 1}`}
                                                placeholderTextColor="rgba(255,255,255,0.4)"
                                                value={opt}
                                                onChangeText={(text) => updateOption(i, text)}
                                            />
                                            {newOptions.length > 2 && (
                                                <TouchableOpacity onPress={() => removeOption(i)} style={{ padding: 6 }}>
                                                    <Ionicons name="close-circle" size={22} color="rgba(255,255,255,0.4)" />
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    ))}
                                    {newOptions.length < 4 && (
                                        <TouchableOpacity onPress={addOption} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 }}>
                                            <Ionicons name="add-circle-outline" size={18} color={Colors.dark.accent} />
                                            <Text style={{ color: Colors.dark.accent, fontFamily: 'Inter_600SemiBold', fontSize: 14 }}>Add Option</Text>
                                        </TouchableOpacity>
                                    )}
                                </>
                            )}

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
                                            backgroundColor: newCategory === cat ? '#5EEAD4' : 'rgba(255,255,255,0.1)',
                                            borderWidth: 1,
                                            borderColor: newCategory === cat ? '#5EEAD4' : 'rgba(255,255,255,0.1)',
                                        }}
                                    >
                                        <Text style={{
                                            color: newCategory === cat ? '#08201C' : 'rgba(255,255,255,0.6)',
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
                                            style: {
                                                width: '100%',
                                                padding: 12,
                                                borderRadius: 12,
                                                backgroundColor: 'rgba(255,255,255,0.1)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                color: '#fff',
                                                fontSize: 14,
                                                colorScheme: 'dark',
                                            }
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
                                            style: {
                                                width: '100%',
                                                padding: 12,
                                                borderRadius: 12,
                                                backgroundColor: 'rgba(255,255,255,0.1)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                color: '#fff',
                                                fontSize: 14,
                                                colorScheme: 'dark',
                                            }
                                        })}
                                    </View>
                                </View>
                            ) : (
                                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                                    <TouchableOpacity onPress={() => { setMode('date'); setShowDatePicker(true); }} style={styles.dateBtn}>
                                        <Text style={styles.dateBtnText}>{closeDate.toLocaleDateString()}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => { setMode('time'); setShowDatePicker(true); }} style={styles.dateBtn}>
                                        <Text style={styles.dateBtnText}>{closeDate.toLocaleTimeString()}</Text>
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

                            <GradientButton
                                title={creating ? 'Creating...' : 'Create Market'}
                                onPress={handleCreateMarket}
                                loading={creating}
                                style={styles.createBtn}
                            />
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
    list: {
        padding: 16,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 50,
        color: Colors.dark.textTertiary,
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
        backgroundColor: Colors.dark.modal,
        borderTopLeftRadius: Radius.xl,
        borderTopRightRadius: Radius.xl,
        borderRadius: Platform.OS === 'web' ? Radius.xl : 0,
        padding: 24,
        width: Platform.OS === 'web' ? '90%' : '100%',
        maxWidth: Platform.OS === 'web' ? 500 : '100%',
        borderWidth: 1,
        borderColor: Colors.dark.border,
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
        color: Colors.dark.textSecondary,
    },
    input: {
        backgroundColor: 'rgba(0,0,0,0.25)',
        padding: 12,
        borderRadius: Radius.md,
        fontSize: 16,
        marginBottom: 20,
        color: '#fff',
        fontFamily: 'Inter_400Regular',
        borderWidth: 1,
        borderColor: Colors.dark.border,
    },
    createBtn: {
        marginTop: 10,
    },
    dateBtn: {
        flex: 1,
        backgroundColor: Colors.dark.surface,
        padding: 12,
        borderRadius: Radius.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.dark.border,
    },
    dateBtnText: {
        color: '#fff',
        fontFamily: 'Inter_600SemiBold',
        fontSize: 14,
    }
});
