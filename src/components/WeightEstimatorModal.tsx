/**
 * AgroScope — 3-Layer Local AI Weight Estimator
 * ZERO API KEYS — Runs 100% in browser (TensorFlow.js + COCO-SSD + MobileNet + HSV).
 */

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Camera,
  Upload,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  Scale,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ══════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════

export interface WeightResult {
  is_crop_waste: boolean;
  rejection_reason?: string;
  estimated_tonnes: number;
  confidence: "High" | "Medium" | "Low";
  confidence_percent: number;
  crop_type_detected: string;
  estimated_dimensions: {
    length_m: number;
    width_m: number;
    height_m: number;
  };
  bulk_density_used: number;
  volume_m3: number;
  reasoning: string;
  scale_references: string;
  range: { min_tonnes: number; max_tonnes: number };
}

interface Props {
  cropType?: string;
  onApply: (tonnes: number) => void;
  onClose: () => void;
}

type Mode =
  | "idle"
  | "camera"
  | "preview"
  | "analyzing"
  | "result"
  | "rejected"
  | "error";

type ModelStatus = "loading" | "ready" | "failed";

// ══════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════

const BULK_DENSITY: Record<string, number> = {
  "Paddy Husk": 130,
  "Wheat Straw": 60,
  "Corn Stalks": 70,
  "Sugarcane Bagasse": 120,
  "Coconut Shells": 600,
};

const REJECT_COCO = new Set([
  "person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck", "boat",
  "traffic light", "fire hydrant", "stop sign", "parking meter", "bench", "bird", "cat", "dog",
  "horse", "sheep", "cow", "elephant", "bear", "zebra", "giraffe", "backpack", "umbrella",
  "handbag", "tie", "suitcase", "frisbee", "skis", "snowboard", "sports ball", "kite",
  "baseball bat", "baseball glove", "skateboard", "surfboard", "tennis racket", "bottle",
  "wine glass", "cup", "fork", "knife", "spoon", "bowl", "banana", "apple", "sandwich", "orange",
  "broccoli", "carrot", "hot dog", "pizza", "donut", "cake", "chair", "couch",
  "potted plant", "bed", "dining table", "toilet", "tv", "laptop", "mouse", "remote",
  "keyboard", "cell phone", "microwave", "oven", "toaster", "sink", "refrigerator", "book",
  "clock", "vase", "scissors", "teddy bear", "hair drier", "toothbrush",
]);

const COCO_REASONS: Record<string, string> = {
  person: "A person was detected. Please photograph only the crop waste pile.",
  car: "A vehicle was detected. Please photograph only the crop waste.",
  truck: "A vehicle was detected.",
  motorcycle: "A vehicle was detected.",
  bicycle: "A bicycle was detected — not crop waste.",
  cat: "An animal (cat) was detected — not crop waste.",
  dog: "An animal (dog) was detected — not crop waste.",
  bird: "A bird was detected — not crop waste.",
  horse: "An animal was detected — not crop waste.",
  cow: "An animal was detected — not crop waste.",
  chair: "Furniture detected. Please photograph crop waste outdoors.",
  couch: "Indoor furniture detected.",
  bed: "Indoor furniture detected.",
  "dining table": "Indoor furniture detected.",
  toilet: "Indoor scene detected.",
  sink: "Indoor scene detected.",
  tv: "Electronics detected — not crop waste.",
  laptop: "Electronics detected — not crop waste.",
  "cell phone": "A phone was detected — not crop waste.",
  keyboard: "Electronics detected — not crop waste.",
  microwave: "Kitchen appliance detected.",
  oven: "Kitchen appliance detected.",
  refrigerator: "Kitchen appliance detected.",
  bottle: "A bottle was detected — not crop waste.",
  cup: "A cup was detected — not crop waste.",
  bowl: "A bowl was detected — not crop waste.",
  default: "A non-crop object was detected in the image.",
};

interface HSVRange {
  hMin: number;
  hMax: number;
  sMin: number;
  sMax: number;
  vMin: number;
  vMax: number;
}

