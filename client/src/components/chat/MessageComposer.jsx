import React, { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore.js';
import { useChannelStore } from '../../store/channelStore.js';
import { useSocket } from '../../context/SocketContext.jsx';
import { useUIStore } from '../../store/uiStore.js';
import { api } from '../../api/client.js';
import { EmojiPickerPopover } from './EmojiPickerPopover.jsx';
import {
  Bold,
  Italic,
  Code,
  List,
  Link,
  Paperclip,
  Smile,
  Send,
  X,
  FileText,
  Loader2,
} from 'lucide-react';

export const MessageComposer = ({ parentId = null, placeholder = null }) => {
  const { currentWorkspace, user } = useAuthStore();
  const { currentChannel, currentConversation, activeView, addMessage, addThreadReply } =
    useChannelStore();
  const { socket } = useSocket();
  const { addToast } = useUIStore();

  const targetId = activeView === 'channel' ? currentChannel?._id : currentConversation?._id;
  const draftKey = `teamspace_draft_${targetId}_${parentId || 'main'}`;

  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Mention autocomplete popup
  const [mentionQuery, setMentionQuery] = useState(null);
  const [members, setMembers] = useState([]);

  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimerRef = useRef(null);

  // Restore draft on targetId change
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const savedDraft = window.localStorage.getItem(draftKey);
      if (savedDraft) {
        setContent(savedDraft);
      } else {
        setContent('');
      }
    }
    setAttachments([]);
  }, [targetId, parentId]);

  // Save draft on content change
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (content.trim()) {
        window.localStorage.setItem(draftKey, content);
      } else {
        window.localStorage.removeItem(draftKey);
      }
    }
  }, [content, draftKey]);

  // Load workspace members for @ mention autocomplete
  useEffect(() => {
    if (currentWorkspace?._id) {
      api.get(`/workspaces/${currentWorkspace._id}/members`).then((res) => {
        setMembers(res.data.members || []);
      }).catch(console.error);
    }
  }, [currentWorkspace?._id]);

  // Handle typing indicator broadcast
  const handleTextChange = (e) => {
    const value = e.target.value;
    setContent(value);

    // Check for @mention
    const cursor = e.target.selectionStart;
    const textBeforeCursor = value.slice(0, cursor);
    const mentionMatch = textBeforeCursor.match(/@([a-zA-Z0-9._-]*)$/);

    if (mentionMatch) {
      setMentionQuery(mentionMatch[1].toLowerCase());
    } else {
      setMentionQuery(null);
    }

    if (socket && targetId) {
      socket.emit('typing_start', {
        conversationType: activeView,
        targetId,
      });

      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        socket.emit('typing_stop', {
          conversationType: activeView,
          targetId,
        });
      }, 1500);
    }
  };

  const insertMention = (member) => {
    if (!textareaRef.current) return;
    const cursor = textareaRef.current.selectionStart;
    const textBeforeCursor = content.slice(0, cursor);
    const textAfterCursor = content.slice(cursor);
    const newTextBefore = textBeforeCursor.replace(/@[a-zA-Z0-9._-]*$/, `@${member.displayName} `);

    setContent(newTextBefore + textAfterCursor);
    setMentionQuery(null);
    textareaRef.current.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const applyFormat = (prefix, suffix = prefix) => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.slice(start, end);

    const replacement = `${prefix}${selected || 'text'}${suffix}`;
    const newContent = content.slice(0, start) + replacement + content.slice(end);
    setContent(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  };

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('workspaceId', currentWorkspace._id);
    formData.append('targetId', targetId);
    formData.append('conversationType', activeView);

    setIsUploading(true);
    try {
      const res = await api.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAttachments((prev) => [...prev, res.data.file]);
      addToast(`Attached ${file.name}`, 'info');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (idx) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSend = async () => {
    if ((!content.trim() && attachments.length === 0) || isSending || !targetId) return;

    const messageText = content.trim();
    const idempotencyKey = crypto.randomUUID ? crypto.randomUUID() : `idemp-${Date.now()}-${Math.random()}`;

    setIsSending(true);
    try {
      const payload = {
        workspaceId: currentWorkspace._id,
        conversationType: activeView,
        targetId,
        content: messageText || (attachments.length > 0 ? 'Shared attachment' : ''),
        parentId: parentId || null,
        attachments,
        idempotencyKey,
      };

      const res = await api.post('/messages', payload);

      // Stop typing immediately
      if (socket) {
        socket.emit('typing_stop', {
          conversationType: activeView,
          targetId,
        });
      }

      // Add to store
      if (parentId) {
        addThreadReply(res.data.message);
      } else {
        addMessage(res.data.message);
      }

      // Clear composer & draft
      setContent('');
      setAttachments([]);
      localStorage.removeItem(draftKey);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setIsSending(false);
    }
  };

  // Filtered members for mention popup
  const filteredMembers =
    mentionQuery !== null
      ? members
          .filter((m) =>
            m.displayName?.toLowerCase().includes(mentionQuery)
          )
          .slice(0, 5)
      : [];

  const recipientName =
    activeView === 'channel'
      ? `#${currentChannel?.name || 'channel'}`
      : currentConversation?.participants?.find((p) => p._id !== user?._id)?.displayName || 'Direct Message';

  return (
    <div className="p-4 pt-1 bg-[#1A1D21] relative flex-shrink-0">
      {/* Mention Autocomplete Popup */}
      {mentionQuery !== null && filteredMembers.length > 0 && (
        <div className="absolute bottom-full left-4 mb-2 bg-[#25282D] border border-[#3A3D44] rounded-xl shadow-2xl p-1.5 w-64 z-50">
          <div className="text-[10px] font-semibold text-[#8C9098] px-2 py-1 uppercase">
            Matching Members
          </div>
          {filteredMembers.map((member) => (
            <button
              key={member._id}
              onClick={() => insertMention(member)}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-slate-200 hover:bg-indigo-600 hover:text-white transition-colors"
            >
              <span className="font-semibold">@{member.displayName}</span>
              {member.title && (
                <span className="text-[10px] opacity-70 truncate">
                  ({member.title})
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Main Composer Box */}
      <div className="border border-[#383A40] focus-within:border-indigo-500 rounded-xl bg-[#222529] shadow-sm transition-colors overflow-hidden">
        {/* Formatting Toolbar */}
        <div className="flex items-center gap-1 px-3 py-1.5 border-b border-[#2C2F36] text-[#8C9098]">
          <button
            type="button"
            onClick={() => applyFormat('**')}
            title="Bold (**text**)"
            className="p-1 rounded hover:text-white hover:bg-[#32363D] transition-colors"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => applyFormat('*')}
            title="Italic (*text*)"
            className="p-1 rounded hover:text-white hover:bg-[#32363D] transition-colors"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => applyFormat('`')}
            title="Inline Code (`code`)"
            className="p-1 rounded hover:text-white hover:bg-[#32363D] transition-colors"
          >
            <Code className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => applyFormat('```\n', '\n```')}
            title="Code Block"
            className="p-1 rounded hover:text-white hover:bg-[#32363D] transition-colors text-xs font-mono"
          >
            {'</>'}
          </button>
          <button
            type="button"
            onClick={() => applyFormat('- ')}
            title="Bulleted List"
            className="p-1 rounded hover:text-white hover:bg-[#32363D] transition-colors"
          >
            <List className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-3.5 bg-[#383A40] mx-1" />

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Attach file or image"
            disabled={isUploading}
            className="p-1 rounded hover:text-white hover:bg-[#32363D] transition-colors disabled:opacity-50"
          >
            {isUploading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
            ) : (
              <Paperclip className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Attachment chips preview */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 p-2.5 pb-0">
            {attachments.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#2B2E34] border border-[#3A3D44] text-xs text-slate-200"
              >
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                <span className="truncate max-w-[150px]">{file.originalName}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(idx)}
                  className="hover:text-rose-400 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Text Area */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || `Message ${recipientName}`}
          rows={2}
          className="w-full bg-transparent p-3 text-sm text-slate-100 placeholder-[#7B7E85] focus:outline-none resize-none leading-relaxed"
        />

        {/* Bottom Actions Row: Emoji picker + Send button */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-[#2A2D33] bg-[#202226]">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              title="Add Emoji"
              className="p-1.5 rounded-lg text-[#8C9098] hover:text-white hover:bg-[#2B2E34] transition-colors"
            >
              <Smile className="w-4 h-4" />
            </button>
            {showEmojiPicker && (
              <EmojiPickerPopover
                position="top"
                onSelect={(emoji) => setContent((prev) => prev + emoji)}
                onClose={() => setShowEmojiPicker(false)}
              />
            )}
          </div>

          <button
            type="button"
            onClick={handleSend}
            disabled={(!content.trim() && attachments.length === 0) || isSending}
            title="Send (Enter)"
            className="flex items-center justify-center p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-30 disabled:hover:bg-indigo-600 transition-all shadow-md shadow-indigo-600/20"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
