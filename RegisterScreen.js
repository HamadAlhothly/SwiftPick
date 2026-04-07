// SwiftPick — Register Screen
import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, ScrollView
} from 'react-native';
import { COLORS } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';

export default function RegisterScreen({ navigation }) {
    const { register } = useAuth();
    const [form, setForm] = useState({
        full_name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        role: 'parent',
    });
    const [loading, setLoading] = useState(false);

    function updateField(field, value) {
        setForm((prev) => ({ ...prev, [field]: value }));
    }

    async function handleRegister() {
        if (!form.full_name.trim() || !form.email.trim() || !form.password) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
        }
        if (form.password.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters');
            return;
        }
        if (form.password !== form.confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            await register({
                full_name: form.full_name.trim(),
                email: form.email.trim().toLowerCase(),
                phone: form.phone.trim(),
                password: form.password,
                role: form.role,
            });
            Alert.alert('Success', 'Account created! You can now log in.', [
                { text: 'OK', onPress: () => navigation.navigate('Login') },
            ]);
        } catch (error) {
            Alert.alert('Registration Failed', error.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                <Text style={styles.heading}>Create Account</Text>
                <Text style={styles.subtitle}>Join SwiftPick for safe school pickups</Text>

                <Text style={styles.label}>Full Name *</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Sara Ahmad"
                    placeholderTextColor={COLORS.textMuted}
                    value={form.full_name}
                    onChangeText={(v) => updateField('full_name', v)}
                />

                <Text style={styles.label}>Email *</Text>
                <TextInput
                    style={styles.input}
                    placeholder="email@example.com"
                    placeholderTextColor={COLORS.textMuted}
                    value={form.email}
                    onChangeText={(v) => updateField('email', v)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                />

                <Text style={styles.label}>Phone</Text>
                <TextInput
                    style={styles.input}
                    placeholder="+966 5XX XXX XXXX"
                    placeholderTextColor={COLORS.textMuted}
                    value={form.phone}
                    onChangeText={(v) => updateField('phone', v)}
                    keyboardType="phone-pad"
                />

                <Text style={styles.label}>Role</Text>
                <View style={styles.roleRow}>
                    {['parent', 'driver'].map((role) => (
                        <TouchableOpacity
                            key={role}
                            style={[styles.roleBtn, form.role === role && styles.roleBtnActive]}
                            onPress={() => updateField('role', role)}
                        >
                            <Text style={[styles.roleBtnText, form.role === role && styles.roleBtnTextActive]}>
                                {role === 'parent' ? '👨‍👩‍👧 Parent' : '🚌 Driver'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.label}>Password *</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Minimum 6 characters"
                    placeholderTextColor={COLORS.textMuted}
                    value={form.password}
                    onChangeText={(v) => updateField('password', v)}
                    secureTextEntry
                />

                <Text style={styles.label}>Confirm Password *</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Re-enter password"
                    placeholderTextColor={COLORS.textMuted}
                    value={form.confirmPassword}
                    onChangeText={(v) => updateField('confirmPassword', v)}
                    secureTextEntry
                />

                <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={handleRegister}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Create Account</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.linkBtn}
                    onPress={() => navigation.navigate('Login')}
                >
                    <Text style={styles.linkText}>
                        Already have an account?{' '}
                        <Text style={styles.linkHighlight}>Sign In</Text>
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    scroll: { paddingHorizontal: 28, paddingTop: 60, paddingBottom: 40 },
    heading: { fontSize: 28, fontWeight: '800', color: COLORS.text },
    subtitle: { color: COLORS.textSecondary, fontSize: 14, marginTop: 6, marginBottom: 20 },
    label: {
        color: COLORS.textSecondary, fontSize: 13, fontWeight: '600',
        marginBottom: 6, marginTop: 14, textTransform: 'uppercase', letterSpacing: 0.8,
    },
    input: {
        backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border,
        borderRadius: 12, padding: 14, fontSize: 16, color: COLORS.text,
    },
    roleRow: { flexDirection: 'row', gap: 12 },
    roleBtn: {
        flex: 1, padding: 14, borderRadius: 12, borderWidth: 1,
        borderColor: COLORS.border, backgroundColor: COLORS.bgCard, alignItems: 'center',
    },
    roleBtnActive: {
        borderColor: COLORS.primary, backgroundColor: COLORS.primary + '22',
    },
    roleBtnText: { color: COLORS.textSecondary, fontWeight: '500' },
    roleBtnTextActive: { color: COLORS.primary, fontWeight: '700' },
    button: {
        backgroundColor: COLORS.primary, borderRadius: 14, padding: 16,
        alignItems: 'center', marginTop: 28,
        shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
    },
    buttonDisabled: { opacity: 0.7 },
    buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
    linkBtn: { alignItems: 'center', marginTop: 20 },
    linkText: { color: COLORS.textSecondary, fontSize: 14 },
    linkHighlight: { color: COLORS.primary, fontWeight: '600' },
});
