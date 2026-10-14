import React from 'react';

interface ARModelViewerProps {
    src: string;
    poster?: string;
    alt: string;
    onView?: () => void;
}

export const ARModelViewer: React.FC<ARModelViewerProps> = ({ src, poster, alt, onView }) => {
    const [loadError, setLoadError] = React.useState<string | null>(null);
    const handleARStart = () => {
        if (onView) onView();
    };

    const ModelViewer = 'model-viewer' as any;

    return (
        <div className="relative w-full h-full rounded-xl overflow-hidden bg-slate-900/5 border border-slate-200">
            {loadError && (
                <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm px-4 text-center">
                    <span className="material-icons-round text-amber-400 text-3xl mb-2">view_in_ar</span>
                    <p className="text-white text-sm font-medium">{loadError}</p>
                    <p className="text-white/60 text-xs mt-1">Check 3D model URL or connection</p>
                </div>
            )}

            <ModelViewer
                src={src}
                poster={poster}
                alt={alt}
                shadow-intensity="1"
                camera-controls
                touch-action="pan-y"
                ar
                ar-scale="fixed"
                crossorigin="anonymous"
                ar-modes="webxr scene-viewer quick-look"
                onError={(e: any) => {
                    console.warn("ARModelViewer load notice:", e);
                    setLoadError("3D Preview unavailable");
                }}
                on-ar-status={(e: any) => {
                    if (e.detail?.status === 'session-started') handleARStart();
                }}
                class="w-full h-full"
            >
                <button slot="ar-button" className="absolute bottom-4 right-4 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-full font-bold text-sm shadow-lg flex items-center gap-2 z-50 transition-colors">
                    <span className="material-icons-round text-lg">view_in_ar</span>
                    View in AR
                </button>
            </ModelViewer>

            <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 border border-slate-200/60 shadow-sm">
                AR Scale: 1:1 Fixed
            </div>
        </div>
    );
};
