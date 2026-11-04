import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore.js';
import { useUIStore } from '../../store/uiStore.js';
import { api } from '../../api/client.js';
import { Building2, X, Loader2 } from 'lucide-react';

export const CreateWorkspaceModal = () => {
  const { addWorkspace } = useAuthStore();
  const { createWorkspaceModalOpen, setCreateWorkspaceModalOpen, addToast } = useUIStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    try {
      const res = await api.post('/workspaces', {
        name: name.trim(),
        description: description.trim(),
      });

      addWorkspace(res.data.workspace);
      setCreateWorkspaceModalOpen(false);
      setName('');
      setDescription('');
      addToast(`Workspace "${res.data.workspace.name}" created!`, 'success');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (!createWorkspaceModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1E2125] border border-[#35383F] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in-50 zoom-in-95">
        <div className="px-6 py-4 border-b border-[#2B2D33] flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-slate-100 text-base">
            <Building2 className="w-5 h-5 text-indigo-400" />
            <span>Create a new workspace</span>
          </div>
          <button
            onClick={() => setCreateWorkspaceModalOpen(false)}
            className="p-1 rounded-lg text-[#8C9098] hover:text-white hover:bg-[#2C2F36]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-200 uppercase tracking-wider mb-1.5">
              Workspace Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Corp, Design Team"
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
              placeholder="What will this workspace be used for?"
              rows={2}
              className="w-full bg-[#16181C] border border-[#3A3D44] focus:border-indigo-500 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-[#7B7E85] focus:outline-none resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={() => setCreateWorkspaceModalOpen(false)}
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
              <span>Create Workspace</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
