import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore.js';
import { useChannelStore } from '../../store/channelStore.js';
import { useUIStore } from '../../store/uiStore.js';
import { api } from '../../api/client.js';
import { Avatar } from '../common/Avatar.jsx';
import { ReactionsBar } from './ReactionsBar.jsx';
import { FileAttachmentPreview } from './FileAttachmentPreview.jsx';
import { EmojiPickerPopover } from './EmojiPickerPopover.jsx';
import {
  SmilePlus,
  MessageSquare,
  Pin,
  Edit2,
  Trash2,
  Check,
  X,
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';

const formatMessageTime = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return format(date, 'h:mm a');
};

export const MessageItem = ({ message, isGrouped = false }) => {
  const { user } = useAuthStore();
  const { openThread, updateMessage, removeMessage, updateReaction } = useChannelStore();
  const { addToast } = useUIStore();

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const isSender = message.senderId?._id === user?._id || message.senderId === user?._id;
  const isDeleted = message.isDeleted;

  const handleEditSubmit = async () => {
    if (!editContent.trim()) return;
    try {
      const res = await api.patch(`/messages/${message._id}`, {
        content: editContent,
      });
      updateMessage(res.data.message);
      setIsEditing(false);
      addToast('Message edited', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this message?')) return;
    try {
      await api.delete(`/messages/${message._id}`);
      removeMessage(message._id);
      addToast('Message deleted', 'info');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handlePin = async () => {
    try {
      const res = await api.post(`/messages/${message._id}/pin`);
      updateMessage(res.data.message);
      addToast(res.data.message.isPinned ? 'Message pinned' : 'Message unpinned', 'info');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleReactionSelect = async (emoji) => {
    try {
      const res = await api.post(`/messages/${message._id}/reactions`, { emoji });
      updateReaction(message._id, res.data.reactions);
    } catch (err) {
      console.error(err);
    }
  };

  // Render message text with simple markdown formatting and mention highlights
  const renderFormattedContent = (text) => {
    if (!text) return null;

    // Check for code block ```code```
    if (text.includes('```')) {
      const parts = text.split(/(```[\s\S]*?```)/g);
      return parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const rawCode = part.slice(3, -3).replace(/^[a-z]+\n/, ''); // strip optional lang identifier
          return (
            <pre key={index} className="my-1.5 overflow-x-auto text-xs">
              <code>{rawCode}</code>
            </pre>
          );
        }
        return <span key={index}>{renderInlineStyles(part)}</span>;
      });
    }

    return renderInlineStyles(text);
  };

  const renderInlineStyles = (text) => {
    // Mentions @username highlight
    const mentionRegex = /(@[a-zA-Z0-9._-]+)/g;
    const parts = text.split(mentionRegex);

    return parts.map((part, idx) => {
      if (part.startsWith('@')) {
        return (
          <span
            key={idx}
            className="px-1.5 py-0.5 rounded-md bg-indigo-950 text-indigo-300 font-medium text-xs mx-0.5 inline-block"
          >
            {part}
          </span>
        );
      }

      // Inline code `code`
      if (part.includes('`')) {
        const subParts = part.split(/(`[^`]+`)/g);
        return subParts.map((sub, sIdx) => {
          if (sub.startsWith('`') && sub.endsWith('`')) {
            return <code key={sIdx}>{sub.slice(1, -1)}</code>;
          }
          return sub;
        });
      }

      return part;
    });
  };

  return (
    <div
      className={`message-row group relative flex gap-3 px-5 py-1.5 hover:bg-[#202327] transition-colors rounded-lg ${
        message.isPinned ? 'bg-amber-950/20 border-l-2 border-amber-500' : ''
      }`}
    >
      {/* Floating Action Bar on Hover */}
      {!isDeleted && (
        <div className="message-actions opacity-0 pointer-events-none absolute right-5 -top-3.5 z-20 flex items-center bg-[#25282D] border border-[#3A3D44] rounded-lg shadow-lg py-0.5 px-1 gap-0.5 transition-all">
          {/* Reaction Picker Button */}
          <div className="relative">
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              title="Add reaction"
              className="p-1 rounded text-[#9EA0A4] hover:text-white hover:bg-[#34383F] transition-colors"
            >
              <SmilePlus className="w-4 h-4" />
            </button>
            {showEmojiPicker && (
              <EmojiPickerPopover
                position="top"
                onSelect={handleReactionSelect}
                onClose={() => setShowEmojiPicker(false)}
              />
            )}
          </div>

          {/* Reply in Thread Button */}
          <button
            onClick={() => openThread(message)}
            title="Reply in thread"
            className="p-1 rounded text-[#9EA0A4] hover:text-white hover:bg-[#34383F] transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
          </button>

          {/* Pin Message Button */}
          <button
            onClick={handlePin}
            title={message.isPinned ? 'Unpin message' : 'Pin message'}
            className={`p-1 rounded transition-colors ${
              message.isPinned
                ? 'text-amber-400 hover:bg-[#34383F]'
                : 'text-[#9EA0A4] hover:text-white hover:bg-[#34383F]'
            }`}
          >
            <Pin className="w-4 h-4" />
          </button>

          {/* Edit Button (if sender) */}
          {isSender && (
            <button
              onClick={() => {
                setIsEditing(true);
                setEditContent(message.content);
              }}
              title="Edit message"
              className="p-1 rounded text-[#9EA0A4] hover:text-white hover:bg-[#34383F] transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Delete Button (if sender) */}
          {isSender && (
            <button
              onClick={handleDelete}
              title="Delete message"
              className="p-1 rounded text-[#9EA0A4] hover:text-rose-400 hover:bg-[#34383F] transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Avatar column */}
      <div className="flex-shrink-0 pt-0.5">
        <Avatar
          src={message.senderId?.avatarUrl}
          name={message.senderId?.displayName || 'User'}
          size="md"
        />
      </div>

      {/* Message Body Column */}
      <div className="flex-1 min-w-0">
        {/* Header: Name, Title, Time, Pin badge */}
        <div className="flex items-baseline gap-2 mb-0.5">
          <span className="font-semibold text-sm text-slate-100 hover:underline cursor-pointer">
            {message.senderId?.displayName || 'User'}
          </span>

          {message.senderId?.title && (
            <span className="text-[10px] text-[#8C9098] bg-[#272A30] px-1.5 py-0.2 rounded border border-[#35383F]">
              {message.senderId.title}
            </span>
          )}

          <span className="text-[11px] text-[#787C84]">
            {formatMessageTime(message.createdAt)}
          </span>

          {message.isPinned && (
            <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-950/40 px-1.5 py-0.2 rounded border border-amber-800/40">
              <Pin className="w-2.5 h-2.5" />
              <span>Pinned</span>
            </span>
          )}
        </div>

        {/* Content or Edit Box */}
        {isEditing ? (
          <div className="mt-1 flex flex-col gap-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full bg-[#1A1D21] border border-indigo-600 rounded-lg p-2.5 text-sm text-slate-100 focus:outline-none resize-none min-h-[60px]"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleEditSubmit}
                className="flex items-center gap-1 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-xs font-medium transition-colors"
              >
                <Check className="w-3.5 h-3.5" /> Save
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="flex items-center gap-1 px-3 py-1 bg-[#2B2D31] hover:bg-[#34383F] text-slate-300 rounded-md text-xs font-medium transition-colors"
              >
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
            </div>
          </div>
        ) : (
          <div
            className={`text-sm leading-relaxed text-[#D1D2D3] break-words ${
              isDeleted ? 'italic text-[#787C84]' : ''
            }`}
          >
            {renderFormattedContent(message.content)}
            {message.isEdited && !isDeleted && (
              <span className="text-[10px] text-[#787C84] ml-1.5">(edited)</span>
            )}
          </div>
        )}

        {/* Attachments */}
        {!isDeleted && <FileAttachmentPreview attachments={message.attachments} />}

        {/* Reactions */}
        {!isDeleted && (
          <ReactionsBar messageId={message._id} reactions={message.reactions || []} />
        )}

        {/* Thread Replies Indicator Badge */}
        {!isDeleted && message.replyCount > 0 && (
          <button
            onClick={() => openThread(message)}
            className="flex items-center gap-2 mt-2 px-2.5 py-1 rounded-lg bg-[#25282D] hover:bg-[#2C3036] border border-[#35383F] text-xs font-medium text-indigo-400 group/thread transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>
              {message.replyCount} {message.replyCount === 1 ? 'reply' : 'replies'}
            </span>
            <span className="text-[#787C84] text-[11px] group-hover/thread:text-slate-300">
              View thread
            </span>
          </button>
        )}
      </div>
    </div>
  );
};
