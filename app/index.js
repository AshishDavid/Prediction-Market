import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import BackgroundLayout from '../components/BackgroundLayout';
import GradientButton from '../components/GradientButton';
import { Colors, Radius } from '../constants/theme';

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
                        <Ionicons name="pulse" size={72} color={Colors.dark.accent} />
                    </View>
                    <Text style={styles.title}>Pulse</Text>
                    <Text style={styles.subtitle}>
                        Real-time opinion & prediction platform.
                    </Text>
                    <Text style={styles.description}>
                        Share your views on world events, track public sentiment, and see how your forecasts stack up against the crowd.
                    </Text>

                    <Link href="/login" asChild>
                        <GradientButton
                            title="Get Started"
                            icon={<Ionicons name="arrow-forward" size={20} color={Colors.dark.onAccent} />}
                            style={styles.ctaButton}
                        />
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
        <Pressable style={({ hovered }) => [styles.card, hovered && styles.cardHovered]}>
            <View style={styles.iconBox}>
                <LinearGradient
                    colors={['rgba(94,234,212,0.28)', 'rgba(94,234,212,0.04)']}
                    style={styles.iconBoxGradient}
                >
                    <Ionicons name={icon} size={24} color={Colors.dark.accent} />
                </LinearGradient>
            </View>
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.cardDesc}>{desc}</Text>
        </Pressable>
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
        marginBottom: 64,
        maxWidth: 600,
        width: '100%',
    },
    logoContainer: {
        width: 112,
        height: 112,
        borderRadius: 56,
        backgroundColor: 'rgba(94, 234, 212, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 28,
        borderWidth: 1,
        borderColor: 'rgba(94, 234, 212, 0.25)',
        shadowColor: Colors.dark.glowTeal,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 30,
        elevation: 10,
    },
    title: {
        fontSize: 52,
        fontFamily: 'Inter_900Black',
        color: '#fff',
        marginBottom: 12,
        letterSpacing: -1.5,
    },
    subtitle: {
        fontSize: 18,
        fontFamily: 'Inter_600SemiBold',
        color: Colors.dark.accent,
        marginBottom: 24,
        textAlign: 'center',
    },
    description: {
        fontSize: 16,
        fontFamily: 'Inter_400Regular',
        color: Colors.dark.textSecondary,
        textAlign: 'center',
        lineHeight: 25,
        marginBottom: 40,
        maxWidth: 400,
    },
    ctaButton: {
        paddingHorizontal: 24,
        alignSelf: 'center',
        minWidth: 220,
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
        backgroundColor: Colors.dark.surface,
        borderRadius: Radius.xl,
        padding: 24,
        borderWidth: 1,
        borderColor: Colors.dark.border,
        borderTopColor: Colors.dark.surfaceHighlight,
        minWidth: 280,
        flexGrow: 1,
        // @ts-ignore web-only transition, harmless no-op on native
        transitionDuration: '200ms',
    },
    cardHovered: {
        backgroundColor: Colors.dark.surfaceElevated,
        borderColor: Colors.dark.borderStrong,
    },
    iconBox: {
        width: 52,
        height: 52,
        borderRadius: Radius.md,
        marginBottom: 16,
        overflow: 'hidden',
    },
    iconBoxGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
        color: Colors.dark.textSecondary,
        lineHeight: 20,
    },
    footer: {
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    legalText: {
        fontSize: 12,
        fontFamily: 'Inter_400Regular',
        color: Colors.dark.textTertiary,
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
