import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../store/authStore.js';
import { useChannelStore } from '../../store/channelStore.js';
import { useUIStore } from '../../store/uiStore.js';
import { api } from '../../api/client.js';
import { Bell, CheckCheck, MessageSquare, AtSign, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export const NotificationsDropdown = () => {
  const { currentWorkspace } = useAuthStore();
  const { channels, selectChannel, conversations, selectConversation } = useChannelStore();
  const {
    notificationsOpen,
    setNotificationsOpen,
    setUnreadNotificationsCount,
  } = useUIStore();

  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    if (!currentWorkspace?._id) return;
    setIsLoading(true);
    try {
      const res = await api.get(`/notifications?workspaceId=${currentWorkspace._id}`);
      setNotifications(res.data.notifications || []);
      setUnreadNotificationsCount(res.data.unreadCount || 0);
    } catch (err) {
      console.error('[Fetch Notifications Error]', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (notificationsOpen) {
      fetchNotifications();
    }
  }, [notificationsOpen, currentWorkspace?._id]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setNotificationsOpen(false);
      }
    };
    if (notificationsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notificationsOpen]);

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/read-all', {
        workspaceId: currentWorkspace._id,
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadNotificationsCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.isRead) {
      await api.patch(`/notifications/${notif._id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === notif._id ? { ...n, isRead: true } : n))
      );
      setUnreadNotificationsCount((prev) => Math.max(0, prev - 1));
    }

    // Navigate to link if present
    setNotificationsOpen(false);
  };

  if (!notificationsOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute right-5 top-14 w-80 bg-[#1E2125] border border-[#35383F] rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col max-h-[460px] animate-in fade-in-50 zoom-in-95"
    >
      <div className="px-4 py-3 border-b border-[#2B2D33] flex items-center justify-between bg-[#222529]">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-indigo-400" />
          <span className="font-bold text-xs text-slate-100 uppercase tracking-wider">
            Activity & Mentions
          </span>
        </div>
        {notifications.some((n) => !n.isRead) && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-10 px-4 text-[#8C9098] text-xs">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-30 text-indigo-400" />
            <p className="font-medium text-slate-300 mb-0.5">All caught up!</p>
            <p>You have no new notifications.</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif._id}
              onClick={() => handleNotificationClick(notif)}
              className={`flex items-start gap-3 p-2.5 rounded-xl transition-all cursor-pointer border ${
                notif.isRead
                  ? 'bg-transparent border-transparent hover:bg-[#25282D]'
                  : 'bg-[#25282D] border-indigo-900/50 hover:bg-[#2B2E34]'
              }`}
            >
              <div className="mt-0.5 w-7 h-7 rounded-lg bg-indigo-950 border border-indigo-800 flex items-center justify-center text-indigo-400 flex-shrink-0">
                {notif.type === 'mention' ? (
                  <AtSign className="w-3.5 h-3.5" />
                ) : (
                  <MessageSquare className="w-3.5 h-3.5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold text-slate-200 block truncate">
                  {notif.title}
                </span>
                <p className="text-[11px] text-[#A6A8AB] line-clamp-2 mt-0.5">
                  {notif.body}
                </p>
                <span className="text-[10px] text-[#787C84] block mt-1">
                  {format(new Date(notif.createdAt), 'MMM d, h:mm a')}
                </span>
              </div>
              {!notif.isRead && (
                <span className="w-2 h-2 rounded-full bg-indigo-500 mt-1 flex-shrink-0" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
