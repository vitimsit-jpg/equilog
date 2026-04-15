"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import type { Notification, NotificationType } from "@/lib/supabase/types";

const TYPE_EMOJI: Record<NotificationType, string> = {
  health_reminder: "🩺",
  training_reminder: "🏇",
  rehab_complete: "🎉",
  weekly_summary: "📊",
  score_alert: "📉",
  coach_modification: "👨‍🏫",
  horse_share: "🤝",
  other: "🔔",
};

export default function NotificationsBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Fetch notifications + unread count
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const { notifications: list, unreadCount: count } = await res.json();
      setNotifications(list ?? []);
      setUnreadCount(count ?? 0);
    } catch {
      // silent fail — pas critique
    }
  }, []);

  // Initial fetch + polling 60s
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Refetch quand on ouvre le panel
  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleNotificationClick = async (notif: Notification) => {
    // Marquer comme lue (optimistic update)
    if (!notif.read) {
      setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
      fetch(`/api/notifications/${notif.id}/read`, { method: "POST" }).catch(() => {});
    }
    setOpen(false);
    if (notif.url) {
      router.push(notif.url);
    }
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;
    setLoading(true);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_all_read" }),
      });
    } catch {
      // optimistic update déjà fait
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-black transition-colors relative"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} non-lues)` : ""}`}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-orange text-white text-[9px] font-bold flex items-center justify-center leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-card-hover border border-gray-100 z-50 animate-scale-in overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
            <p className="text-sm font-bold text-black">Notifications</p>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={loading}
                className="text-2xs text-orange hover:underline flex items-center gap-1 disabled:opacity-50"
              >
                <Check className="h-3 w-3" />
                Tout marquer lu
              </button>
            )}
          </div>

          {/* Liste */}
          <div className="max-h-[70vh] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-2xl mb-2">🔕</p>
                <p className="text-sm text-gray-400">Aucune notification</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`w-full flex items-start gap-3 px-4 py-3 border-b border-gray-50 last:border-0 text-left transition-colors ${
                    notif.read ? "hover:bg-gray-50" : "bg-orange-light/30 hover:bg-orange-light/50"
                  }`}
                >
                  <span className="text-lg flex-shrink-0 mt-0.5">{TYPE_EMOJI[notif.type] ?? "🔔"}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${notif.read ? "text-gray-600" : "text-black font-semibold"}`}>
                      {notif.title}
                    </p>
                    {notif.body && (
                      <p className="text-2xs text-gray-400 mt-0.5 line-clamp-2">{notif.body}</p>
                    )}
                    <p className="text-2xs text-gray-300 mt-1">
                      {(() => {
                        try {
                          return formatDistanceToNow(parseISO(notif.created_at), { addSuffix: true, locale: fr });
                        } catch {
                          return "";
                        }
                      })()}
                    </p>
                  </div>
                  {!notif.read && (
                    <span className="w-2 h-2 rounded-full bg-orange flex-shrink-0 mt-2" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
