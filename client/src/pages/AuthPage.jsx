import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore.js';
import { useUIStore } from '../store/uiStore.js';
import { MessageSquare, ArrowRight, Loader2, Sparkles } from 'lucide-react';

export const AuthPage = () => {
  const { login, register } = useAuthStore();
  const { addToast } = useUIStore();

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (isRegister) {
        await register(email, password, displayName);
        addToast('Welcome to TeamSpace!', 'success');
      } else {
        await login(email, password);
        addToast('Logged in successfully', 'success');
      }
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoLogin = async (demoEmail) => {
    setIsLoading(true);
    try {
      await login(demoEmail, 'password123');
      addToast(`Logged in as ${demoEmail}`, 'success');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#111316] flex flex-col justify-center items-center p-4 selection:bg-indigo-500 selection:text-white">
      {/* Brand Header */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-600/30 mb-3">
          <MessageSquare className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-100 tracking-tight">TeamSpace</h1>
        <p className="text-xs text-[#8C9098] mt-1">Real-time team communication platform</p>
      </div>

      {/* Main Form Card */}
      <div className="bg-[#1A1D21] border border-[#2E3138] rounded-2xl shadow-2xl p-8 w-full max-w-md animate-in fade-in-50 zoom-in-95">
        {/* Toggle Mode */}
        <div className="flex bg-[#23262C] p-1 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => setIsRegister(false)}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              !isRegister
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-[#8C9098] hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setIsRegister(true)}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              isRegister
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-[#8C9098] hover:text-slate-200'
            }`}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-slate-200 uppercase tracking-wider mb-1.5">
                Display Name / Handle
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. alex"
                className="w-full bg-[#121417] border border-[#353840] focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-[#7B7E85] focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-200 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="w-full bg-[#121417] border border-[#353840] focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-[#7B7E85] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-200 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#121417] border border-[#353840] focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-[#7B7E85] focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>{isRegister ? 'Get Started' : 'Sign In'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Logins Section */}
        <div className="mt-8 pt-6 border-t border-[#2B2E34] flex flex-col gap-2.5">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#8C9098] uppercase tracking-wider">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Instant Demo Accounts</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('alex@teamspace.dev')}
              disabled={isLoading}
              className="p-2 rounded-xl bg-[#23262C] hover:bg-[#2B2F36] border border-[#353840] text-left transition-colors group"
            >
              <span className="block text-xs font-bold text-slate-200 group-hover:text-indigo-400">
                Alex
              </span>
              <span className="block text-[10px] text-[#8C9098]">Owner</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemoLogin('sarah@teamspace.dev')}
              disabled={isLoading}
              className="p-2 rounded-xl bg-[#23262C] hover:bg-[#2B2F36] border border-[#353840] text-left transition-colors group"
            >
              <span className="block text-xs font-bold text-slate-200 group-hover:text-indigo-400">
                Sarah
              </span>
              <span className="block text-[10px] text-[#8C9098]">Admin</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemoLogin('elena@teamspace.dev')}
              disabled={isLoading}
              className="p-2 rounded-xl bg-[#23262C] hover:bg-[#2B2F36] border border-[#353840] text-left transition-colors group"
            >
              <span className="block text-xs font-bold text-slate-200 group-hover:text-indigo-400">
                Elena
              </span>
              <span className="block text-[10px] text-[#8C9098]">Member</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
