import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getBalanceWallet, postWithdrawRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const IFSC_LEN = 11;
const MOBILE_LEN = 10;
const emailRegex = /^\S+@\S+\.\S+$/;

export default function WithdrawalRequest() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [balance, setBalance] = useState<number>(0);
  const [amount, setAmount] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [confirmAccountNumber, setConfirmAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [upiId, setUpiId] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const loadBalance = useCallback(async () => {
    try {
      const { wallet } = await getBalanceWallet();
      setBalance(Number(wallet?.balance ?? 0));
    } catch {
      setBalance(0);
    }
  }, []);

  useEffect(() => {
    loadBalance();
  }, [loadBalance]);

  const validate = useCallback((): boolean => {
    const e: Record<string, string> = {};
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) e.amount = "Enter a valid amount greater than 0";
    else if (amt > balance) e.amount = `Amount cannot exceed available balance (₹ ${balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })})`;
    if (!accountNumber.trim()) e.accountNumber = "Account number is required";
    if (accountNumber.trim() !== confirmAccountNumber.trim()) {
      e.confirmAccountNumber = "Account number and confirm do not match";
    }
    if (ifscCode.trim().length !== IFSC_LEN) {
      e.ifscCode = `IFSC must be exactly ${IFSC_LEN} characters`;
    }
    const mobile = (mobileNumber || "").replace(/\D/g, "");
    if (mobile.length !== MOBILE_LEN) e.mobileNumber = "Enter a valid 10-digit mobile number";
    if (!emailRegex.test(String(email).trim())) e.email = "Enter a valid email address";
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [amount, balance, accountNumber, confirmAccountNumber, ifscCode, mobileNumber, email]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await postWithdrawRequest({
        amount: Number(amount),
        accountNumber: accountNumber.trim(),
        confirmAccountNumber: confirmAccountNumber.trim(),
        ifscCode: ifscCode.trim(),
        upiId: upiId.trim() || undefined,
        mobileNumber: mobileNumber.trim(),
        email: email.trim(),
      });
      setConfirmOpen(false);
      setSuccess(true);
      toast({ title: "Success", description: "Withdrawal request submitted successfully." });
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Submission failed",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const last4 = accountNumber.trim().slice(-4);

  if (success) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="rounded-xl border border-border bg-card p-6 max-w-md text-center space-y-4">
          <p className="text-lg font-medium text-foreground">
            Your withdrawal request has been submitted.
          </p>
          <p className="text-sm text-muted-foreground">
            You will receive a confirmation once processed. Receipt will be sent to your email and
            WhatsApp.
          </p>
          <Button onClick={() => navigate("/dashboard")} type="button">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} type="button">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold text-foreground">Request Withdrawal</h1>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6 max-w-lg">
        <p className="text-sm text-muted-foreground mb-4">
          Available balance: ₹ {balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="amount">Withdrawal Amount *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onBlur={() => validate()}
              className={errors.amount ? "border-destructive" : ""}
            />
            {errors.amount && (
              <p className="text-xs text-destructive mt-1">{errors.amount}</p>
            )}
          </div>
          <div>
            <Label htmlFor="accountNumber">Bank Account Number *</Label>
            <Input
              id="accountNumber"
              type="text"
              placeholder="Account number"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              onBlur={() => validate()}
              className={errors.accountNumber ? "border-destructive" : ""}
            />
            {errors.accountNumber && (
              <p className="text-xs text-destructive mt-1">{errors.accountNumber}</p>
            )}
          </div>
          <div>
            <Label htmlFor="confirmAccountNumber">Confirm Account Number *</Label>
            <Input
              id="confirmAccountNumber"
              type="text"
              placeholder="Confirm account number"
              value={confirmAccountNumber}
              onChange={(e) => setConfirmAccountNumber(e.target.value)}
              onBlur={() => validate()}
              className={errors.confirmAccountNumber ? "border-destructive" : ""}
            />
            {errors.confirmAccountNumber && (
              <p className="text-xs text-destructive mt-1">{errors.confirmAccountNumber}</p>
            )}
          </div>
          <div>
            <Label htmlFor="ifscCode">IFSC Code *</Label>
            <Input
              id="ifscCode"
              type="text"
              placeholder="11-character IFSC"
              maxLength={IFSC_LEN}
              value={ifscCode}
              onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
              onBlur={() => validate()}
              className={errors.ifscCode ? "border-destructive" : ""}
            />
            {errors.ifscCode && (
              <p className="text-xs text-destructive mt-1">{errors.ifscCode}</p>
            )}
          </div>
          <div>
            <Label htmlFor="upiId">UPI ID (optional)</Label>
            <Input
              id="upiId"
              type="text"
              placeholder="name@bank"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="mobileNumber">Mobile Number *</Label>
            <Input
              id="mobileNumber"
              type="tel"
              placeholder="10-digit mobile"
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
              onBlur={() => validate()}
              className={errors.mobileNumber ? "border-destructive" : ""}
            />
            {errors.mobileNumber && (
              <p className="text-xs text-destructive mt-1">{errors.mobileNumber}</p>
            )}
          </div>
          <div>
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => validate()}
              className={errors.email ? "border-destructive" : ""}
            />
            {errors.email && (
              <p className="text-xs text-destructive mt-1">{errors.email}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Withdrawal Request"}
          </Button>
        </form>
      </main>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Withdrawal</DialogTitle>
            <DialogDescription>
              Amount: ₹ {Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              <br />
              To Account: XXXXXXXX{last4}
              <br />
              IFSC: {ifscCode}
              <br />
              <br />
              Withdrawals are processed within 2–3 business days. Receipt will be sent to your
              email and WhatsApp.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} type="button">
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={submitting} type="button">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm & Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
