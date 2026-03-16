/**
 * Orchestrates verified capture flow: permissions → GPS watch (accuracy < 50m) → capture → SHA-256 → upload.
 * No gallery; camera capture only. No third-party liveness AI.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { uploadCropWaste, type CropWastePayload } from '@/services/cropWasteService';
import { VERIFICATION_ERRORS } from '@/constants/errorMessages';

/** Best accuracy: show "GPS Locked" */
const GPS_ACCURACY_LOCKED_M = 50;
/** Allow capture when accuracy below this (works indoors / globally) */
const GPS_ACCURACY_CAPTURE_ALLOWED_M = 500;
const GPS_TIMEOUT_MS = 15000;
const DEVICE_ID_KEY = 'agroscope_device_id';

export type VerifiedCaptureStatus =
  | 'idle'
  | 'requesting_permissions'
  | 'locating'
  | 'capturing'
  | 'hashing'
  | 'uploading'
  | 'success'
  | 'failed';

export type GpsLockStatus = 'acquiring' | 'low_accuracy' | 'location_available' | 'locked';

export interface UseVerifiedCaptureReturn {
  captureAndVerify: (captureImageBase64: () => Promise<string>) => Promise<void>;
  status: VerifiedCaptureStatus;
  error: string | null;
  verifiedPayload: CropWastePayload | null;
  gpsStatus: GpsLockStatus;
  gpsAccuracy: number | null;
  locationLabel: string | null;
  reset: () => void;
}

