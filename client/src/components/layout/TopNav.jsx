import React from 'react';
import { useChannelStore } from '../../store/channelStore.js';
import { useAuthStore } from '../../store/authStore.js';
import { useUIStore } from '../../store/uiStore.js';
import { useSocket } from '../../context/SocketContext.jsx';
import {
  Hash,
  Lock,
  Pin,
  Users,
  Search,
  Bell,
  Wifi,
  WifiOff,
} from 'lucide-react';

export const TopNav = () => {
  const { currentChannel, currentConversation, activeView } = useChannelStore();
  const { user } = useAuthStore();
  const {
    setSearchModalOpen,
    activeRightPanel,
    setActiveRightPanel,
    setChannelDetailsModalOpen,
    notificationsOpen,
    setNotificationsOpen,
    unreadNotificationsCount,
  } = useUIStore();

  const { isConnected, isReconnecting } = useSocket();

  // Find DM recipient name
  const otherUser = currentConversation?.participants?.find((p) => p._id !== user?._id);
  const title =
    activeView === 'channel'
      ? currentChannel?.name
      : otherUser?.displayName || currentConversation?.title || 'Direct Message';

  const topic =
    activeView === 'channel'
      ? currentChannel?.topic || currentChannel?.description
      : otherUser?.title || 'Direct Message';

  return (
    <header className="h-[52px] bg-[#1E2125] border-b border-[#2B2D33] px-5 flex items-center justify-between select-none flex-shrink-0 z-10">
      {/* Title & Topic */}
      <div className="flex items-center gap-3 overflow-hidden">
        <div className="flex items-center gap-1.5 font-bold text-slate-100 text-base">
          {activeView === 'channel' ? (
            currentChannel?.isPrivate ? (
              <Lock className="w-4 h-4 text-slate-400" />
            ) : (
              <Hash className="w-4 h-4 text-slate-400" />
            )
          ) : (
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-1" />
          )}
          <span className="truncate">{title || 'Select a conversation'}</span>
        </div>

        {topic && (
          <>
            <div className="w-[1px] h-4 bg-[#3E4249] flex-shrink-0" />
            <span className="text-xs text-[#9EA0A4] truncate max-w-md hidden md:inline">
              {topic}
            </span>
          </>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2">
        {/* Connection Status Indicator */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
            isConnected
              ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-400'
              : isReconnecting
              ? 'bg-amber-950/40 border-amber-800/60 text-amber-400 animate-pulse'
              : 'bg-rose-950/40 border-rose-800/60 text-rose-400'
          }`}
          title={
            isConnected
              ? 'Connected to real-time engine'
              : isReconnecting
              ? 'Reconnecting to real-time engine...'
              : 'Disconnected'
          }
        >
          {isConnected ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="hidden sm:inline">Live</span>
            </>
          ) : isReconnecting ? (
            <>
              <Wifi className="w-3 h-3 text-amber-400 animate-spin" />
              <span className="hidden sm:inline">Reconnecting...</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3 text-rose-400" />
              <span className="hidden sm:inline">Offline</span>
            </>
          )}
        </div>

        {/* Global Search Button */}
        <button
          onClick={() => setSearchModalOpen(true)}
          title="Search (⌘K)"
          className="p-2 rounded-lg text-[#9EA0A4] hover:text-white hover:bg-[#282B30] transition-colors"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Pinned Messages Button */}
        {activeView === 'channel' && (
          <button
            onClick={() =>
              setActiveRightPanel(activeRightPanel === 'pins' ? null : 'pins')
            }
            title="Pinned Messages"
            className={`p-2 rounded-lg transition-colors ${
              activeRightPanel === 'pins'
                ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                : 'text-[#9EA0A4] hover:text-white hover:bg-[#282B30]'
            }`}
          >
            <Pin className="w-4 h-4" />
          </button>
        )}

        {/* Member Details */}
        {activeView === 'channel' && (
          <button
            onClick={() => setChannelDetailsModalOpen(true)}
            title="Channel Details & Members"
            className="p-2 rounded-lg text-[#9EA0A4] hover:text-white hover:bg-[#282B30] transition-colors"
          >
            <Users className="w-4 h-4" />
          </button>
        )}

        {/* Notifications Dropdown Toggle */}
        <button
          onClick={() => setNotificationsOpen(!notificationsOpen)}
          title="Notifications"
          className="relative p-2 rounded-lg text-[#9EA0A4] hover:text-white hover:bg-[#282B30] transition-colors"
        >
          <Bell className="w-4 h-4" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-500 rounded-full" />
          )}
        </button>
      </div>
    </header>
  );
};