const CROP_HSV: Record<string, { ranges: HSVRange[]; weight: number }> = {
  "Paddy Husk": {
    ranges: [
      { hMin: 25, hMax: 45, sMin: 0.15, sMax: 0.65, vMin: 0.55, vMax: 0.95 },
      { hMin: 20, hMax: 50, sMin: 0.08, sMax: 0.35, vMin: 0.65, vMax: 1.0 },
    ],
    weight: 1.2,
  },
  "Wheat Straw": {
    ranges: [
      { hMin: 30, hMax: 50, sMin: 0.28, sMax: 0.8, vMin: 0.48, vMax: 0.9 },
      { hMin: 18, hMax: 35, sMin: 0.18, sMax: 0.6, vMin: 0.38, vMax: 0.78 },
    ],
    weight: 1.0,
  },
  "Corn Stalks": {
    ranges: [
      { hMin: 62, hMax: 150, sMin: 0.22, sMax: 0.9, vMin: 0.18, vMax: 0.8 },
      { hMin: 45, hMax: 72, sMin: 0.18, sMax: 0.68, vMin: 0.38, vMax: 0.85 },
    ],
    weight: 1.1,
  },
  "Sugarcane Bagasse": {
    ranges: [
      { hMin: 0, hMax: 360, sMin: 0, sMax: 0.22, vMin: 0.75, vMax: 1.0 },
      { hMin: 15, hMax: 48, sMin: 0.04, sMax: 0.28, vMin: 0.7, vMax: 0.95 },
    ],
    weight: 1.15,
  },
  "Coconut Shells": {
    ranges: [
      { hMin: 10, hMax: 28, sMin: 0.28, sMax: 0.82, vMin: 0.08, vMax: 0.42 },
      { hMin: 0, hMax: 40, sMin: 0.18, sMax: 0.88, vMin: 0.04, vMax: 0.32 },
    ],
    weight: 1.3,
  },
};

// ══════════════════════════════════════════════
// MODEL CACHE
// ══════════════════════════════════════════════

let cocoModel: unknown = null;
let cocoLoading = false;
let mnModel: unknown = null;
let mnLoading = false;

async function loadCoco(): Promise<unknown> {
  if (cocoModel) return cocoModel;
  if (cocoLoading) {
    while (cocoLoading) await new Promise((r) => setTimeout(r, 100));
    return cocoModel;
  }
  cocoLoading = true;
  try {
    const [tf, coco] = await Promise.all([
      import("@tensorflow/tfjs"),
      import("@tensorflow-models/coco-ssd"),
    ]);
    await (tf as { ready: () => Promise<void> }).ready();
    cocoModel = await (coco as { load: (o: { base: string }) => Promise<unknown> }).load({
      base: "mobilenet_v2",
    });
    cocoLoading = false;
    return cocoModel;
  } catch (e) {
    cocoLoading = false;
    console.warn("COCO-SSD load failed:", e);
    return null;
  }
}

async function loadMobileNet(): Promise<unknown> {
  if (mnModel) return mnModel;
  if (mnLoading) {
    while (mnLoading) await new Promise((r) => setTimeout(r, 100));
    return mnModel;
  }
  mnLoading = true;
  try {
    const mn = await import("@tensorflow-models/mobilenet");
    mnModel = await (mn as { load: (o: { version: number; alpha: number }) => Promise<unknown> }).load({
      version: 2,
      alpha: 1.0,
    });
    mnLoading = false;
    return mnModel;
  } catch (e) {
    mnLoading = false;
    console.warn("MobileNet load failed:", e);
    return null;
  }
}

// ══════════════════════════════════════════════
// RGB → HSV
// ══════════════════════════════════════════════

function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255,
    gn = g / 255,
    bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === rn) h = 60 * (((gn - bn) / d) % 6);
    else if (max === gn) h = 60 * ((bn - rn) / d + 2);
    else h = 60 * ((rn - gn) / d + 4);
    if (h < 0) h += 360;
  }
  return [h, max === 0 ? 0 : d / max, max];
}

