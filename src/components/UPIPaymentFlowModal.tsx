import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  X,
  Copy,
  CheckCircle,
  Upload,
  Smartphone,
  ArrowRight,
  Shield,
  ImageIcon,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface Provision {
  _id?: string;
  id?: string;
  wasteType: string;
  quantityTons: number;
  pricePerKg: number;
  /** When set, used as payment amount (dashboard least price) instead of quantity × pricePerKg */
  leastPrice?: number;
  farmerName: string;
  farmerUpiId: string;
  location?: string;
}

interface Props {
  provision: Provision;
  buyerName?: string;
  buyerId?: string;
  onClose: () => void;
}

type Step = "qr" | "upload" | "submitting" | "success";

function StepDot({
  num,
  active,
  done,
  label,
}: {
  num: number;
  active: boolean;
  done: boolean;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-all duration-300 ${
          done
            ? "bg-green-500 text-white"
            : active
              ? "bg-green-600 text-white ring-4 ring-green-600/30"
              : "bg-gray-700 text-gray-400"
        }`}
      >
        {done ? "✓" : num}
      </div>
      <span
        className={`hidden text-xs sm:block ${
          active ? "font-semibold text-green-400" : done ? "text-green-600" : "text-gray-600"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

/** UPI app order: 1st PhonePe, 2nd Google Pay, 3rd Paytm, 4th BHIM. Icons and QR images stored in public/ for permanent use. */
const UPI_APPS = [
  { id: "phonepe", name: "PhonePe", iconSrc: "/upi-icons/phonepe.png", qrSrc: "/upi-qr/phonepe.png" },
  { id: "googlepay", name: "Google Pay", iconSrc: "/upi-icons/googlepay.png", qrSrc: "/upi-qr/googlepay.png" },
  { id: "paytm", name: "Paytm", iconSrc: "/upi-icons/paytm.png", qrSrc: "/upi-qr/paytm.png" },
  { id: "bhim", name: "BHIM UPI", iconSrc: "/upi-icons/bhim.png", qrSrc: "/upi-qr/bhim.png" },
] as const;

export default function UPIPaymentFlowModal({
  provision,
  buyerName = "Buyer",
  buyerId = "anon",
  onClose,
}: Props) {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("qr");
  const [selectedUpiApp, setSelectedUpiApp] = useState<(typeof UPI_APPS)[number]["id"]>("phonepe");
  const [copied, setCopied] = useState(false);
  const [upiRef, setUpiRef] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const [paymentId, setPaymentId] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const provisionId = provision._id || provision.id || "";
  const totalINR =
    provision.leastPrice != null && provision.leastPrice > 0
      ? Number(provision.leastPrice)
      : Math.round(
          provision.quantityTons * 1000 * (provision.pricePerKg || 0)
        );

  const copyUpiId = useCallback(() => {
    navigator.clipboard.writeText(provision.farmerUpiId || "77998026466@ybl");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [provision.farmerUpiId]);

  const handleFileSelect = useCallback((file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File too large (max 10MB)");
      return;
    }
    setError("");
    setScreenshotFile(file);
    const reader = new FileReader();
    reader.onload = (e) =>
      setScreenshotPreview((e.target?.result as string) || null);
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFileSelect(e.dataTransfer.files[0] || null);
    },
    [handleFileSelect]
  );

  const handleSubmit = async () => {
    if (!screenshotFile) {
      setError("Please upload payment screenshot");
      return;
    }
    setStep("submitting");
    setError("");

    try {
      const formData = new FormData();
      formData.append("screenshot", screenshotFile);
      formData.append("provisionId", provisionId);
      formData.append("wasteType", provision.wasteType);
      formData.append("quantityTons", String(provision.quantityTons));
      formData.append("pricePerKg", String(provision.pricePerKg ?? 0));
      formData.append("farmerName", provision.farmerName);
      formData.append("farmerUpiId", provision.farmerUpiId || "77998026466@ybl");
      formData.append("buyerName", buyerName);
      formData.append("buyerId", buyerId);
      formData.append("totalAmount", String(totalINR));
      formData.append("upiRef", upiRef);

      const base = (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL ?? "";
      const res = await fetch(`${base}/api/payments/submit`, {
        method: "POST",
        body: formData,
      });

      const text = await res.text();
      let json: { error?: string; paymentId?: string } = {};
      try {
        json = JSON.parse(text);
      } catch {
        if (!res.ok) {
          const isCannotPost = /Cannot POST/i.test(text);
          throw new Error(
            isCannotPost
              ? "Backend payments route not found. Run in terminal: cd server && npm install && npm run dev"
              : text.replace(/<[^>]+>/g, "").slice(0, 200) || "Submission failed"
          );
        }
      }

      if (!res.ok) {
        throw new Error((json as { error?: string }).error || "Submission failed");
      }

      setPaymentId(json.paymentId || "");
      setStep("success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed. Retry.";
      const friendly =
        msg.includes("Failed to fetch") || msg.includes("NetworkError")
          ? "Network error. Start the backend: cd server && npm run dev"
          : msg.includes("Cannot POST") || msg.includes("Backend payments")
            ? msg
            : msg.replace(/<[^>]+>/g, "").slice(0, 200) || "Upload failed. Retry.";
      setError(friendly);
      setStep("upload");
    }
  };

  const stepNum =
    step === "qr" ? 1 : step === "upload" || step === "submitting" ? 3 : 4;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && step !== "submitting") onClose();
      }}
    >
      <div className="flex max-h-[96vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-gray-800 bg-[#0a0f0c] shadow-2xl">
        <div className="shrink-0 border-b border-gray-800 bg-gradient-to-r from-[#040c06] to-[#071510] px-5 py-4">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Shield size={18} className="text-green-400" />
              <div>
                <h2 className="text-sm font-bold text-white">
                  Express Interest & Secure Supply
                </h2>
                <p className="text-xs text-green-400/50">UPI Zero-KYC Payment</p>
              </div>
            </div>
            {step !== "submitting" && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-800 hover:text-white"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <div className="relative flex items-center justify-between">
            <div className="absolute -z-10 left-4 right-4 top-4 h-0.5 bg-gray-800" />
            <div
              className="absolute -z-10 left-4 top-4 h-0.5 bg-green-600 transition-all duration-500"
              style={{
                width:
                  stepNum === 1 ? "0%" : stepNum === 3 ? "66%" : "100%",
              }}
            />
            <StepDot num={1} label="Scan QR" active={step === "qr"} done={step !== "qr"} />
            <StepDot num={2} label="Pay UPI" active={false} done={step !== "qr"} />
            <StepDot
              num={3}
              label="Upload Proof"
              active={step === "upload" || step === "submitting"}
              done={step === "success"}
            />
            <StepDot num={4} label="Done" active={step === "success"} done={false} />
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between border-b border-green-800/30 bg-green-700/20 px-5 py-3">
          <div>
            <p className="text-xs text-green-400/60">
              {provision.wasteType} • {provision.quantityTons}t
            </p>
            <p className="text-xl font-black text-white">
              ₹{totalINR.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">To</p>
            <p className="text-sm font-semibold text-white">
              {provision.farmerName}
            </p>
            <p className="text-xs text-gray-500">
              {provision.farmerUpiId || "77998026466@ybl"}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {step === "qr" && (
            <div className="space-y-4">
              <div className="flex gap-3">
                {[
                  { n: "1", text: "Scan QR below", sub: "with any UPI app" },
                  { n: "2", text: "Pay the amount", sub: "confirm in your app" },
                ].map((s) => (
                  <div
                    key={s.n}
                    className="flex-1 rounded-xl border border-gray-700/50 bg-gray-800/50 p-3"
                  >
                    <div className="mb-2 flex h-6 w-6 items-center justify-center rounded-full bg-green-600 text-xs font-black text-white">
                      {s.n}
                    </div>
                    <p className="text-xs font-semibold text-white">{s.text}</p>
                    <p className="mt-0.5 text-xs text-gray-500">{s.sub}</p>
                  </div>
                ))}
              </div>

              <div className="flex w-full justify-center -mx-1">
                <div className="w-full max-w-[min(100%,26rem)] rounded-2xl border-4 border-green-500/30 bg-white p-1.5 shadow-lg shadow-green-900/20">
                  <img
                    src={UPI_APPS.find((a) => a.id === selectedUpiApp)?.qrSrc ?? "/upi-qr/phonepe.png"}
                    alt={`UPI QR - ${selectedUpiApp} - ${provision.farmerUpiId || "77998026466@ybl"}`}
                    className="block w-full aspect-square min-h-[16rem] max-h-[min(24rem,62vh)] object-contain"
                  />
                </div>
              </div>

              <div className="flex justify-center gap-6">
                {UPI_APPS.map(({ id, name, iconSrc, qrSrc }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSelectedUpiApp(id)}
                    className={`flex flex-col items-center gap-2 rounded-xl p-1 transition focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      selectedUpiApp === id ? "ring-2 ring-green-500 bg-green-500/10" : "hover:bg-gray-800/60"
                    }`}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-md ring-1 ring-black/5">
                      <img
                        src={iconSrc}
                        alt={name}
                        className="h-7 w-7 object-contain"
                        onError={(e) => {
                          const el = e.target as HTMLImageElement;
                          el.style.display = "none";
                          if (!el.nextElementSibling) {
                            const fallback = document.createElement("span");
                            fallback.className = "text-lg font-bold text-gray-600";
                            fallback.textContent = name.charAt(0);
                            el.parentElement?.appendChild(fallback);
                          }
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">{name}</span>
                  </button>
                ))}
              </div>

              <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-3">
                <p className="mb-2 text-xs text-gray-500">
                  Or copy UPI ID manually:
                </p>
                <div className="flex gap-2">
                  <code className="flex-1 truncate rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 font-mono text-sm text-white">
                    {provision.farmerUpiId || "77998026466@ybl"}
                  </code>
                  <button
                    type="button"
                    onClick={copyUpiId}
                    className="shrink-0 rounded-lg bg-green-600 px-3 py-2 transition hover:bg-green-700"
                  >
                    {copied ? (
                      <CheckCircle size={15} className="text-white" />
                    ) : (
                      <Copy size={15} className="text-white" />
                    )}
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-600">
                  Amount:{" "}
                  <span className="font-bold text-green-400">
                    ₹{totalINR.toLocaleString("en-IN")}
                  </span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setStep("upload")}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-3 text-sm font-bold text-white transition active:scale-95 hover:bg-green-700"
              >
                I&apos;ve Paid — Upload Proof
                <ArrowRight size={16} />
              </button>

              <p className="text-center text-xs text-gray-600">
                Payment goes directly to farmer. Zero commission.
              </p>
            </div>
          )}

          {(step === "upload" || step === "submitting") && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-base font-bold text-white">
                  Upload Payment Screenshot
                </h3>
                <p className="mt-1 text-xs text-gray-400">
                  Take a screenshot of your UPI app after payment & upload it
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs text-gray-400">
                  UPI Reference / Transaction ID{" "}
                  <span className="ml-1 text-gray-600">(optional)</span>
                </label>
                <input
                  type="text"
                  value={upiRef}
                  onChange={(e) => setUpiRef(e.target.value)}
                  placeholder="e.g. 123456789012"
                  className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white outline-none transition placeholder-gray-600 focus:border-green-500"
                />
              </div>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => {
                  if (!screenshotFile) fileRef.current?.click();
                }}
                className={`relative cursor-pointer rounded-2xl border-2 border-dashed transition-all ${
                  dragOver
                    ? "border-green-400 bg-green-900/20"
                    : screenshotFile
                      ? "border-green-600/50 bg-green-900/10"
                      : "border-gray-700 bg-gray-800/30 hover:border-gray-600"
                }`}
              >
                {screenshotPreview ? (
                  <div className="relative">
                    <img
                      src={screenshotPreview}
                      alt="Payment screenshot"
                      className="max-h-64 w-full rounded-2xl object-contain"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setScreenshotFile(null);
                        setScreenshotPreview(null);
                      }}
                      className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-sm text-white shadow-lg hover:bg-red-700"
                    >
                      ×
                    </button>
                    <div className="absolute bottom-2 left-2 rounded-full bg-green-600 px-2.5 py-1 text-xs font-bold text-white">
                      ✓ Screenshot ready
                    </div>
                  </div>
                ) : (
                  <div className="px-6 py-10 text-center">
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-700">
                      <ImageIcon size={24} className="text-gray-400" />
                    </div>
                    <p className="text-sm font-semibold text-white">
                      Drop screenshot here
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      or click to browse
                    </p>
                    <p className="mt-2 text-xs text-gray-600">
                      JPG, PNG, WEBP • Max 10MB
                    </p>
                  </div>
                )}
              </div>

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) =>
                  handleFileSelect(e.target.files?.[0] ?? null)
                }
              />

              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-700 bg-gray-800 py-2 text-sm text-gray-300 transition hover:border-gray-600"
              >
                <Upload size={14} />
                {screenshotFile ? "Change Screenshot" : "Choose from Gallery / Camera"}
              </button>

              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-red-700/30 bg-red-900/20 p-3">
                  <AlertCircle size={15} className="shrink-0 text-red-400" />
                  <p className="text-xs text-red-400">{error}</p>
                </div>
              )}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!screenshotFile || step === "submitting"}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-3 text-sm font-bold text-white transition active:scale-95 hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {step === "submitting" ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    Submit Payment Proof
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setStep("qr")}
                disabled={step === "submitting"}
                className="w-full py-2 text-sm text-gray-500 transition hover:text-gray-300 disabled:opacity-50"
              >
                ← Back to QR Code
              </button>
            </div>
          )}

          {step === "success" && (
            <div className="space-y-4 py-2 text-center">
              <div className="relative mx-auto h-20 w-20">
                <div className="absolute inset-0 animate-ping rounded-full bg-green-500/20" />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20">
                  <CheckCircle size={40} className="text-green-400" />
                </div>
              </div>

              <div>
                <h3 className="text-xl font-black text-white">
                  Payment Submitted!
                </h3>
                <p className="mt-1 text-sm text-gray-400">
                  Your proof has been uploaded successfully
                </p>
              </div>

              <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-4 text-left">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="text-gray-500">Payment ID</span>
                  <code className="font-mono font-bold text-green-400">
                    {paymentId}
                  </code>
                </div>
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="text-gray-500">Amount</span>
                  <span className="font-bold text-white">
                    ₹{totalINR.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Status</span>
                  <span className="flex items-center gap-1 font-semibold text-amber-400">
                    Pending Verification
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-amber-700/30 bg-amber-900/20 p-3 text-left">
                <p className="mb-1 text-xs font-semibold text-amber-400">
                  ℹ️ What happens next?
                </p>
                <p className="text-xs leading-relaxed text-amber-300/70">
                  The farmer will verify your payment screenshot and confirm the
                  provision. You can track the status on the Payments page.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate("/payments");
                }}
                className="w-full rounded-xl bg-green-600 py-3 text-sm font-bold text-white transition active:scale-95 hover:bg-green-700"
              >
                View All Payments →
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 text-sm text-gray-500 transition hover:text-gray-300"
              >
                Back to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
