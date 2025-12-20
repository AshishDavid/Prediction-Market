import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Dimensions } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import BackgroundLayout from '../components/BackgroundLayout';

const { width } = Dimensions.get('window');

export default function LandingPage() {
    const router = useRouter();

    return (
        <BackgroundLayout>
            <ScrollView
                contentContainerStyle={styles.container}
                showsVerticalScrollIndicator={false}
            >
                {/* Hero Section */}
                <View style={styles.hero}>
                    <View style={styles.logoContainer}>
                        <Ionicons name="pulse" size={80} color="#69F0AE" />
                    </View>
                    <Text style={styles.title}>Pulse</Text>
                    <Text style={styles.subtitle}>
                        Real-time opinion & prediction platform.
                    </Text>
                    <Text style={styles.description}>
                        Share your views on world events, track public sentiment, and see how your forecasts stack up against the crowd.
                    </Text>

                    <Link href="/login" asChild>
                        <TouchableOpacity style={styles.ctaButton}>
                            <Text style={styles.ctaText}>Get Started</Text>
                            <Ionicons name="arrow-forward" size={20} color="#141E30" />
                        </TouchableOpacity>
                    </Link>
                </View>

                {/* Features Grid */}
                <View style={styles.featuresContainer}>
                    <Text style={styles.sectionTitle}>Key Features</Text>

                    <View style={styles.grid}>
                        <FeatureCard
                            icon="globe-outline"
                            title="Global Events"
                            desc="Explore predictions on finance, tech, sports, and politics."
                        />
                        <FeatureCard
                            icon="analytics-outline"
                            title="Track Sentiment"
                            desc="Watch how the crowd's opinion shifts over time."
                        />
                        <FeatureCard
                            icon="trophy-outline"
                            title="Earn Rankings"
                            desc="Climb the leaderboard by making accurate forecasts."
                        />
                        <FeatureCard
                            icon="school-outline"
                            title="Test Foresight"
                            desc="A fun and educational way to challenge your intuition."
                        />
                    </View>
                </View>

                {/* Footer / Legal */}
                <View style={styles.footer}>
                    <Text style={styles.legalText}>
                        Legal note: Pulse is for entertainment and information purposes only. It does not offer financial advice, trading, or betting services.
                    </Text>
                    <Text style={styles.copyright}>© 2025 Pulse Inc.</Text>
                </View>
            </ScrollView>
        </BackgroundLayout>
    );
}

function FeatureCard({ icon, title, desc }) {
    return (
        <View style={styles.card}>
            <View style={styles.iconBox}>
                <Ionicons name={icon} size={24} color="#69F0AE" />
            </View>
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.cardDesc}>{desc}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 24,
        paddingTop: 80,
        paddingBottom: 40,
        alignItems: 'center',
    },
    hero: {
        alignItems: 'center',
        marginBottom: 60,
        maxWidth: 600,
        width: '100%',
    },
    logoContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(105, 240, 174, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(105, 240, 174, 0.3)',
        shadowColor: '#69F0AE',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
    },
    title: {
        fontSize: 48,
        fontFamily: 'Inter_900Black',
        color: '#fff',
        marginBottom: 12,
        letterSpacing: -1,
    },
    subtitle: {
        fontSize: 18,
        fontFamily: 'Inter_600SemiBold',
        color: '#69F0AE',
        marginBottom: 24,
        textAlign: 'center',
    },
    description: {
        fontSize: 16,
        fontFamily: 'Inter_400Regular',
        color: 'rgba(255, 255, 255, 0.7)',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 40,
        maxWidth: 400,
    },
    ctaButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#69F0AE',
        paddingVertical: 16,
        paddingHorizontal: 40,
        borderRadius: 30,
        shadowColor: '#69F0AE',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5,
        gap: 10,
    },
    ctaText: {
        color: '#141E30',
        fontSize: 18,
        fontFamily: 'Inter_700Bold',
    },
    featuresContainer: {
        width: '100%',
        maxWidth: 800,
        marginBottom: 60,
    },
    sectionTitle: {
        fontSize: 24,
        fontFamily: 'Inter_700Bold',
        color: '#fff',
        marginBottom: 30,
        textAlign: 'center',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 20,
    },
    card: {
        width: '100%',
        maxWidth: 350,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 20,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        minWidth: 280,
        flexGrow: 1,
    },
    iconBox: {
        width: 50,
        height: 50,
        borderRadius: 15,
        backgroundColor: 'rgba(105, 240, 174, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    cardTitle: {
        fontSize: 18,
        fontFamily: 'Inter_700Bold',
        color: '#fff',
        marginBottom: 8,
    },
    cardDesc: {
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
        color: 'rgba(255, 255, 255, 0.6)',
        lineHeight: 20,
    },
    footer: {
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    legalText: {
        fontSize: 12,
        fontFamily: 'Inter_400Regular',
        color: 'rgba(255, 255, 255, 0.4)',
        textAlign: 'center',
        marginBottom: 12,
        maxWidth: 500,
    },
    copyright: {
        fontSize: 12,
        fontFamily: 'Inter_600SemiBold',
        color: 'rgba(255, 255, 255, 0.2)',
    }
});