// ══════════════════════════════════════════════
// LAYER 2: INDOOR DETECTOR
// ══════════════════════════════════════════════

function detectIndoor(
  canvas: HTMLCanvasElement,
  avgBrightness: number,
  textureScore: number,
  edgeDensity: number
): { isIndoor: boolean; reason: string } {
  const ctx = canvas.getContext("2d")!;
  const W = canvas.width;
  const H = canvas.height;
  const topH = Math.floor(H * 0.25);
  const topData = ctx.getImageData(0, 0, W, topH).data;
  let whiteTopPx = 0,
    topTotal = 0;
  for (let i = 0; i < topData.length; i += 16) {
    const r = topData[i],
      g = topData[i + 1],
      b = topData[i + 2];
    const bright = (r + g + b) / 3;
    topTotal++;
    if (bright > 185 && Math.abs(r - g) < 22 && Math.abs(g - b) < 22) whiteTopPx++;
  }
  const topWhiteRatio = whiteTopPx / Math.max(topTotal, 1);
  if (topWhiteRatio > 0.62 && textureScore < 28) {
    return {
      isIndoor: true,
      reason:
        "Indoor ceiling detected — bright uniform surface at top of frame. Please photograph crop waste outdoors.",
    };
  }
  if (avgBrightness > 190 && textureScore < 14) {
    return {
      isIndoor: true,
      reason:
        "Indoor scene detected — very bright uniform surface with no texture. Please use an outdoor photo of your crop waste pile.",
    };
  }
  if (edgeDensity < 0.06 && avgBrightness > 165 && textureScore < 18) {
    return {
      isIndoor: true,
      reason:
        "Indoor wall or ceiling detected. Please photograph actual crop waste in an outdoor farm setting.",
    };
  }
  return { isIndoor: false, reason: "" };
}

// ══════════════════════════════════════════════
// LAYER 3: PIXEL PROFILE
// ══════════════════════════════════════════════

interface PixelProfile {
  cropScores: Record<string, number>;
  bestCrop: string;
  bestScore: number;
  coverageRatio: number;
  textureScore: number;
  edgeDensity: number;
  avgBrightness: number;
  pileWidthPx: number;
  pileHeightPx: number;
  imageW: number;
  imageH: number;
}

function analyzePixels(canvas: HTMLCanvasElement): PixelProfile {
  const ctx = canvas.getContext("2d")!;
  const W = canvas.width;
  const H = canvas.height;
  const data = ctx.getImageData(0, 0, W, H).data;
  const counts: Record<string, number> = {};
  for (const c of Object.keys(CROP_HSV)) counts[c] = 0;
  let totalPx = 0,
    matchedPx = 0,
    brightnessSum = 0;
  const brightnessArr: number[] = [];
  let minX = W,
    maxX = 0,
    minY = H,
    maxY = 0;
  for (let y = 0; y < H; y += 3) {
    for (let x = 0; x < W; x += 3) {
      const i = (y * W + x) * 4;
      const r = data[i],
        g = data[i + 1],
        b = data[i + 2];
      const bright = (r + g + b) / 3;
      brightnessSum += bright;
      brightnessArr.push(bright);
      totalPx++;
      const [h, s, v] = rgbToHsv(r, g, b);
      for (const [crop, profile] of Object.entries(CROP_HSV)) {
        for (const rng of profile.ranges) {
          const hOk =
            rng.hMin <= rng.hMax
              ? h >= rng.hMin && h <= rng.hMax
              : h >= rng.hMin || h <= rng.hMax;
          if (
            hOk &&
            s >= rng.sMin &&
            s <= rng.sMax &&
            v >= rng.vMin &&
            v <= rng.vMax
          ) {
            counts[crop] += profile.weight;
            matchedPx++;
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
            break;
          }
        }
      }
    }
  }
  const cropScores: Record<string, number> = {};
  for (const crop of Object.keys(CROP_HSV)) {
    cropScores[crop] = (counts[crop] / Math.max(totalPx, 1)) * 100;
  }
  let bestCrop = "Paddy Husk";
  let bestScore = 0;
  for (const [c, s] of Object.entries(cropScores)) {
    if (s > bestScore) {
      bestScore = s;
      bestCrop = c;
    }
  }
  const avgB = brightnessSum / totalPx;
  let variance = 0;
  for (const b of brightnessArr) variance += (b - avgB) ** 2;
  variance /= brightnessArr.length;
  let edgePx = 0,
    edgeTotal = 0;
  const step = 8;
  for (let y = step; y < H - step; y += step) {
    for (let x = step; x < W - step; x += step) {
      const i = (y * W + x) * 4;
      const gx = Math.abs(data[i] - data[(y * W + x + step) * 4]);
      const gy = Math.abs(data[i] - data[((y + step) * W + x) * 4]);
      if (Math.sqrt(gx * gx + gy * gy) > 22) edgePx++;
      edgeTotal++;
    }
  }
  return {
    cropScores,
    bestCrop,
    bestScore,
    coverageRatio: matchedPx / totalPx,
    textureScore: Math.sqrt(variance),
    edgeDensity: edgePx / Math.max(edgeTotal, 1),
    avgBrightness: avgB,
    pileWidthPx: maxX > minX ? maxX - minX : W * 0.5,
    pileHeightPx: maxY > minY ? maxY - minY : H * 0.4,
    imageW: W,
    imageH: H,
  };
}

