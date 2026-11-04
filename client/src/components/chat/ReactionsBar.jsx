import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore.js';
import { useChannelStore } from '../../store/channelStore.js';
import { api } from '../../api/client.js';
import { EmojiPickerPopover } from './EmojiPickerPopover.jsx';
import { SmilePlus } from 'lucide-react';

export const ReactionsBar = ({ messageId, reactions = [] }) => {
  const { user } = useAuthStore();
  const { updateReaction } = useChannelStore();
  const [showPicker, setShowPicker] = useState(false);

  const handleToggle = async (emoji) => {
    try {
      const res = await api.post(`/messages/${messageId}/reactions`, { emoji });
      updateReaction(messageId, res.data.reactions);
    } catch (err) {
      console.error('[Reaction Toggle Error]', err);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
      {reactions.map((r, idx) => {
        const hasReacted = r.users?.some(
          (u) => (typeof u === 'string' ? u : u._id) === user?._id
        );

        const reactingNames = r.users
          ?.map((u) => (typeof u === 'object' ? u.displayName : 'Someone'))
          .join(', ');

        return (
          <button
            key={idx}
            onClick={() => handleToggle(r.emoji)}
            title={reactingNames || `${r.users?.length} reactions`}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all border ${
              hasReacted
                ? 'bg-indigo-950/60 border-indigo-700/80 text-indigo-300 font-semibold shadow-inner'
                : 'bg-[#22252A] border-[#353840] text-[#9EA0A4] hover:bg-[#2B2E34] hover:text-slate-200'
            }`}
          >
            <span>{r.emoji}</span>
            <span className="text-[11px]">{r.users?.length || 0}</span>
          </button>
        );
      })}

      {/* Add reaction trigger */}
      <div className="relative">
        <button
          onClick={() => setShowPicker(!showPicker)}
          title="Add reaction"
          className="p-1 rounded-full text-[#8C9098] hover:text-slate-200 hover:bg-[#2B2E34] transition-colors"
        >
          <SmilePlus className="w-3.5 h-3.5" />
        </button>

        {showPicker && (
          <EmojiPickerPopover
            position="top"
            onSelect={handleToggle}
            onClose={() => setShowPicker(false)}
          />
        )}
      </div>
    </div>
  );
};
