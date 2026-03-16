import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  ImageIcon,
  Eye,
  X,
  IndianRupee,
  Package,
  Loader2,
  TrendingUp,
  Check,
  Ban,
} from "lucide-react";

interface Payment {
  id: string;
  provisionId: string;
  wasteType: string;
  quantityTons: number;
  pricePerKg: number;
  farmerName: string;
  farmerUpiId: string;
  buyerName: string;
  totalAmount: number;
  upiRef: string;
  screenshotUrl: string;
  status: "pending_verification" | "verified" | "rejected";
  submittedAt: string;
  verifiedAt?: string;
  rejectionReason?: string;
}

interface WithdrawalRequest {
  _id: string;
  farmerId: string;
  amount: number;
  accountNumber: string;
  ifscCode: string;
  upiId?: string;
  mobileNumber: string;
  email: string;
  status: string;
  adminNote?: string;
  receiptUrl?: string;
  requestedAt?: string;
  createdAt?: string;
}

const STATUS = {
  pending_verification: {
    label: "Pending",
    color: "text-amber-400",
    bg: "bg-amber-900/20",
    border: "border-amber-700/30",
    icon: Clock,
  },
  verified: {
    label: "Verified",
    color: "text-green-400",
    bg: "bg-green-900/20",
    border: "border-green-700/30",
    icon: CheckCircle,
  },
  rejected: {
    label: "Rejected",
    color: "text-red-400",
    bg: "bg-red-900/20",
    border: "border-red-700/30",
    icon: XCircle,
  },
};

