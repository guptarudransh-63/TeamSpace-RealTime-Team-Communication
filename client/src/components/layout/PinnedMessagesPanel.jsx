import React, { useState, useEffect } from 'react';
import { useChannelStore } from '../../store/channelStore.js';
import { useUIStore } from '../../store/uiStore.js';
import { api } from '../../api/client.js';
import { MessageItem } from '../chat/MessageItem.jsx';
import { X, Pin, Loader2 } from 'lucide-react';

export const PinnedMessagesPanel = () => {
  const { currentChannel } = useChannelStore();
  const { activeRightPanel, setActiveRightPanel } = useUIStore();

  const [pins, setPins] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (activeRightPanel === 'pins' && currentChannel?._id) {
      setIsLoading(true);
      api
        .get(`/channels/${currentChannel._id}/pins`)
        .then((res) => {
          setPins(res.data.messages || []);
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [activeRightPanel, currentChannel?._id]);

  if (activeRightPanel !== 'pins') return null;

  return (
    <div className="w-[360px] bg-[#1E2125] border-l border-[#2B2D33] flex flex-col h-full flex-shrink-0 z-20 select-none">
      <div className="h-[52px] border-b border-[#2B2D33] px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Pin className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-sm text-slate-100">Pinned Messages</span>
          <span className="text-xs text-[#8C9098]">({pins.length})</span>
        </div>
        <button
          onClick={() => setActiveRightPanel(null)}
          className="p-1.5 rounded-lg text-[#8C9098] hover:text-white hover:bg-[#2C2F36] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {isLoading ? (
          <div className="flex justify-center p-6">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
          </div>
        ) : pins.length === 0 ? (
          <div className="text-center py-12 px-4 text-[#8C9098] text-xs">
            <Pin className="w-8 h-8 mx-auto mb-2 opacity-40 text-amber-400" />
            <p className="font-medium text-slate-300 mb-1">No pinned messages yet</p>
            <p>Hover over any message and click the pin icon to keep important info handy.</p>
          </div>
        ) : (
          pins.map((msg) => <MessageItem key={msg._id} message={msg} />)
        )}
      </div>
    </div>
  );
};
