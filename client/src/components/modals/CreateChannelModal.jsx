import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore.js';
import { useChannelStore } from '../../store/channelStore.js';
import { useUIStore } from '../../store/uiStore.js';
import { api } from '../../api/client.js';
import { Hash, Lock, X, Loader2 } from 'lucide-react';

export const CreateChannelModal = () => {
  const { currentWorkspace } = useAuthStore();
  const { channels, setChannels, selectChannel } = useChannelStore();
  const { createChannelModalOpen, setCreateChannelModalOpen, addToast } = useUIStore();

  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !currentWorkspace?._id) return;

    setIsLoading(true);
    try {
      const res = await api.post('/channels', {
        workspaceId: currentWorkspace._id,
        name: name.trim(),
        topic: topic.trim(),
        description: description.trim(),
        isPrivate,
      });

      const newChan = res.data.channel;
      setChannels([...channels, newChan]);
      selectChannel(newChan);
      setCreateChannelModalOpen(false);
      setName('');
      setTopic('');
      setDescription('');
      setIsPrivate(false);
      addToast(`Created #${newChan.name}`, 'success');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (!createChannelModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1E2125] border border-[#35383F] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in-50 zoom-in-95">
        <div className="px-6 py-4 border-b border-[#2B2D33] flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-slate-100 text-base">
            {isPrivate ? (
              <Lock className="w-5 h-5 text-indigo-400" />
            ) : (
              <Hash className="w-5 h-5 text-indigo-400" />
            )}
            <span>Create a channel</span>
          </div>
          <button
            onClick={() => setCreateChannelModalOpen(false)}
            className="p-1 rounded-lg text-[#8C9098] hover:text-white hover:bg-[#2C2F36]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-200 uppercase tracking-wider mb-1.5">
              Name
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-slate-400 font-bold">#</span>
              <input
                type="text"
                required
                value={name}
                onChange={(e) =>
                  setName(e.target.value.toLowerCase().replace(/\s+/g, '-'))
                }
                placeholder="e.g. plan-launch"
                className="w-full bg-[#16181C] border border-[#3A3D44] focus:border-indigo-500 rounded-xl pl-8 pr-3 py-2 text-sm text-slate-100 placeholder-[#7B7E85] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-200 uppercase tracking-wider mb-1.5">
              Topic <span className="text-[#7B7E84] font-normal normal-case">(optional)</span>
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="What is this channel about?"
              className="w-full bg-[#16181C] border border-[#3A3D44] focus:border-indigo-500 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-[#7B7E85] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-200 uppercase tracking-wider mb-1.5">
              Description <span className="text-[#7B7E84] font-normal normal-case">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide context on when to use this channel..."
              rows={2}
              className="w-full bg-[#16181C] border border-[#3A3D44] focus:border-indigo-500 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-[#7B7E85] focus:outline-none resize-none"
            />
          </div>

          {/* Privacy Switch */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#25282D] border border-[#35383F]">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-slate-200">
                Make channel private
              </span>
              <span className="text-[11px] text-[#8C9098]">
                Only invited members can view this channel and its messages.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsPrivate(!isPrivate)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ${
                isPrivate ? 'bg-indigo-600 justify-end' : 'bg-[#3A3D44] justify-start'
              }`}
            >
              <div className="bg-white w-4 h-4 rounded-full shadow-md" />
            </button>
          </div>

          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={() => setCreateChannelModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-[#2C2F36] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isLoading}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition-colors flex items-center gap-2 shadow-lg shadow-indigo-600/20"
            >
              {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Create Channel</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
