import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import { useUIStore } from '../store/uiStore.js';
import { api } from '../api/client.js';
import { MessageSquare, Loader2, CheckCircle2 } from 'lucide-react';

export const InviteAcceptPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, checkAuth } = useAuthStore();
  const { addToast } = useUIStore();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const accept = async () => {
      try {
        await api.post(`/workspaces/invitations/${token}/accept`);
        await checkAuth();
        addToast('Successfully joined workspace!', 'success');
        navigate('/');
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated) {
      accept();
    } else {
      setIsLoading(false);
    }
  }, [token, isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#111316] flex flex-col items-center justify-center p-4">
        <div className="bg-[#1A1D21] border border-[#2E3138] rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white mx-auto mb-4">
            <MessageSquare className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">You've Been Invited!</h2>
          <p className="text-xs text-[#8C9098] mb-6">
            Please log in or create an account to accept your invitation to TeamSpace.
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111316] flex flex-col items-center justify-center p-4">
      <div className="bg-[#1A1D21] border border-[#2E3138] rounded-2xl p-8 max-w-md w-full text-center">
        {isLoading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-sm font-semibold text-slate-200">
              Joining workspace...
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm text-rose-400 font-semibold">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="mt-4 px-4 py-2 bg-[#2B2D31] text-xs text-white rounded-xl"
            >
              Back to Home
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            <p className="text-sm font-semibold text-slate-200">
              Welcome to the workspace!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