// ══════════════════════════════════════════════
// WEIGHT CALCULATOR
// ══════════════════════════════════════════════

const H_RATIOS: Record<string, number> = {
  "Paddy Husk": 0.35,
  "Wheat Straw": 0.5,
  "Corn Stalks": 0.65,
  "Sugarcane Bagasse": 0.28,
  "Coconut Shells": 0.55,
};

function calcWeight(
  cropType: string,
  px: PixelProfile,
  pileAreaM2?: number
): {
  tonnes: number;
  lm: number;
  wm: number;
  hm: number;
  vol: number;
  density: number;
  conf: "High" | "Medium" | "Low";
  confPct: number;
  reasoning: string;
  scaleRef: string;
} {
  const density = BULK_DENSITY[cropType] || 100;
  const fovW = 4.0;
  const fovH = 3.0;
  const scaleX = fovW / px.imageW;
  const scaleY = fovH / px.imageH;
  let lm: number, wm: number;
  if (pileAreaM2 && pileAreaM2 > 0) {
    lm = Math.sqrt(pileAreaM2 * 1.6);
    wm = pileAreaM2 / lm;
  } else {
    lm = Math.max(px.pileWidthPx * scaleX, 0.5);
    wm = Math.max(px.pileHeightPx * scaleY * 0.55, 0.3);
  }
  const hm = Math.min(
    Math.max(Math.min(lm, wm) * (H_RATIOS[cropType] ?? 0.4), 0.2),
    3.2
  );
  const r = Math.min(lm, wm) / 2;
  const vol = (1 / 3) * Math.PI * r * r * hm;
  const massKg = vol * density;
  const tonnes = parseFloat((massKg / 1000).toFixed(2));
  let conf: "High" | "Medium" | "Low";
  let confPct: number;
  if (pileAreaM2 && pileAreaM2 > 0) {
    conf = "High";
    confPct = 85;
  } else if (
    px.bestScore > 20 &&
    px.textureScore > 30 &&
    px.coverageRatio > 0.25
  ) {
    conf = "High";
    confPct = 80;
  } else if (px.bestScore > 10 && px.coverageRatio > 0.12) {
    conf = "Medium";
    confPct = 65;
  } else {
    conf = "Low";
    confPct = 45;
  }
  const scaleRef = pileAreaM2
    ? `Farmer-provided area: ${pileAreaM2} m²`
    : `Visual estimation — ${(px.coverageRatio * 100).toFixed(0)}% frame coverage, texture: ${px.textureScore.toFixed(0)}`;
  const reasoning =
    `Detected ${cropType} via HSV colour analysis (score: ${px.bestScore.toFixed(1)}%). ` +
    `Pile: ${lm.toFixed(1)}m × ${wm.toFixed(1)}m × ${hm.toFixed(1)}m. ` +
    `Conical V = ${vol.toFixed(2)} m³ × ${density} kg/m³ = ${massKg.toFixed(0)} kg = ${tonnes} t.`;
  return {
    tonnes,
    lm,
    wm,
    hm,
    vol,
    density,
    conf,
    confPct,
    reasoning,
    scaleRef,
  };
}

