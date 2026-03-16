/**
 * Overlay on top of camera preview for verified crop waste capture.
 * Dashed frame, GPS pill (acquiring / low accuracy / locked), shutter (disabled until locked),
 * loading steps, success checkmark, failure banner.
 */

import React from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { VerifiedCaptureStatus, GpsLockStatus } from '@/hooks/useVerifiedCapture';
import { VERIFICATION_UI } from '@/constants/verificationMessages';

interface VerifiedCaptureOverlayProps {
  status: VerifiedCaptureStatus;
  gpsStatus: GpsLockStatus;
  locationLabel?: string | null;
  error: string | null;
  onCapture: () => void;
  onRetry: () => void;
  showSuccessCheck?: boolean;
}

function getLoadingMessage(status: VerifiedCaptureStatus): string {
  if (status === 'capturing' || status === 'hashing') return VERIFICATION_UI.SECURING_IMAGE;
  if (status === 'uploading') return VERIFICATION_UI.SUBMITTING_LISTING;
  return VERIFICATION_UI.VERIFYING_LOCATION;
}

export function VerifiedCaptureOverlay({
  status,
  gpsStatus,
  locationLabel,
  error,
  onCapture,
  onRetry,
  showSuccessCheck = false,
}: VerifiedCaptureOverlayProps) {
  const isBusy =
    status === 'capturing' ||
    status === 'hashing' ||
    status === 'uploading' ||
    status === 'requesting_permissions' ||
    status === 'locating';
  const showLoadingSteps = status === 'capturing' || status === 'hashing' || status === 'uploading';
  const canCapture = gpsStatus === 'locked' || gpsStatus === 'location_available';
  const shutterEnabled = canCapture && !isBusy && !showSuccessCheck;
  const showErrorBanner = !!error;

  return (
    <div className="absolute inset-0 flex flex-col pointer-events-none [&_button]:pointer-events-auto">
      {/* Dashed frame — alignment guide */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div
          className="relative w-full max-w-sm aspect-[4/3] rounded-2xl border-2 border-dashed border-white/80 flex items-center justify-center animate-pulse"
          style={{
            background: 'rgba(0,0,0,0.2)',
          }}
        >
          <span className="absolute -top-8 left-0 right-0 text-center text-sm font-medium text-white drop-shadow-md">
            {VERIFICATION_UI.ALIGN_LABEL}
          </span>
        </div>
      </div>

      {/* GPS status pill + optional location label (Google Geocoding) */}
      <div className="absolute top-4 right-4 left-4 flex flex-col items-end gap-1">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 text-white text-xs font-medium">
          {gpsStatus === 'acquiring' && (
            <>
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              {VERIFICATION_UI.GPS_ACQUIRING}
            </>
          )}
          {gpsStatus === 'low_accuracy' && (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              {VERIFICATION_UI.GPS_LOW_ACCURACY}
            </>
          )}
          {gpsStatus === 'location_available' && (
            <>
              <span className="w-2 h-2 rounded-full bg-green-500" />
              {VERIFICATION_UI.LOCATION_AVAILABLE}
            </>
          )}
          {gpsStatus === 'locked' && (
            <>
              <span className="w-2 h-2 rounded-full bg-green-500" />
              {VERIFICATION_UI.GPS_LOCKED}
            </>
          )}
        </div>
        {locationLabel && (
          <span className="text-xs text-white/90 drop-shadow-md max-w-[80%] truncate" title={locationLabel}>
            {locationLabel}
          </span>
        )}
      </div>

      {/* After capture: frosted overlay + sequential status messages */}
      {showLoadingSteps && (
        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-white" />
          <p className="text-white font-medium">{getLoadingMessage(status)}</p>
        </div>
      )}

      {/* Bottom: shutter or success */}
      <div className="p-6 flex flex-col items-center gap-4">
        {showSuccessCheck && (
          <div className="flex flex-col items-center gap-2 animate-in zoom-in duration-300">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <span className="text-green-400 font-medium">{VERIFICATION_UI.SUCCESS_MESSAGE}</span>
          </div>
        )}
        {!showLoadingSteps && !showSuccessCheck && (
          <button
            type="button"
            onClick={onCapture}
            disabled={!shutterEnabled}
            className={`w-16 h-16 rounded-full border-4 border-white shadow-lg focus:outline-none focus:ring-2 focus:ring-green-400 transition-colors ${
              shutterEnabled
                ? 'bg-white/20 hover:bg-white/30 cursor-pointer'
                : 'bg-white/10 cursor-not-allowed opacity-70'
            }`}
            aria-label="Capture"
          />
        )}
      </div>

      {/* Error banner */}
      {showErrorBanner && (
        <div className="absolute bottom-24 left-4 right-4 rounded-lg bg-red-600 text-white p-4 shadow-lg pointer-events-auto">
          <p className="text-sm font-medium">{error}</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={onRetry}>
            {VERIFICATION_UI.TRY_AGAIN}
          </Button>
        </div>
      )}
    </div>
  );
}
