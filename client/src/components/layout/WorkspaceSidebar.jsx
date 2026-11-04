import React from 'react';
import { useAuthStore } from '../../store/authStore.js';
import { useUIStore } from '../../store/uiStore.js';
import { Avatar } from '../common/Avatar.jsx';
import { Plus, MessageSquare } from 'lucide-react';

export const WorkspaceSidebar = () => {
  const { workspaces, currentWorkspace, setCurrentWorkspace, user } = useAuthStore();
  const { setCreateWorkspaceModalOpen, setProfileModalOpen } = useUIStore();

  return (
    <div className="w-[70px] bg-[#121417] flex flex-col items-center py-3 justify-between border-r border-[#26282D] flex-shrink-0 select-none">
      <div className="flex flex-col items-center gap-3 w-full">
        {/* TeamSpace Logo */}
        <div className="w-11 h-11 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-600/30 mb-2">
          <MessageSquare className="w-6 h-6" />
        </div>

        <div className="w-8 h-[1px] bg-[#2E3136] mb-1" />

        {/* Workspace List */}
        <div className="flex flex-col gap-2.5 items-center w-full overflow-y-auto max-h-[calc(100vh-220px)]">
          {workspaces.map((ws) => {
            const isActive = currentWorkspace?._id === ws._id;
            const initials = ws.name
              .split(' ')
              .map((n) => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase();

            return (
              <div key={ws._id} className="relative group flex items-center">
                {/* Active indicator bar */}
                {isActive && (
                  <div className="absolute -left-3 w-1.5 h-8 bg-indigo-500 rounded-r-md" />
                )}

                <button
                  onClick={() => setCurrentWorkspace(ws)}
                  title={ws.name}
                  className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm transition-all duration-200 ${
                    isActive
                      ? 'bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-500/20'
                      : 'bg-[#222529] text-[#ABABAD] hover:bg-[#2B2D31] hover:text-white hover:rounded-xl'
                  }`}
                >
                  {ws.avatarUrl ? (
                    <img
                      src={ws.avatarUrl}
                      alt={ws.name}
                      className="w-full h-full rounded-xl object-cover"
                    />
                  ) : (
                    initials
                  )}
                </button>
              </div>
            );
          })}

          {/* Add Workspace Button */}
          <button
            onClick={() => setCreateWorkspaceModalOpen(true)}
            title="Create a new workspace"
            className="w-11 h-11 rounded-xl bg-[#222529] border border-dashed border-[#3E4249] text-[#9EA0A4] hover:text-white hover:bg-[#2B2D31] hover:border-indigo-500 flex items-center justify-center transition-all group"
          >
            <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </div>

      {/* User Avatar Trigger at Bottom */}
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={() => setProfileModalOpen(true)}
          className="relative group p-1 rounded-xl hover:bg-[#2B2D31] transition-colors"
          title={`${user?.displayName || 'User'} (${user?.presence || 'offline'})`}
        >
          <Avatar
            src={user?.avatarUrl}
            name={user?.displayName || user?.email}
            size="md"
            presence={user?.presence}
          />
        </button>
      </div>
    </div>
  );
};
