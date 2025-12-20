import React from 'react';
import { StyleSheet, View, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function BackgroundLayout({ children, style }) {
    return (
        <View style={[styles.container, style]}>
            <StatusBar barStyle="light-content" />
            <LinearGradient
                colors={['#141E30', '#243B55']}
                style={styles.background}
            />
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#141E30', // Fallback
    },
    background: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
    },
});
