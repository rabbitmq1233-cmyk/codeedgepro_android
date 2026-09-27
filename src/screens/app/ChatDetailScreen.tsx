import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../services/api';
import { LoadingScreen } from '../../components';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../config/theme';
import type { Message } from '../../types';

interface DisplayMessage extends Message {
  isStreaming?: boolean;
}

export function ChatDetailScreen({ route }: any) {
  const { chatId } = route.params;
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadMessages();
  }, [chatId]);

  const loadMessages = async () => {
    try {
      const data = await apiClient.getChatMessages(chatId);
      setMessages(data);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  const sendMessage = async () => {
    const text = inputText.trim();
    if (!text) return;

    setIsSending(true);
    setInputText('');

    // Optimistically add user message
    const userMsg: DisplayMessage = {
      id: `temp-user-${Date.now()}`,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };

    // Add placeholder for streaming assistant response
    const assistantMsg: DisplayMessage = {
      id: `temp-assistant-${Date.now()}`,
      role: 'assistant',
      content: '',
      isStreaming: true,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    scrollToBottom();

    try {
      let streamedContent = '';

      await apiClient.streamMessage(chatId, text, [], {
        onChunk: (content: string) => {
          streamedContent += content;
          // Update the streaming message in place
          setMessages((prev) => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            if (lastIdx >= 0 && updated[lastIdx].isStreaming) {
              updated[lastIdx] = {
                ...updated[lastIdx],
                content: streamedContent,
              };
            }
            return updated;
          });
          scrollToBottom();
        },
        onMeta: (meta) => {
          // Update the streaming message with token/cost info
          setMessages((prev) => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            if (lastIdx >= 0 && updated[lastIdx].isStreaming) {
              updated[lastIdx] = {
                ...updated[lastIdx],
                tokens: meta.tokens,
                cost_usd: meta.cost_usd,
              };
            }
            return updated;
          });
        },
        onDone: (messageId: string) => {
          // Finalize the streaming message
          setMessages((prev) => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            if (lastIdx >= 0 && updated[lastIdx].isStreaming) {
              updated[lastIdx] = {
                ...updated[lastIdx],
                id: messageId,
                isStreaming: false,
              };
            }
            return updated;
          });
        },
        onError: (errorMsg: string) => {
          setMessages((prev) => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            if (lastIdx >= 0 && updated[lastIdx].isStreaming) {
              updated[lastIdx] = {
                ...updated[lastIdx],
                content: `Error: ${errorMsg}`,
                isStreaming: false,
              };
            }
            return updated;
          });
        },
      });
    } catch (error: any) {
      // If streaming fails entirely, update the placeholder
      setMessages((prev) => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        if (lastIdx >= 0 && updated[lastIdx].isStreaming) {
          updated[lastIdx] = {
            ...updated[lastIdx],
            content: 'Failed to get response. Please try again.',
            isStreaming: false,
          };
        }
        return updated;
      });
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const renderMessage = ({ item }: { item: DisplayMessage }) => {
    const isUser = item.role === 'user';

    return (
      <View style={[styles.messageRow, isUser && styles.userRow]}>
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userBubble : styles.assistantBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isUser ? styles.userText : styles.assistantText,
            ]}
          >
            {item.content}
            {item.isStreaming && item.content.length === 0 && '...'}
          </Text>
          {item.isStreaming && (
            <View style={styles.streamingIndicator}>
              <ActivityIndicator size="small" color={COLORS.primary} />
            </View>
          )}
          <View style={styles.metaRow}>
            <Text
              style={[
                styles.messageTime,
                isUser && styles.userTimeText,
              ]}
            >
              {formatTime(item.created_at)}
            </Text>
            {item.tokens != null && (
              <Text
                style={[
                  styles.tokenInfo,
                  isUser && styles.userTimeText,
                ]}
              >
                {item.tokens} tokens
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return <LoadingScreen message="Loading messages..." />;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={scrollToBottom}
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <Ionicons name="chatbubbles-outline" size={48} color={COLORS.disabled} />
            <Text style={styles.emptyChatText}>
              Start the conversation by sending a message
            </Text>
          </View>
        }
      />
      <View style={styles.inputArea}>
        <TextInput
          style={styles.input}
          placeholder="Type your message..."
          placeholderTextColor={COLORS.textTertiary}
          value={inputText}
          onChangeText={setInputText}
          editable={!isSending}
          multiline
          maxLength={5000}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!inputText.trim() || isSending) && styles.sendButtonDisabled,
          ]}
          onPress={sendMessage}
          disabled={isSending || !inputText.trim()}
        >
          {isSending ? (
            <ActivityIndicator size="small" color={COLORS.textInverse} />
          ) : (
            <Ionicons name="send" size={20} color={COLORS.textInverse} />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  messageList: {
    padding: SPACING.lg,
    gap: SPACING.sm,
    flexGrow: 1,
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  messageBubble: {
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    maxWidth: '80%',
  },
  userBubble: {
    backgroundColor: COLORS.chatUserBubble,
    borderBottomRightRadius: RADIUS.sm,
  },
  assistantBubble: {
    backgroundColor: COLORS.chatAssistantBubble,
    borderBottomLeftRadius: RADIUS.sm,
  },
  messageText: {
    fontSize: FONTS.sizes.md,
    lineHeight: 20,
  },
  userText: {
    color: COLORS.chatUserText,
  },
  assistantText: {
    color: COLORS.chatAssistantText,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.xs,
    gap: SPACING.sm,
  },
  messageTime: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textTertiary,
  },
  userTimeText: {
    color: 'rgba(255,255,255,0.7)',
  },
  tokenInfo: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textTertiary,
  },
  streamingIndicator: {
    marginTop: SPACING.xs,
  },
  emptyChat: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    gap: SPACING.md,
  },
  emptyChatText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textTertiary,
    textAlign: 'center',
    paddingHorizontal: SPACING.xxl,
  },
  inputArea: {
    flexDirection: 'row',
    padding: SPACING.md,
    gap: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    backgroundColor: COLORS.background,
    ...SHADOWS.small,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    maxHeight: 100,
    fontSize: FONTS.sizes.md,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.surface,
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-end',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
