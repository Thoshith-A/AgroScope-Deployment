/**
 * User-facing error messages for the verified crop waste capture flow.
 * No hardcoded strings in components — import from here.
 */

export const VERIFICATION_ERRORS = {
  CAMERA_REQUIRED: 'Camera access is required to submit crop waste.',
  LOCATION_REQUIRED: 'Location access is required to verify your listing.',
  GPS_TIMEOUT: 'Unable to get GPS location. Please move to open ground and retry.',
  UPLOAD_FAILED: 'Upload failed. Please try again.',
  PHOTO_ALREADY_SUBMITTED: 'This photo has already been submitted. Please take a new photo.',
  VERIFICATION_FAILED: 'Verification failed. Photo may be too old or location invalid.',
  CAPTURE_FAILED: 'Failed to capture image.',
  SIGN_IN_REQUIRED: 'Please sign in to submit verified crop waste. Uploads are linked to your farmer account.',
} as const;
