'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  captureARRender,
  startVideoRecording,
  prewarmCamera,
  releaseCamera,
  type VideoRecordingHandle,
} from '@/lib/utils/captureUtils';

// ─── Types ───────────────────────────────────────────────────────

export type CaptureSubState = 'CAPTURING_PHOTO' | 'RECORDING_VIDEO' | 'PLACED';

interface CaptureOverlayProps {
  modelViewerRef: React.RefObject<HTMLElement | null>;
  dishName: string;
  restaurantName: string;
  onStateChange?: (state: CaptureSubState) => void;
  onReposition?: () => void;
}

// ─── Constants ───────────────────────────────────────────────────

/** How long the user must hold before it switches from photo → video mode */
const HOLD_THRESHOLD_MS = 400;

// ─── Component ───────────────────────────────────────────────────

export const CaptureOverlay: React.FC<CaptureOverlayProps> = ({
  modelViewerRef,
  dishName,
  restaurantName,
  onStateChange,
  onReposition,
}) => {
  const [isFlashing, setIsFlashing] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // Refs for hold-to-record logic
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHoldingRef = useRef(false);
  const recordingHandleRef = useRef<VideoRecordingHandle | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Pre-warm camera on mount so first capture is instant
  useEffect(() => {
    console.log('[CaptureOverlay] Mounted for:', dishName);
    prewarmCamera();
    return () => {
      // Cleanup on unmount
      releaseCamera();
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (recordingHandleRef.current) recordingHandleRef.current.stop();
    };
  }, [dishName]);

  // ─── Photo Capture ──────────────────────────────────────────

  const handlePhotoCapture = useCallback(async () => {
    if (isCapturing || isRecording) return;

    setIsCapturing(true);
    setIsFlashing(true);
    onStateChange?.('CAPTURING_PHOTO');
    setTimeout(() => setIsFlashing(false), 150);

    try {
      await captureARRender(modelViewerRef.current, {
        dishName,
        restaurantName,
      });
    } catch (error) {
      console.error('[CaptureOverlay] Photo capture error:', error);
    } finally {
      setTimeout(() => {
        setIsCapturing(false);
        onStateChange?.('PLACED');
      }, 500);
    }
  }, [isCapturing, isRecording, modelViewerRef, dishName, restaurantName, onStateChange]);

  // ─── Video Recording ───────────────────────────────────────

  const startRecording = useCallback(() => {
    if (isRecording) return;

    setIsRecording(true);
    setRecordingSeconds(0);
    onStateChange?.('RECORDING_VIDEO');

    const handle = startVideoRecording(modelViewerRef.current, {
      dishName,
      restaurantName,
    });

    recordingHandleRef.current = handle;

    // Timer to show recording duration
    recordingTimerRef.current = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);

    console.log('[CaptureOverlay] Recording started.');
  }, [isRecording, modelViewerRef, dishName, restaurantName, onStateChange]);

  const stopRecording = useCallback(() => {
    if (!isRecording) return;

    if (recordingHandleRef.current) {
      recordingHandleRef.current.stop();
      recordingHandleRef.current = null;
    }

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    setIsRecording(false);
    setRecordingSeconds(0);
    onStateChange?.('PLACED');
    console.log('[CaptureOverlay] Recording stopped.');
  }, [isRecording, onStateChange]);

  // ─── Pointer Handlers (Tap vs Hold) ────────────────────────

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      if (isCapturing) return;

      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {}

      isHoldingRef.current = true;

      // Start a timer — if they hold past the threshold, start recording
      holdTimerRef.current = setTimeout(() => {
        if (isHoldingRef.current) {
          startRecording();
        }
      }, HOLD_THRESHOLD_MS);
    },
    [isCapturing, startRecording]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      isHoldingRef.current = false;

      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }

      if (isRecording) {
        // Was recording — stop it
        stopRecording();
      } else {
        // Was a quick tap — take photo
        handlePhotoCapture();
      }
    },
    [isRecording, stopRecording, handlePhotoCapture]
  );

  const handlePointerCancel = useCallback(
    (e: React.PointerEvent) => {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      isHoldingRef.current = false;

      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }

      if (isRecording) {
        stopRecording();
      }
    },
    [isRecording, stopRecording]
  );

  // ─── Format Timer ──────────────────────────────────────────

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ─── Render ────────────────────────────────────────────────

  return (
    <>
      {/* ── Shutter Flash Overlay ──────────────────────────────── */}
      {isFlashing && (
        <div
          className="fixed inset-0 z-[1000] pointer-events-none animate-shutter-flash"
          style={{ backgroundColor: 'white' }}
          aria-hidden="true"
        />
      )}

      {/* ── Recording Timer Badge ─────────────────────────────── */}
      {isRecording && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[999] flex items-center gap-2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full pointer-events-none">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
          <span
            className="text-white text-sm font-mono font-bold tracking-wider"
            style={{ fontFamily: '"SF Mono", "Fira Code", monospace' }}
          >
            {formatTime(recordingSeconds)}
          </span>
        </div>
      )}

      {/* ── Shutter Button Container (positioned above bottom safe area) ── */}
      <div
        className="absolute bottom-8 left-0 right-0 z-[999] flex flex-col items-center pointer-events-none"
        id="capture-overlay"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
      >
        {/* Reposition / Adjust Pill */}
        {onReposition && !isRecording && (
          <button
            id="ar-reposition-button"
            onClick={onReposition}
            type="button"
            disabled={isCapturing}
            className="pointer-events-auto mb-3.5 bg-black/70 hover:bg-black/90 active:scale-95 backdrop-blur-md text-white text-xs font-semibold px-4 py-2 rounded-full border border-white/25 flex items-center gap-1.5 shadow-xl transition-all"
            aria-label="Reposition dish in space"
          >
            <span className="material-icons-round text-sm text-primary">tune</span>
            <span>Reposition Dish</span>
          </button>
        )}

        {/* Shutter Button — tap for photo, hold for video */}
        <button
          id="ar-capture-button"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onContextMenu={(e) => e.preventDefault()}
          disabled={isCapturing}
          className="pointer-events-auto group relative flex items-center justify-center transition-all duration-200 disabled:opacity-50 touch-none"
          aria-label={isRecording ? 'Stop recording' : 'Capture AR screenshot or hold to record'}
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          {/* Outer Ring */}
          <div
            className={`
              w-[72px] h-[72px] rounded-full border-[3.5px] flex items-center justify-center
              shadow-[0_0_24px_rgba(0,0,0,0.35)] transition-all duration-300
              ${isRecording
                ? 'border-red-500 scale-110'
                : 'border-white/90 hover:border-white active:border-white/60'
              }
            `}
            style={{
              background: isRecording
                ? 'rgba(239, 68, 68, 0.12)'
                : 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(4px)',
            }}
          >
            {/* Inner Circle — white for photo, red for recording */}
            <div
              className={`
                rounded-full transition-all duration-300
                ${isRecording
                  ? 'w-[28px] h-[28px] rounded-lg animate-pulse'
                  : 'w-[54px] h-[54px] active:scale-90'
                }
              `}
              style={{
                background: isRecording
                  ? '#ef4444'
                  : 'radial-gradient(circle at 40% 35%, rgba(255,255,255,1) 0%, rgba(240,240,240,1) 100%)',
                boxShadow: isRecording
                  ? '0 0 16px rgba(239, 68, 68, 0.5)'
                  : 'inset 0 -2px 4px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.2)',
              }}
            />
          </div>
        </button>

        {/* Mode Label */}
        <span
          className="mt-2.5 text-[10px] font-medium tracking-[2px] uppercase select-none pointer-events-none"
          style={{
            color: isRecording ? 'rgba(239, 68, 68, 0.9)' : 'rgba(255, 255, 255, 0.7)',
            fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
            textShadow: '0 1px 3px rgba(0,0,0,0.5)',
          }}
        >
          {isRecording ? 'RECORDING' : 'HOLD FOR VIDEO'}
        </span>
      </div>
    </>
  );
};
