'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CaptureOverlay } from '@/components/ar/CaptureOverlay';
import {
    releaseCamera,
    prewarmCamera,
    getCameraStream,
    setBackgroundVideoElement,
} from '@/lib/utils/captureUtils';

interface ARExperienceProps {
    src: string;
    iosSrc?: string;
    alt: string;
    dishName: string;
    dishPrice: string | number;
    secondaryColor?: string;
    arScale?: number;
    restaurantName?: string;
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

export const ARExperience: React.FC<ARExperienceProps> = ({
    src: modelUrl,
    iosSrc,
    alt,
    dishName,
    dishPrice,
    secondaryColor = '#FFD700',
    arScale = 1.0,
    restaurantName = 'VisionDine',
    onClose
}) => {
    // ── Explicit AR State Machine ───────────────────────────────
    const [arState, setArState] = useState<ARState>('INITIALIZING');
    const [loadingProgress, setLoadingProgress] = useState<number>(0);
    const [hasError, setHasError] = useState(false);
    const [cameraReady, setCameraReady] = useState(false);
    const [cameraError, setCameraError] = useState(false);
    const [modelReady, setModelReady] = useState(false);
    const [cameraInterrupted, setCameraInterrupted] = useState(false);
    const modelViewerRef = useRef<HTMLElement>(null);
    const backgroundVideoRef = useRef<HTMLVideoElement>(null);

    // Log what we received
    console.log('[ARExperience] Received model URL:', modelUrl, 'Current state:', arState);

    // STRICT CHECK: No fallbacks. If empty, show error.
    // FIREWALL: Explicitly block the Astronaut URL if it comes from the DB
    const isAstronaut = modelUrl?.includes('Astronaut.glb');
    const isValidUrl = modelUrl && modelUrl.trim() !== '' && !isAstronaut;

    // ── Background Camera Feed Setup & Lifecycle Recovery ───────
    const startBackgroundCamera = useCallback(async (forceFresh = false) => {
        try {
            const stream = await getCameraStream(forceFresh);
            if (stream && backgroundVideoRef.current) {
                backgroundVideoRef.current.srcObject = stream;
                await backgroundVideoRef.current.play();
                // Register this video element with captureUtils so composite capture
                // grabs frames from this exact element (no duplicate getUserMedia)
                setBackgroundVideoElement(backgroundVideoRef.current);
                setCameraReady(true);
                setCameraError(false);
                setCameraInterrupted(false);
                console.log('[ARExperience] Background camera feed running.');
            } else {
                setCameraReady(false);
                setCameraError(true);
                setCameraInterrupted(true);
            }
        } catch (err) {
            console.warn('[ARExperience] Camera access denied or failed:', err);
            setCameraReady(false);
            setCameraError(true);
            setCameraInterrupted(true);
        }
    }, []);

    const stopBackgroundCamera = useCallback(() => {
        if (backgroundVideoRef.current) {
            backgroundVideoRef.current.pause();
            backgroundVideoRef.current.srcObject = null;
        }
        setCameraReady(false);
        console.log('[ARExperience] Background camera feed stopped.');
    }, []);

    // Health check and recovery after Android share sheet or visibility change
    const checkAndRestoreCamera = useCallback(async () => {
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
    }, [startBackgroundCamera]);

    // Mount: start background camera feed
    useEffect(() => {
        startBackgroundCamera();
        return () => {
            // Full cleanup ONLY on component unmount — release all camera resources
            stopBackgroundCamera();
            releaseCamera();
        };
    }, [startBackgroundCamera, stopBackgroundCamera]);

    // Mobile Lifecycle Listeners: restore camera when returning from Android Share Sheet
    useEffect(() => {
        const handleVisibilityChange = async () => {
            if (document.visibilityState === 'visible') {
                console.log('[ARExperience] Page became visible. Restoring camera...');
                await checkAndRestoreCamera();
            }
        };

        const handleFocus = async () => {
            console.log('[ARExperience] Window focus restored. Checking camera...');
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

    // Transition from INITIALIZING to READY_TO_PLACE once both camera and model are ready
    useEffect(() => {
        if (arState === 'INITIALIZING' && (cameraReady || cameraError) && modelReady) {
            console.log('[ARExperience] Both camera and 3D model are ready! Advancing to READY_TO_PLACE.');
            setArState('READY_TO_PLACE');
        }
    }, [arState, cameraReady, cameraError, modelReady]);

    // ── Placement Action Handler ─────────────────────────────────
    const handlePlace = useCallback(() => {
        if (arState !== 'READY_TO_PLACE') return;

        console.log('[ARExperience] User triggered Place It. Transitioning to PLACING.');
        setArState('PLACING');

        // Tactile Haptic Feedback
        if (typeof window !== 'undefined' && 'vibrate' in navigator) {
            try {
                navigator.vibrate([40, 30, 60]);
            } catch {}
        }

        // Lock model in position: stop auto-rotation so it anchors firmly to table
        const viewer = modelViewerRef.current as any;
        if (viewer) {
            viewer.autoRotate = false;
        }

        // Smooth settling animation before confirming PLACED
        setTimeout(() => {
            console.log('[ARExperience] Dish placed and anchored. Transitioning to PLACED.');
            setArState('PLACED');
        }, 350);
    }, [arState]);

    const handleCaptureSubState = useCallback((subState: 'CAPTURING_PHOTO' | 'RECORDING_VIDEO' | 'PLACED') => {
        setArState(subState);
    }, []);

    // Sync autoRotate property on model-viewer element whenever isReadyToPlace changes
    const isReadyToPlace = arState === 'READY_TO_PLACE';
    useEffect(() => {
        const viewer = modelViewerRef.current as any;
        if (viewer) {
            viewer.autoRotate = isReadyToPlace;
        }
    }, [isReadyToPlace]);

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
            {/* ─── Layer 0: Background Camera Video Feed ──────────────
                 Streams getUserMedia (rear camera) and sits BEHIND the
                 transparent model-viewer, creating the web AR experience. */}
            <video
                ref={backgroundVideoRef}
                autoPlay
                playsInline
                muted
                onPause={() => {
                    // If video pauses while page is active, automatically attempt to resume
                    if (document.visibilityState === 'visible') {
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

            {/* Camera unavailable fallback gradient — only shows if no camera feed */}
            {!cameraReady && (
                <div
                    className="absolute inset-0 z-[2]"
                    style={{
                        background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
                    }}
                />
            )}

            {/* Close Button — always accessible at top-right, respecting safe area */}
            <button
                id="ar-close-button"
                onClick={onClose}
                className="absolute top-4 right-4 z-[90] bg-white text-black w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-2xl hover:bg-gray-100 active:scale-95 transition-all"
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
                        {!cameraReady && !cameraError
                            ? 'Getting your camera ready...'
                            : loadingProgress > 0 && loadingProgress < 1
                            ? `Loading 3D Model (${Math.round(loadingProgress * 100)}%)...`
                            : 'Preparing 3D model...'}
                    </span>
                </div>
            )}

            {/* ─── STAGE: ERROR ───────────────────────────────────────
                 Shown if model failed to load or asset network failure */}
            {(arState === 'ERROR' || hasError) && (
                <div className="absolute inset-0 z-[65] flex flex-col items-center justify-center bg-black/95 text-center p-6">
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

            {/* ─── Camera Interruption Recovery Overlay ──────────────
                 Self-healing action if OS halts camera while in background */}
            {cameraInterrupted && (
                <div className="absolute inset-0 z-[85] bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                    <div className="w-16 h-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mb-4">
                        <span className="material-icons-round text-3xl text-amber-400">videocam_off</span>
                    </div>
                    <h3 className="text-white font-bold text-lg mb-1.5">Camera Paused</h3>
                    <p className="text-white/70 text-xs max-w-xs mb-6 leading-relaxed">
                        The camera was paused while sharing your photo. Tap below to resume the AR experience.
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

            {/* ─── Layer 1: Transparent Model-Viewer ──────────────────
                 The model-viewer renders the 3D dish over the camera feed.
                 In READY_TO_PLACE, it hovers slightly above ground (preview altitude).
                 In PLACED, it anchors firmly with full contact shadow. */}
            <div
                className={`w-full h-full transition-all duration-500 ease-out ${
                    isReadyToPlace
                        ? 'transform -translate-y-6 scale-[0.96] opacity-90'
                        : isPlacing
                        ? 'transform -translate-y-2 scale-[0.98] opacity-95'
                        : 'transform translate-y-0 scale-100 opacity-100'
                }`}
                style={{ position: 'relative', zIndex: 10 }}
            >
                {/* @ts-ignore - model-viewer is a web component */}
                <model-viewer
                    ref={modelViewerRef}
                    className={`w-full h-full ${!isInitializing && !hasError ? 'animate-ar-pop' : 'opacity-0'}`}
                    src={modelUrl}
                    ios-src={iosSrc || modelUrl}
                    alt={alt}
                    scale={`${Number(arScale) || 1.0} ${Number(arScale) || 1.0} ${Number(arScale) || 1.0}`}
                    camera-controls
                    auto-rotate={isReadyToPlace}
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
                />
            </div>

            {/* ─── STAGE C: READY_TO_PLACE & PLACING Controls ───────────
                 Visible strictly before placement. The capture shutter is hidden. */}
            {(isReadyToPlace || isPlacing) && (
                <div
                    className="absolute bottom-12 left-0 right-0 z-[80] flex flex-col items-center pointer-events-none px-6"
                    style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 16px) + 0.5rem)' }}
                >
                    {/* Readable Instruction: "Place your camera on a flat surface" */}
                    {isReadyToPlace && (
                        <div className="mb-4 bg-black/75 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/20 text-white text-xs md:text-sm font-medium flex items-center gap-2 shadow-2xl pointer-events-auto">
                            <span className="material-icons-round text-base text-primary">control_camera</span>
                            <span>Place your camera on a flat surface</span>
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
        </div>
    );
};
