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
    const [isLoading, setIsLoading] = useState(true);
    const [loadingProgress, setLoadingProgress] = useState<number>(0);
    const [hasError, setHasError] = useState(false);
    const [isInARSession, setIsInARSession] = useState(false);
    // The first screen is only a placement prompt. Capture controls become
    // available after the visitor has chosen to place the model. Native AR
    // still hides them because the native viewer owns the camera.
    const [hasStartedPlacement, setHasStartedPlacement] = useState(false);
    const [cameraReady, setCameraReady] = useState(false);
    const modelViewerRef = useRef<HTMLElement>(null);
    const backgroundVideoRef = useRef<HTMLVideoElement>(null);

    // Log what we received
    console.log("AR COMPONENT RECEIVED URL:", modelUrl);

    // STRICT CHECK: No fallbacks. If empty, show error.
    // FIREWALL: Explicitly block the Astronaut URL if it comes from the DB
    const isAstronaut = modelUrl?.includes('Astronaut.glb');
    const isValidUrl = modelUrl && modelUrl.trim() !== '' && !isAstronaut;

    // ── Background Camera Feed Setup ────────────────────────────
    // Starts getUserMedia and pipes it into the visible <video> element
    const startBackgroundCamera = useCallback(async () => {
        try {
            const stream = await getCameraStream();
            if (stream && backgroundVideoRef.current) {
                backgroundVideoRef.current.srcObject = stream;
                await backgroundVideoRef.current.play();
                // Register this video element with captureUtils so composite capture
                // grabs frames from this exact element (no duplicate getUserMedia)
                setBackgroundVideoElement(backgroundVideoRef.current);
                setCameraReady(true);
                console.log('[ARExperience] Background camera feed started.');
            }
        } catch (err) {
            console.warn('[ARExperience] Camera access denied or unavailable:', err);
            setCameraReady(false);
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

    // Mount: start background camera feed
    useEffect(() => {
        startBackgroundCamera();
        return () => {
            // Full cleanup on unmount — release all camera resources
            stopBackgroundCamera();
            releaseCamera();
        };
    }, [startBackgroundCamera, stopBackgroundCamera]);

    // ── Model load/error lifecycle ─────────────────────────────
    useEffect(() => {
        const viewer = modelViewerRef.current;
        if (!viewer) return;

        // Check if already loaded (cached or fast mount)
        if ((viewer as any).loaded) {
            setIsLoading(false);
            return;
        }

        // 1. Success Handler
        const handleLoad = () => {
            console.log("Model Loaded Successfully! (Event Listener)");
            setIsLoading(false);
        };

        // 2. Error Handler
        const handleError = (e: any) => {
            console.error("Model Failed (Event Listener):", e);
            setHasError(true);
            setIsLoading(false);
        };

        // 3. Progress Handler (for slow cellular/network connections)
        const handleProgress = (event: any) => {
            const progress = event?.detail?.totalProgress;
            if (typeof progress === 'number') {
                setLoadingProgress(progress);
                if (progress >= 1) {
                    setIsLoading(false);
                }
            }
        };

        // 4. Attach Listeners Manually
        viewer.addEventListener('load', handleLoad);
        viewer.addEventListener('error', handleError);
        viewer.addEventListener('progress', handleProgress);

        // 5. Extended Safety Timeout for slow 3G/4G connections (30 seconds)
        const safetyTimer = setTimeout(() => {
            if ((viewer as any).loaded) {
                console.warn("Safety timer check: Model already loaded, hiding loader.");
                setIsLoading(false);
            }
        }, 30000);

        return () => {
            viewer.removeEventListener('load', handleLoad);
            viewer.removeEventListener('error', handleError);
            viewer.removeEventListener('progress', handleProgress);
            clearTimeout(safetyTimer);
        };
    }, []); // Run once on mount

    // ── AR Session lifecycle (Hardware Handshake) ──────────────
    // CRITICAL: When native AR (ARCore/ARKit) takes over, we MUST release
    // our getUserMedia tracks to prevent a hardware lock. The browser's
    // native AR session needs exclusive camera access. When the user exits
    // native AR, we re-acquire the camera for our composite capture pipeline.
    useEffect(() => {
        const viewer = modelViewerRef.current;
        if (!viewer) return;

        const handleARStatus = (event: any) => {
            const status = event?.detail?.status;
            console.log('[ARExperience] ar-status changed:', status);

            if (status === 'session-started') {
                // ─── HARDWARE HANDSHAKE: RELEASE ─────────────────────
                // Native AR is taking over — stop ALL camera tracks from
                // our background video feed to free the hardware for ARCore/ARKit.
                // Without this, the browser will report a hardware lock error.
                console.log('[ARExperience] Native AR session started. Releasing camera hardware.');
                stopBackgroundCamera();
                releaseCamera();
                setIsInARSession(true);
            } else if (status === 'not-presenting') {
                // ─── HARDWARE HANDSHAKE: RE-ACQUIRE ──────────────────
                // User exited native AR — back to 3D web view.
                // Restart the background camera feed for our composite capture.
                console.log('[ARExperience] AR session ended. Re-acquiring camera.');
                setIsInARSession(false);
                startBackgroundCamera();
                prewarmCamera();
            }
        };

        viewer.addEventListener('ar-status', handleARStatus);

        return () => {
            viewer.removeEventListener('ar-status', handleARStatus);
        };
    }, [startBackgroundCamera, stopBackgroundCamera]);

    // Mobile-safe CSS animation takes over the entrance scaling and rotation (defined in globals.css)

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

    return (
        <div className="absolute inset-0 z-50 bg-black">
            {/* ─── Layer 0: Background Camera Video Feed ──────────────
                 This <video> streams getUserMedia (rear camera) and sits
                 BEHIND the transparent model-viewer, creating the
                 "Pseudo-AR" effect that bypasses the WebXR black screen. */}
            <video
                ref={backgroundVideoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full z-[1]"
                style={{
                    objectFit: 'cover',
                    transform: 'scaleX(1)',   // No mirror for rear camera
                    pointerEvents: 'none',
                }}
            />

            {/* Camera unavailable fallback gradient — only shows if no camera feed */}
            {!cameraReady && !isInARSession && (
                <div
                    className="absolute inset-0 z-[2]"
                    style={{
                        background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
                    }}
                />
            )}

            {/* Close Button — always visible, even in AR (sits above everything) */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 z-[70] bg-white text-black w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-lg hover:bg-gray-100 active:scale-95 transition-all"
            >
                ✕
            </button>

            {/* Loading Indicator - Shows while loading with progress tracking for slow connections */}
            {isLoading && !hasError && (
                <div className="absolute inset-0 z-[65] flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none">
                    <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin mb-3"></div>
                    <span className="text-white text-sm font-medium tracking-wide">
                        {loadingProgress > 0 && loadingProgress < 1
                            ? `Loading 3D Model (${Math.round(loadingProgress * 100)}%)...`
                            : 'Loading 3D Model...'}
                    </span>
                    <span className="text-white/60 text-xs mt-1">Preparing AR experience</span>
                </div>
            )}

            {/* Error Overlay */}
            {hasError && (
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

            {/* ─── Layer 1: Transparent Model-Viewer ──────────────────
                 The model-viewer renders the 3D dish with a TRANSPARENT
                 background, allowing the camera video feed to show through.
                 This is the core of the "Pseudo-AR" technique. */}
            {/* @ts-ignore - model-viewer is a web component */}
            <model-viewer
                ref={modelViewerRef}
                className={`w-full h-full ${!isLoading && !hasError ? 'animate-ar-pop' : 'opacity-0'}`}
                src={modelUrl}
                ios-src={iosSrc || modelUrl}
                alt={alt}
                scale={`${Number(arScale) || 1.0} ${Number(arScale) || 1.0} ${Number(arScale) || 1.0}`}
                ar
                ar-modes="webxr scene-viewer quick-look"
                camera-controls
                auto-rotate
                shadow-intensity="1"
                exposure="1"
                ar-scale="fixed"
                ar-placement="floor"
                touch-action="pan-y"
                style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'transparent',
                    position: 'relative',
                    zIndex: 10,
                }}
                crossorigin="anonymous"
                loading="eager"
                reveal="auto"
                environment-image="neutral"
            >

                {/* AR Prompt Slot */}
                <div slot="ar-prompt" className="absolute top-24 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 pointer-events-none w-full px-6">
                    <div className="bg-white/10 backdrop-blur-xl border border-white/20 px-6 py-4 rounded-2xl flex items-center gap-4 shadow-2xl">
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                            <span className="material-icons-round text-white text-xl animate-pulse">view_in_ar</span>
                        </div>
                        <div className="flex flex-col text-left">
                            <span className="text-white text-sm font-bold tracking-wide">Ready to Place</span>
                            <span className="text-white/70 text-xs">Point camera at a flat surface</span>
                        </div>
                    </div>
                </div>


                {/* Custom AR Button (Strictly Required for iOS/Android Native AR Launch) */}
                <button 
                    slot="ar-button" 
                    onClick={() => setHasStartedPlacement(true)}
                    className="absolute bottom-52 left-1/2 transform -translate-x-1/2 bg-white text-black px-6 py-3 rounded-full font-bold shadow-lg z-[80] active:scale-95 transition-transform"
                >
                    Place in your space
                </button>

                {/* @ts-ignore */}
            </model-viewer>

            {/*
              Camera Shutter Capture Overlay
              ─────────────────────────────────────────────────────────
              ONLY visible in the standard 3D web view (not in native AR).
              
              When native AR is active (isInARSession === true):
              - Our getUserMedia camera is released (hardware freed for ARCore/ARKit)
              - WebXR blocks JS pixel access, so composite capture is impossible
              - User relies on the native system screenshot/AR UI instead
              
              When back in 3D web view (isInARSession === false):
              - Camera is re-warmed for composite capture
              - Shutter button is visible and functional
              
              The shutter triggers the composite capture pipeline in captureUtils:
              1) Draws the background <video> frame onto an offscreen canvas
              2) Draws the model-viewer WebGL canvas (from shadowRoot) on top
              3) Applies the VisionDine watermark + dish name
              4) Exports as high-res PNG (photo) or MP4/WebM (video)
            */}
            {!isInARSession && hasStartedPlacement && (
                <CaptureOverlay
                    modelViewerRef={modelViewerRef}
                    dishName={dishName}
                    restaurantName={restaurantName}
                />
            )}

            {/* Bottom Info Card — also hidden during native AR session */}
            {!isInARSession && (
                <div className="absolute bottom-6 left-4 right-4 z-[60] pointer-events-none">
                    <div className="bg-white/95 backdrop-blur-2xl rounded-2xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-white/50 pointer-events-auto">
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 font-serif leading-tight">{dishName}</h2>
                                <p className="text-gray-500 text-[10px] mt-0.5 uppercase tracking-wider font-bold">AR Preview</p>
                            </div>
                            <span
                                className="text-base font-bold font-serif px-2 py-1 bg-gray-100 rounded-lg"
                                style={{ color: secondaryColor }}
                            >
                                {typeof dishPrice === 'number' ? `PKR ${dishPrice}` : dishPrice}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
