import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore.js';
import { useUIStore } from '../../store/uiStore.js';
import { api } from '../../api/client.js';
import { UserPlus, X, Copy, Check, Loader2 } from 'lucide-react';

export const InviteModal = () => {
  const { currentWorkspace } = useAuthStore();
  const { inviteModalOpen, setInviteModalOpen, addToast } = useUIStore();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [inviteLink, setInviteLink] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !currentWorkspace?._id) return;

    setIsLoading(true);
    try {
      const res = await api.post(`/workspaces/${currentWorkspace._id}/invitations`, {
        email: email.trim(),
        role,
      });

      setInviteLink(res.data.inviteLink);
      addToast(`Invitation generated for ${email}`, 'success');
      setEmail('');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    addToast('Invitation link copied to clipboard', 'info');
  };

  if (!inviteModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1E2125] border border-[#35383F] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in-50 zoom-in-95">
        <div className="px-6 py-4 border-b border-[#2B2D33] flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-slate-100 text-base">
            <UserPlus className="w-5 h-5 text-indigo-400" />
            <span>Invite teammates to {currentWorkspace?.name}</span>
          </div>
          <button
            onClick={() => setInviteModalOpen(false)}
            className="p-1 rounded-lg text-[#8C9098] hover:text-white hover:bg-[#2C2F36]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-5">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-200 uppercase tracking-wider mb-1.5">
                Teammate's Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="w-full bg-[#16181C] border border-[#3A3D44] focus:border-indigo-500 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-[#7B7E85] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-200 uppercase tracking-wider mb-1.5">
                Workspace Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-[#16181C] border border-[#3A3D44] focus:border-indigo-500 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none"
              >
                <option value="member">Member (Can view, chat, and join channels)</option>
                <option value="admin">Admin (Can manage channels and settings)</option>
                <option value="guest">Guest (Restricted access)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={!email.trim() || isLoading}
              className="w-full py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
            >
              {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Generate Invitation Link</span>
            </button>
          </form>

          {/* Generated Link Display */}
          {inviteLink && (
            <div className="p-3.5 rounded-xl bg-[#25282D] border border-[#3A3D44] flex flex-col gap-2">
              <span className="text-xs font-semibold text-slate-200">
                Shareable Invitation Link
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={inviteLink}
                  className="flex-1 bg-[#1A1C20] border border-[#3A3D44] rounded-lg px-2.5 py-1.5 text-xs text-indigo-300 select-all focus:outline-none truncate"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
