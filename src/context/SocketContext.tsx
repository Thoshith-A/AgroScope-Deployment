import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { io, Socket } from "socket.io-client";
import { useNavigate } from "react-router-dom";

export interface Provision {
  id: string;
  farmerId: string;
  farmerName: string;
  wasteType: string;
  quantityTons: number;
  pricePerKg: number;
  grade: string;
  moisture: number;
  location: string;
  description?: string;
  upiId?: string;
  status: "pending" | "accepted" | "rejected";
  decisions: Record<
    string,
    {
      status: "accepted" | "rejected";
      startupName: string;
      message?: string;
      reason?: string;
      decidedAt: string;
    }
  >;
  createdAt: string;
  syncedAt: string;
}

export interface Notification {
  id: string;
  type: "accepted" | "rejected" | "synced";
  provisionId: string;
  wasteType: string;
  quantityTons: number;
  startupName?: string;
  message: string;
  reason?: string;
  timestamp: string;
  read: boolean;
}

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  provisions: Provision[];
  notifications: Notification[];
  unreadCount: number;
  markAllRead: () => void;
  markRead: (id: string) => void;
  emitNewProvision: (data: Record<string, unknown>) => void;
  emitAccept: (provisionId: string, message?: string) => void;
  emitReject: (provisionId: string, reason: string) => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  connected: false,
  provisions: [],
  notifications: [],
  unreadCount: 0,
  markAllRead: () => {},
  markRead: () => {},
  emitNewProvision: () => {},
  emitAccept: () => {},
  emitReject: () => {},
});

export function SocketProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const navigate = useNavigate();
  const [connected, setConnected] = useState(false);
  const [provisions, setProvisions] = useState<Provision[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const user = (() => {
    try {
      return JSON.parse(
        localStorage.getItem("user") || sessionStorage.getItem("user") || "{}"
      );
    } catch {
      return {};
    }
  })();

  const role = user?.role || "startup";
  const userId = user?.id ?? user?._id ?? user?.email ?? "anon";
  const name = user?.name || user?.company_name || user?.email || "User";

  useEffect(() => {
    const env = import.meta as { env?: { VITE_SOCKET_URL?: string; VITE_API_URL?: string; DEV?: boolean } };
    const apiUrl = (env.env?.VITE_API_URL ?? '').replace(/\/$/, '');
    const SOCKET_URL =
      env.env?.VITE_SOCKET_URL ||
      (apiUrl || (typeof window !== "undefined"
        ? (env.env?.DEV ? "http://localhost:5000" : window.location.origin)
        : "http://localhost:5000"));

    socketRef.current = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      timeout: 20000,
    });

    const s = socketRef.current;

    s.on("connect", () => {
      setConnected(true);
      s.emit("register", { role, userId, name });
    });

    s.on("disconnect", () => setConnected(false));

    s.on("reconnect", () => {
      setConnected(true);
      s.emit("register", { role, userId, name });
    });

    s.on("provision_saved", (data: { success?: boolean }) => {
      if (data.success && role === "farmer") {
        navigate("/farmer-inventory");
      }
    });

    s.on("my_provisions", (provs: Provision[]) => {
      if (role === "farmer") setProvisions(provs);
    });

    s.on("provision_accepted", (notif: Record<string, unknown>) => {
      setNotifications((prev) => [
        {
          id: `NOTIF_${Date.now()}`,
          type: "accepted",
          provisionId: String(notif.provisionId ?? ""),
          wasteType: String(notif.wasteType ?? ""),
          quantityTons: Number(notif.quantityTons ?? 0),
          startupName: notif.startupName as string | undefined,
          message: String(notif.message ?? ""),
          timestamp: String(notif.timestamp ?? new Date().toISOString()),
          read: false,
        },
        ...prev,
      ]);
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("✅ Provision Accepted!", { body: String(notif.message ?? "") });
      } else if (typeof Notification !== "undefined" && Notification.permission !== "denied") {
        Notification.requestPermission().then((perm) => {
          if (perm === "granted") new Notification("✅ Provision Accepted!", { body: String(notif.message ?? "") });
        });
      }
    });

    s.on("provision_rejected", (notif: Record<string, unknown>) => {
      setNotifications((prev) => [
        {
          id: `NOTIF_${Date.now()}`,
          type: "rejected",
          provisionId: String(notif.provisionId ?? ""),
          wasteType: String(notif.wasteType ?? ""),
          quantityTons: Number(notif.quantityTons ?? 0),
          startupName: notif.startupName as string | undefined,
          message: String(notif.message ?? ""),
          reason: notif.reason as string | undefined,
          timestamp: String(notif.timestamp ?? new Date().toISOString()),
          read: false,
        },
        ...prev,
      ]);
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("❌ Provision Rejected", { body: String(notif.message ?? "") });
      }
    });

    s.on("all_provisions", (provs: Provision[]) => {
      if (role === "startup") setProvisions(provs);
    });

    s.on("provision_synced", ({ provision }: { provision: Provision }) => {
      if (role === "startup") {
        setProvisions((prev) => {
          if (prev.some((p) => p.id === provision.id)) return prev;
          return [provision, ...prev];
        });
        navigate("/startup/inventory", {
          state: { newProvisionId: provision.id, highlight: true },
        });
      }
    });

    s.on("provision_updated", ({ provision }: { provision: Provision }) => {
      setProvisions((prev) =>
        prev.map((p) => (p.id === provision.id ? provision : p))
      );
    });

    s.on("provision_update_confirmed", ({ provision }: { provision: Provision }) => {
      setProvisions((prev) =>
        prev.map((p) => (p.id === provision.id ? provision : p))
      );
    });

    return () => {
      s.disconnect();
    };
  }, [navigate, role, userId, name]);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const emitNewProvision = useCallback((data: Record<string, unknown>) => {
    socketRef.current?.emit("new_provision", data);
  }, []);

  const emitAccept = useCallback(
    (provisionId: string, message?: string) => {
      socketRef.current?.emit("accept_provision", {
        provisionId,
        startupId: userId,
        startupName: name,
        message: message || "Accepted",
      });
    },
    [userId, name]
  );

  const emitReject = useCallback(
    (provisionId: string, reason: string) => {
      socketRef.current?.emit("reject_provision", {
        provisionId,
        startupId: userId,
        startupName: name,
        reason,
      });
    },
    [userId, name]
  );

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current,
        connected,
        provisions,
        notifications,
        unreadCount,
        markAllRead,
        markRead,
        emitNewProvision,
        emitAccept,
        emitReject,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
