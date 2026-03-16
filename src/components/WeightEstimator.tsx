/**
 * Vision-based weight estimator — Google Cloud Vision + Gemini.
 * Optional reference object and measurement; never required.
 * When user uploads an image, can run Detect Crop Type and apply result to form (onCropDetected).
 */

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Camera,
  Upload,
  Loader2,
  CheckCircle,
  AlertCircle,
  Scale,
  ChevronDown,
  ChevronUp,
  ImageIcon,
  Eye,
  Box,
  Ruler,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getWasteTypeId } from "@/lib/wasteTypeIds";
import { listVerifiedUploads, deleteVerifiedUpload, type VerifiedUploadItem } from "@/services/cropWasteService";

const API_BASE = (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL ?? "";
const MAX_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
/** Only images from the Home page Verification feature are allowed here (no arbitrary file upload). */
const VERIFIED_IMAGE_STORAGE_KEY = "agroscope_last_verified_image";

/** Compress image and call detect-crop API; returns detected crop label or null. */
async function detectCropFromFile(file: File): Promise<string | null> {
  const compress = (f: File, maxW: number, q: number): Promise<Blob> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      img.onload = () => {
        const ratio = Math.min(maxW / img.width, 1);
        const w = Math.max(1, Math.round(img.width * ratio));
        const h = Math.max(1, Math.round(img.height * ratio));
        canvas.width = w;
        canvas.height = h;
        if (!ctx) {
          reject(new Error("No canvas context"));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Compress failed"))), "image/jpeg", q);
      };
      img.onerror = () => reject(new Error("Image load failed"));
      img.src = URL.createObjectURL(f);
    });
  const toBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result ?? "").split(",")[1] ?? "";
        resolve(result);
      };
      reader.onerror = () => reject(new Error("Read failed"));
      reader.readAsDataURL(blob);
    });
  const attempts: Array<{ maxWidth: number; quality: number }> = [
    { maxWidth: 1400, quality: 0.82 },
    { maxWidth: 1200, quality: 0.72 },
    { maxWidth: 960, quality: 0.62 },
  ];
  let base64: string;
  try {
    let gotSmall = false;
    for (const { maxWidth, quality } of attempts) {
      const blob = await compress(file, maxWidth, quality);
      if (blob.size <= 3 * 1024 * 1024) {
        base64 = await toBase64(blob);
        gotSmall = true;
        break;
      }
    }
    if (!gotSmall) base64 = await toBase64(file);
  } catch {
    return null;
  }
  const res = await fetch(`${API_BASE}/api/vision/detect-crop`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64: base64, filenameHint: file.name }),
  });
  if (!res.ok) return null;
  const data = (await res.json().catch(() => null)) as { success?: boolean; cropType?: string } | null;
  return data?.success && data?.cropType ? data.cropType : null;
}

type EstimationState = "idle" | "image_selected" | "estimating" | "success" | "error";

interface EstimationResult {
  estimatedWeightKg: number;
  estimatedWeightTonnes: number;
  confidencePercent: number;
  weightRangeKg: { min: number; max: number };
  estimatedVolumeCubicMetres: number;
  densityUsedKgM3: number;
  geometryAssumed: string;
  estimationMethod: string;
  anchorsUsed: string[];
  materialConfidence: "high" | "medium" | "low";
  wasteTypeConfirmed: boolean;
  wasteTypeDetected: string;
  dimensionEstimatesMetres: {
    estimatedLength: number | null;
    estimatedWidth: number | null;
    estimatedHeight: number | null;
  };
  reasoning: string;
  warningFlags: string[];
  improvementSuggestions: string[];
  wasteCreditPreview: number;
  certificationStandard: string;
}

interface ImageAnalysisResult {
  dominantColors: string[];
  detectedLabels: string[];
  detectedObjects: string[];
  frameCoveragePercent: number;
  imageAngle: string;
  textFoundInImage: string[];
}

type ProgressStep = 0 | 1 | 2 | 3;

interface Props {
  wasteTypeLabel: string;
  onEstimateConfirmed: (weightKg: number, estimationId?: string) => void;
  onClose: () => void;
  /** When provided, weight estimator will detect crop type from uploaded image and call this so the form updates. */
  onCropDetected?: (label: string) => void;
}

