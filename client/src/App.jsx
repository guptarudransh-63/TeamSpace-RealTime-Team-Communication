import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore.js';
import { SocketProvider } from './context/SocketContext.jsx';
import { AuthPage } from './pages/AuthPage.jsx';
import { WorkspacePage } from './pages/WorkspacePage.jsx';
import { InviteAcceptPage } from './pages/InviteAcceptPage.jsx';
import { MessageSquare, Loader2 } from 'lucide-react';

export const App = () => {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#111316] flex flex-col items-center justify-center text-slate-100">
        <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-600/30 mb-4 animate-bounce">
          <MessageSquare className="w-8 h-8" />
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-[#8C9098]">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
          <span>Connecting to TeamSpace...</span>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/join/:token"
          element={<InviteAcceptPage />}
        />
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <SocketProvider>
                <WorkspacePage />
              </SocketProvider>
            ) : (
              <AuthPage />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
