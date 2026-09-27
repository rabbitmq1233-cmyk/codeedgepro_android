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
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../services/api';
import { LoadingScreen } from '../../components';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../config/theme';
import type { Message, ProjectExpert } from '../../types';

interface DisplayMessage extends Message {
  isStreaming?: boolean;
}

export function ChatDetailScreen({ route }: any) {
  const { chatId, projectId } = route.params;
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  // Expert selection — REQUIRED before any message can be sent
  // (backend expert_ids binding:"required,min=1"). Loaded from the chat's
  // project assigned-expert list.
  const [projectExperts, setProjectExperts] = useState<ProjectExpert[]>([]);
  const [selectedExpertIds, setSelectedExpertIds] = useState<string[]>([]);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadMessages();
    loadProjectExperts();
  }, [chatId, projectId]);

  const loadProjectExperts = async () => {
    try {
      const project = await apiClient.getProjectDetails(projectId);
      const active = (project.experts || []).filter((e) => e.is_active);
      setProjectExperts(active);
      // Default: select all assigned experts so the user can send immediately.
      setSelectedExpertIds(active.map((e) => e.expert_id));
    } catch (error) {
      console.error('Failed to load project experts:', error);
    }
  };

  const toggleExpert = (expertId: string) => {
    setSelectedExpertIds((prev) =>
      prev.includes(expertId) ? prev.filter((id) => id !== expertId) : [...prev, expertId]
    );
  };

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
    if (selectedExpertIds.length === 0) {
      return; // Send is disabled in this state, but guard anyway.
    }

    setIsSending(true);
    setInputText('');

    // Optimistically add user message
    const userMsg: DisplayMessage = {
      id: `temp-user-${Date.now()}`,
      chat_id: chatId,
      role: 'user',
      content: text,
      turn_number: 0,
      created_at: new Date().toISOString(),
    };

    // Add placeholder for streaming assistant response
    const assistantMsg: DisplayMessage = {
      id: `temp-assistant-${Date.now()}`,
      chat_id: chatId,
      role: 'assistant',
      content: '',
      turn_number: 0,
      isStreaming: true,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    scrollToBottom();

    try {
      let streamedContent = '';

      await apiClient.streamMessage(chatId, text, selectedExpertIds, {
        onChunk: (content: string) => {
          // Incremental tokens — only sent when exactly 1 expert selected.
          streamedContent += content;
          setMessages((prev) => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            if (lastIdx >= 0 && updated[lastIdx].isStreaming) {
              updated[lastIdx] = { ...updated[lastIdx], content: streamedContent };
            }
            return updated;
          });
          scrollToBottom();
        },
        onComplete: (data) => {
          // Full expert answer. For multi-expert (no chunk streaming) this
          // is the only place content arrives; for single-expert it
          // overwrites the streamed text with the final, citation-backed
          // version. When multiple experts respond, append extra bubbles.
          setMessages((prev) => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            if (lastIdx >= 0 && updated[lastIdx].isStreaming && streamedContent === '') {
              // multi-expert / no stream: fill the placeholder with first answer
              updated[lastIdx] = {
                ...updated[lastIdx],
                content: data.content,
                expert_id: data.expert_id,
                confidence: data.confidence,
              };
              streamedContent = data.content; // mark placeholder as used
            } else if (streamedContent !== '' && updated[lastIdx]?.isStreaming) {
              // single-expert: finalize streamed bubble with citation content
              updated[lastIdx] = {
                ...updated[lastIdx],
                content: data.content || updated[lastIdx].content,
                expert_id: data.expert_id,
                confidence: data.confidence,
              };
            } else {
              // additional experts → new bubbles
              updated.push({
                id: `expert-${data.expert_id}-${Date.now()}`,
                chat_id: chatId,
                role: 'assistant',
                content: data.content,
                turn_number: 0,
                expert_id: data.expert_id,
                confidence: data.confidence,
                created_at: new Date().toISOString(),
              });
            }
            return updated;
          });
          scrollToBottom();
        },
        onDone: () => {
          // Finalize: reload from server so persisted message_ids, tokens,
          // cost and citations replace the optimistic placeholders.
          setMessages((prev) =>
            prev.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m))
          );
          loadMessages();
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
            {item.tokens_used != null && item.tokens_used > 0 && (
              <Text
                style={[
                  styles.tokenInfo,
                  isUser && styles.userTimeText,
                ]}
              >
                {item.tokens_used} tokens
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
      {/* Expert selection bar — at least one is required to send */}
      {projectExperts.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.expertBar}
          contentContainerStyle={styles.expertBarContent}
        >
          {projectExperts.map((exp) => {
            const selected = selectedExpertIds.includes(exp.expert_id);
            return (
              <TouchableOpacity
                key={exp.expert_id}
                style={[styles.expertChip, selected && styles.expertChipSelected]}
                onPress={() => toggleExpert(exp.expert_id)}
              >
                {selected && <Ionicons name="checkmark" size={13} color={COLORS.textInverse} />}
                <Text style={[styles.expertChipText, selected && styles.expertChipTextSelected]}>
                  {exp.expert_name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : (
        <View style={styles.noExpertBar}>
          <Text style={styles.noExpertText}>
            No experts assigned to this project — add experts before chatting.
          </Text>
        </View>
      )}
      <View style={styles.inputArea}>
        <TextInput
          style={styles.input}
          placeholder={
            selectedExpertIds.length === 0 ? 'Select an expert first...' : 'Type your message...'
          }
          placeholderTextColor={COLORS.textTertiary}
          value={inputText}
          onChangeText={setInputText}
          editable={!isSending && selectedExpertIds.length > 0}
          multiline
          maxLength={5000}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!inputText.trim() || isSending || selectedExpertIds.length === 0) &&
              styles.sendButtonDisabled,
          ]}
          onPress={sendMessage}
          disabled={isSending || !inputText.trim() || selectedExpertIds.length === 0}
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
  expertBar: {
    maxHeight: 44,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    backgroundColor: COLORS.surface,
  },
  expertBarContent: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
    alignItems: 'center',
  },
  expertChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  expertChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  expertChipText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  expertChipTextSelected: {
    color: COLORS.textInverse,
    fontWeight: '600',
  },
  noExpertBar: {
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  noExpertText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.warning,
    textAlign: 'center',
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
