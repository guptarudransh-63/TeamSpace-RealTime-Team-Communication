import React, { useRef, useEffect, useState } from 'react';
import { useChannelStore } from '../../store/channelStore.js';
import { useAuthStore } from '../../store/authStore.js';
import { useUIStore } from '../../store/uiStore.js';
import { useUnreadStore } from '../../store/unreadStore.js';
import { MessageItem } from './MessageItem.jsx';
import { format, isToday, isYesterday } from 'date-fns';
import { Hash, MessageSquare, ArrowDown, Loader2 } from 'lucide-react';

const formatDateHeader = (dateStr) => {
  const date = new Date(dateStr);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'EEEE, MMMM d, yyyy');
};

export const MessageTimeline = () => {
  const {
    messages,
    hasMore,
    isLoadingMore,
    loadOlderMessages,
    currentChannel,
    currentConversation,
    activeView,
    isLoadingMessages,
  } = useChannelStore();

  const { user } = useAuthStore();
  const { typingByTarget } = useUIStore();
  const { markAsRead } = useUnreadStore();

  const scrollRef = useRef(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const prevScrollHeightRef = useRef(0);
  const targetId = activeView === 'channel' ? currentChannel?._id : currentConversation?._id;

  // Mark conversation as read on entry or when new messages arrive
  useEffect(() => {
    if (targetId && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      markAsRead(lastMsg.workspaceId, targetId, activeView, lastMsg._id);
    }
  }, [targetId, messages.length]);

  // Scroll to bottom on initial message load
  useEffect(() => {
    if (!isLoadingMessages && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [isLoadingMessages, targetId]);

  // Maintain scroll position when older messages are loaded into the top
  useEffect(() => {
    if (scrollRef.current && prevScrollHeightRef.current > 0) {
      const addedHeight = scrollRef.current.scrollHeight - prevScrollHeightRef.current;
      scrollRef.current.scrollTop += addedHeight;
      prevScrollHeightRef.current = 0;
    }
  }, [messages.length]);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;

    // Detect if scrolled up to trigger load older
    if (scrollTop < 50 && hasMore && !isLoadingMore) {
      prevScrollHeightRef.current = scrollHeight;
      loadOlderMessages();
    }

    // Toggle jump to bottom button
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 120;
    setShowScrollBottom(!isAtBottom);
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  // Group messages by date
  const messagesWithDates = [];
  let lastDateStr = null;

  messages.forEach((msg) => {
    const dateStr = format(new Date(msg.createdAt), 'yyyy-MM-dd');
    if (dateStr !== lastDateStr) {
      messagesWithDates.push({ isDateSeparator: true, date: msg.createdAt, key: `date-${dateStr}` });
      lastDateStr = dateStr;
    }
    messagesWithDates.push(msg);
  });

  // Active typing users for this channel/DM (excluding current user)
  const typingUsers = (typingByTarget[targetId] || []).filter(
    (u) => u.userId !== user?._id
  );

  if (isLoadingMessages) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#1A1D21]">
        <div className="flex flex-col items-center gap-2 text-[#8C9098]">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          <span className="text-xs">Loading message history...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 relative flex flex-col h-full overflow-hidden bg-[#1A1D21]">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto pt-4 pb-2 flex flex-col"
      >
        {/* Loading older indicator at top */}
        {isLoadingMore && (
          <div className="flex justify-center py-2 text-xs text-[#8C9098] items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
            <span>Loading older messages...</span>
          </div>
        )}

        {/* Channel / Conversation Welcome Header */}
        {!hasMore && (
          <div className="px-5 py-6 mb-4 flex flex-col gap-2">
            <div className="w-14 h-14 rounded-2xl bg-[#25282D] border border-[#383A40] flex items-center justify-center text-indigo-400 mb-1">
              {activeView === 'channel' ? (
                <Hash className="w-8 h-8" />
              ) : (
                <MessageSquare className="w-8 h-8" />
              )}
            </div>
            <h1 className="text-xl font-bold text-slate-100">
              Welcome to{' '}
              {activeView === 'channel'
                ? `#${currentChannel?.name || 'channel'}`
                : 'your direct conversation'}
              !
            </h1>
            <p className="text-xs text-[#9EA0A4] max-w-lg leading-relaxed">
              {activeView === 'channel'
                ? currentChannel?.description ||
                  `This is the very beginning of the #${currentChannel?.name} channel. Share ideas, update the team, or ask questions.`
                : 'This is the start of your 1-on-1 direct message history. Send messages and files directly.'}
            </p>
          </div>
        )}

        {/* Messages List with Date Separators */}
        <div className="flex-1 flex flex-col">
          {messagesWithDates.map((item) => {
            if (item.isDateSeparator) {
              return (
                <div key={item.key} className="relative flex items-center justify-center my-4 px-5">
                  <div className="absolute inset-x-5 h-[1px] bg-[#2E3136]" />
                  <span className="relative bg-[#1A1D21] px-3 text-[11px] font-semibold text-[#8C9098] border border-[#2E3136] rounded-full py-0.5">
                    {formatDateHeader(item.date)}
                  </span>
                </div>
              );
            }

            return <MessageItem key={item._id} message={item} />;
          })}
        </div>

        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <div className="px-5 py-2 flex items-center gap-2 text-xs text-[#9EA0A4] italic">
            <span className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]" />
            </span>
            <span>
              {typingUsers.map((u) => u.displayName).join(', ')}{' '}
              {typingUsers.length === 1 ? 'is' : 'are'} typing...
            </span>
          </div>
        )}
      </div>

      {/* Jump to Bottom Floating Button */}
      {showScrollBottom && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 right-6 p-2 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl transition-all hover:scale-105 z-20 flex items-center gap-1.5 text-xs px-3 font-medium"
        >
          <ArrowDown className="w-3.5 h-3.5" />
          <span>New messages</span>
        </button>
      )}
    </div>
  );
};
