import React from 'react';
import { StyleSheet, View, StatusBar, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg';
import { Colors } from '../constants/theme';

// Soft, fixed ambient light sources behind the content — turns the flat
// navy base into something with depth instead of a plain wash.
function AmbientGlow({ width, height }) {
    return (
        <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
            <Defs>
                <RadialGradient id="glowTeal" cx="50%" cy="50%" r="50%">
                    <Stop offset="0%" stopColor={Colors.dark.glowTeal} stopOpacity={0.28} />
                    <Stop offset="100%" stopColor={Colors.dark.glowTeal} stopOpacity={0} />
                </RadialGradient>
                <RadialGradient id="glowViolet" cx="50%" cy="50%" r="50%">
                    <Stop offset="0%" stopColor={Colors.dark.glowViolet} stopOpacity={0.22} />
                    <Stop offset="100%" stopColor={Colors.dark.glowViolet} stopOpacity={0} />
                </RadialGradient>
            </Defs>
            <Circle cx={width * 0.82} cy={height * 0.04} r={Math.max(width, height) * 0.5} fill="url(#glowTeal)" />
            <Circle cx={width * 0.08} cy={height * 0.62} r={Math.max(width, height) * 0.55} fill="url(#glowViolet)" />
        </Svg>
    );
}

export default function BackgroundLayout({ children, style }) {
    const { width, height } = useWindowDimensions();

    return (
        <View style={[styles.container, style]}>
            <StatusBar barStyle="light-content" />
            <LinearGradient
                colors={[Colors.dark.bgStart, Colors.dark.bgEnd]}
                start={{ x: 0.2, y: 0 }}
                end={{ x: 0.8, y: 1 }}
                style={styles.background}
            />
            <AmbientGlow width={width} height={height} />
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.dark.bgStart, // Fallback
    },
    background: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
    },
});
