import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '../store/authStore.js';
import { useChannelStore } from '../store/channelStore.js';
import { useUnreadStore } from '../store/unreadStore.js';
import { useUIStore } from '../store/uiStore.js';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);

  const { isAuthenticated, user, currentWorkspace } = useAuthStore();
  const {
    currentChannel,
    currentConversation,
    activeView,
    addMessage,
    addThreadReply,
    updateReaction,
    updateMessage,
    removeMessage,
    messages,
  } = useChannelStore();

  const { incrementUnread, syncFromSocket } = useUnreadStore();
  const {
    setUserPresence,
    addTypingUser,
    removeTypingUser,
    addToast,
  } = useUIStore();

  const typingTimeouts = useRef(new Map());

  // Keep ref of active targetId for listeners
  const activeTargetIdRef = useRef(null);
  activeTargetIdRef.current =
    activeView === 'channel' ? currentChannel?._id : currentConversation?._id;

  const newestMessageTimeRef = useRef(null);
  if (messages.length > 0) {
    newestMessageTimeRef.current = messages[messages.length - 1].createdAt;
  }

  useEffect(() => {
    if (!isAuthenticated || !user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const socketUrl = window.location.origin;
    const socketInstance = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
    });

    socketInstance.on('connect', () => {
      console.log('[Socket] Connected with ID:', socketInstance.id);
      setIsConnected(true);
      setIsReconnecting(false);

      // Join active channel or conversation if any
      const targetId = activeTargetIdRef.current;
      if (targetId) {
        if (activeView === 'channel') {
          socketInstance.emit('join_channel', { channelId: targetId });
        } else {
          socketInstance.emit('join_conversation', { conversationId: targetId });
        }

        // Recover missed messages on reconnect
        if (newestMessageTimeRef.current) {
          socketInstance.emit(
            'recover_missed_messages',
            { targetId, sinceTimestamp: newestMessageTimeRef.current },
            (response) => {
              if (response?.success && response.messages?.length > 0) {
                console.log(`[Socket Recovery] Recovered ${response.messages.length} missed messages`);
                response.messages.forEach((msg) => addMessage(msg));
              }
            }
          );
        }
      }
    });

    socketInstance.on('disconnect', (reason) => {
      console.warn('[Socket] Disconnected:', reason);
      setIsConnected(false);
      setIsReconnecting(true);
    });

    socketInstance.on('reconnect_attempt', () => {
      setIsReconnecting(true);
    });

    // Real-Time Event Handlers
    socketInstance.on('new_message', (message) => {
      addMessage(message);
      incrementUnread(message.targetId, activeTargetIdRef.current);
    });

    socketInstance.on('thread_reply', (reply) => {
      addThreadReply(reply);
    });

    socketInstance.on('reaction_updated', ({ messageId, reactions }) => {
      updateReaction(messageId, reactions);
    });

    socketInstance.on('message_edited', (updated) => {
      updateMessage(updated);
    });

    socketInstance.on('message_deleted', ({ messageId }) => {
      removeMessage(messageId);
    });

    socketInstance.on('user_presence_changed', ({ userId, presence }) => {
      setUserPresence(userId, presence);
    });

    socketInstance.on('user_typing', ({ targetId, userId, displayName }) => {
      addTypingUser(targetId, userId, displayName);

      // Clear existing timeout for this user in this target
      const key = `${targetId}:${userId}`;
      if (typingTimeouts.current.has(key)) {
        clearTimeout(typingTimeouts.current.get(key));
      }

      // Auto-clear after 3 seconds
      const timeout = setTimeout(() => {
        removeTypingUser(targetId, userId);
        typingTimeouts.current.delete(key);
      }, 3000);

      typingTimeouts.current.set(key, timeout);
    });

    socketInstance.on('user_stop_typing', ({ targetId, userId }) => {
      const key = `${targetId}:${userId}`;
      if (typingTimeouts.current.has(key)) {
        clearTimeout(typingTimeouts.current.get(key));
        typingTimeouts.current.delete(key);
      }
      removeTypingUser(targetId, userId);
    });

    socketInstance.on('read_state_synced', ({ targetId }) => {
      syncFromSocket(targetId);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [isAuthenticated, user?._id]);

  // When active channel changes, tell socket to join room
  useEffect(() => {
    if (!socket || !isConnected) return;

    if (activeView === 'channel' && currentChannel?._id) {
      socket.emit('join_channel', { channelId: currentChannel._id });
    } else if (activeView === 'conversation' && currentConversation?._id) {
      socket.emit('join_conversation', { conversationId: currentConversation._id });
    }
  }, [socket, isConnected, currentChannel?._id, currentConversation?._id, activeView]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, isReconnecting }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
