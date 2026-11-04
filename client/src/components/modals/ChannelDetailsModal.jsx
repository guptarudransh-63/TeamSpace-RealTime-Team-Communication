import React, { useEffect, useState } from 'react';
import { useChannelStore } from '../../store/channelStore.js';
import { useAuthStore } from '../../store/authStore.js';
import { useUIStore } from '../../store/uiStore.js';
import { api } from '../../api/client.js';
import { Avatar } from '../common/Avatar.jsx';
import { Hash, Lock, Users, X, LogOut, Loader2, UserPlus } from 'lucide-react';

export const ChannelDetailsModal = () => {
  const { currentChannel, selectChannel, channels, setChannels } = useChannelStore();
  const { currentWorkspace, user } = useAuthStore();
  const {
    channelDetailsModalOpen,
    setChannelDetailsModalOpen,
    addToast,
    onlineUserIds,
  } = useUIStore();

  const [members, setMembers] = useState([]);
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAddUserId, setSelectedAddUserId] = useState('');

  useEffect(() => {
    if (channelDetailsModalOpen && currentChannel?._id) {
      setIsLoading(true);
      Promise.all([
        api.get(`/channels/${currentChannel._id}/members`),
        api.get(`/workspaces/${currentWorkspace._id}/members`),
      ])
        .then(([chanRes, wsRes]) => {
          setMembers(chanRes.data.members || []);
          setWorkspaceMembers(wsRes.data.members || []);
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [channelDetailsModalOpen, currentChannel?._id, currentWorkspace?._id]);

  const handleLeaveChannel = async () => {
    if (currentChannel.name === 'general') {
      addToast('Cannot leave the #general channel', 'error');
      return;
    }

    if (!window.confirm(`Leave #${currentChannel.name}?`)) return;

    try {
      await api.post(`/channels/${currentChannel._id}/leave`);
      setChannelDetailsModalOpen(false);
      // Switch to general channel
      const general = channels.find((c) => c.name === 'general') || channels[0];
      if (general) selectChannel(general);
      addToast(`Left #${currentChannel.name}`, 'info');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleAddMember = async () => {
    if (!selectedAddUserId) return;
    try {
      await api.post(`/channels/${currentChannel._id}/invite`, {
        userIds: [selectedAddUserId],
      });
      addToast('Member added to channel', 'success');
      setSelectedAddUserId('');
      // Refresh member list
      const res = await api.get(`/channels/${currentChannel._id}/members`);
      setMembers(res.data.members || []);
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  if (!channelDetailsModalOpen || !currentChannel) return null;

  // Find workspace members who are not yet channel members
  const memberIds = new Set(members.map((m) => m._id));
  const candidateUsers = workspaceMembers.filter((m) => !memberIds.has(m._id));

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1E2125] border border-[#35383F] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in-50 zoom-in-95 flex flex-col max-h-[85vh]">
        <div className="px-6 py-4 border-b border-[#2B2D33] flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-slate-100 text-base">
            {currentChannel.isPrivate ? (
              <Lock className="w-5 h-5 text-indigo-400" />
            ) : (
              <Hash className="w-5 h-5 text-indigo-400" />
            )}
            <span>#{currentChannel.name}</span>
          </div>
          <button
            onClick={() => setChannelDetailsModalOpen(false)}
            className="p-1 rounded-lg text-[#8C9098] hover:text-white hover:bg-[#2C2F36]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
          {/* Channel Topic & Description */}
          <div className="p-4 rounded-xl bg-[#25282D] border border-[#35383F] flex flex-col gap-2">
            <div>
              <span className="text-[11px] font-semibold text-[#8C9098] uppercase tracking-wider block mb-0.5">
                Topic
              </span>
              <p className="text-xs text-slate-200">
                {currentChannel.topic || 'No topic set for this channel.'}
              </p>
            </div>
            {currentChannel.description && (
              <div className="pt-2 border-t border-[#35383F]">
                <span className="text-[11px] font-semibold text-[#8C9098] uppercase tracking-wider block mb-0.5">
                  Description
                </span>
                <p className="text-xs text-slate-300">{currentChannel.description}</p>
              </div>
            )}
          </div>

          {/* Add Member Dropdown (if any eligible members) */}
          {candidateUsers.length > 0 && (
            <div className="flex items-center gap-2">
              <select
                value={selectedAddUserId}
                onChange={(e) => setSelectedAddUserId(e.target.value)}
                className="flex-1 bg-[#16181C] border border-[#3A3D44] focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none"
              >
                <option value="">Select workspace member to add...</option>
                {candidateUsers.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.displayName} ({m.email})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAddMember}
                disabled={!selectedAddUserId}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          )}

          {/* Members List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                Members ({members.length})
              </span>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-1">
                {members.map((member) => {
                  const isOnline = onlineUserIds.has(member._id);
                  return (
                    <div
                      key={member._id}
                      className="flex items-center justify-between p-2 rounded-xl bg-[#222529] border border-[#30333A]"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Avatar
                          src={member.avatarUrl}
                          name={member.displayName}
                          size="sm"
                          presence={isOnline ? 'online' : member.presence}
                        />
                        <div className="flex flex-col truncate">
                          <span className="text-xs font-semibold text-slate-200 truncate">
                            {member.displayName} {member._id === user?._id && '(you)'}
                          </span>
                          <span className="text-[10px] text-[#8C9098] truncate">
                            {member.title || member.email}
                          </span>
                        </div>
                      </div>

                      {member.channelRole && (
                        <span className="text-[10px] font-medium text-slate-400 bg-[#2C2F36] px-2 py-0.5 rounded-full capitalize">
                          {member.channelRole}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Leave Channel Action */}
          {currentChannel.name !== 'general' && (
            <div className="pt-2 border-t border-[#2B2D33] flex justify-end">
              <button
                type="button"
                onClick={handleLeaveChannel}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-950/40 rounded-xl transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Leave Channel</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
