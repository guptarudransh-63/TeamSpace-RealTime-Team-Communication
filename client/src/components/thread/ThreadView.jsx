import React, { useRef, useEffect } from 'react';
import { useChannelStore } from '../../store/channelStore.js';
import { MessageItem } from '../chat/MessageItem.jsx';
import { MessageComposer } from '../chat/MessageComposer.jsx';
import { X, MessageSquare, Loader2 } from 'lucide-react';

export const ThreadView = () => {
  const {
    threadParent,
    threadReplies,
    isThreadOpen,
    closeThread,
    isLoadingThread,
    currentChannel,
  } = useChannelStore();

  const repliesEndRef = useRef(null);

  useEffect(() => {
    if (repliesEndRef.current) {
      repliesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [threadReplies.length]);

  if (!isThreadOpen || !threadParent) return null;

  return (
    <div className="w-[380px] bg-[#1E2125] border-l border-[#2B2D33] flex flex-col h-full flex-shrink-0 z-20 select-none">
      {/* Header */}
      <div className="h-[52px] border-b border-[#2B2D33] px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-indigo-400" />
          <span className="font-bold text-sm text-slate-100">Thread</span>
          <span className="text-xs text-[#8C9098]">
            #{currentChannel?.name || 'conversation'}
          </span>
        </div>
        <button
          onClick={closeThread}
          className="p-1.5 rounded-lg text-[#8C9098] hover:text-white hover:bg-[#2C2F36] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-2 flex flex-col">
        {/* Parent Message */}
        <div className="border-b border-[#2B2D33] pb-3 mb-2">
          <MessageItem message={threadParent} />
        </div>

        {/* Reply Count Separator */}
        <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[#8C9098]">
          <span>
            {threadReplies.length} {threadReplies.length === 1 ? 'reply' : 'replies'}
          </span>
          <div className="flex-1 h-[1px] bg-[#2E3136]" />
        </div>

        {/* Replies List */}
        {isLoadingThread ? (
          <div className="flex justify-center p-6">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {threadReplies.map((reply) => (
              <MessageItem key={reply._id} message={reply} />
            ))}
            <div ref={repliesEndRef} />
          </div>
        )}
      </div>

      {/* Thread Composer */}
      <div className="border-t border-[#2B2D33]">
        <MessageComposer
          parentId={threadParent._id}
          placeholder="Reply in thread..."
        />
      </div>
    </div>
  );
};
