import React, { forwardRef } from 'react';
import { Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Gradients, Radius } from '../constants/theme';

// Primary call-to-action: gradient fill, soft accent glow, subtle press scale.
// Forwards ref + any extra props (href, role, target, ...) so this still works
// as the child of expo-router's <Link asChild> — Link/Slot clones its child
// with those props merged in, and react-native-web only renders a real <a>
// when `href` reaches the underlying Pressable/View.
const GradientButton = forwardRef(function GradientButton({
    title,
    onPress,
    icon,
    loading,
    disabled,
    variant = 'accent', // 'accent' | 'danger'
    style,
    textStyle,
    ...rest
}, ref) {
    const colors = variant === 'danger' ? Gradients.dangerButton : Gradients.accentButton;
    const glowColor = variant === 'danger' ? Colors.dark.dangerDeep : Colors.dark.accentDeep;

    return (
        <Pressable
            ref={ref}
            onPress={onPress}
            disabled={disabled || loading}
            style={({ pressed, hovered }) => [
                styles.wrapper,
                { shadowColor: glowColor },
                (disabled || loading) && styles.disabled,
                pressed && styles.pressed,
                hovered && !pressed && styles.hovered,
                style,
            ]}
            {...rest}
        >
            <LinearGradient
                colors={colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradient}
            >
                {loading ? (
                    <ActivityIndicator color={Colors.dark.onAccent} />
                ) : (
                    <>
                        <Text style={[styles.text, textStyle]}>{title}</Text>
                        {icon}
                    </>
                )}
            </LinearGradient>
        </Pressable>
    );
});

export default GradientButton;

const styles = StyleSheet.create({
    wrapper: {
        borderRadius: Radius.pill,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 18,
        elevation: 8,
    },
    gradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 16,
        borderRadius: Radius.pill,
    },
    text: {
        color: Colors.dark.onAccent,
        fontSize: 16,
        fontFamily: 'Inter_700Bold',
    },
    pressed: {
        transform: [{ scale: 0.97 }],
        shadowOpacity: 0.2,
    },
    hovered: {
        shadowOpacity: 0.5,
    },
    disabled: {
        opacity: 0.6,
        shadowOpacity: 0,
    },
});
