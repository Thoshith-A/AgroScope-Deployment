import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useSocket } from "@/context/SocketContext";
import ProvisionSyncCard from "@/components/ProvisionSyncCard";
import { Wifi, WifiOff, Package } from "lucide-react";

export default function StartupInventory() {
  const location = useLocation();
  const { connected, provisions, emitAccept, emitReject } = useSocket();
  const [filter, setFilter] = useState<
    "all" | "pending" | "accepted" | "rejected"
  >("all");
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{
    open: boolean;
    provisionId: string;
  }>({ open: false, provisionId: "" });
  const [rejectReason, setRejectReason] = useState("");
  const newCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const state = location.state as { newProvisionId?: string } | null;
    if (state?.newProvisionId) {
      setHighlightId(state.newProvisionId);
      setTimeout(() => {
        newCardRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 300);
      setTimeout(() => setHighlightId(null), 4000);
    }
  }, [location.state]);

  const filtered = provisions.filter((p) => {
    if (filter === "all") return true;
    return p.status === filter;
  });

  const stats = {
    total: provisions.length,
    pending: provisions.filter((p) => p.status === "pending").length,
    accepted: provisions.filter((p) => p.status === "accepted").length,
    rejected: provisions.filter((p) => p.status === "rejected").length,
  };

  const handleAccept = (provisionId: string) => {
    emitAccept(provisionId, "Accepted — we will proceed with purchase");
  };

  const handleRejectClick = (provisionId: string) => {
    setRejectModal({ open: true, provisionId });
    setRejectReason("");
  };

  const handleRejectConfirm = () => {
    if (!rejectReason.trim()) return;
    emitReject(rejectModal.provisionId, rejectReason.trim());
    setRejectModal({ open: false, provisionId: "" });
    setRejectReason("");
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="sticky top-0 z-30 border-b border-green-900/30 bg-gradient-to-r from-[#040c06] to-[#0a1f10] px-6 py-5">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="flex items-center gap-3 text-2xl font-black text-white">
                <Package size={26} className="text-green-400" />
                Startup Inventory
              </h1>
              <p className="mt-0.5 text-sm text-green-400/60">
                Live replica of farmer provisions
              </p>
            </div>
            <div
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${
                connected
                  ? "border border-green-700/40 bg-green-900/40 text-green-400"
                  : "border border-red-700/40 bg-red-900/40 text-red-400"
              }`}
            >
              {connected ? (
                <>
                  <Wifi size={15} />
                  Live Sync Active
                  <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
                </>
              ) : (
                <>
                  <WifiOff size={15} />
                  Reconnecting...
                </>
              )}
            </div>
          </div>
          <div className="mt-5 grid grid-cols-4 gap-4">
            {[
              {
                label: "Total",
                value: stats.total,
                color: "text-white",
                bg: "bg-white/5",
                filter: "all" as const,
              },
              {
                label: "Pending",
                value: stats.pending,
                color: "text-amber-400",
                bg: "bg-amber-900/20",
                filter: "pending" as const,
              },
              {
                label: "Accepted",
                value: stats.accepted,
                color: "text-green-400",
                bg: "bg-green-900/20",
                filter: "accepted" as const,
              },
              {
                label: "Rejected",
                value: stats.rejected,
                color: "text-red-400",
                bg: "bg-red-900/20",
                filter: "rejected" as const,
              },
            ].map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => setFilter(s.filter)}
                className={`rounded-xl border-2 p-3 text-center transition-all ${s.bg} ${
                  filter === s.filter ? "border-green-500" : "border-transparent"
                } hover:border-green-700`}
              >
                <div className={`text-2xl font-black ${s.color}`}>
                  {s.value}
                </div>
                <div className="mt-0.5 text-xs text-gray-400">{s.label}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-800 text-4xl">
              📦
            </div>
            <h3 className="text-lg font-bold text-white">
              {filter === "all"
                ? "No provisions yet"
                : `No ${filter} provisions`}
            </h3>
            <p className="mt-2 max-w-xs text-sm text-gray-500">
              {filter === "all"
                ? "Waiting for farmers to sync provisions. New ones will appear here instantly."
                : `Switch to "All" to see other provisions.`}
            </p>
            {connected && (
              <div className="mt-4 flex items-center gap-2 text-sm text-green-400">
                <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
                Listening for new provisions...
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((provision) => (
              <div
                key={provision.id}
                ref={provision.id === highlightId ? newCardRef : null}
              >
                <ProvisionSyncCard
                  provision={provision}
                  isNew={provision.id === highlightId}
                  onAccept={() => handleAccept(provision.id)}
                  onReject={() => handleRejectClick(provision.id)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {rejectModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-gray-700 bg-gray-900 p-6">
            <h3 className="mb-4 text-base font-bold text-white">
              ❌ Reject Provision
            </h3>
            <p className="mb-4 text-sm text-gray-400">
              Please provide a reason for rejecting this provision. The farmer
              will be notified.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Quality doesn't meet our requirements, price too high, not required at this time..."
              rows={4}
              className="w-full resize-none rounded-xl border border-gray-600 bg-gray-800 p-3 text-sm text-white placeholder-gray-500 outline-none focus:border-red-500"
            />
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() =>
                  setRejectModal({ open: false, provisionId: "" })
                }
                className="flex-1 rounded-xl border border-gray-600 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectConfirm}
                disabled={!rejectReason.trim()}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-40"
              >
                Send Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