function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = `web_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

/** Decode base64 to ArrayBuffer (binary string from atob). */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64.replace(/^data:image\/\w+;base64,/, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/** SHA-256 of image bytes, return hex string. */
async function sha256Hex(base64Image: string): Promise<string> {
  const buffer = base64ToArrayBuffer(base64Image);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Reverse geocode lat/lng to a short label (city, country) via Google Geocoding API. */
async function fetchLocationLabel(lat: number, lng: number): Promise<string | null> {
  const key = (import.meta as { env?: { VITE_GOOGLE_MAPS_API_KEY?: string } }).env?.VITE_GOOGLE_MAPS_API_KEY?.trim();
  if (!key) return null;
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${key}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data?.status !== 'OK' || !Array.isArray(data.results) || data.results.length === 0) return null;
    const addr = data.results[0].address_components as Array<{ long_name: string; types: string[] }> | undefined;
    if (!addr) return null;
    const locality = addr.find((c) => c.types.includes('locality'))?.long_name;
    const country = addr.find((c) => c.types.includes('country'))?.long_name;
    const parts = [locality, country].filter(Boolean);
    return parts.length ? parts.join(', ') : data.results[0].formatted_address || null;
  } catch {
    return null;
  }
}

/**
 * Encapsulates the full verified capture flow: camera + location permissions,
 * GPS watch until accuracy acceptable (< 500m for global use), capture, SHA-256 hash, upload.
 * Shutter enabled when gpsStatus is 'locked' or 'location_available'.
 */
export function useVerifiedCapture(): UseVerifiedCaptureReturn {
  const [status, setStatus] = useState<VerifiedCaptureStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [verifiedPayload, setVerifiedPayload] = useState<CropWastePayload | null>(null);
  const [gpsStatus, setGpsStatus] = useState<GpsLockStatus>('acquiring');
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);

  const coordsRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasLockedRef = useRef(false);
  const hasReceivedPositionRef = useRef(false);

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
    setVerifiedPayload(null);
    setGpsStatus('acquiring');
    setGpsAccuracy(null);
    setLocationLabel(null);
  }, []);

  const isMockMode =
    typeof import.meta !== 'undefined' &&
    (import.meta as { env?: { DEV?: boolean; VITE_MOCK_CAPTURE?: string } }).env?.DEV === true &&
    (import.meta as { env?: { VITE_MOCK_CAPTURE?: string } }).env?.VITE_MOCK_CAPTURE === 'true';

  // Request permissions and start GPS watch (or mock)
  useEffect(() => {
    if (isMockMode) {
      console.log('[MOCK] Using mock capture data');
      coordsRef.current = { latitude: 13.0827, longitude: 80.2707 };
      hasLockedRef.current = true;
      setGpsStatus('locked');
      setGpsAccuracy(10);
      setLocationLabel('Chennai, India');
      setStatus('idle');
      return;
    }

    let cancelled = false;
    setStatus('requesting_permissions');
    setError(null);

    const run = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true }).catch(() => null);
        if (cancelled) return;
        if (!stream) {
          setError(VERIFICATION_ERRORS.CAMERA_REQUIRED);
          setStatus('failed');
          return;
        }
        stream.getTracks().forEach((t) => t.stop());
      } catch {
        if (!cancelled) {
          setError(VERIFICATION_ERRORS.CAMERA_REQUIRED);
          setStatus('failed');
        }
        return;
      }

      if (!navigator.geolocation) {
        if (!cancelled) {
          setError(VERIFICATION_ERRORS.LOCATION_REQUIRED);
          setStatus('failed');
        }
        return;
      }

      setStatus('locating');
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          if (cancelled) return;
          hasReceivedPositionRef.current = true;
          const acc = pos.coords.accuracy;
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          coordsRef.current = { latitude: lat, longitude: lng };
          setGpsAccuracy(acc);
          fetchLocationLabel(lat, lng).then((label) => {
            if (!cancelled) setLocationLabel(label);
          });
          if (acc < GPS_ACCURACY_LOCKED_M) {
            hasLockedRef.current = true;
            setGpsStatus('locked');
            setStatus('idle');
          } else if (acc < GPS_ACCURACY_CAPTURE_ALLOWED_M) {
            hasLockedRef.current = true;
            setGpsStatus('location_available');
            setStatus('idle');
          } else {
            setGpsStatus('low_accuracy');
          }
        },
        () => {
          if (!cancelled) {
            setError(VERIFICATION_ERRORS.LOCATION_REQUIRED);
            setStatus('failed');
          }
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
      );
      watchIdRef.current = watchId;

      timeoutRef.current = setTimeout(() => {
        if (cancelled) return;
        // Only show timeout error when we never received any position (e.g. no fix at all)
        if (!hasReceivedPositionRef.current) {
          setError(VERIFICATION_ERRORS.GPS_TIMEOUT);
          setStatus('failed');
        }
      }, GPS_TIMEOUT_MS);
    };

    run();
    return () => {
      cancelled = true;
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isMockMode]);

  const captureAndVerify = useCallback(async (captureImageBase64: () => Promise<string>) => {
    setError(null);
    setVerifiedPayload(null);

    try {
      setStatus('capturing');
      const imageBase64 = await captureImageBase64();
      if (!imageBase64) {
        setError(VERIFICATION_ERRORS.CAPTURE_FAILED);
        setStatus('failed');
        return;
      }
      const capturedAt = Date.now();

      setStatus('hashing');
      const imageHash = await sha256Hex(imageBase64);

      const coords = coordsRef.current;
      if (!coords) {
        setError(VERIFICATION_ERRORS.GPS_TIMEOUT);
        setStatus('failed');
        return;
      }

      const payload: CropWastePayload = {
        imageBase64,
        imageHash,
        latitude: coords.latitude,
        longitude: coords.longitude,
        capturedAt,
        deviceId: getDeviceId(),
      };

      setStatus('uploading');
      await uploadCropWaste(payload);
      setVerifiedPayload(payload);
      setStatus('success');
    } catch (err) {
      setStatus('failed');
      setError(err instanceof Error ? err.message : VERIFICATION_ERRORS.UPLOAD_FAILED);
    }
  }, []);

  return {
    captureAndVerify,
    status,
    error,
    verifiedPayload,
    gpsStatus,
    gpsAccuracy,
    locationLabel,
    reset,
  };
}
