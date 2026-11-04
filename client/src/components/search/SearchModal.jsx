import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../store/authStore.js';
import { useChannelStore } from '../../store/channelStore.js';
import { useUIStore } from '../../store/uiStore.js';
import { api } from '../../api/client.js';
import { Avatar } from '../common/Avatar.jsx';
import { Search, X, Hash, MessageSquare, Loader2, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export const SearchModal = () => {
  const { currentWorkspace } = useAuthStore();
  const { channels, selectChannel, selectConversation, conversations } = useChannelStore();
  const { searchModalOpen, setSearchModalOpen } = useUIStore();

  const [query, setQuery] = useState('');
  const [selectedChannelId, setSelectedChannelId] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const inputRef = useRef(null);

  useEffect(() => {
    if (searchModalOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults([]);
      setHasSearched(false);
    }
  }, [searchModalOpen]);

  // Keyboard shortcut ⌘K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchModalOpen(!searchModalOpen);
      }
      if (e.key === 'Escape' && searchModalOpen) {
        setSearchModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchModalOpen]);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!query.trim() || !currentWorkspace?._id) return;

    setIsLoading(true);
    setHasSearched(true);
    try {
      let url = `/search?workspaceId=${currentWorkspace._id}&q=${encodeURIComponent(query.trim())}`;
      if (selectedChannelId) {
        url += `&channelId=${selectedChannelId}`;
      }
      const res = await api.get(url);
      setResults(res.data.results || []);
    } catch (err) {
      console.error('[Search Error]', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJumpToResult = (result) => {
    if (result.conversationType === 'channel') {
      const chan = channels.find((c) => c._id === result.targetId);
      if (chan) selectChannel(chan);
    } else {
      const conv = conversations.find((c) => c._id === result.targetId);
      if (conv) selectConversation(conv);
    }
    setSearchModalOpen(false);
  };

  if (!searchModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-16 px-4">
      <div className="bg-[#1E2125] border border-[#35383F] rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in-50 zoom-in-95">
        {/* Search Input Bar */}
        <form onSubmit={handleSearch} className="flex items-center gap-3 px-4 py-3.5 border-b border-[#2B2D33] bg-[#222529]">
          <Search className="w-5 h-5 text-indigo-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search messages by keyword, handle, or topic..."
            className="flex-1 bg-transparent text-slate-100 placeholder-[#7B7E85] text-sm focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setResults([]);
                setHasSearched(false);
              }}
              className="text-[#8C9098] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="submit"
            disabled={!query.trim() || isLoading}
            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors"
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Search'}
          </button>
        </form>

        {/* Filter bar */}
        <div className="px-4 py-2 bg-[#1A1C20] border-b border-[#2B2D33] flex items-center justify-between text-xs text-[#8C9098]">
          <div className="flex items-center gap-2">
            <span>Filter by channel:</span>
            <select
              value={selectedChannelId}
              onChange={(e) => setSelectedChannelId(e.target.value)}
              className="bg-[#24272D] border border-[#3A3D44] rounded-lg px-2 py-1 text-slate-200 text-xs focus:outline-none"
            >
              <option value="">Everywhere in workspace</option>
              {channels.map((c) => (
                <option key={c._id} value={c._id}>
                  #{c.name}
                </option>
              ))}
            </select>
          </div>
          {results.length > 0 && <span>{results.length} results</span>}
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-[#8C9098]">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
              <span className="text-xs">Searching workspace conversations...</span>
            </div>
          ) : results.length > 0 ? (
            results.map((res) => (
              <div
                key={res._id}
                onClick={() => handleJumpToResult(res)}
                className="flex items-start gap-3 p-3 rounded-xl bg-[#222529] hover:bg-[#282B30] border border-[#30333A] hover:border-indigo-500/50 cursor-pointer transition-all group"
              >
                <Avatar
                  src={res.senderId?.avatarUrl}
                  name={res.senderId?.displayName}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-slate-200">
                        {res.senderId?.displayName}
                      </span>
                      <span className="text-[10px] text-indigo-400 font-medium px-1.5 py-0.5 rounded bg-indigo-950/60 border border-indigo-800/40">
                        {res.location?.name}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#7B7E84]">
                      {format(new Date(res.createdAt), 'MMM d, h:mm a')}
                    </span>
                  </div>
                  <p className="text-xs text-[#C6C8CA] line-clamp-2 leading-relaxed">
                    {res.content}
                  </p>
                </div>
              </div>
            ))
          ) : hasSearched ? (
            <div className="text-center py-12 text-[#8C9098] text-xs">
              No matching messages found for "{query}".
            </div>
          ) : (
            <div className="text-center py-12 text-[#8C9098] text-xs flex flex-col items-center gap-1">
              <Search className="w-8 h-8 opacity-30 text-indigo-400 mb-1" />
              <p className="font-medium text-slate-300">Type a keyword to search</p>
              <p>Search across messages, shared files, and direct messages.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
