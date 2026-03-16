import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Wallet, Loader2, History, Banknote, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getBalanceWallet, type BalanceWallet } from "@/lib/api";

interface WalletDropdownProps {
  role: "farmer" | "startup" | "admin" | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  className?: string;
}

export function WalletDropdown({
  role,
  trigger,
  className,
}: WalletDropdownProps) {
  const navigate = useNavigate();
  const [wallet, setWallet] = useState<BalanceWallet | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const fetchWallet = useCallback(async () => {
    setLoading(true);
    try {
      const { wallet: w } = await getBalanceWallet();
      setWallet(w);
    } catch {
      setWallet(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && (role === "farmer" || role === "startup")) {
      fetchWallet();
    }
  }, [open, role, fetchWallet]);

  if (role !== "farmer" && role !== "startup") return null;

  const balance = wallet ? Number(wallet.balance ?? 0) : 0;
  const totalEarned = wallet ? Number(wallet.totalEarned ?? 0) : 0;
  const totalWithdrawn = wallet ? Number(wallet.totalWithdrawn ?? 0) : 0;
  const totalSpent = wallet ? Number(wallet.totalSpent ?? 0) : 0;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        {trigger ?? (
          <Button
            variant="outline"
            className={`border-2 gap-2 ${className ?? ""}`}
            type="button"
          >
            <Wallet className="h-4 w-4 mr-1.5" />
            Wallet
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 p-0" sideOffset={6}>
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Wallet className="h-4 w-4 text-emerald-500" />
            My Wallet
          </div>
        </div>
        <div className="p-3 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div>
                <p className="text-xs text-muted-foreground">Available Balance</p>
                <p className="text-xl font-bold text-foreground">
                  ₹ {balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </p>
              </div>
              {role === "farmer" && (
                <>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <p>Total Earned: ₹ {totalEarned.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                    <p>Withdrawn: ₹ {totalWithdrawn.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                  </div>
                </>
              )}
              {role === "startup" && (
                <div className="text-xs text-muted-foreground">
                  <p>Total Spent: ₹ {totalSpent.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                </div>
              )}
            </>
          )}
        </div>
        <div className="border-t border-border p-2 space-y-0.5">
          <DropdownMenuItem
            className="cursor-pointer gap-2"
            onClick={() => {
              setOpen(false);
              navigate("/wallet");
            }}
          >
            <Coins className="h-4 w-4" />
            Agro Coins
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer gap-2"
            onClick={() => {
              setOpen(false);
              navigate("/wallet/transactions");
            }}
          >
            <History className="h-4 w-4" />
            Transaction History
          </DropdownMenuItem>
          {role === "farmer" && (
            <DropdownMenuItem
              className="cursor-pointer gap-2"
              onClick={() => {
                setOpen(false);
                navigate("/wallet/withdraw");
              }}
            >
              <Banknote className="h-4 w-4" />
              Request Withdrawal
            </DropdownMenuItem>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