// ══════════════════════════════════════════════
// MAIN ANALYSIS
// ══════════════════════════════════════════════

async function runAnalysis(
  file: File,
  hintCrop: string | undefined,
  pileArea: string
): Promise<WeightResult> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 480;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, 640, 480);
  bitmap.close();
  const imgEl = new Image();
  imgEl.width = 640;
  imgEl.height = 480;
  await new Promise<void>((res) => {
    imgEl.onload = () => res();
    imgEl.src = canvas.toDataURL("image/jpeg", 0.85);
  });
  const px = analyzePixels(canvas);

  // Layer 1: COCO-SSD
  let cocoRejectReason: string | null = null;
  try {
    const coco = await loadCoco();
    if (coco && typeof (coco as { detect: (img: HTMLImageElement) => Promise<Array<{ class: string; score: number }>> }).detect === "function") {
      const dets = await (coco as { detect: (img: HTMLImageElement) => Promise<Array<{ class: string; score: number }>> }).detect(imgEl);
      let topScore = 0,
        topClass = "";
      for (const d of dets) {
        const cls = d.class.toLowerCase();
        if (REJECT_COCO.has(cls) && d.score > 0.32 && d.score > topScore) {
          topScore = d.score;
          topClass = cls;
        }
      }
      if (topClass) {
        cocoRejectReason = COCO_REASONS[topClass] ?? `${topClass} detected — ${COCO_REASONS.default}`;
      }
    }
  } catch (e) {
    console.warn("COCO error:", e);
  }
  if (cocoRejectReason) {
    return {
      is_crop_waste: false,
      rejection_reason: cocoRejectReason,
      estimated_tonnes: 0,
      confidence: "Low",
      confidence_percent: 0,
      crop_type_detected: "None",
      estimated_dimensions: { length_m: 0, width_m: 0, height_m: 0 },
      bulk_density_used: 0,
      volume_m3: 0,
      reasoning: `COCO-SSD: ${cocoRejectReason}`,
      scale_references: "N/A",
      range: { min_tonnes: 0, max_tonnes: 0 },
    };
  }

  // Layer 2: Indoor
  const indoor = detectIndoor(
    canvas,
    px.avgBrightness,
    px.textureScore,
    px.edgeDensity
  );
  if (indoor.isIndoor) {
    return {
      is_crop_waste: false,
      rejection_reason: indoor.reason,
      estimated_tonnes: 0,
      confidence: "Low",
      confidence_percent: 0,
      crop_type_detected: "None",
      estimated_dimensions: { length_m: 0, width_m: 0, height_m: 0 },
      bulk_density_used: 0,
      volume_m3: 0,
      reasoning: `Indoor: ${indoor.reason}`,
      scale_references: "N/A",
      range: { min_tonnes: 0, max_tonnes: 0 },
    };
  }

  // Layer 3: MobileNet + final crop
  let mnCrop: string | null = null;
  try {
    const mn = await loadMobileNet();
    if (mn && typeof (mn as { classify: (img: HTMLImageElement, k: number) => Promise<Array<{ className: string; probability: number }>> }).classify === "function") {
      const preds = await (mn as { classify: (img: HTMLImageElement, k: number) => Promise<Array<{ className: string; probability: number }>> }).classify(imgEl, 12);
      const KWS: Record<string, string[]> = {
        "Paddy Husk": ["hay", "straw", "chaff", "grain", "rice", "husk", "cereal", "thatch", "paddy"],
        "Wheat Straw": ["wheat", "straw", "hay", "bale", "stubble", "dried", "cereal straw", "farmland"],
        "Corn Stalks": ["corn", "maize", "stalk", "cob", "cornfield", "silage", "corn field"],
        "Sugarcane Bagasse": ["sugarcane", "bagasse", "cane", "fiber", "pulp", "reed", "plant fiber"],
        "Coconut Shells": ["coconut", "shell", "coir", "palm", "nut", "dried husk", "coconut palm"],
      };
      const scores: Record<string, number> = {};
      for (const [crop, kws] of Object.entries(KWS)) {
        scores[crop] = 0;
        for (const p of preds) {
          const cn = p.className.toLowerCase();
          for (const kw of kws) {
            if (cn.includes(kw)) scores[crop] += p.probability;
          }
        }
      }
      let best = "",
        bestS = 0;
      for (const [c, s] of Object.entries(scores)) {
        if (s > bestS) {
          bestS = s;
          best = c;
        }
      }
      if (bestS > 0.04) mnCrop = best;
    }
  } catch (e) {
    console.warn("MobileNet error:", e);
  }

  const finalCrop =
    mnCrop ||
    (px.bestScore > 8 ? px.bestCrop : null) ||
    hintCrop ||
    "Paddy Husk";

  const minScore = hintCrop ? 2 : 6;
  if (
    px.bestScore < minScore &&
    !mnCrop &&
    px.coverageRatio < 0.08 &&
    px.textureScore < 18
  ) {
    return {
      is_crop_waste: false,
      rejection_reason:
        "No recognizable crop waste detected. Image may show an empty area, blurry content, or unsupported material. Please photograph a clear outdoor pile of Paddy Husk, Wheat Straw, Corn Stalks, Sugarcane Bagasse, or Coconut Shells.",
      estimated_tonnes: 0,
      confidence: "Low",
      confidence_percent: 0,
      crop_type_detected: "None",
      estimated_dimensions: { length_m: 0, width_m: 0, height_m: 0 },
      bulk_density_used: 0,
      volume_m3: 0,
      reasoning: "Insufficient crop signal",
      scale_references: "N/A",
      range: { min_tonnes: 0, max_tonnes: 0 },
    };
  }

  const paN = pileArea ? parseFloat(pileArea) : undefined;
  const w = calcWeight(finalCrop, px, paN);
  return {
    is_crop_waste: true,
    estimated_tonnes: w.tonnes,
    confidence: w.conf,
    confidence_percent: w.confPct,
    crop_type_detected: finalCrop,
    estimated_dimensions: {
      length_m: parseFloat(w.lm.toFixed(2)),
      width_m: parseFloat(w.wm.toFixed(2)),
      height_m: parseFloat(w.hm.toFixed(2)),
    },
    bulk_density_used: w.density,
    volume_m3: parseFloat(w.vol.toFixed(2)),
    reasoning: w.reasoning,
    scale_references: w.scaleRef,
    range: {
      min_tonnes: parseFloat((w.tonnes * 0.72).toFixed(2)),
      max_tonnes: parseFloat((w.tonnes * 1.33).toFixed(2)),
    },
  };
}

