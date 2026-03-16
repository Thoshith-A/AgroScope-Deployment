import { useState, useRef, useEffect } from "react";
import { Bell, CheckCircle, XCircle, X } from "lucide-react";
import { useSocket } from "@/context/SocketContext";

export default function FarmerNotifications() {
  const { notifications, unreadCount, markAllRead, markRead } = useSocket();
  const [open, setOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!dropRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={dropRef}>
      <button
        type="button"
        onClick={() => {
          setOpen(!open);
          if (!open) markAllRead();
        }}
        className="relative rounded-xl p-2 text-gray-400 transition hover:bg-gray-800 hover:text-white"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 animate-pulse items-center justify-center rounded-full bg-green-500 text-xs font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl">
          <div className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
            <h3 className="text-sm font-bold text-white">Notifications</h3>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-gray-500 hover:text-white"
            >
              <X size={14} />
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell size={28} className="mx-auto mb-2 text-gray-600" />
                <p className="text-sm text-gray-500">No notifications yet</p>
                <p className="mt-1 text-xs text-gray-600">
                  You&apos;ll be notified when startups respond
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => markRead(n.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") markRead(n.id);
                  }}
                  className={`cursor-pointer border-b border-gray-800 px-4 py-3 transition ${
                    !n.read ? "bg-gray-800/50" : "hover:bg-gray-800/20"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                        n.type === "accepted"
                          ? "bg-green-900/50"
                          : "bg-red-900/50"
                      }`}
                    >
                      {n.type === "accepted" ? (
                        <CheckCircle size={16} className="text-green-400" />
                      ) : (
                        <XCircle size={16} className="text-red-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-xs leading-relaxed ${
                          !n.read
                            ? "font-semibold text-white"
                            : "text-gray-300"
                        }`}
                      >
                        {n.message}
                      </p>
                      {n.reason && (
                        <p className="mt-1 text-xs text-red-400/70">
                          Reason: {n.reason}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        {new Date(n.timestamp).toLocaleTimeString("en-IN")}
                      </p>
                    </div>
                    {!n.read && (
                      <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-green-400" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
