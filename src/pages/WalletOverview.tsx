import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Leaf, Home, Loader2, RefreshCw, Zap, Coins } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getWalletTransactions, getWalletUsers, postWalletTransfer } from "@/lib/api";
import type { WalletTransaction } from "@/lib/api";
import { useWallet } from "@/context/WalletContext";

function formatTxTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (dDate.getTime() === today.getTime()) return "Today";
  if (dDate.getTime() === yesterday.getTime()) return "Yesterday";
  return d.toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" });
}

function formatAgroCoins(n: number): string {
  if (!Number.isFinite(n)) return "0";
  if (n % 1 === 0) return String(n);
  return Number(n.toFixed(8)).toString();
}

export default function WalletOverview() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    agroCredits,
    agroCoins,
    pendingCredits,
    creditsToNextCoin,
    progressPercent,
    refresh,
    isLoading: walletLoading,
  } = useWallet();
  const [role, setRole] = useState<"farmer" | "startup" | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [transactionsHasMore, setTransactionsHasMore] = useState(false);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [walletUsers, setWalletUsers] = useState<{ email: string; userId: string; role: string; agroCoins: number }[]>([]);
  const [transferTo, setTransferTo] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferring, setTransferring] = useState(false);

  const loadTransactions = useCallback(
    async (page = 1) => {
      setTransactionsLoading(true);
      try {
        const data = await getWalletTransactions(page);
        if (page === 1) setTransactions(data.transactions);
        else setTransactions((prev) => [...prev, ...data.transactions]);
        setTransactionsHasMore(data.hasMore);
        setTransactionsPage(page);
      } catch {
        setTransactions([]);
      } finally {
        setTransactionsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const userRaw = localStorage.getItem("user");
    if (!token || !userRaw) {
      navigate("/home");
      return;
    }
    try {
      const u = JSON.parse(userRaw);
      setRole(u.role);
    } catch {
      setRole(null);
    }
    loadTransactions(1);
  }, [navigate, loadTransactions]);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) return;
    getWalletUsers()
      .then((r) => setWalletUsers(r.users || []))
      .catch(() => setWalletUsers([]));
  }, [role]);

  const handleTransfer = async () => {
    const to = transferTo.trim().toLowerCase();
    const amount = Number(transferAmount);
    if (!to) {
      toast({ title: "Enter recipient", description: "Enter recipient email.", variant: "destructive" });
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      toast({ title: "Invalid amount", description: "Enter a positive amount of Agro Coins (e.g. 1, 0.06, 0.008).", variant: "destructive" });
      return;
    }
    if (amount > agroCoins) {
      toast({ title: "Insufficient balance", description: `You have ${formatAgroCoins(agroCoins)} Agro Coins.`, variant: "destructive" });
      return;
    }
    setTransferring(true);
    try {
      const recipientRole = role === "farmer" ? "startup" : "farmer";
      await postWalletTransfer(to, amount, recipientRole);
      toast({ title: "Transfer complete", description: `Sent ${formatAgroCoins(amount)} Agro Coin${amount !== 1 ? "s" : ""} to ${to}.` });
      setTransferTo("");
      setTransferAmount("");
      refresh();
      loadTransactions(1);
    } catch (e: unknown) {
      toast({ title: "Transfer failed", description: e instanceof Error ? e.message : "Try again.", variant: "destructive" });
    } finally {
      setTransferring(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate("/home")} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="bg-primary rounded-full p-2">
              <Leaf className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-foreground">AgroScope</span>
          </button>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => navigate("/home")}>
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-xl space-y-6">
        <Card className="border-2">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="flex items-center gap-2">
                {role === "startup" ? "🏭 Agro Coins Wallet" : "🌾 Agro Coins Wallet"}
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => refresh()} disabled={walletLoading}>
                <RefreshCw className={`h-4 w-4 mr-1 ${walletLoading ? "animate-spin" : ""}`} /> Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/30 p-4">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <Coins className="h-5 w-5" /> Agro Coins
                </div>
                <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">{formatAgroCoins(agroCoins)}</p>
                <p className="text-xs text-amber-700/80">≈ ₹{(agroCoins * 950).toFixed(2)} value</p>
              </div>
              <div className="rounded-xl border border-green-500/30 bg-green-50/50 dark:bg-green-950/30 p-4">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                  <Zap className="h-5 w-5" /> AgroCredits
                </div>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                  {agroCredits.toLocaleString("en-IN")}
                </p>
                <p className="text-xs text-green-700/80">{creditsToNextCoin} to next coin 🪙</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">PROGRESS TO NEXT COIN</p>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-green-500 to-green-400 transition-[width] duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {pendingCredits} / 1,000 · {creditsToNextCoin} more AgroCredits = 1 Agro Coin
              </p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2">💱 CONVERSION RATE</p>
              <p className="text-sm">1,000 AgroCredits = 1 Agro Coin</p>
              <p className="text-xs text-muted-foreground">1 Agro Coin ≈ ₹800–1,200 value</p>
            </div>
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground">
                {role === "farmer" ? "📤 Send Agro Coins to Startup" : "📤 Pay Farmer (Agro Coins)"}
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1">
                  <Label className="text-xs">Recipient email</Label>
                  {walletUsers.length > 0 ? (
                    <select
                      value={transferTo}
                      onChange={(e) => setTransferTo(e.target.value)}
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Select {role === "farmer" ? "startup" : "farmer"}</option>
                      {walletUsers.map((u) => (
                        <option key={u.email} value={u.email}>
                          {u.email} ({u.role}) · 🪙{formatAgroCoins(u.agroCoins)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      type="email"
                      placeholder={role === "farmer" ? "Startup email (e.g. east@argo)" : "Farmer email"}
                      value={transferTo}
                      onChange={(e) => setTransferTo(e.target.value)}
                      className="mt-1"
                    />
                  )}
                </div>
                <div className="w-full sm:w-28">
                  <Label className="text-xs">🪙 Coins</Label>
                  <Input
                    type="number"
                    min={0.00000001}
                    step="any"
                    max={agroCoins}
                    placeholder="e.g. 1, 0.06, 0.008"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
              <Button onClick={handleTransfer} disabled={transferring || agroCoins <= 0} className="w-full">
                {transferring ? "Sending…" : "Transfer Agro Coins"}
              </Button>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">TRANSACTION HISTORY</p>
              <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border bg-muted/20 p-2">
                {transactions.length === 0 && !transactionsLoading && (
                  <p className="text-sm text-muted-foreground py-4 text-center">No transactions yet.</p>
                )}
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className={`flex items-start gap-2 rounded border-l-4 bg-background/80 px-3 py-2 text-sm ${
                      tx.type === "TRANSFER_OUT"
                        ? "border-amber-500/50"
                        : tx.type === "TRANSFER_IN"
                          ? "border-blue-500/50"
                          : "border-green-500/50"
                    }`}
                  >
                    <span className="shrink-0">
                      {tx.type === "COIN_CONVERT" && "🪙"}
                      {tx.type === "CREDIT_EARN" && "🟢"}
                      {tx.type === "TRANSFER_OUT" && "📤"}
                      {tx.type === "TRANSFER_IN" && "📥"}
                      {tx.type === "TRANSFER_OUT" ? ` -${formatAgroCoins(tx.amount)}` : ` +${formatAgroCoins(tx.amount)}`}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">{tx.description}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatTxTime(tx.timestamp)}</span>
                  </div>
                ))}
              </div>
              {transactionsHasMore && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 w-full"
                  onClick={() => loadTransactions(transactionsPage + 1)}
                  disabled={transactionsLoading}
                >
                  {transactionsLoading ? "Loading..." : "Load More"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

