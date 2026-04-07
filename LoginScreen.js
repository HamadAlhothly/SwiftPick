// SwiftPick — Login Screen
import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, KeyboardAvoidingView, Platform, Alert, ActivityIndicator
} from 'react-native';
import { COLORS } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';

export default function LoginScreen({ navigation }) {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleLogin() {
        if (!email.trim() || !password) {
            Alert.alert('Error', 'Please enter your email and password');
            return;
        }

        setLoading(true);
        try {
            await login(email.trim().toLowerCase(), password);
            // Navigation will auto-switch via AuthContext
        } catch (error) {
            Alert.alert('Login Failed', error.message || 'Invalid email or password');
        } finally {
            setLoading(false);
        }
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={styles.inner}>
                {/* Logo area */}
                <View style={styles.logoArea}>
                    <Text style={styles.logo}>🚸</Text>
                    <Text style={styles.appName}>SwiftPick</Text>
                    <Text style={styles.tagline}>School Pickup & Bus Tracking</Text>
                </View>

                {/* Form */}
                <View style={styles.form}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="email@example.com"
                        placeholderTextColor={COLORS.textMuted}
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                    />

                    <Text style={styles.label}>Password</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="••••••••"
                        placeholderTextColor={COLORS.textMuted}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />

                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>Sign In</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.linkBtn}
                        onPress={() => navigation.navigate('Register')}
                    >
                        <Text style={styles.linkText}>
                            Don't have an account?{' '}
                            <Text style={styles.linkHighlight}>Register</Text>
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    inner: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 28,
    },
    logoArea: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logo: {
        fontSize: 60,
    },
    appName: {
        fontSize: 32,
        fontWeight: '800',
        color: COLORS.text,
        marginTop: 10,
        letterSpacing: 1,
    },
    tagline: {
        color: COLORS.textSecondary,
        fontSize: 14,
        marginTop: 6,
    },
    form: {},
    label: {
        color: COLORS.textSecondary,
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 6,
        marginTop: 14,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    input: {
        backgroundColor: COLORS.bgCard,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        color: COLORS.text,
    },
    button: {
        backgroundColor: COLORS.primary,
        borderRadius: 14,
        padding: 16,
        alignItems: 'center',
        marginTop: 28,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '700',
    },
    linkBtn: {
        alignItems: 'center',
        marginTop: 20,
    },
    linkText: {
        color: COLORS.textSecondary,
        fontSize: 14,
    },
    linkHighlight: {
        color: COLORS.primary,
        fontWeight: '600',
    },
});
