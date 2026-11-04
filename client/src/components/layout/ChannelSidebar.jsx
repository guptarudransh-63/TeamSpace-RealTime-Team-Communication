import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore.js';
import { useChannelStore } from '../../store/channelStore.js';
import { useUnreadStore } from '../../store/unreadStore.js';
import { useUIStore } from '../../store/uiStore.js';
import { Avatar } from '../common/Avatar.jsx';
import {
  Hash,
  Lock,
  Plus,
  Search,
  ChevronDown,
  UserPlus,
  Smile,
  Circle,
  MoreVertical,
} from 'lucide-react';

export const ChannelSidebar = () => {
  const { currentWorkspace, user } = useAuthStore();
  const {
    channels,
    conversations,
    currentChannel,
    currentConversation,
    activeView,
    selectChannel,
    selectConversation,
  } = useChannelStore();

  const { unreadByTarget } = useUnreadStore();
  const {
    setSearchModalOpen,
    setCreateChannelModalOpen,
    setInviteModalOpen,
    setProfileModalOpen,
    onlineUserIds,
  } = useUIStore();

  const [channelsCollapsed, setChannelsCollapsed] = useState(false);
  const [dmsCollapsed, setDmsCollapsed] = useState(false);

  return (
    <div className="w-[260px] bg-[#1E2125] flex flex-col h-full border-r border-[#2B2D33] select-none flex-shrink-0">
      {/* Workspace Header */}
      <div className="h-[52px] border-b border-[#2B2D33] px-4 flex items-center justify-between hover:bg-[#25282D] transition-colors cursor-pointer group">
        <div className="flex items-center gap-2 overflow-hidden">
          <h2 className="font-bold text-[#E5E7EB] text-base truncate">
            {currentWorkspace?.name || 'Workspace'}
          </h2>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setInviteModalOpen(true);
          }}
          title="Invite Teammates"
          className="p-1.5 rounded-lg text-[#9EA0A4] hover:text-white hover:bg-[#32363C] transition-colors"
        >
          <UserPlus className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Actions */}
      <div className="p-3 pb-1 flex flex-col gap-1">
        <button
          onClick={() => setSearchModalOpen(true)}
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-[#272A30] hover:bg-[#2F3238] text-[#9EA0A4] hover:text-slate-200 text-xs transition-all border border-[#35383F]"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-indigo-400" />
            <span>Search messages...</span>
          </div>
          <kbd className="text-[10px] bg-[#1E2125] px-1.5 py-0.5 rounded text-[#7B7E84] border border-[#3E4249]">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Scrollable Channels & DMs List */}
      <div className="flex-1 overflow-y-auto px-2 py-2 flex flex-col gap-4">
        {/* Channels Section */}
        <div>
          <div className="flex items-center justify-between px-2 mb-1 group">
            <button
              onClick={() => setChannelsCollapsed(!channelsCollapsed)}
              className="flex items-center gap-1 text-[11px] font-semibold text-[#8C9098] uppercase tracking-wider hover:text-slate-200 transition-colors"
            >
              <ChevronDown
                className={`w-3 h-3 transition-transform ${
                  channelsCollapsed ? '-rotate-90' : ''
                }`}
              />
              <span>Channels</span>
            </button>
            <button
              onClick={() => setCreateChannelModalOpen(true)}
              title="Create Channel"
              className="p-1 rounded text-[#8C9098] hover:text-white hover:bg-[#2C2F36] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {!channelsCollapsed && (
            <div className="flex flex-col gap-0.5">
              {channels.map((chan) => {
                const isActive = activeView === 'channel' && currentChannel?._id === chan._id;
                const unreadCount = unreadByTarget[chan._id] || 0;

                return (
                  <button
                    key={chan._id}
                    onClick={() => selectChannel(chan)}
                    className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-sm transition-all group ${
                      isActive
                        ? 'bg-indigo-600 text-white font-medium shadow-sm'
                        : unreadCount > 0
                        ? 'text-white font-bold hover:bg-[#282B30]'
                        : 'text-[#9EA0A4] hover:text-slate-200 hover:bg-[#26282E]'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {chan.isPrivate ? (
                        <Lock className="w-3.5 h-3.5 flex-shrink-0" />
                      ) : (
                        <Hash className="w-3.5 h-3.5 flex-shrink-0" />
                      )}
                      <span className="truncate">{chan.name}</span>
                    </div>

                    {unreadCount > 0 && !isActive && (
                      <span className="px-1.5 py-0.5 bg-indigo-500 text-white text-[10px] font-bold rounded-full min-w-[18px] text-center">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Direct Messages Section */}
        <div>
          <div className="flex items-center justify-between px-2 mb-1 group">
            <button
              onClick={() => setDmsCollapsed(!dmsCollapsed)}
              className="flex items-center gap-1 text-[11px] font-semibold text-[#8C9098] uppercase tracking-wider hover:text-slate-200 transition-colors"
            >
              <ChevronDown
                className={`w-3 h-3 transition-transform ${
                  dmsCollapsed ? '-rotate-90' : ''
                }`}
              />
              <span>Direct Messages</span>
            </button>
          </div>

          {!dmsCollapsed && (
            <div className="flex flex-col gap-0.5">
              {conversations.map((conv) => {
                const isActive = activeView === 'conversation' && currentConversation?._id === conv._id;
                const unreadCount = unreadByTarget[conv._id] || 0;

                // Find recipient (other user)
                const otherUser = conv.participants?.find((p) => p._id !== user?._id);
                const name = otherUser?.displayName || conv.title || 'Direct Message';
                const isOnline = onlineUserIds.has(otherUser?._id);

                return (
                  <button
                    key={conv._id}
                    onClick={() => selectConversation(conv)}
                    className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-sm transition-all group ${
                      isActive
                        ? 'bg-indigo-600 text-white font-medium shadow-sm'
                        : unreadCount > 0
                        ? 'text-white font-bold hover:bg-[#282B30]'
                        : 'text-[#9EA0A4] hover:text-slate-200 hover:bg-[#26282E]'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Avatar
                        src={otherUser?.avatarUrl}
                        name={name}
                        size="xs"
                        presence={isOnline ? 'online' : otherUser?.presence}
                      />
                      <span className="truncate">{name}</span>
                    </div>

                    {unreadCount > 0 && !isActive && (
                      <span className="px-1.5 py-0.5 bg-indigo-500 text-white text-[10px] font-bold rounded-full min-w-[18px] text-center">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* User Status Bar at Bottom */}
      <div className="p-3 border-t border-[#2B2D33] bg-[#1A1C20] flex items-center justify-between">
        <div
          onClick={() => setProfileModalOpen(true)}
          className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity truncate"
        >
          <Avatar
            src={user?.avatarUrl}
            name={user?.displayName}
            size="sm"
            presence={user?.presence}
          />
          <div className="flex flex-col truncate">
            <span className="text-xs font-semibold text-slate-200 truncate">
              {user?.displayName}
            </span>
            <span className="text-[11px] text-[#8C9098] truncate">
              {user?.status?.text ? (
                <span>
                  {user.status.emoji} {user.status.text}
                </span>
              ) : (
                user?.title || user?.presence || 'Active'
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