// ══════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════

export default function WeightEstimatorModal({
  cropType,
  onApply,
  onClose,
}: Props) {
  const [mode, setMode] = useState<Mode>("idle");
  const [previewUrl, setPreviewUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [pileArea, setPileArea] = useState("");
  const [result, setResult] = useState<WeightResult | null>(null);
  const [error, setError] = useState("");
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [modelStatus, setModelStatus] = useState<ModelStatus>("loading");
  const [pendingStream, setPendingStream] = useState<MediaStream | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    setModelStatus("loading");
    Promise.all([loadCoco(), loadMobileNet()])
      .then(() => setModelStatus("ready"))
      .catch(() => setModelStatus("failed"));
  }, []);

  useEffect(() => {
    if (mode === "camera" && pendingStream && videoRef.current) {
      const video = videoRef.current;
      video.srcObject = pendingStream;
      video.onloadedmetadata = () => video.play().catch(() => {});
      streamRef.current = pendingStream;
      setPendingStream(null);
    }
  }, [mode, pendingStream]);

  useEffect(
    () => () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    },
    []
  );

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setPendingStream(null);
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const reset = useCallback(() => {
    stopCamera();
    setMode("idle");
    setPreviewUrl((u) => {
      if (u) URL.revokeObjectURL(u);
      return "";
    });
    setImageFile(null);
    setResult(null);
    setError("");
    setPileArea("");
    setShowBreakdown(false);
  }, [stopCamera]);

  const startCamera = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      setPendingStream(stream);
      setMode("camera");
    } catch {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        setPendingStream(stream);
        setMode("camera");
      } catch {
        const secureHint =
          typeof window !== "undefined" && !window.isSecureContext
            ? " Camera works over HTTPS. Use Upload instead."
            : "";
        setError("Camera denied. Use Upload instead." + secureHint);
        setMode("error");
      }
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const W = video.videoWidth || 1280;
    const H = video.videoHeight || 720;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0, W, H);
    stopCamera();
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
        setImageFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        setMode("preview");
      },
      "image/jpeg",
      0.9
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError("Image too large. Use under 10MB.");
      setMode("error");
      return;
    }
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setMode("preview");
    setError("");
    e.target.value = "";
  };

  const handleAnalyze = async () => {
    if (!imageFile) return;
    setMode("analyzing");
    setError("");
    try {
      const res = await runAnalysis(imageFile, cropType, pileArea);
      setResult(res);
      setMode(res.is_crop_waste ? "result" : "rejected");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Analysis failed.");
      setMode("error");
    }
  };

  const handleApply = () => {
    if (result?.is_crop_waste && result.estimated_tonnes > 0) {
      onApply(result.estimated_tonnes);
      onClose();
    }
  };

  const handleBackdropClick = () => {
    stopCamera();
    onClose();
  };

  const statusText =
    modelStatus === "loading"
      ? "⏳ Loading AI models..."
      : modelStatus === "ready"
        ? "✓ COCO-SSD + MobileNet ready"
        : "⚠ Pixel analysis mode";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-green-600" />
            <div>
              <h2 className="font-semibold text-gray-900">
                Estimate Weight via Camera
              </h2>
              <p className="text-xs text-muted-foreground">{statusText}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 rounded-lg hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Idle */}
          {mode === "idle" && (
            <>
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
                <p className="font-medium mb-1">Tips:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Show full pile in frame</li>
                  <li>Include person/vehicle for scale</li>
                  <li>Photograph outdoors, good lighting</li>
                  <li>Angle shot — not top-down</li>
                </ul>
              </div>
              <div className="flex gap-2">
                <Button type="button" onClick={startCamera} className="flex-1">
                  <Camera className="h-4 w-4 mr-2" />
                  Use Camera
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Photo
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Optional: pile area (m²)"
                  value={pileArea}
                  onChange={(e) => setPileArea(e.target.value)}
                  className="flex-1 h-9 rounded-md border px-2 text-sm"
                />
                <span className="text-sm text-muted-foreground">m²</span>
              </div>
            </>
          )}

          {/* Camera */}
          {mode === "camera" && (
            <div className="space-y-2">
              <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
                <video
                  ref={videoRef}
                  playsInline
                  autoPlay
                  muted
                  className="w-full h-full object-cover"
                />
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-red-500 text-white text-xs font-medium animate-pulse">
                  LIVE
                </span>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => { stopCamera(); setMode("idle"); }}>
                  ← Back
                </Button>
                <Button type="button" onClick={capturePhoto} className="flex-1">
                  📸 Capture
                </Button>
              </div>
            </div>
          )}

          {/* Preview */}
          {mode === "preview" && imageFile && (
            <>
              <div className="relative">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-h-64 w-full object-contain rounded-lg border"
                />
                <button
                  type="button"
                  onClick={reset}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/90 hover:bg-white"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
              {cropType && (
                <p className="text-xs text-muted-foreground">
                  Crop hint: {cropType}
                </p>
              )}
              <Button
                type="button"
                onClick={handleAnalyze}
                disabled={modelStatus === "loading"}
                className="w-full"
              >
                {modelStatus === "loading" ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Analyze & Estimate Weight
              </Button>
            </>
          )}

          {/* Analyzing */}
          {mode === "analyzing" && (
            <div className="py-8 text-center">
              <Loader2 className="h-12 w-12 animate-spin text-green-600 mx-auto mb-4" />
              <p className="font-medium text-gray-900">Running 3-layer analysis...</p>
              <p className="text-sm text-muted-foreground mt-1">Layer 1: COCO-SSD object detection</p>
              <p className="text-sm text-muted-foreground">Layer 2: Indoor scene detection</p>
              <p className="text-sm text-muted-foreground">Layer 3: HSV crop identification</p>
            </div>
          )}

          {/* Result */}
          {mode === "result" && result && (
            <>
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="Result"
                  className="max-h-48 w-full object-contain rounded-lg border mb-4"
                />
              )}
              <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                <p className="text-4xl font-bold text-green-700">
                  {result.estimated_tonnes} tonnes
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Range: {result.range.min_tonnes} – {result.range.max_tonnes} tonnes
                </p>
                <span
                  className={`inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium ${
                    result.confidence === "High"
                      ? "bg-green-200 text-green-800"
                      : result.confidence === "Medium"
                        ? "bg-amber-200 text-amber-800"
                        : "bg-red-200 text-red-800"
                  }`}
                >
                  {result.confidence} ({result.confidence_percent}%)
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Crop detected: {result.crop_type_detected}
              </p>
              <details className="text-sm">
                <summary className="cursor-pointer font-medium">🧠 Analysis</summary>
                <p className="mt-2 text-muted-foreground">{result.reasoning}</p>
              </details>
              <details className="text-sm">
                <summary className="cursor-pointer font-medium">📐 Calculation Breakdown</summary>
                <div className="mt-2 text-muted-foreground space-y-1">
                  <p>Length: {result.estimated_dimensions.length_m} m</p>
                  <p>Width: {result.estimated_dimensions.width_m} m</p>
                  <p>Height: {result.estimated_dimensions.height_m} m</p>
                  <p>Volume: {result.volume_m3} m³</p>
                  <p>Bulk density: {result.bulk_density_used} kg/m³</p>
                  <p>{result.scale_references}</p>
                </div>
              </details>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={reset}>
                  Try Another
                </Button>
                <Button type="button" onClick={handleApply}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Use {result.estimated_tonnes}t
                </Button>
              </div>
            </>
          )}

          {/* Rejected */}
          {mode === "rejected" && result && (
            <>
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="Rejected"
                  className="max-h-48 w-full object-contain rounded-lg border filter grayscale opacity-75"
                />
              )}
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">🚫</span>
                </div>
                <h3 className="font-semibold text-gray-900">Crop Waste Not Detected</h3>
                <p className="text-sm text-red-600 mt-2">{result.rejection_reason}</p>
                <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-left text-sm">
                  <p className="font-medium text-amber-900 mb-1">Accepted types:</p>
                  <p>🌾 Paddy Husk · 🌿 Wheat Straw · 🌽 Corn Stalks · 🎋 Sugarcane Bagasse · 🥥 Coconut Shells</p>
                </div>
                <Button type="button" onClick={reset} className="mt-4">
                  📷 Try Different Image
                </Button>
              </div>
            </>
          )}

          {/* Error */}
          {mode === "error" && (
            <div className="text-center py-4">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900">Analysis Failed</h3>
              <p className="text-sm text-red-600 mt-2">{error}</p>
              <Button type="button" onClick={reset} className="mt-4">
                Try Again
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
