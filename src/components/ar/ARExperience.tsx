'use client';
import React, { useState, useEffect, useRef, useCallback, useImperativeHandle } from 'react';
import { CaptureOverlay } from '@/components/ar/CaptureOverlay';
import {
    releaseCamera,
    prewarmCamera,
    getCameraStream,
    setBackgroundVideoElement,
} from '@/lib/utils/captureUtils';

export interface ARExperienceHandle {
    startAR: () => Promise<void>;
}

export interface ARExperienceProps {
    src: string;
    iosSrc?: string;
    alt: string;
    dishName: string;
    dishPrice?: string | number;
    secondaryColor?: string;
    arScale?: number;
    restaurantName?: string;
    isOpen?: boolean;
    onClose: () => void;
}

// ─── State Machine Types ─────────────────────────────────────────

export type ARState =
    | 'INITIALIZING'
    | 'READY_TO_PLACE'
    | 'PLACING'
    | 'PLACED'
    | 'CAPTURING_PHOTO'
    | 'RECORDING_VIDEO'
    | 'ERROR';

export const ARExperience = React.forwardRef<ARExperienceHandle, ARExperienceProps>(({
    src: modelUrl,
    iosSrc,
    alt,
    dishName,
    dishPrice = '',
    secondaryColor = '#FFD700',
    arScale = 1.0,
    restaurantName = 'VisionDine',
    isOpen = true,
    onClose
}, ref) => {
    // ── Explicit AR State Machine ───────────────────────────────
    const [arState, setArState] = useState<ARState>('INITIALIZING');
    const [isInWebXR, setIsInWebXR] = useState(false);
    const [isWebXRSupported, setIsWebXRSupported] = useState(true);
    const [loadingProgress, setLoadingProgress] = useState<number>(0);
    const [hasError, setHasError] = useState(false);
    const [cameraReady, setCameraReady] = useState(false);
    const [cameraError, setCameraError] = useState(false);
    const [modelReady, setModelReady] = useState(false);
    const [cameraInterrupted, setCameraInterrupted] = useState(false);
    const [trackingState, setTrackingState] = useState<'tracking' | 'not-tracking' | 'unknown'>('unknown');
    const modelViewerRef = useRef<HTMLElement>(null);
    const backgroundVideoRef = useRef<HTMLVideoElement>(null);

    // Log what we received
    console.log('[ARExperience] Received model URL:', modelUrl, 'Current state:', arState);

    // STRICT CHECK: No fallbacks. If empty, show error.
    // FIREWALL: Explicitly block the Astronaut URL if it comes from the DB
    const isAstronaut = modelUrl?.includes('Astronaut.glb');
    const isValidUrl = modelUrl && modelUrl.trim() !== '' && !isAstronaut;

    // ── Background Camera Feed Setup (Fallback when NOT in WebXR) ───────
    const startBackgroundCamera = useCallback(async (forceFresh = false) => {
        // If actively in WebXR, do NOT start getUserMedia to prevent hardware lock conflicts with ARCore
        if (isInWebXR) return;

        try {
            const stream = await getCameraStream(forceFresh);
            if (stream && backgroundVideoRef.current) {
                backgroundVideoRef.current.srcObject = stream;
                await backgroundVideoRef.current.play();
                setBackgroundVideoElement(backgroundVideoRef.current);
                setCameraReady(true);
                setCameraError(false);
                setCameraInterrupted(false);
                console.log('[ARExperience] Fallback camera feed running.');
            } else {
                setCameraReady(false);
                setCameraError(true);
                setCameraInterrupted(true);
            }
        } catch (err) {
            console.warn('[ARExperience] Fallback camera access notice:', err);
            setCameraReady(false);
            setCameraError(true);
            setCameraInterrupted(true);
        }
    }, [isInWebXR]);

    const stopBackgroundCamera = useCallback(() => {
        if (backgroundVideoRef.current) {
            backgroundVideoRef.current.pause();
            backgroundVideoRef.current.srcObject = null;
        }
        setCameraReady(false);
        console.log('[ARExperience] Fallback camera feed stopped.');
    }, []);

    // ── WebXR Session Launcher ──────────────────────────────────────────
    const startAR = useCallback(async () => {
        const viewer = modelViewerRef.current as any;
        if (!viewer) return;

        // Check if WebXR is supported
        if (typeof navigator !== 'undefined' && 'xr' in navigator) {
            try {
                const isSupported = await (navigator as any).xr?.isSessionSupported?.('immersive-ar');
                if (isSupported === false) {
                    console.log('[ARExperience] WebXR immersive-ar not supported on this device.');
                    setIsWebXRSupported(false);
                    startBackgroundCamera();
                    return;
                }
            } catch (e) {
                console.warn('[ARExperience] Error checking xr.isSessionSupported:', e);
            }
        }

        if (typeof viewer.activateAR === 'function') {
            try {
                console.log('[ARExperience] Activating WebXR session via modelViewer.activateAR()...');
                // Crucial: Stop 2D camera stream BEFORE entering WebXR so ARCore gets exclusive hardware camera access
                stopBackgroundCamera();
                await viewer.activateAR();
            } catch (err) {
                console.warn('[ARExperience] activateAR() notice, falling back to 2D camera:', err);
                setIsWebXRSupported(false);
                startBackgroundCamera();
            }
        } else {
            setIsWebXRSupported(false);
            startBackgroundCamera();
        }
    }, [startBackgroundCamera, stopBackgroundCamera]);

    useImperativeHandle(ref, () => ({
        startAR,
    }), [startAR]);

    // Health check and recovery after Android share sheet or visibility change (Fallback mode)
    const checkAndRestoreCamera = useCallback(async () => {
        if (isInWebXR) return; // WebXR handles its own lifecycle
        const video = backgroundVideoRef.current;
        if (!video) return;

        const currentStream = video.srcObject as MediaStream | null;
        const hasLiveTracks = currentStream && currentStream.active && currentStream.getVideoTracks().some(t => t.readyState === 'live');

        if (hasLiveTracks) {
            if (video.paused) {
                try {
                    console.log('[ARExperience] Resuming paused video playback after return...');
                    await video.play();
                    setCameraReady(true);
                    setCameraInterrupted(false);
                    return;
                } catch (err) {
                    console.warn('[ARExperience] video.play() failed on active stream:', err);
                }
            } else {
                setCameraReady(true);
                setCameraInterrupted(false);
                return;
            }
        }

        // Stream is dead or was terminated by Android while in background
        console.log('[ARExperience] Camera stream inactive. Reacquiring fresh stream...');
        await startBackgroundCamera(true);
    }, [isInWebXR, startBackgroundCamera]);

    // Camera Lifecycle: start only when open and NOT in WebXR
    useEffect(() => {
        if (isOpen && !isInWebXR && !isWebXRSupported) {
            startBackgroundCamera();
        }
        return () => {
            stopBackgroundCamera();
            releaseCamera();
        };
    }, [isOpen, isInWebXR, isWebXRSupported, startBackgroundCamera, stopBackgroundCamera]);

    // Mobile Lifecycle Listeners: restore camera when returning from Android Share Sheet
    useEffect(() => {
        const handleVisibilityChange = async () => {
            if (document.visibilityState === 'visible') {
                await checkAndRestoreCamera();
            }
        };

        const handleFocus = async () => {
            await checkAndRestoreCamera();
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleFocus);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleFocus);
        };
    }, [checkAndRestoreCamera]);

    // Synchronize both HTML attribute and DOM property for <model-viewer> scale
    useEffect(() => {
        const viewer = modelViewerRef.current;
        if (!viewer) return;
        const s = `${Number(arScale) || 1.0} ${Number(arScale) || 1.0} ${Number(arScale) || 1.0}`;
        viewer.setAttribute('scale', s);
        (viewer as any).scale = s;
    }, [arScale]);

    // ── WebXR Session Status Listener ────────────────────────────
    useEffect(() => {
        const viewer = modelViewerRef.current as any;
        if (!viewer) return;

        const handleARStatus = (event: any) => {
            const status = event.detail?.status;
            console.log('[ARExperience] WebXR ar-status changed to:', status);

            if (status === 'session-started') {
                setIsInWebXR(true);
                stopBackgroundCamera();
                setArState('READY_TO_PLACE');
            } else if (status === 'object-placed') {
                setIsInWebXR(true);
                setArState('PLACED');
                if (typeof window !== 'undefined' && 'vibrate' in navigator) {
                    try { navigator.vibrate([40, 30, 60]); } catch {}
                }
            } else if (status === 'not-presenting') {
                setIsInWebXR(false);
                onClose();
            } else if (status === 'failed') {
                setIsInWebXR(false);
                setIsWebXRSupported(false);
                console.warn('[ARExperience] WebXR session failed. Falling back to camera view.');
                startBackgroundCamera();
            }
        };

        const handleTracking = (event: any) => {
            const status = event.detail?.status || viewer.getAttribute('ar-tracking');
            console.log('[ARExperience] WebXR ar-tracking changed to:', status);
            if (status === 'tracking') {
                setTrackingState('tracking');
            } else if (status === 'not-tracking') {
                setTrackingState('not-tracking');
            }
        };

        viewer.addEventListener('ar-status', handleARStatus);
        viewer.addEventListener('tracking', handleTracking);
        viewer.addEventListener('ar-tracking', handleTracking);

        // Also observe attribute mutations directly
        let observer: MutationObserver | null = null;
        if (typeof MutationObserver !== 'undefined') {
            observer = new MutationObserver(() => {
                const tracking = viewer.getAttribute('ar-tracking');
                if (tracking === 'tracking' || tracking === 'not-tracking') {
                    setTrackingState(tracking);
                }
                const status = viewer.getAttribute('ar-status');
                if (status === 'object-placed') {
                    setIsInWebXR(true);
                    setArState('PLACED');
                }
            });
            observer.observe(viewer, { attributes: true, attributeFilter: ['ar-tracking', 'ar-status'] });
        }

        return () => {
            viewer.removeEventListener('ar-status', handleARStatus);
            viewer.removeEventListener('tracking', handleTracking);
            viewer.removeEventListener('ar-tracking', handleTracking);
            if (observer) observer.disconnect();
        };
    }, [stopBackgroundCamera, startBackgroundCamera, onClose]);

    // ── Model load/error lifecycle & Dual Readiness Transition ────
    useEffect(() => {
        const viewer = modelViewerRef.current;
        if (!viewer) return;

        const handleModelReady = () => {
            console.log('[ARExperience] 3D Model loaded and ready.');
            setModelReady(true);
        };

        const checkLoaded = () => {
            if ((viewer as any).loaded || (viewer as any).modelIsVisible) {
                handleModelReady();
                return true;
            }
            return false;
        };

        if (checkLoaded()) return;

        // 1. Success Handler
        const handleLoad = () => {
            console.log('[ARExperience] Model Loaded Successfully!');
            handleModelReady();
        };

        // 2. Error Handler
        const handleError = (e: any) => {
            console.error('[ARExperience] Model Failed to load:', e);
            setHasError(true);
            setArState('ERROR');
        };

        // 3. Progress Handler (for slow cellular/network connections)
        const handleProgress = (event: any) => {
            const progress = event?.detail?.totalProgress;
            if (typeof progress === 'number') {
                setLoadingProgress(progress);
                if (progress >= 1) {
                    handleModelReady();
                }
            }
        };

        // 4. Attach Listeners Manually
        viewer.addEventListener('load', handleLoad);
        viewer.addEventListener('error', handleError);
        viewer.addEventListener('progress', handleProgress);

        // 5. Active Poll check (every 300ms) for fast/cached loads & custom element upgrade
        const pollInterval = setInterval(() => {
            if (checkLoaded()) {
                clearInterval(pollInterval);
            }
        }, 300);

        // 6. Reasonable safety fallback (3.5 seconds) so user is never stranded on INITIALIZING
        const safetyTimer = setTimeout(() => {
            console.warn('[ARExperience] Safety timeout reached, marking ready.');
            setModelReady(true);
            setArState((prev) => (prev === 'INITIALIZING' ? 'READY_TO_PLACE' : prev));
        }, 3500);

        return () => {
            viewer.removeEventListener('load', handleLoad);
            viewer.removeEventListener('error', handleError);
            viewer.removeEventListener('progress', handleProgress);
            clearInterval(pollInterval);
            clearTimeout(safetyTimer);
        };
    }, []);

    // Transition from INITIALIZING to READY_TO_PLACE once model is ready
    useEffect(() => {
        if (arState === 'INITIALIZING' && (modelReady || isInWebXR)) {
            console.log('[ARExperience] Model is ready! Advancing to READY_TO_PLACE.');
            setArState('READY_TO_PLACE');
        }
    }, [arState, modelReady, isInWebXR]);

    // ── Placement Action Handler ─────────────────────────────────
    const handlePlace = useCallback(() => {
        console.log('[ARExperience] User triggered Place It. isInWebXR:', isInWebXR);

        if (isInWebXR) {
            // In WebXR: model-viewer anchors when a touch or click event occurs on the viewer canvas
            const viewer = modelViewerRef.current as any;
            if (viewer) {
                const canvas = viewer.shadowRoot?.querySelector('canvas') || viewer;
                canvas.dispatchEvent(new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    clientX: window.innerWidth / 2,
                    clientY: window.innerHeight / 2,
                }));
            }
            setArState('PLACING');
            if (typeof window !== 'undefined' && 'vibrate' in navigator) {
                try { navigator.vibrate([40, 30, 60]); } catch {}
            }
            // Once model-viewer confirms placement, 'object-placed' will solidify PLACED
            setTimeout(() => {
                setArState('PLACED');
            }, 300);
        } else {
            // Fallback mode (no WebXR active): attempt to activate WebXR or perform visual anchoring
            const viewer = modelViewerRef.current as any;
            if (viewer?.canActivateAR && typeof viewer.activateAR === 'function') {
                startAR();
            } else {
                setArState('PLACING');
                if (typeof window !== 'undefined' && 'vibrate' in navigator) {
                    try { navigator.vibrate([40, 30, 60]); } catch {}
                }
                if (viewer) viewer.autoRotate = false;
                setTimeout(() => {
                    setArState('PLACED');
                }, 350);
            }
        }
    }, [isInWebXR, startAR]);

    const handleCaptureSubState = useCallback((subState: 'CAPTURING_PHOTO' | 'RECORDING_VIDEO' | 'PLACED') => {
        setArState(subState);
    }, []);

    // Sync autoRotate property on model-viewer element whenever isReadyToPlace changes
    const isReadyToPlace = arState === 'READY_TO_PLACE';
    useEffect(() => {
        const viewer = modelViewerRef.current as any;
        if (viewer) {
            viewer.autoRotate = isReadyToPlace && !isInWebXR;
        }
    }, [isReadyToPlace, isInWebXR]);

    if (!isValidUrl) {
        return (
            <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center text-white p-4">
                <div className="text-red-500 font-bold text-xl mb-2">3D MODEL NOT CONFIGURED</div>
                <p className="text-center text-sm text-white/80 max-w-sm mb-4">
                    No valid 3D (.glb) model URL has been configured for this dish.
                    <br />
                    Please visit the AR Demo section in the admin panel to upload or assign a GLB file.
                </p>
                <button
                    onClick={onClose}
                    className="px-6 py-2.5 bg-white text-black rounded-xl font-bold hover:bg-gray-100 transition-colors"
                >
                    Return to Dish
                </button>
            </div>
        );
    }

    const isInitializing = arState === 'INITIALIZING';
    const isPlacing = arState === 'PLACING';
    const isPlaced = arState === 'PLACED' || arState === 'CAPTURING_PHOTO' || arState === 'RECORDING_VIDEO';

    return (
        <div className="absolute inset-0 z-50 bg-black overflow-hidden select-none">
            {/* ─── Layer 0: Fallback Camera Video Feed ──────────────
                 ONLY active when NOT in an active WebXR session.
                 WebXR renders its own native passthrough camera feed. */}
            {!isInWebXR && (
                <video
                    ref={backgroundVideoRef}
                    autoPlay
                    playsInline
                    muted
                    onPause={() => {
                        if (document.visibilityState === 'visible' && !isInWebXR) {
                            backgroundVideoRef.current?.play().catch(() => {});
                        }
                    }}
                    className="absolute inset-0 w-full h-full z-[1]"
                    style={{
                        objectFit: 'cover',
                        transform: 'scaleX(1)',
                        pointerEvents: 'none',
                    }}
                />
            )}

            {/* Camera unavailable fallback gradient (when not in WebXR and camera not ready) */}
            {!isInWebXR && !cameraReady && (
                <div
                    className="absolute inset-0 z-[2]"
                    style={{
                        background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
                    }}
                />
            )}

            {/* ─── Layer 1: Model-Viewer with Genuine WebXR Enabled! ───
                 WebXR hit-test detects the table and anchors the 3D model.
                 All nested child elements automatically become the WebXR DOM Overlay! */}
            {/* @ts-ignore - model-viewer is a web component */}
            <model-viewer
                ref={modelViewerRef}
                className="w-full h-full absolute inset-0 z-[10]"
                src={modelUrl}
                ios-src={iosSrc || modelUrl}
                alt={alt}
                scale={`${Number(arScale) || 1.0} ${Number(arScale) || 1.0} ${Number(arScale) || 1.0}`}
                ar
                ar-modes="webxr"
                ar-scale="fixed"
                ar-placement="floor"
                camera-controls
                auto-rotate={isReadyToPlace && !isInWebXR}
                rotation-per-second="25deg"
                shadow-intensity={isPlaced ? '1.8' : '0.4'}
                exposure="1"
                touch-action="pan-y"
                style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'transparent',
                }}
                crossorigin="anonymous"
                loading="eager"
                reveal="auto"
                environment-image="neutral"
            >
                {/* ─── WebXR DOM OVERLAY ELEMENTS (Nested inside <model-viewer>) ─── */}

                {/* Close Button — always accessible at top-right, respecting safe area */}
                <button
                    id="ar-close-button"
                    onClick={onClose}
                    className="absolute top-4 right-4 z-[90] bg-white text-black w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-2xl hover:bg-gray-100 active:scale-95 transition-all pointer-events-auto"
                    style={{ marginTop: 'env(safe-area-inset-top, 0px)' }}
                    aria-label="Close AR experience"
                >
                    ✕
                </button>

                {/* ─── STAGE D: Clean, elegant dish name (small, dynamic from data, no price, no restaurant card) ── */}
                {isPlaced && (
                    <div
                        className="absolute top-5 left-5 z-[80] pointer-events-none select-none max-w-[calc(100%-110px)]"
                        style={{ marginTop: 'env(safe-area-inset-top, 0px)' }}
                    >
                        <h2
                            className="text-white text-sm md:text-base font-semibold tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] truncate"
                            style={{ fontFamily: '"Inter", "Helvetica Neue", -apple-system, sans-serif' }}
                        >
                            {dishName}
                        </h2>
                    </div>
                )}

                {/* ─── STAGE B: INITIALIZING ────────────────────────────────
                     Minimal loading screen with honest status messages */}
                {isInitializing && !hasError && (
                    <div className="absolute inset-0 z-[65] flex flex-col items-center justify-center bg-black/70 backdrop-blur-md pointer-events-none px-6 text-center">
                        <div className="w-12 h-12 border-3 border-white/20 border-t-white rounded-full animate-spin mb-4 shadow-lg" />
                        <span className="text-white text-base font-semibold tracking-wide">
                            Preparing your AR experience
                        </span>
                        <span className="text-white/70 text-xs mt-1.5 font-medium">
                            {loadingProgress > 0 && loadingProgress < 1
                                ? `Loading 3D Model (${Math.round(loadingProgress * 100)}%)...`
                                : !cameraReady && !cameraError && !isInWebXR
                                ? 'Getting camera ready...'
                                : 'Finding flat surfaces...'}
                        </span>
                    </div>
                )}

                {/* ─── STAGE: ERROR ─────────────────────────────────────── */}
                {(arState === 'ERROR' || hasError) && (
                    <div className="absolute inset-0 z-[65] flex flex-col items-center justify-center bg-black/95 text-center p-6 pointer-events-auto">
                        <div className="w-14 h-14 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center mb-4">
                            <span className="material-icons-round text-3xl">error_outline</span>
                        </div>
                        <div className="text-white font-bold text-xl mb-2">3D Model Failed to Load</div>
                        <p className="text-white/70 text-sm max-w-xs mb-6">
                            Unable to load the 3D model. Please verify the .glb asset URL, CORS headers, or network connection.
                        </p>
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 bg-white text-black rounded-xl font-bold hover:bg-gray-100 transition-all shadow-lg"
                        >
                            Return to Dish
                        </button>
                    </div>
                )}

                {/* ─── Camera Interruption Recovery Overlay (Fallback mode only) ── */}
                {cameraInterrupted && !isInWebXR && (
                    <div className="absolute inset-0 z-[85] bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in pointer-events-auto">
                        <div className="w-16 h-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mb-4">
                            <span className="material-icons-round text-3xl text-amber-400">videocam_off</span>
                        </div>
                        <h3 className="text-white font-bold text-lg mb-1.5">Camera Paused</h3>
                        <p className="text-white/70 text-xs max-w-xs mb-6 leading-relaxed">
                            The camera was paused. Tap below to resume the AR experience.
                        </p>
                        <button
                            onClick={checkAndRestoreCamera}
                            className="px-6 py-3.5 bg-white text-black font-bold text-sm rounded-full shadow-2xl hover:bg-gray-100 active:scale-95 transition-all flex items-center gap-2"
                        >
                            <span className="material-icons-round text-lg">refresh</span>
                            <span>Resume Camera</span>
                        </button>
                    </div>
                )}

                {/* ─── STAGE C: READY_TO_PLACE & PLACING Controls ───────────
                     Visible strictly before placement. The capture shutter is hidden. */}
                {(isReadyToPlace || isPlacing) && (
                    <div
                        className="absolute bottom-12 left-0 right-0 z-[80] flex flex-col items-center pointer-events-none px-6"
                        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 16px) + 0.5rem)' }}
                    >
                        {/* Readable Instruction */}
                        {isReadyToPlace && (
                            <div className="mb-4 bg-black/75 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/20 text-white text-xs md:text-sm font-medium flex items-center gap-2 shadow-2xl pointer-events-auto">
                                <span className="material-icons-round text-base text-primary">control_camera</span>
                                <span>
                                    {isInWebXR && trackingState === 'not-tracking'
                                        ? 'Scan table... Move phone slowly'
                                        : isInWebXR && trackingState === 'tracking'
                                        ? 'Surface detected! Tap Place It'
                                        : 'Place your camera on a flat surface'}
                                </span>
                            </div>
                        )}

                        {/* Single Prominent Button: "Place It" */}
                        <button
                            id="ar-place-button"
                            onClick={handlePlace}
                            disabled={isPlacing}
                            className={`
                                pointer-events-auto w-full max-w-xs py-4 px-8 rounded-full font-extrabold text-base tracking-wide
                                flex items-center justify-center gap-2.5 shadow-[0_12px_36px_rgba(0,0,0,0.6)]
                                border-2 border-white/90 active:scale-95 transition-all
                                ${isPlacing
                                    ? 'bg-white/90 text-black cursor-wait opacity-90'
                                    : 'bg-white text-black hover:bg-gray-100 hover:shadow-[0_16px_40px_rgba(255,255,255,0.25)]'
                                }
                            `}
                            aria-label="Place It"
                        >
                            {isPlacing ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                    <span>Placing...</span>
                                </>
                            ) : (
                                <>
                                    <span className="material-icons-round text-2xl text-black">view_in_ar</span>
                                    <span>Place It</span>
                                </>
                            )}
                        </button>
                    </div>
                )}

                {/* ─── STAGE D: Capture Overlay (Shutter Button + Hold for Video) ────
                     Visible strictly AFTER confirmed placement. Contains only shutter & recording badge. */}
                {isPlaced && (
                    <CaptureOverlay
                        modelViewerRef={modelViewerRef}
                        dishName={dishName}
                        restaurantName={restaurantName}
                        onStateChange={handleCaptureSubState}
                    />
                )}
            </model-viewer>
        </div>
    );
});

ARExperience.displayName = 'ARExperience';

