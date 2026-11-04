import React, { useEffect } from 'react';
import { useAuthStore } from '../store/authStore.js';
import { useChannelStore } from '../store/channelStore.js';
import { useUnreadStore } from '../store/unreadStore.js';
import { api } from '../api/client.js';

// Layout
import { WorkspaceSidebar } from '../components/layout/WorkspaceSidebar.jsx';
import { ChannelSidebar } from '../components/layout/ChannelSidebar.jsx';
import { TopNav } from '../components/layout/TopNav.jsx';
import { PinnedMessagesPanel } from '../components/layout/PinnedMessagesPanel.jsx';

// Chat & Threads
import { MessageTimeline } from '../components/chat/MessageTimeline.jsx';
import { MessageComposer } from '../components/chat/MessageComposer.jsx';
import { ThreadView } from '../components/thread/ThreadView.jsx';

// Modals
import { SearchModal } from '../components/search/SearchModal.jsx';
import { CreateChannelModal } from '../components/modals/CreateChannelModal.jsx';
import { InviteModal } from '../components/modals/InviteModal.jsx';
import { ProfileModal } from '../components/modals/ProfileModal.jsx';
import { ChannelDetailsModal } from '../components/modals/ChannelDetailsModal.jsx';
import { CreateWorkspaceModal } from '../components/modals/CreateWorkspaceModal.jsx';
import { NotificationsDropdown } from '../components/modals/NotificationsDropdown.jsx';
import { ToastContainer } from '../components/common/ToastContainer.jsx';

export const WorkspacePage = () => {
  const { currentWorkspace } = useAuthStore();
  const {
    channels,
    setChannels,
    conversations,
    setConversations,
    currentChannel,
    currentConversation,
    selectChannel,
  } = useChannelStore();

  const { fetchUnreads } = useUnreadStore();

  // Load channels, conversations, and unread counts when workspace changes
  useEffect(() => {
    if (!currentWorkspace?._id) return;

    const loadWorkspaceData = async () => {
      try {
        const [channelsRes, convRes] = await Promise.all([
          api.get(`/channels/workspace/${currentWorkspace._id}`),
          api.get(`/conversations/workspace/${currentWorkspace._id}`),
        ]);

        const loadedChannels = channelsRes.data.channels || [];
        setChannels(loadedChannels);
        setConversations(convRes.data.conversations || []);

        // Default to #general or first channel if none currently selected
        if (!currentChannel && !currentConversation && loadedChannels.length > 0) {
          const general =
            loadedChannels.find((c) => c.name === 'general') || loadedChannels[0];
          selectChannel(general);
        }

        // Fetch unreads
        fetchUnreads(currentWorkspace._id);
      } catch (err) {
        console.error('[Load Workspace Data Error]', err);
      }
    };

    loadWorkspaceData();
  }, [currentWorkspace?._id]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#1A1D21] text-slate-100 font-sans">
      {/* 1. Workspace Switcher Sidebar */}
      <WorkspaceSidebar />

      {/* 2. Channel & DM Navigation Sidebar */}
      <ChannelSidebar />

      {/* 3. Main Conversation Panel */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0 bg-[#1A1D21]">
        <TopNav />
        <MessageTimeline />
        <MessageComposer />
      </div>

      {/* 4. Right Contextual Panel: Threads */}
      <ThreadView />

      {/* 5. Right Contextual Panel: Pinned Messages */}
      <PinnedMessagesPanel />

      {/* Floating Modals & Overlays */}
      <SearchModal />
      <CreateChannelModal />
      <InviteModal />
      <ProfileModal />
      <ChannelDetailsModal />
      <CreateWorkspaceModal />
      <NotificationsDropdown />

      {/* Toast Alert System */}
      <ToastContainer />
    </div>
  );
};
