/**
 * Real-time verified crop waste capture: live camera only, no gallery.
 * GPS lock required before capture; SHA-256 hash + backend verification.
 * Navigate to listing confirmation (input) on success.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVerifiedCapture } from '@/hooks/useVerifiedCapture';
import { VerifiedCaptureOverlay } from '@/components/VerifiedCaptureOverlay';
import { VERIFICATION_ERRORS } from '@/constants/errorMessages';

const isMockMode =
  typeof import.meta !== 'undefined' &&
  (import.meta as { env?: { DEV?: boolean; VITE_MOCK_CAPTURE?: string } }).env?.DEV === true &&
  (import.meta as { env?: { VITE_MOCK_CAPTURE?: string } }).env?.VITE_MOCK_CAPTURE === 'true';

/** Generate a minimal JPEG base64 for mock mode (no bundled file required). */
function getMockImageBase64(): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 2;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.resolve('');
  ctx.fillStyle = '#8B4513';
  ctx.fillRect(0, 0, 2, 2);
  return Promise.resolve(canvas.toDataURL('image/jpeg', 0.9));
}

export default function CropWasteUploadScreen() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showSuccessCheck, setShowSuccessCheck] = useState(false);

  const { captureAndVerify, status, error, gpsStatus, locationLabel, verifiedPayload, reset } = useVerifiedCapture();

  const startCamera = useCallback(async () => {
    setCameraError(null);
    if (isMockMode) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setCameraError(VERIFICATION_ERRORS.CAMERA_REQUIRED);
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [startCamera]);

  const captureImageBase64 = useCallback((): Promise<string> => {
    if (isMockMode) {
      return getMockImageBase64();
    }
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      return Promise.resolve('');
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return Promise.resolve('');
    ctx.drawImage(video, 0, 0);
    return Promise.resolve(canvas.toDataURL('image/jpeg', 0.9));
  }, []);

  const handleCapture = useCallback(async () => {
    await captureAndVerify(captureImageBase64);
  }, [captureAndVerify, captureImageBase64]);

  const handleRetry = useCallback(() => {
    reset();
    setShowSuccessCheck(false);
  }, [reset]);

  // On success: store verified image for Weight Estimator (only verified photos allowed there), then navigate after 1.5s
  useEffect(() => {
    if (status !== 'success') return;
    if (verifiedPayload?.imageBase64) {
      try {
        sessionStorage.setItem('agroscope_last_verified_image', verifiedPayload.imageBase64);
      } catch {
        // ignore quota
      }
    }
    setShowSuccessCheck(true);
    const t = setTimeout(() => navigate('/input'), 1500);
    return () => clearTimeout(t);
  }, [status, verifiedPayload, navigate]);

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <header className="flex items-center justify-between p-4 bg-black/60 z-10">
        <Button variant="ghost" size="icon" className="text-white" onClick={() => navigate('/home')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold text-white">Crop Waste Verification</h1>
        <div className="w-10" />
      </header>

      <div className="flex-1 relative overflow-hidden">
        {cameraError && !isMockMode ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-white bg-black/90">
            <p className="text-center mb-4">{cameraError}</p>
            <Button variant="outline" className="text-white border-white" onClick={startCamera}>
              Try again
            </Button>
            <Button variant="ghost" className="mt-2 text-white" onClick={() => navigate('/home')}>
              Back to Home
            </Button>
          </div>
        ) : (
          <>
            {isMockMode ? (
              <div className="absolute inset-0 bg-neutral-800 flex items-center justify-center">
                <p className="text-white/80 text-sm">[MOCK] Camera bypassed — tap capture to use test image</p>
              </div>
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
            <VerifiedCaptureOverlay
              status={status}
              gpsStatus={gpsStatus}
              locationLabel={locationLabel}
              error={error}
              onCapture={handleCapture}
              onRetry={handleRetry}
              showSuccessCheck={showSuccessCheck}
            />
          </>
        )}
      </div>
    </div>
  );
}
