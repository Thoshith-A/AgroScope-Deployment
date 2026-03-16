import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, RefreshCw, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getBalanceWalletTransactions, type BalanceWalletTransaction } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const TYPE_LABELS: Record<string, string> = {
  listing_credit: "Listing credit",
  platform_fee: "Platform fee",
  withdrawal_requested: "Withdrawal requested",
  withdrawal_completed: "Withdrawal completed",
  startup_payment: "Startup payment",
};

function isCredit(type: string, amount: number): boolean {
  if (amount > 0) return true;
  return type === "listing_credit";
}

export default function TransactionHistory() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<BalanceWalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const load = useCallback(async (pageNum = 1, append = false) => {
    setLoading(true);
    try {
      const res = await getBalanceWalletTransactions(pageNum, 20);
      if (res.success) {
        setTransactions((prev) => (append ? [...prev, ...res.transactions] : res.transactions));
        setTotal(res.total);
        setHasMore(res.hasMore);
        setPage(res.page);
      }
    } catch {
      toast({ title: "Error", description: "Failed to load transactions", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load(1, false);
  }, [load]);

  const handleLoadMore = () => {
    if (!loading && hasMore) load(page + 1, true);
  };

  const formatDate = (s: string) => {
    try {
      const d = new Date(s);
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return s;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} type="button">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold text-foreground">Transaction History</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => load(1, false)}
            disabled={loading}
            type="button"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6 max-w-2xl">
        {loading && transactions.length === 0 ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : transactions.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">No transactions yet.</p>
        ) : (
          <ul className="space-y-2">
            {transactions.map((tx) => {
              const credit = isCredit(tx.type, tx.amount);
              const amt = Math.abs(Number(tx.amount));
              return (
                <li
                  key={tx._id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                        credit ? "bg-emerald-500/20 text-emerald-600" : "bg-red-500/20 text-red-600"
                      }`}
                    >
                      {credit ? (
                        <ArrowDownLeft className="h-4 w-4" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {TYPE_LABELS[tx.type] ?? tx.type}
                      </p>
                      {tx.description && (
                        <p className="text-xs text-muted-foreground truncate">{tx.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground">{formatDate(tx.createdAt)}</p>
                    </div>
                  </div>
                  <p
                    className={`text-sm font-semibold shrink-0 ${
                      credit ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {credit ? "+" : "-"}₹ {amt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
        {hasMore && (
          <div className="mt-4 flex justify-center">
            <Button variant="outline" onClick={handleLoadMore} disabled={loading} type="button">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load more"}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
