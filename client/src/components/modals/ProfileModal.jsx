import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore.js';
import { useUIStore } from '../../store/uiStore.js';
import { Avatar } from '../common/Avatar.jsx';
import { User, X, LogOut, Check, Loader2, Smile } from 'lucide-react';

export const ProfileModal = () => {
  const { user, updateProfile, updateStatus, updatePresence, logout } = useAuthStore();
  const { profileModalOpen, setProfileModalOpen, addToast } = useUIStore();

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [realName, setRealName] = useState(user?.realName || '');
  const [title, setTitle] = useState(user?.title || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');

  const [statusText, setStatusText] = useState(user?.status?.text || '');
  const [statusEmoji, setStatusEmoji] = useState(user?.status?.emoji || '💬');
  const [presence, setPresence] = useState(user?.presence || 'online');

  const [isLoading, setIsLoading] = useState(false);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await updateProfile({ displayName, realName, title, avatarUrl });
      await updateStatus({ text: statusText, emoji: statusEmoji });
      await updatePresence(presence);
      addToast('Profile updated successfully', 'success');
      setProfileModalOpen(false);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setProfileModalOpen(false);
  };

  if (!profileModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1E2125] border border-[#35383F] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in-50 zoom-in-95">
        <div className="px-6 py-4 border-b border-[#2B2D33] flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-slate-100 text-base">
            <User className="w-5 h-5 text-indigo-400" />
            <span>Edit Profile & Status</span>
          </div>
          <button
            onClick={() => setProfileModalOpen(false)}
            className="p-1 rounded-lg text-[#8C9098] hover:text-white hover:bg-[#2C2F36]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSaveProfile} className="p-6 flex flex-col gap-5">
          {/* Avatar and Presence Header */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-[#25282D] border border-[#35383F]">
            <Avatar
              src={avatarUrl}
              name={displayName || user?.email}
              size="lg"
              presence={presence}
            />
            <div className="flex-1">
              <span className="block text-xs font-semibold text-slate-200 mb-1">
                Presence Status
              </span>
              <div className="flex gap-2">
                {['online', 'away', 'offline'].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPresence(p)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium capitalize border transition-all ${
                      presence === p
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                        : 'bg-[#1E2125] border-[#383A40] text-[#8C9098] hover:text-slate-200'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Status Message */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 uppercase tracking-wider mb-1.5">
              Custom Status Message
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={statusEmoji}
                onChange={(e) => setStatusEmoji(e.target.value)}
                className="w-12 text-center bg-[#16181C] border border-[#3A3D44] rounded-xl text-lg focus:outline-none"
              />
              <input
                type="text"
                value={statusText}
                onChange={(e) => setStatusText(e.target.value)}
                placeholder="What are you working on right now?"
                className="flex-1 bg-[#16181C] border border-[#3A3D44] focus:border-indigo-500 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-[#7B7E85] focus:outline-none"
              />
            </div>
          </div>

          {/* Display & Real Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-200 uppercase tracking-wider mb-1.5">
                Display Name
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-[#16181C] border border-[#3A3D44] focus:border-indigo-500 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-200 uppercase tracking-wider mb-1.5">
                Full Real Name
              </label>
              <input
                type="text"
                value={realName}
                onChange={(e) => setRealName(e.target.value)}
                placeholder="e.g. Alex Chen"
                className="w-full bg-[#16181C] border border-[#3A3D44] focus:border-indigo-500 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none"
              />
            </div>
          </div>

          {/* Title & Avatar URL */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-200 uppercase tracking-wider mb-1.5">
                Job Title / Role
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Engineering Lead"
                className="w-full bg-[#16181C] border border-[#3A3D44] focus:border-indigo-500 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-200 uppercase tracking-wider mb-1.5">
                Avatar Image URL
              </label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-[#16181C] border border-[#3A3D44] focus:border-indigo-500 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between border-t border-[#2B2D33] pt-4 mt-2">
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-950/40 rounded-xl transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Log out</span>
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setProfileModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-[#2C2F36] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition-colors flex items-center gap-2 shadow-lg shadow-indigo-600/20"
              >
                {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
