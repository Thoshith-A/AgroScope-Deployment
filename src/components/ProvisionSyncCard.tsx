import { useState } from "react";
import type { Provision } from "@/context/SocketContext";
import { CheckCircle, XCircle, Clock, MapPin } from "lucide-react";

interface Props {
  provision: Provision;
  isNew?: boolean;
  onAccept: () => void;
  onReject: () => void;
}

const CROP_EMOJIS: Record<string, string> = {
  "Paddy Husk": "🌾",
  "Wheat Straw": "🌿",
  "Corn Stalks": "🌽",
  "Sugarcane Bagasse": "🎋",
  "Coconut Shells": "🥥",
};

const STATUS_CONFIG = {
  pending: {
    label: "Pending Review",
    color: "text-amber-400",
    bg: "bg-amber-900/20",
    border: "border-amber-700/30",
    dot: "bg-amber-400 animate-pulse",
  },
  accepted: {
    label: "Accepted",
    color: "text-green-400",
    bg: "bg-green-900/20",
    border: "border-green-700/30",
    dot: "bg-green-400",
  },
  rejected: {
    label: "Rejected",
    color: "text-red-400",
    bg: "bg-red-900/20",
    border: "border-red-700/30",
    dot: "bg-red-400",
  },
};

export default function ProvisionSyncCard({
  provision,
  isNew = false,
  onAccept,
  onReject,
}: Props) {
  const [accepting, setAccepting] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const status = STATUS_CONFIG[provision.status];
  const emoji = CROP_EMOJIS[provision.wasteType] || "🌱";
  const totalValue = Math.round(
    provision.quantityTons * 1000 * (provision.pricePerKg || 0)
  );
  const timeAgo = (() => {
    const diff = Date.now() - new Date(provision.createdAt).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  })();

  const handleAccept = () => {
    setAccepting(true);
    onAccept();
    setTimeout(() => setAccepting(false), 1500);
  };

  const handleReject = () => {
    setRejecting(true);
    onReject();
    setTimeout(() => setRejecting(false), 500);
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-gray-900 transition-all duration-500 ${
        isNew
          ? "border-green-400 shadow-lg shadow-green-900/50 ring-2 ring-green-500/30"
          : "border-gray-700/50 hover:border-gray-600"
      }`}
    >
      {isNew && (
        <div className="absolute right-3 top-3 z-10 animate-bounce rounded-full bg-green-500 px-2.5 py-1 text-xs font-bold text-white">
          NEW ✨
        </div>
      )}
      <div
        className={`h-1 w-full ${
          provision.status === "accepted"
            ? "bg-green-500"
            : provision.status === "rejected"
              ? "bg-red-500"
              : "bg-amber-500"
        }`}
      />
      <div className="p-5">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-700 bg-gray-800 text-2xl">
              {emoji}
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {provision.wasteType}
              </h3>
              <p className="text-xs text-gray-400">by {provision.farmerName}</p>
            </div>
          </div>
          <div
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${status.bg} ${status.color} ${status.border}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
            {status.label}
          </div>
        </div>
        <div className="mb-4 grid grid-cols-2 gap-2">
          {[
            { label: "Quantity", value: `${provision.quantityTons}t`, icon: "⚖️" },
            {
              label: "Price/kg",
              value: `₹${provision.pricePerKg ?? 0}`,
              icon: "💰",
            },
            { label: "Grade", value: provision.grade || "N/A", icon: "⭐" },
            {
              label: "Moisture",
              value: `${provision.moisture ?? 0}%`,
              icon: "💧",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-gray-700/50 bg-gray-800/60 p-2.5"
            >
              <div className="mb-0.5 text-xs text-gray-500">
                {item.icon} {item.label}
              </div>
              <div className="text-sm font-bold text-white">{item.value}</div>
            </div>
          ))}
        </div>
        <div className="mb-3 flex items-center justify-between rounded-xl border border-green-800/30 bg-green-900/20 p-3">
          <span className="text-xs text-green-400/70">Total Value</span>
          <span className="text-lg font-black text-green-400">
            ₹{totalValue.toLocaleString("en-IN")}
          </span>
        </div>
        <div className="mb-4 flex items-center justify-between text-xs text-gray-500">
          <span className="flex items-center gap-1 truncate">
            <MapPin size={10} />
            {provision.location || "Location N/A"}
          </span>
          <span className="flex shrink-0 items-center gap-1">
            <Clock size={10} />
            {timeAgo}
          </span>
        </div>
        {provision.status === "pending" && (
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleReject}
              disabled={rejecting}
              className="flex items-center justify-center gap-2 rounded-xl border border-red-700/40 bg-red-900/30 py-2.5 text-sm font-bold text-red-400 transition-all hover:bg-red-900/50 active:scale-95 disabled:opacity-50"
            >
              <XCircle size={15} />
              Reject
            </button>
            <button
              type="button"
              onClick={handleAccept}
              disabled={accepting}
              className="flex items-center justify-center gap-2 rounded-xl bg-green-600 py-2.5 text-sm font-bold text-white transition-all hover:bg-green-700 active:scale-95 disabled:opacity-50"
            >
              {accepting ? (
                <span className="flex items-center gap-1">Accepting...</span>
              ) : (
                <>
                  <CheckCircle size={15} />
                  Accept
                </>
              )}
            </button>
          </div>
        )}
        {provision.status === "accepted" && (
          <div className="flex items-center gap-2 rounded-xl border border-green-700/40 bg-green-900/30 p-3">
            <CheckCircle size={16} className="shrink-0 text-green-400" />
            <p className="text-xs font-semibold text-green-400">
              You accepted this provision. Farmer has been notified.
            </p>
          </div>
        )}
        {provision.status === "rejected" && (
          <div className="flex items-center gap-2 rounded-xl border border-red-700/30 bg-red-900/20 p-3">
            <XCircle size={16} className="shrink-0 text-red-400" />
            <p className="text-xs font-semibold text-red-400">
              Rejected. Farmer has been notified.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
