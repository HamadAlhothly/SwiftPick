// SwiftPick — AI Chat Screen (Parent)
// Full chat interface for parents to interact with the SwiftPick AI Assistant.
// Uses aiService.js → Flowise → Azure OpenAI for intelligent NLP responses.
import React, { useState, useRef, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { COLORS } from '../../utils/constants';
import { askAssistant, predictETA } from '../../services/aiService';

const SUGGESTED_QUESTIONS = [
    '🚌 Where is my child\'s bus?',
    '⏱️ What is the estimated arrival time?',
    '✅ Has my child been picked up?',
    '📍 Is the bus near the school?',
];

export default function AIChatScreen({ route }) {
    const [messages, setMessages] = useState([
        {
            id: 'welcome',
            text: 'Hello! 👋 I\'m the SwiftPick AI Assistant. I can help you with bus tracking, pickup status, and estimated arrival times.\n\nWhat would you like to know?',
            sender: 'ai',
            timestamp: new Date(),
        },
    ]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const flatListRef = useRef(null);

    const tripData = route?.params?.tripData || {};

    /**
     * Send a message to the AI assistant.
     */
    const handleSend = useCallback(async (text) => {
        const question = text || inputText.trim();
        if (!question || isLoading) return;

        // Add user message
        const userMessage = {
            id: `user_${Date.now()}`,
            text: question,
            sender: 'user',
            timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMessage]);
        setInputText('');
        setIsLoading(true);

        try {
            // Call Flowise → Azure OpenAI via our aiService
            const response = await askAssistant(question, tripData);

            const aiMessage = {
                id: `ai_${Date.now()}`,
                text: response,
                sender: 'ai',
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, aiMessage]);
        } catch (error) {
            const errorMessage = {
                id: `error_${Date.now()}`,
                text: '⚠️ Sorry, I couldn\'t process that. Please try again.',
                sender: 'ai',
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    }, [inputText, isLoading, tripData]);

    /**
     * Render a single chat message bubble.
     */
    const renderMessage = ({ item }) => {
        const isUser = item.sender === 'user';
        return (
            <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.aiBubble]}>
                {!isUser && <Text style={styles.aiLabel}>🤖 SwiftPick AI</Text>}
                <Text style={[styles.messageText, isUser && styles.userText]}>
                    {item.text}
                </Text>
                <Text style={styles.timestamp}>
                    {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={90}
        >
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerEmoji}>🤖</Text>
                <View>
                    <Text style={styles.headerTitle}>SwiftPick AI Assistant</Text>
                    <Text style={styles.headerSubtitle}>Powered by Azure OpenAI via Flowise</Text>
                </View>
            </View>

            {/* Chat Messages */}
            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => item.id}
                renderItem={renderMessage}
                contentContainerStyle={styles.messagesList}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />

            {/* Suggested Questions (shown only when no user messages yet) */}
            {messages.length <= 1 && (
                <View style={styles.suggestionsContainer}>
                    <Text style={styles.suggestionsLabel}>Try asking:</Text>
                    {SUGGESTED_QUESTIONS.map((q, idx) => (
                        <TouchableOpacity
                            key={idx}
                            style={styles.suggestionChip}
                            onPress={() => handleSend(q)}
                        >
                            <Text style={styles.suggestionText}>{q}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {/* Loading Indicator */}
            {isLoading && (
                <View style={styles.typingIndicator}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                    <Text style={styles.typingText}>AI is thinking...</Text>
                </View>
            )}

            {/* Input Bar */}
            <View style={styles.inputBar}>
                <TextInput
                    style={styles.textInput}
                    placeholder="Ask about bus location, ETA..."
                    placeholderTextColor="#666"
                    value={inputText}
                    onChangeText={setInputText}
                    onSubmitEditing={() => handleSend()}
                    returnKeyType="send"
                    editable={!isLoading}
                />
                <TouchableOpacity
                    style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
                    onPress={() => handleSend()}
                    disabled={!inputText.trim() || isLoading}
                >
                    <Text style={styles.sendButtonText}>➤</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F0F1A',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#1A1A2E',
        borderBottomWidth: 1,
        borderBottomColor: '#2A2A3E',
    },
    headerEmoji: {
        fontSize: 28,
        marginRight: 12,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFF',
    },
    headerSubtitle: {
        fontSize: 11,
        color: COLORS.primary,
        marginTop: 2,
    },
    messagesList: {
        padding: 16,
        paddingBottom: 8,
    },
    messageBubble: {
        maxWidth: '82%',
        padding: 12,
        borderRadius: 16,
        marginBottom: 10,
    },
    userBubble: {
        alignSelf: 'flex-end',
        backgroundColor: COLORS.primary,
        borderBottomRightRadius: 4,
    },
    aiBubble: {
        alignSelf: 'flex-start',
        backgroundColor: '#1E1E36',
        borderBottomLeftRadius: 4,
    },
    aiLabel: {
        fontSize: 10,
        color: COLORS.primaryLight,
        marginBottom: 4,
        fontWeight: '600',
    },
    messageText: {
        fontSize: 14,
        color: '#DDD',
        lineHeight: 20,
    },
    userText: {
        color: '#FFF',
    },
    timestamp: {
        fontSize: 10,
        color: '#888',
        marginTop: 4,
        alignSelf: 'flex-end',
    },
    suggestionsContainer: {
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    suggestionsLabel: {
        fontSize: 12,
        color: '#888',
        marginBottom: 8,
    },
    suggestionChip: {
        backgroundColor: '#1E1E36',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
        marginBottom: 6,
        borderWidth: 1,
        borderColor: '#2A2A3E',
    },
    suggestionText: {
        color: '#CCC',
        fontSize: 13,
    },
    typingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 8,
    },
    typingText: {
        color: '#888',
        fontSize: 12,
        marginLeft: 8,
    },
    inputBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: '#1A1A2E',
        borderTopWidth: 1,
        borderTopColor: '#2A2A3E',
    },
    textInput: {
        flex: 1,
        backgroundColor: '#0F0F1A',
        color: '#FFF',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 24,
        fontSize: 14,
        borderWidth: 1,
        borderColor: '#2A2A3E',
    },
    sendButton: {
        marginLeft: 10,
        backgroundColor: COLORS.primary,
        width: 42,
        height: 42,
        borderRadius: 21,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: '#333',
    },
    sendButtonText: {
        color: '#FFF',
        fontSize: 18,
    },
});