function ScreenshotViewer({
  url,
  onClose,
}: {
  url: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-gray-800 p-2 text-white hover:bg-gray-700"
      >
        <X size={20} />
      </button>
      <img
        src={url}
        alt="Payment screenshot"
        className="max-h-full max-w-full rounded-xl object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

const API_BASE =
  (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL ?? "";

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("authToken");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function getIsAdmin(): boolean {
  try {
    const u = JSON.parse(localStorage.getItem("user") || "{}");
    return u?.role === "admin";
  } catch {
    return false;
  }
}

export default function PaymentsPage() {
  const navigate = useNavigate();
  const isAdmin = getIsAdmin();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<
    "all" | "pending_verification" | "verified" | "rejected"
  >(() => (getIsAdmin() ? "pending_verification" : "all"));
  const [viewingScreenshot, setViewingScreenshot] = useState<string | null>(
    null
  );
  const [refreshing, setRefreshing] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [adminTab, setAdminTab] = useState<"payments" | "withdrawals">("payments");
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [withdrawalsLoading, setWithdrawalsLoading] = useState(false);
  const [withdrawalActionId, setWithdrawalActionId] = useState<string | null>(null);
  const [completeModal, setCompleteModal] = useState<WithdrawalRequest | null>(null);
  const [rejectModal, setRejectModal] = useState<WithdrawalRequest | null>(null);
  const [completeNote, setCompleteNote] = useState("");
  const [completeReceiptUrl, setCompleteReceiptUrl] = useState("");
  const [rejectNote, setRejectNote] = useState("");

  const fetchPayments = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const res = await fetch(`${API_BASE}/api/payments`);
      const data = await res.json();
      setPayments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPayments();
    const interval = setInterval(() => fetchPayments(), 30000);
    return () => clearInterval(interval);
  }, [fetchPayments]);

  const fetchWithdrawals = useCallback(async () => {
    if (!getIsAdmin()) return;
    setWithdrawalsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/withdrawals`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      setWithdrawals(Array.isArray(data?.withdrawals) ? data.withdrawals : []);
    } catch {
      setWithdrawals([]);
    } finally {
      setWithdrawalsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (adminTab === "withdrawals" && isAdmin) fetchWithdrawals();
  }, [adminTab, isAdmin, fetchWithdrawals]);

  const handleWithdrawalStatus = async (
    id: string,
    status: "processing" | "completed" | "rejected",
    adminNote?: string,
    receiptUrl?: string
  ) => {
    setWithdrawalActionId(id);
    try {
      const res = await fetch(`${API_BASE}/api/admin/withdrawals/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status, adminNote, receiptUrl }),
      });
      if (res.ok) {
        setCompleteModal(null);
        setRejectModal(null);
        setCompleteNote("");
        setCompleteReceiptUrl("");
        setRejectNote("");
        fetchWithdrawals();
      } else {
        const err = await res.json().catch(() => ({}));
        alert((err as { error?: string }).error || "Update failed");
      }
    } finally {
      setWithdrawalActionId(null);
    }
  };

  const filtered =
    filter === "all"
      ? payments
      : payments.filter((p) => p.status === filter);

  const stats = {
    total: payments.length,
    pending: payments.filter((p) => p.status === "pending_verification")
      .length,
    verified: payments.filter((p) => p.status === "verified").length,
    totalValue: payments
      .filter((p) => p.status === "verified")
      .reduce((s, p) => s + p.totalAmount, 0),
  };

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const screenshotUrl = (p: Payment) =>
    p.screenshotUrl.startsWith("http")
      ? p.screenshotUrl
      : `${API_BASE}${p.screenshotUrl}`;

  const handleVerify = async (payment: Payment) => {
    const paymentId = payment.id;
    const provisionId = payment.provisionId;
    setActioningId(paymentId);
    try {
      if (provisionId) {
        const creditRes = await fetch(
          `${API_BASE}/api/admin/listings/${encodeURIComponent(provisionId)}/verify-payment`,
          {
            method: "PATCH",
            headers: getAuthHeaders(),
          }
        );
        if (!creditRes.ok) {
          const err = await creditRes.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error || "Failed to credit farmer wallet");
        }
      }
      const res = await fetch(`${API_BASE}/api/payments/${paymentId}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verifiedBy: "admin" }),
      });
      if (res.ok) await fetchPayments(true);
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Verify failed");
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (paymentId: string) => {
    setActioningId(paymentId);
    try {
      const res = await fetch(`${API_BASE}/api/payments/${paymentId}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Rejected by admin" }),
      });
      if (res.ok) await fetchPayments(true);
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="sticky top-0 z-30 border-b border-green-900/30 bg-[#040c06] px-6 py-5">
        <div className="mx-auto max-w-6xl">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 rounded-xl border border-gray-700 bg-gray-800 px-3 py-2 text-sm font-medium text-gray-300 transition hover:bg-gray-700 hover:text-white"
                aria-label="Go back"
              >
                <ArrowLeft size={18} />
                Back
              </button>
              <div>
                <h1 className="flex items-center gap-3 text-2xl font-black text-white">
                  <IndianRupee size={26} className="text-green-400" />
                  {isAdmin ? "Payment verification" : "Payments"}
                </h1>
              <p className="mt-0.5 text-sm text-green-400/50">
                {isAdmin
                  ? "Pending transactions from startups — verify or reject"
                  : "All UPI payment records & screenshots"}
              </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => fetchPayments(true)}
              disabled={refreshing}
              className="flex items-center gap-2 rounded-xl border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 transition hover:bg-gray-700 disabled:opacity-50"
            >
              <RefreshCw
                size={14}
                className={refreshing ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </div>

          {isAdmin && (
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setAdminTab("payments")}
                className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                  adminTab === "payments"
                    ? "border-green-500 bg-green-500/20 text-green-400"
                    : "border-gray-700 text-gray-400 hover:bg-gray-800"
                }`}
              >
                Payments
              </button>
              <button
                type="button"
                onClick={() => setAdminTab("withdrawals")}
                className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                  adminTab === "withdrawals"
                    ? "border-green-500 bg-green-500/20 text-green-400"
                    : "border-gray-700 text-gray-400 hover:bg-gray-800"
                }`}
              >
                Withdrawals
              </button>
            </div>
          )}

          {(adminTab === "payments" || !isAdmin) && (
          <div className="grid grid-cols-4 gap-3">
            {[
              {
                label: "Total",
                value: stats.total,
                icon: Package,
                color: "text-white",
                bg: "bg-white/5",
                f: "all" as const,
              },
              {
                label: "Pending",
                value: stats.pending,
                icon: Clock,
                color: "text-amber-400",
                bg: "bg-amber-900/20",
                f: "pending_verification" as const,
              },
              {
                label: "Verified",
                value: stats.verified,
                icon: CheckCircle,
                color: "text-green-400",
                bg: "bg-green-900/20",
                f: "verified" as const,
              },
              {
                label: "Value",
                value: `₹${(stats.totalValue / 1000).toFixed(0)}K`,
                icon: TrendingUp,
                color: "text-blue-400",
                bg: "bg-blue-900/20",
                f: "all" as const,
              },
            ].map((s) => (
              <button
                type="button"
                key={s.label}
                onClick={() => setFilter(s.f)}
                className={`rounded-xl border-2 p-3 text-left transition-all ${s.bg} ${
                  filter === s.f ? "border-green-500" : "border-transparent"
                } hover:border-green-800`}
              >
                <s.icon size={16} className={`mb-1 ${s.color}`} />
                <div className={`text-lg font-black ${s.color}`}>
                  {s.value}
                </div>
                <div className="text-xs text-gray-500">{s.label}</div>
              </button>
            ))}
          </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-6">
        {isAdmin && adminTab === "withdrawals" ? (
          <>
            {withdrawalsLoading ? (
              <div className="flex justify-center py-24">
                <Loader2 size={32} className="animate-spin text-green-600" />
              </div>
            ) : withdrawals.length === 0 ? (
              <div className="py-24 text-center text-gray-500">No withdrawal requests.</div>
            ) : (
              <div className="space-y-4">
                {withdrawals.map((w) => (
                  <div
                    key={w._id}
                    className="rounded-xl border border-gray-800 bg-gray-900 p-4 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div>
                      <p className="font-medium text-white">
                        ₹{w.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-sm text-gray-500">
                        {w.email} · {w.mobileNumber}
                      </p>
                      <p className="text-xs text-gray-600">
                        A/c ****{String(w.accountNumber).slice(-4)} · IFSC: {w.ifscCode}
                      </p>
                      <span
                        className={`inline-block mt-1 rounded px-2 py-0.5 text-xs ${
                          w.status === "completed"
                            ? "bg-green-900/30 text-green-400"
                            : w.status === "rejected"
                              ? "bg-red-900/30 text-red-400"
                              : "bg-amber-900/30 text-amber-400"
                        }`}
                      >
                        {w.status}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {w.status === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleWithdrawalStatus(w._id, "processing")}
                          disabled={!!withdrawalActionId}
                        >
                          {withdrawalActionId === w._id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Processing"
                          )}
                        </Button>
                      )}
                      {(w.status === "pending" || w.status === "processing") && (
                        <>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => setCompleteModal(w)}
                            disabled={!!withdrawalActionId}
                          >
                            Complete
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setRejectModal(w)}
                            disabled={!!withdrawalActionId}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {completeModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
                <div className="w-full max-w-md rounded-xl border border-gray-700 bg-gray-900 p-4">
                  <h3 className="text-lg font-semibold text-white mb-3">Mark as Completed</h3>
                  <label className="block text-sm text-gray-400 mb-1">UTR / Reference</label>
                  <input
                    type="text"
                    value={completeNote}
                    onChange={(e) => setCompleteNote(e.target.value)}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white mb-3"
                    placeholder="UTR or reference number"
                  />
                  <label className="block text-sm text-gray-400 mb-1">Receipt URL (optional)</label>
                  <input
                    type="text"
                    value={completeReceiptUrl}
                    onChange={(e) => setCompleteReceiptUrl(e.target.value)}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white mb-4"
                    placeholder="https://..."
                  />
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setCompleteModal(null)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={() =>
                        handleWithdrawalStatus(
                          completeModal._id,
                          "completed",
                          completeNote,
                          completeReceiptUrl || undefined
                        )
                      }
                      disabled={!!withdrawalActionId}
                    >
                      {withdrawalActionId === completeModal._id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Submit"
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
            {rejectModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
                <div className="w-full max-w-md rounded-xl border border-gray-700 bg-gray-900 p-4">
                  <h3 className="text-lg font-semibold text-white mb-3">Reject Withdrawal</h3>
                  <label className="block text-sm text-gray-400 mb-1">Reason (optional)</label>
                  <input
                    type="text"
                    value={rejectNote}
                    onChange={(e) => setRejectNote(e.target.value)}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white mb-4"
                    placeholder="Reason for rejection"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setRejectModal(null)}>
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() =>
                        handleWithdrawalStatus(rejectModal._id, "rejected", rejectNote)
                      }
                      disabled={!!withdrawalActionId}
                    >
                      {withdrawalActionId === rejectModal._id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Reject"
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={32} className="animate-spin text-green-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-24 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-800 text-4xl">
              💳
            </div>
            <h3 className="text-lg font-bold text-white">No payments yet</h3>
            <p className="mt-2 text-sm text-gray-500">
              Payments will appear here after startups click &quot;Express
              Interest&quot;
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((payment) => {
              const st = STATUS[payment.status];
              const Icon = st.icon;
              const url = screenshotUrl(payment);
              return (
                <div
                  key={payment.id}
                  className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900 transition-all hover:border-gray-700"
                >
                  <div
                    className={`h-1 ${
                      payment.status === "verified"
                        ? "bg-green-500"
                        : payment.status === "rejected"
                          ? "bg-red-500"
                          : "bg-amber-500"
                    }`}
                  />
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setViewingScreenshot(url)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && setViewingScreenshot(url)
                    }
                    className="relative flex h-40 items-center justify-center overflow-hidden bg-gray-800 cursor-zoom-in group"
                  >
                    <img
                      src={url}
                      alt="Payment screenshot"
                      className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/40">
                      <Eye
                        size={24}
                        className="text-white opacity-0 transition group-hover:opacity-100"
                      />
                    </div>
                    <div
                      className={`absolute right-2 top-2 flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${st.bg} ${st.color} ${st.border}`}
                    >
                      <Icon size={11} />
                      {st.label}
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        <p className="text-sm font-bold text-white">
                          {payment.wasteType}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {payment.buyerName} → {payment.farmerName}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-green-400">
                          ₹{payment.totalAmount.toLocaleString("en-IN")}
                        </p>
                        <p className="text-xs text-gray-600">
                          {payment.quantityTons}t
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs text-gray-500">
                      <div className="flex justify-between">
                        <span>Payment ID</span>
                        <code className="font-mono text-gray-400">
                          {payment.id.substring(0, 16)}
                        </code>
                      </div>
                      {payment.upiRef && (
                        <div className="flex justify-between">
                          <span>UPI Ref</span>
                          <code className="font-mono text-gray-400">
                            {payment.upiRef}
                          </code>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>UPI ID</span>
                        <span className="max-w-[55%] truncate text-right text-gray-400">
                          {payment.farmerUpiId}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Submitted</span>
                        <span className="text-gray-400">
                          {timeAgo(payment.submittedAt)}
                        </span>
                      </div>
                      {payment.verifiedAt && (
                        <div className="flex justify-between">
                          <span>Verified</span>
                          <span className="text-green-400">
                            {timeAgo(payment.verifiedAt)}
                          </span>
                        </div>
                      )}
                      {payment.rejectionReason && (
                        <div className="mt-2 rounded-lg border border-red-800/30 bg-red-900/20 p-2">
                          <span className="text-red-400">
                            Rejected: {payment.rejectionReason}
                          </span>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setViewingScreenshot(url)}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-700 bg-gray-800 py-2 text-xs font-medium text-gray-300 transition hover:bg-gray-700"
                    >
                      <ImageIcon size={13} />
                      View Screenshot
                    </button>

                    {isAdmin && payment.status === "pending_verification" && (
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleVerify(payment)}
                          disabled={actioningId === payment.id}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-green-600 py-2 text-xs font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
                        >
                          {actioningId === payment.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Check size={12} />
                          )}
                          Verify
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReject(payment.id)}
                          disabled={actioningId === payment.id}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-red-600/80 py-2 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                        >
                          <Ban size={12} />
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {viewingScreenshot && (
        <ScreenshotViewer
          url={viewingScreenshot}
          onClose={() => setViewingScreenshot(null)}
        />
      )}
    </div>
  );
}