function progressLabel(step: ProgressStep): string {
  switch (step) {
    case 0: return "Uploading image...";
    case 1: return "Running Google Cloud Vision analysis...";
    case 2: return "Analysing material density and geometry...";
    case 3: return "Calculating weight estimate...";
    default: return "";
  }
}

function progressPct(step: ProgressStep): number {
  switch (step) {
    case 0: return 15;
    case 1: return 45;
    case 2: return 75;
    case 3: return 100;
    default: return 0;
  }
}

/** Create a File from a data URL (e.g. from verification flow). */
function dataUrlToFile(dataUrl: string, name: string): File | null {
  try {
    const [header, base64] = dataUrl.split(",");
    const mime = header?.match(/data:(image\/[^;]+)/)?.[1] || "image/jpeg";
    const bin = atob(base64 || "");
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new File([arr], name, { type: mime });
  } catch {
    return null;
  }
}

export default function WeightEstimator({ wasteTypeLabel, onEstimateConfirmed, onClose, onCropDetected }: Props) {
  const { toast } = useToast();
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [state, setState] = useState<EstimationState>("idle");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [detectedWasteType, setDetectedWasteType] = useState<string | null>(null);
  const [optionalRef, setOptionalRef] = useState("");
  const [optionalMeas, setOptionalMeas] = useState("");
  const [showOptional, setShowOptional] = useState(false);
  const [progressStep, setProgressStep] = useState<ProgressStep>(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [result, setResult] = useState<{
    estimation: EstimationResult;
    imageAnalysis: ImageAnalysisResult;
    processingTimeMs: number;
  } | null>(null);
  const [estimationId, setEstimationId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [verifiedUploads, setVerifiedUploads] = useState<VerifiedUploadItem[]>([]);
  const [verifiedLoading, setVerifiedLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setVerifiedLoading(true);
    listVerifiedUploads()
      .then((list) => {
        if (!cancelled) setVerifiedUploads(list);
      })
      .finally(() => {
        if (!cancelled) setVerifiedLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedFile || !onCropDetected) return;
    let cancelled = false;
    (async () => {
      try {
        const label = await detectCropFromFile(selectedFile);
        if (!cancelled && label) {
          setDetectedWasteType(label);
          onCropDetected(label);
        }
      } catch {
        // ignore; form keeps current waste type
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedFile, onCropDetected]);

  const reset = useCallback(() => {
    setState("idle");
    setSelectedFile(null);
    setDetectedWasteType(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setProgressStep(0);
    setErrorMessage("");
    setResult(null);
  }, [previewUrl]);

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_SIZE_BYTES) return "Image file too large — please compress below 10MB";
    if (!ALLOWED_TYPES.includes(file.type)) return "Only JPEG, PNG, or WEBP images allowed";
    return null;
  };

  const handleFile = (file: File | null) => {
    if (!file) return;
    const err = validateFile(file);
    if (err) {
      toast({ title: "Invalid file", description: err, variant: "destructive" });
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setDetectedWasteType(null);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setState("image_selected");
    setErrorMessage("");
    setResult(null);
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  /** Use the last image from the Home page Verification feature only (no computer upload). */
  const handleUseVerifiedPhoto = useCallback(() => {
    try {
      const dataUrl = sessionStorage.getItem(VERIFIED_IMAGE_STORAGE_KEY);
      if (!dataUrl) {
        toast({
          title: "No verified photo",
          description: "Complete a verified capture from Home → Verification first. Only photos from that flow can be used here.",
          variant: "destructive",
        });
        return;
      }
      const file = dataUrlToFile(dataUrl, "verified-crop-waste.jpg");
      if (file) handleFile(file);
      else toast({ title: "Invalid image", description: "Verified photo could not be loaded.", variant: "destructive" });
    } catch {
      toast({ title: "Error", description: "Could not load verified photo.", variant: "destructive" });
    }
  }, [toast]);

  /** Select a verified upload from the list (fetch image and use for estimate). */
  const handleSelectVerifiedUpload = useCallback(
    async (item: VerifiedUploadItem) => {
      if (!item.imageUrl) {
        toast({ title: "No image URL", description: "This upload has no image.", variant: "destructive" });
        return;
      }
      try {
        const res = await fetch(item.imageUrl);
        if (!res.ok) throw new Error("Fetch failed");
        const blob = await res.blob();
        const file = new File([blob], `verified-${item._id}.jpg`, { type: blob.type || "image/jpeg" });
        handleFile(file);
      } catch {
        toast({ title: "Could not load image", description: "Try again or choose another.", variant: "destructive" });
      }
    },
    [toast]
  );

  const handleTakePhotoClick = () => {
    try {
      const ua = navigator.userAgent || "";
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
      if (!isMobile) {
        toast({
          title: "Camera capture only",
          description: "On desktop, direct uploads are disabled. Use Home → Verification to capture a photo and then choose “Use verified photo”.",
          variant: "destructive",
        });
        return;
      }
      cameraInputRef.current?.click();
    } catch {
      cameraInputRef.current?.click();
    }
  };

  /** Delete a verified upload (removes from server and local list). */
  const handleDeleteVerifiedUpload = useCallback(
    async (id: string) => {
      try {
        await deleteVerifiedUpload(id);
        setVerifiedUploads((prev) => prev.filter((u) => u._id !== id));
        toast({ title: "Deleted", description: "Photo removed from your collection." });
      } catch (err) {
        toast({
          title: "Could not delete",
          description: err instanceof Error ? err.message : "Please try again.",
          variant: "destructive",
        });
      }
    },
    [toast]
  );

  const runEstimation = async () => {
    if (!selectedFile) return;
    setState("estimating");
    setProgressStep(0);
    setErrorMessage("");
    const effectiveLabel = detectedWasteType ?? wasteTypeLabel;
    const wasteTypeId = getWasteTypeId(effectiveLabel);

    const formData = new FormData();
    formData.append("image", selectedFile);
    formData.append("wasteTypeId", wasteTypeId);
    if (optionalRef.trim()) formData.append("optionalReferenceObject", optionalRef.trim());
    if (optionalMeas.trim()) formData.append("optionalMeasurement", optionalMeas.trim());
    formData.append("unit", "kg");

    const steps: ProgressStep[] = [0, 1, 2, 3];
    let stepIndex = 0;
    const stepInterval = setInterval(() => {
      stepIndex++;
      if (stepIndex < steps.length) setProgressStep(steps[stepIndex]);
    }, 800);

    try {
      const res = await fetch(`${API_BASE}/api/vision/estimate-weight`, {
        method: "POST",
        body: formData,
      });
      clearInterval(stepInterval);
      setProgressStep(3);

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.error || res.statusText || "Estimation failed";
        if (msg.includes("Invalid image")) setErrorMessage("Invalid image content");
        else if (msg.includes("10MB") || msg.includes("too large")) setErrorMessage("Image file too large — please compress below 10MB");
        else if (msg.includes("quota") || msg.includes("exceeded")) setErrorMessage("Google Vision API quota exceeded — please try again shortly");
        else if (msg.includes("No waste") || msg.includes("no waste")) setErrorMessage("No waste material detected in this image");
        else if (msg.includes("dark") || msg.includes("blur")) setErrorMessage("Image too dark or blurry — please retake in better lighting");
        else setErrorMessage(msg);
        setState("error");
        return;
      }
      if (data.success && data.estimation) {
        setResult({ estimation: data.estimation, imageAnalysis: data.imageAnalysis || {}, processingTimeMs: data.processingTimeMs || 0 });
        setState("success");
      } else {
        setErrorMessage(data?.error || "Estimation failed");
        setState("error");
      }
    } catch (e) {
      clearInterval(stepInterval);
      setErrorMessage((e as Error).message || "Network error");
      setState("error");
    }
  };

  const handleUseEstimate = () => {
    if (result?.estimation) {
      onEstimateConfirmed(result.estimation.estimatedWeightKg, estimationId || undefined);
      onClose();
    }
  };

  const estimation = result?.estimation;
  const imageAnalysis = result?.imageAnalysis;
  const conf = estimation?.confidencePercent ?? 0;
  const confColor = conf >= 75 ? "text-green-600" : conf >= 50 ? "text-amber-600" : "text-red-600";

  return (
    <div className="flex flex-col gap-4 max-h-[90vh] overflow-y-auto" role="region" aria-live="polite" aria-label="Weight estimation">
      {/* Waste type used for density — from form or auto-detected from image */}
      <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm dark:border-green-800 dark:bg-green-950/30">
        <span className="font-medium text-green-800 dark:text-green-300">Using waste type for weight estimate: </span>
        <span className="text-green-700 dark:text-green-400">{(detectedWasteType ?? wasteTypeLabel) || "—"}</span>
        {detectedWasteType && (
          <p className="text-xs text-green-600/90 dark:text-green-400/90 mt-1">Detected from your image and applied to the form. Weight estimate uses this type.</p>
        )}
        {!detectedWasteType && (
          <p className="text-xs text-green-600/90 dark:text-green-400/90 mt-1">Density for this waste type is applied to the image analysis. Change waste type on the main form if needed.</p>
        )}
      </div>
      {/* Section 1 — Camera / Upload */}
      {(state === "idle" || state === "image_selected") && (
        <>
          <div
            className="border-2 border-dashed rounded-xl p-6 text-center transition-colors"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => e.preventDefault()}
            role="region"
            aria-label="Image source: camera or verified photo only"
          >
            {!previewUrl ? (
              <>
                <p className="text-sm text-muted-foreground mb-3">Use a photo from the camera or from the Home page Verification feature only. Computer uploads are not allowed.</p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button type="button" variant="outline" onClick={handleTakePhotoClick} aria-label="Take photo">
                    <Camera className="h-4 w-4 mr-2" /> Take Photo
                  </Button>
                  <Button type="button" variant="outline" onClick={handleUseVerifiedPhoto} aria-label="Use last verified photo from Home">
                    <Upload className="h-4 w-4 mr-2" /> Use verified photo
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Verified photo = image taken via Home → Verification (camera + GPS).</p>
              </>
            ) : (
              <div className="space-y-2">
                <img src={previewUrl} alt="Preview" className="max-h-48 mx-auto rounded-lg object-contain border" />
                <Button type="button" variant="outline" size="sm" onClick={reset} aria-label="Retake photo">Retake</Button>
              </div>
            )}
          </div>

          {/* All verified photos — select one to estimate */}
          <div className="rounded-lg border p-3 space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Your verified photos — select one to estimate</p>
            {verifiedLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : verifiedUploads.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">Sign in and complete verifications (Home → Verification) to see your photos here.</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                {verifiedUploads.map((item) => (
                  <div key={item._id} className="relative aspect-square group">
                    <button
                      type="button"
                      onClick={() => handleSelectVerifiedUpload(item)}
                      className="w-full h-full rounded-lg border-2 border-transparent overflow-hidden hover:border-green-500 focus:border-green-500 focus:outline-none"
                      aria-label={`Select verified photo ${item._id}`}
                    >
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <ImageIcon className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteVerifiedUpload(item._id);
                      }}
                      className="absolute top-1 right-1 p-1.5 rounded-md bg-red-500/90 text-white hover:bg-red-600 shadow-sm opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none transition-opacity"
                      aria-label="Delete this verified photo"
                      title="Delete photo"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFileInputChange} />

          {/* Section 2 — Optional inputs */}
          <div className="border rounded-lg p-3">
            <button type="button" className="flex items-center gap-2 w-full text-left font-medium text-sm" onClick={() => setShowOptional(!showOptional)}>
              {showOptional ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              Improve Accuracy (Optional)
            </button>
            {showOptional && (
              <div className="mt-3 space-y-2">
                <input
                  type="text"
                  placeholder="e.g. standard EU pallet, shipping container, person standing nearby"
                  value={optionalRef}
                  onChange={(e) => setOptionalRef(e.target.value)}
                  className="w-full rounded border px-3 py-2 text-sm"
                  aria-label="Reference object visible in image (optional)"
                />
                <input
                  type="text"
                  placeholder="e.g. pile is about 3 metres wide, container is 1 tonne capacity"
                  value={optionalMeas}
                  onChange={(e) => setOptionalMeas(e.target.value)}
                  className="w-full rounded border px-3 py-2 text-sm"
                  aria-label="Approximate measurement you know (optional)"
                />
                <p className="text-xs text-muted-foreground">These are completely optional. The AI estimates without them — providing them reduces uncertainty.</p>
              </div>
            )}
          </div>

          {state === "image_selected" && (
            <Button className="w-full" onClick={runEstimation} aria-label="Start weight estimation">
              <Scale className="h-4 w-4 mr-2" /> Estimate Weight
            </Button>
          )}
        </>
      )}

      {/* Section 3 — Loading */}
      {state === "estimating" && (
        <div className="space-y-4">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-green-600 transition-all duration-500" style={{ width: `${progressPct(progressStep)}%` }} />
          </div>
          <div className="flex items-center gap-2 text-sm">
            {progressStep === 0 && <Upload className="h-4 w-4 text-green-600" />}
            {progressStep === 1 && <Eye className="h-4 w-4 text-green-600" />}
            {progressStep === 2 && <Box className="h-4 w-4 text-green-600" />}
            {progressStep === 3 && <Scale className="h-4 w-4 text-green-600" />}
            <span className="font-medium">{progressLabel(progressStep)}</span>
            <span className="text-muted-foreground">({progressPct(progressStep)}%)</span>
          </div>
        </div>
      )}

      {/* Section 4 — Results */}
      {state === "success" && estimation && (
        <div className="space-y-4">
          <div className="rounded-xl border-2 border-green-200 bg-green-50 p-6 text-center">
            <p className="text-3xl font-bold text-green-800">
              {estimation.estimatedWeightKg < 0.1
                ? `${Math.round(estimation.estimatedWeightKg * 1000)} g`
                : `${estimation.estimatedWeightKg.toLocaleString("en-IN")} kg`}
            </p>
            <p className="text-muted-foreground">
              {estimation.estimatedWeightKg < 0.1
                ? `≈ ${estimation.estimatedWeightKg.toFixed(3)} kg`
                : `≈ ${estimation.estimatedWeightTonnes.toFixed(2)} tonnes`}
            </p>
            <div className="mt-3" role="progressbar" aria-valuenow={conf} aria-valuemin={0} aria-valuemax={100} aria-label="Confidence">
              <span className={`font-medium ${confColor}`}>Confidence: {conf}%</span>
              <div className="h-2 mt-1 bg-gray-200 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${conf >= 75 ? "bg-green-500" : conf >= 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${conf}%` }} />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Range: {estimation.estimatedWeightKg < 0.1
                ? `${Math.round(estimation.weightRangeKg.min * 1000)} — ${Math.round(estimation.weightRangeKg.max * 1000)} g`
                : `${estimation.weightRangeKg.min.toLocaleString()} — ${estimation.weightRangeKg.max.toLocaleString()} kg`}
            </p>
          </div>

          {(estimation as { scaleAnchor?: string }).scaleAnchor && (estimation as { scaleAnchor?: string }).scaleAnchor !== "None" && (
            <div className="rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-sm font-medium text-green-800">
              🎯 Scale Anchor: {(estimation as { scaleAnchor?: string }).scaleAnchor}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg border p-2">
              📐 Volume: {(estimation.estimatedVolumeCubicMetres ?? 0) < 0.01
                ? (estimation as { volumeMl?: number }).volumeMl != null
                  ? `${(estimation as { volumeMl?: number }).volumeMl.toFixed(0)} ml`
                  : (estimation as { volumeLiters?: number }).volumeLiters != null
                    ? `${(estimation as { volumeLiters?: number }).volumeLiters.toFixed(2)} L`
                    : `${((estimation.estimatedVolumeCubicMetres ?? 0) * 1000).toFixed(2)} L`
                : `${(estimation.estimatedVolumeCubicMetres ?? 0).toFixed(2)} m³`}
            </div>
            <div className="rounded-lg border p-2">⚖️ Density: {estimation.densityUsedKgM3} kg/m³</div>
            <div className="rounded-lg border p-2">🔷 Geometry: {estimation.geometryAssumed}</div>
            <div className="rounded-lg border p-2">📸 Angle: {estimation.imageAngle ?? "—"}</div>
            <div className="col-span-2 rounded-lg border p-2">🎯 Method: {(estimation.estimationMethod ?? "").slice(0, 60)}{(estimation.estimationMethod ?? "").length > 60 ? "…" : ""}</div>
            <div className="col-span-2 rounded-lg border p-2">🔗 Anchors: {Array.isArray(estimation.anchorsUsed) && estimation.anchorsUsed.length ? estimation.anchorsUsed.join(", ") : "Pure visual"}</div>
          </div>

          <div className="rounded-lg border p-3">
            <p className="font-medium text-sm">
              Waste type used for estimate: {estimation.wasteTypeConfirmed ? "✅ " + (estimation.wasteTypeDetected || "Confirmed") : "⚠️ AI could not identify"}
            </p>
            {!estimation.wasteTypeConfirmed && estimation.wasteTypeDetected && (
              <p className="text-amber-700 text-sm mt-1">AI detected: {estimation.wasteTypeDetected}</p>
            )}
            <span className={`inline-block mt-2 px-2 py-0.5 rounded text-xs ${estimation.materialConfidence === "high" ? "bg-green-200" : estimation.materialConfidence === "medium" ? "bg-amber-200" : "bg-red-200"}`}>
              Material confidence: {estimation.materialConfidence}
            </span>
          </div>

          <div className="rounded-lg border bg-muted/50 p-3">
            <p className="text-xs font-medium text-muted-foreground">AI Reasoning</p>
            <p className="italic text-sm mt-1">{estimation.reasoning}</p>
          </div>

          <div className="rounded-lg border p-3">
            <p className="font-medium">🪙 Estimated WasteCredits: {estimation.wasteCreditPreview.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Based on estimated weight × carbon factor. Final credits calculated on verified weight.</p>
          </div>

          {Array.isArray(estimation.warningFlags) && estimation.warningFlags.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <ul className="list-disc list-inside text-sm text-amber-800">
                {estimation.warningFlags.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}

          {Array.isArray(estimation.improvementSuggestions) && estimation.improvementSuggestions.length > 0 && (
            <details className="rounded-lg border p-3">
              <summary className="cursor-pointer font-medium text-sm">How to improve this estimate</summary>
              <ul className="list-disc list-inside text-sm text-muted-foreground mt-2">
                {estimation.improvementSuggestions.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </details>
          )}

          {/* Section 5 — Actions */}
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleUseEstimate} aria-label="Use this estimate">
              <CheckCircle className="h-4 w-4 mr-2" /> Use This Estimate
            </Button>
            <Button variant="outline" onClick={reset} aria-label="Retake photo">Retake Photo</Button>
            <Button variant="ghost" onClick={onClose} aria-label="Enter weight manually">Enter Weight Manually</Button>
          </div>
          <p className="text-xs text-muted-foreground">After weighing your waste, confirm the actual weight to improve our AI accuracy.</p>
        </div>
      )}

      {/* Section 6 — Image analysis sidebar (collapsible) */}
      {state === "success" && imageAnalysis && (
        <details className="border rounded-lg p-3" open={showSidebar}>
          <summary className="cursor-pointer font-medium text-sm" onClick={() => setShowSidebar(!showSidebar)}>Image analysis</summary>
          <div className="mt-2 flex flex-wrap gap-2">
            {imageAnalysis.detectedLabels?.map((l, i) => <span key={i} className="rounded-full bg-muted px-2 py-0.5 text-xs">{l}</span>)}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {imageAnalysis.detectedObjects?.map((o, i) => <span key={i} className="rounded-full bg-muted px-2 py-0.5 text-xs">{o}</span>)}
          </div>
          {imageAnalysis.dominantColors?.length > 0 && (
            <div className="flex gap-1 mt-2">
              {imageAnalysis.dominantColors.slice(0, 5).map((c, i) => (
                <span key={i} className="w-6 h-6 rounded border" style={{ backgroundColor: c }} title={c} />
              ))}
            </div>
          )}
          <p className="text-xs mt-2">Frame coverage: ~{imageAnalysis.frameCoveragePercent}% · Angle: {imageAnalysis.imageAngle}</p>
          {imageAnalysis.textFoundInImage?.length > 0 && (
            <p className="text-xs mt-1">Text in image: {imageAnalysis.textFoundInImage.join(", ")}</p>
          )}
        </details>
      )}

      {/* Error state */}
      {state === "error" && (
        <div className="text-center py-4">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" aria-hidden />
          <h3 className="font-semibold">Estimation failed</h3>
          <p className="text-sm text-red-600 mt-2">{errorMessage}</p>
          <Button className="mt-4" onClick={reset} aria-label="Try again">Try Again</Button>
        </div>
      )}

      <Button variant="ghost" size="sm" onClick={onClose} className="self-start">Close</Button>
    </div>
  );
}
