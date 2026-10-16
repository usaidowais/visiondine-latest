'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { supabaseService, supabase } from '@/lib/services/supabaseService';
import { Dish } from '@/lib/types';
import {
    calculateArScale,
    calculatePhysicalDimensions,
    calculateTargetDiameterFromScale,
    type Dimensions3D,
    type PhysicalDimensionsCm
} from '@/lib/utils/arSizing';

export default function ARDemoAdminPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [resetting, setResetting] = useState(false);

    // Form fields
    const [dishName, setDishName] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [currency, setCurrency] = useState('PKR');
    const [category, setCategory] = useState('Specialty');
    const [imageUrl, setImageUrl] = useState('');
    const [glbUrl, setGlbUrl] = useState('');

    // ── Physical Sizing & Calibration State ──────────────────────
    // Decouples preview camera framing from physical AR scale.
    //
    // rawDims: Raw unscaled bounding box dimensions (in meters) from getDimensions().
    // rawMaxMeters: Longest planar axis max(x, z) in meters.
    // targetDiameterCm: Intended real-world diameter in centimetres (e.g., 20.0, 9.0).
    // relativeScaleSlider: Synchronized relative multiplier (0.1× – 3.0×, where 1.0× = 20 cm).
    // calibrationFactor: Geometry unit conversion multiplier (default: 1.0 = raw geometry).
    const [rawDims, setRawDims] = useState<Dimensions3D>({ x: 0.8418, y: 0.0435, z: 0.8418 });
    const [rawMaxMeters, setRawMaxMeters] = useState<number>(0.8418);
    const [dimsReady, setDimsReady] = useState(false);

    const [targetDiameterCm, setTargetDiameterCm] = useState<number>(20.0);
    const [relativeScaleSlider, setRelativeScaleSlider] = useState<number>(1.0);
    const [calibrationFactor, setCalibrationFactor] = useState<number>(1.0);
    const [showCalibration, setShowCalibration] = useState<boolean>(false);
    const [customRefInput, setCustomRefInput] = useState<string>('');

    // Model Upload State
    const [modelUploadProgress, setModelUploadProgress] = useState<number | null>(null);
    const [modelUploadError, setModelUploadError] = useState<string | null>(null);
    const [modelUploadSuccess, setModelUploadSuccess] = useState<string | null>(null);
    const [isUploadingModel, setIsUploadingModel] = useState(false);

    // Image Upload State
    const [imageUploadProgress, setImageUploadProgress] = useState<number | null>(null);
    const [imageUploadError, setImageUploadError] = useState<string | null>(null);
    const [imageUploadSuccess, setImageUploadSuccess] = useState<string | null>(null);
    const [isUploadingImage, setIsUploadingImage] = useState(false);

    // Notification State
    const [saveStatus, setSaveStatus] = useState<{
        type: 'success' | 'error' | 'warning' | null;
        message: string;
        details?: string;
    }>({ type: null, message: '' });

    // Model viewer preview state
    const [modelViewerError, setModelViewerError] = useState(false);
    const [modelViewerLoading, setModelViewerLoading] = useState(true);
    const [autoRotate, setAutoRotate] = useState(true);

    const modelViewerRef = useRef<any>(null);
    const modelFileInputRef = useRef<HTMLInputElement>(null);
    const imageFileInputRef = useRef<HTMLInputElement>(null);

    // Refs to track persisted scale/calibration values across async loads without stale closures
    const loadedTrueScaleRef = useRef<number>(1.0);
    const loadedCalibrationRef = useRef<number>(1.0);
    const loadedTargetDiameterRef = useRef<number | null>(null);

    // Derived physical dimensions and model scale (live calculated)
    const currentArScale = calculateArScale({
        rawMaxMeters: rawMaxMeters > 0 ? rawMaxMeters : 0.8418,
        targetDiameterCm,
        calibrationFactor
    });

    const physicalDims: PhysicalDimensionsCm = calculatePhysicalDimensions({
        rawDimensions: rawDims.x > 0 ? rawDims : { x: 0.8418, y: 0.0435, z: 0.8418 },
        arScale: currentArScale,
        calibrationFactor
    });

    const publicDemoUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/menu/khansaab/dish/wood-fired-pizza`
        : '/menu/khansaab/dish/wood-fired-pizza';

    // Load initial demo dish
    useEffect(() => {
        const loadDemoData = async () => {
            setLoading(true);
            try {
                const demoDish = await supabaseService.getDemoDish();
                if (demoDish) {
                    setDishName(demoDish.name || 'Wood-Fired Artisan Pizza');
                    setDescription(demoDish.description || '');
                    setPrice(demoDish.price ? demoDish.price.toString() : '18.50');
                    setCurrency(demoDish.currency || 'PKR');
                    setCategory(demoDish.category || 'Specialty');
                    setImageUrl(demoDish.image_url || '/dish-pizza.svg');
                    setGlbUrl(demoDish.glb_url || '/assets/pizza-source.glb');

                    const trueScale = demoDish.ar_scale || 1.0;
                    loadedTrueScaleRef.current = trueScale;

                    const calFactor = demoDish.calibration_factor || 1.0;
                    setCalibrationFactor(calFactor);
                    loadedCalibrationRef.current = calFactor;

                    if (demoDish.target_dimensions_cm?.diameter) {
                        const d = demoDish.target_dimensions_cm.diameter;
                        setTargetDiameterCm(d);
                        setRelativeScaleSlider(Number((d / 20.0).toFixed(2)));
                        loadedTargetDiameterRef.current = d;
                    }
                }
            } catch (err: any) {
                console.error('Failed to load demo dish:', err);
                setSaveStatus({
                    type: 'error',
                    message: 'Could not load current AR Demo dish.',
                    details: err?.message
                });
            } finally {
                setLoading(false);
            }
        };

        loadDemoData();
    }, []);

    // Listen to <model-viewer> load/error events + compute unpolluted raw geometry
    useEffect(() => {
        const viewer = modelViewerRef.current;
        if (!viewer) return;

        setModelViewerLoading(true);
        setModelViewerError(false);
        setDimsReady(false);

        const handleLoad = () => {
            setModelViewerLoading(false);
            setModelViewerError(false);

            try {
                // Since preview <model-viewer> is rendered unscaled, getDimensions()
                // returns the pure, unpolluted raw geometry dimensions in meters!
                const dims = (viewer as any).getDimensions();
                if (dims && typeof dims.x === 'number') {
                    const raw: Dimensions3D = { x: dims.x, y: dims.y, z: dims.z };
                    setRawDims(raw);
                    const maxM = Math.max(dims.x, dims.z) || dims.y;
                    setRawMaxMeters(maxM);

                    // Auto-frame the model to occupy ~80% of viewport without cropping
                    if (typeof (viewer as any).updateFraming === 'function') {
                        (viewer as any).updateFraming();
                    }

                    // Restore saved physical diameter
                    if (loadedTargetDiameterRef.current) {
                        const d = loadedTargetDiameterRef.current;
                        setTargetDiameterCm(d);
                        setRelativeScaleSlider(Number((d / 20.0).toFixed(2)));
                    } else if (loadedTrueScaleRef.current && maxM > 0) {
                        const restored = calculateTargetDiameterFromScale({
                            rawMaxMeters: maxM,
                            arScale: loadedTrueScaleRef.current,
                            calibrationFactor: loadedCalibrationRef.current
                        });
                        setTargetDiameterCm(restored);
                        setRelativeScaleSlider(Number((restored / 20.0).toFixed(2)));
                    }

                    setDimsReady(true);
                }
            } catch (err) {
                console.warn('[ARDemoAdminPage] getDimensions notice:', err);
            }
        };

        const handleError = () => {
            setModelViewerLoading(false);
            setModelViewerError(true);
        };

        viewer.addEventListener('load', handleLoad);
        viewer.addEventListener('error', handleError);

        return () => {
            viewer.removeEventListener('load', handleLoad);
            viewer.removeEventListener('error', handleError);
        };
    }, [glbUrl]);

    // Handle GLB Upload
    const handleModelFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Reset previous feedback
        setModelUploadError(null);
        setModelUploadSuccess(null);

        // Client validation: Must end in .glb
        if (!file.name.toLowerCase().endsWith('.glb')) {
            setModelUploadError('Invalid file type: Please select a 3D model with a .glb extension.');
            if (modelFileInputRef.current) modelFileInputRef.current.value = '';
            return;
        }

        // Client validation: Size limit (max 30MB)
        const MAX_SIZE = 30 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
            setModelUploadError(`File too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed GLB size is 30 MB.`);
            if (modelFileInputRef.current) modelFileInputRef.current.value = '';
            return;
        }

        setIsUploadingModel(true);
        setModelUploadProgress(1);

        try {
            const uploadResult = await supabaseService.uploadModelWithProgress(file, (pct) => {
                setModelUploadProgress(pct);
            });

            if (uploadResult.persisted && uploadResult.url) {
                // Successfully persisted to Supabase Storage
                setGlbUrl(uploadResult.url);
                setModelUploadSuccess(`Model persisted to Supabase Storage! File: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`);
                setModelUploadError(null);
            } else {
                // Upload failed: PRESERVE existing configured model
                setModelUploadError(uploadResult.error || 'Upload to Supabase Storage failed. Existing model was preserved.');
                setModelUploadSuccess(null);
            }
        } catch (err: any) {
            console.error('Model upload exception:', err);
            // Preserve existing model
            setModelUploadError(`Upload failed: ${err?.message || 'Network connection error'}. Existing model was preserved.`);
            setModelUploadSuccess(null);
        } finally {
            setIsUploadingModel(false);
            setModelUploadProgress(null);
            if (modelFileInputRef.current) modelFileInputRef.current.value = '';
        }
    };

    // Handle Image Upload
    const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImageUploadError(null);
        setImageUploadSuccess(null);

        const validExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.svg'];
        const isValid = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext)) || file.type.startsWith('image/');
        if (!isValid) {
            setImageUploadError('Invalid file type: Please select a PNG, JPEG, WebP, or SVG image.');
            if (imageFileInputRef.current) imageFileInputRef.current.value = '';
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setImageUploadError(`Image is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum size is 5 MB.`);
            if (imageFileInputRef.current) imageFileInputRef.current.value = '';
            return;
        }

        setIsUploadingImage(true);
        setImageUploadProgress(1);

        try {
            const uploadResult = await supabaseService.uploadImageFileWithProgress(file, (pct) => {
                setImageUploadProgress(pct);
            });

            if (uploadResult.persisted && uploadResult.url) {
                setImageUrl(uploadResult.url);
                setImageUploadSuccess(`Image persisted to Supabase Storage! File: ${file.name}`);
                setImageUploadError(null);
            } else {
                setImageUploadError(uploadResult.error || 'Image upload failed. Existing image was preserved.');
                setImageUploadSuccess(null);
            }
        } catch (err: any) {
            setImageUploadError(`Image upload failed: ${err?.message || 'Network error'}. Existing image was preserved.`);
            setImageUploadSuccess(null);
        } finally {
            setIsUploadingImage(false);
            setImageUploadProgress(null);
            if (imageFileInputRef.current) imageFileInputRef.current.value = '';
        }
    };

    // Save Demo Configuration
    const handleSaveConfiguration = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setSaving(true);
        setSaveStatus({ type: null, message: '' });

        if (!dishName.trim()) {
            setSaveStatus({
                type: 'error',
                message: 'Dish Name cannot be empty.'
            });
            setSaving(false);
            return;
        }

        const parsedPrice = parseFloat(price);
        if (isNaN(parsedPrice) || parsedPrice < 0) {
            setSaveStatus({
                type: 'error',
                message: 'Please provide a valid price (e.g. 18.50).'
            });
            setSaving(false);
            return;
        }

        try {
            const currentArScale = calculateArScale({
                rawMaxMeters: rawMaxMeters > 0 ? rawMaxMeters : 0.8418,
                targetDiameterCm,
                calibrationFactor
            });

            const physicalDims = calculatePhysicalDimensions({
                rawDimensions: rawDims.x > 0 ? rawDims : { x: 0.8418, y: 0.0435, z: 0.8418 },
                arScale: currentArScale,
                calibrationFactor
            });

            const updates: Partial<Dish> = {
                name: dishName.trim(),
                description: description.trim(),
                price: parsedPrice,
                currency: currency.trim() || 'PKR',
                category: category.trim(),
                image_url: imageUrl.trim() || '/dish-pizza.svg',
                glb_url: glbUrl.trim() || '/assets/pizza-source.glb',
                ar_scale: currentArScale,
                calibration_factor: calibrationFactor,
                target_dimensions_cm: {
                    width: physicalDims.width,
                    height: physicalDims.height,
                    depth: physicalDims.depth,
                    diameter: targetDiameterCm
                }
            };

            const result = await supabaseService.saveDemoDish(updates);

            if (result.persistedRemote) {
                const channels: string[] = [];
                if (result.persistedDb) channels.push('Supabase Database (demo_dish_config table)');
                if (result.persistedStorage) channels.push('Supabase Storage (media/config JSON)');

                setSaveStatus({
                    type: 'success',
                    message: 'AR Demo Dish centrally saved to Supabase!',
                    details: `Persisted via ${channels.join(' and ')}. Configured physical diameter: ${targetDiameterCm.toFixed(1)} cm (ar_scale: ${currentArScale.toFixed(6)}). Public visitors will see these updates immediately.`
                });
            } else {
                setSaveStatus({
                    type: 'error',
                    message: 'Failed to persist configuration centrally to Supabase.',
                    details: result.error || 'Check internet connection and Supabase permissions.'
                });
            }
        } catch (err: any) {
            console.error('Save failed:', err);
            setSaveStatus({
                type: 'error',
                message: 'Failed to save configuration.',
                details: err?.message || 'An unexpected error occurred.'
            });
        } finally {
            setSaving(false);
        }
    };

    // Reset Demo Configuration
    const handleResetToDefault = async () => {
        const confirmed = window.confirm(
            'Reset AR Demo to default Wood-Fired Artisan Pizza model (/assets/pizza-source.glb)?'
        );
        if (!confirmed) return;

        setResetting(true);
        setSaveStatus({ type: null, message: '' });

        try {
            const defaultDish = await supabaseService.resetDemoDish();
            setDishName(defaultDish.name);
            setDescription(defaultDish.description);
            setPrice(defaultDish.price.toString());
            setCurrency(defaultDish.currency || 'PKR');
            setCategory(defaultDish.category);
            setImageUrl(defaultDish.image_url);
            setGlbUrl(defaultDish.glb_url || '/assets/pizza-source.glb');

            const defaultTrueScale = 0.237586; // normalises ~20 cm for pizza
            setTargetDiameterCm(20.0);
            setRelativeScaleSlider(1.0);
            setCalibrationFactor(1.0);
            loadedTrueScaleRef.current = defaultTrueScale;
            loadedCalibrationRef.current = 1.0;
            loadedTargetDiameterRef.current = 20.0;
            setDimsReady(false);

            setModelUploadSuccess(null);
            setModelUploadError(null);
            setImageUploadSuccess(null);
            setImageUploadError(null);

            setSaveStatus({
                type: 'success',
                message: 'AR Demo successfully restored centrally to default Wood-Fired Artisan Pizza.',
                details: 'Public demo now serves /assets/pizza-source.glb.'
            });
        } catch (err: any) {
            console.error('Reset failed:', err);
            setSaveStatus({
                type: 'error',
                message: 'Failed to reset demo dish.',
                details: err?.message
            });
        } finally {
            setResetting(false);
        }
    };

    const copyDemoUrl = () => {
        navigator.clipboard.writeText(publicDemoUrl);
        setSaveStatus({
            type: 'success',
            message: 'Public demo link copied to clipboard!',
            details: publicDemoUrl
        });
    };

    if (loading) {
        return (
            <div className="p-8 max-w-7xl mx-auto flex flex-col justify-center items-center h-[60vh] gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="text-sm text-muted-foreground font-medium">Loading AR Demo configuration...</p>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/50 pb-6">
                <div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                        <span>Platform</span>
                        <span className="material-icons-round text-xs">chevron_right</span>
                        <span className="text-primary font-bold">AR Demo</span>
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                        <span className="material-icons-round text-primary text-3xl">view_in_ar</span>
                        AR Demo Dish Management
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Control the live 3D model, metadata, and WebAR presentation for the public marketing demo.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleResetToDefault}
                        disabled={resetting || saving}
                        className="gap-2 text-muted-foreground hover:text-foreground text-xs md:text-sm"
                    >
                        <span className="material-icons-round text-base">restart_alt</span>
                        {resetting ? 'Resetting...' : 'Reset Default'}
                    </Button>

                    <a
                        href="/menu/khansaab/dish/wood-fired-pizza"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all border border-border shadow-sm"
                    >
                        <span className="material-icons-round text-base">open_in_new</span>
                        Test Public Demo
                    </a>

                    <Button
                        type="button"
                        onClick={handleSaveConfiguration}
                        disabled={saving}
                        className="gap-2 bg-primary text-primary-foreground shadow-lg shadow-primary/25 text-xs md:text-sm px-5"
                    >
                        <span className="material-icons-round text-base">save</span>
                        {saving ? 'Saving...' : 'Save Configuration'}
                    </Button>
                </div>
            </div>

            {/* Notification Banner */}
            {saveStatus.type && (
                <div
                    className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${
                        saveStatus.type === 'success'
                            ? 'bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-300'
                            : saveStatus.type === 'warning'
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
                            : 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300'
                    }`}
                >
                    <span className="material-icons-round text-xl shrink-0 mt-0.5">
                        {saveStatus.type === 'success' ? 'check_circle' : saveStatus.type === 'warning' ? 'warning' : 'error'}
                    </span>
                    <div className="flex-1 text-sm">
                        <p className="font-bold">{saveStatus.message}</p>
                        {saveStatus.details && <p className="text-xs opacity-90 mt-0.5">{saveStatus.details}</p>}
                    </div>
                    <button
                        onClick={() => setSaveStatus({ type: null, message: '' })}
                        className="opacity-70 hover:opacity-100 transition-opacity"
                    >
                        <span className="material-icons-round text-base">close</span>
                    </button>
                </div>
            )}

            {/* Platform Quick Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-card border border-border/60 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                        <span className="material-icons-round text-2xl">link</span>
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-xs text-muted-foreground font-medium">Public Demo Route</p>
                        <p className="text-xs font-mono font-bold text-foreground truncate mt-0.5">
                            /menu/khansaab/dish/wood-fired-pizza
                        </p>
                    </div>
                </div>

                <div className="bg-card border border-border/60 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                        <span className="material-icons-round text-2xl">cloud_done</span>
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-xs text-muted-foreground font-medium">Storage Engine</p>
                        <p className="text-xs font-bold text-foreground truncate mt-0.5">
                            Supabase Storage (bucket: media)
                        </p>
                    </div>
                </div>

                <div className="bg-card border border-border/60 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
                        <span className="material-icons-round text-2xl">admin_panel_settings</span>
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-xs text-muted-foreground font-medium">Access Control</p>
                        <p className="text-xs font-bold text-foreground truncate mt-0.5">
                            Super-Admin Protected
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Editor Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left Column: Form Controls (7 cols) */}
                <div className="lg:col-span-7 space-y-6">
                    {/* Metadata Card */}
                    <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm space-y-6">
                        <div className="flex items-center justify-between border-b border-border/40 pb-4">
                            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                                <span className="material-icons-round text-primary text-xl">restaurant</span>
                                Demo Dish Information
                            </h2>
                            <span className="text-xs bg-primary/10 text-primary font-bold px-2.5 py-1 rounded-full border border-primary/20">
                                Single-Dish Mode
                            </span>
                        </div>

                        {/* Name & Category */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                                    Dish Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={dishName}
                                    onChange={(e) => setDishName(e.target.value)}
                                    placeholder="Wood-Fired Artisan Pizza"
                                    className="w-full px-4 py-2.5 bg-background border border-input rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                                    Category
                                </label>
                                <input
                                    type="text"
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    placeholder="Specialty, Mains, BBQ..."
                                    className="w-full px-4 py-2.5 bg-background border border-input rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                                />
                            </div>
                        </div>

                        {/* Price and Currency */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                                    Price <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                                        {currency || 'PKR'}
                                    </span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value)}
                                        placeholder="18.50"
                                        className="w-full pl-16 pr-4 py-2.5 bg-background border border-input rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                                    Currency Code <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={currency}
                                    onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                                    placeholder="PKR, USD, AED, EUR..."
                                    maxLength={5}
                                    className="w-full px-4 py-2.5 bg-background border border-input rounded-xl text-foreground text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                                />
                                <p className="text-[11px] text-muted-foreground mt-1">
                                    Default is PKR. Reflected across price tags and AR viewer.
                                </p>
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                                Description
                            </label>
                            <textarea
                                rows={3}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Describe the ingredients, preparation, and flavors of this demo dish..."
                                className="w-full px-4 py-2.5 bg-background border border-input rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none leading-relaxed"
                            />
                        </div>

                        {/* Dish Preview Image Section */}
                        <div className="border-t border-border/40 pt-5 space-y-3">
                            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                Dish Preview Image
                            </label>

                            <div className="flex flex-col sm:flex-row items-center gap-4">
                                <div className="w-20 h-20 rounded-xl border border-border overflow-hidden bg-secondary/40 shrink-0 flex items-center justify-center relative">
                                    {imageUrl ? (
                                        <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="material-icons-round text-muted-foreground text-2xl">image</span>
                                    )}
                                </div>

                                <div className="flex-1 w-full space-y-2">
                                    <input
                                        type="text"
                                        value={imageUrl}
                                        onChange={(e) => setImageUrl(e.target.value)}
                                        placeholder="https://... or /dish-pizza.svg"
                                        className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                                    />

                                    <div className="flex items-center gap-2">
                                        <input
                                            ref={imageFileInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageFileUpload}
                                            className="hidden"
                                            id="image-file-upload"
                                        />
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            disabled={isUploadingImage}
                                            onClick={() => imageFileInputRef.current?.click()}
                                            className="text-xs h-8 gap-1.5"
                                        >
                                            <span className="material-icons-round text-sm">upload</span>
                                            {isUploadingImage ? 'Uploading Image...' : 'Upload Image File'}
                                        </Button>
                                        <span className="text-[11px] text-muted-foreground">PNG, JPG, WebP, SVG (max 5MB)</span>
                                    </div>
                                </div>
                            </div>

                            {/* Image Upload Progress */}
                            {modelUploadProgress !== null && isUploadingImage && (
                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>Uploading image...</span>
                                        <span>{imageUploadProgress}%</span>
                                    </div>
                                    <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                                        <div
                                            className="bg-primary h-full transition-all duration-300"
                                            style={{ width: `${imageUploadProgress}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {imageUploadSuccess && (
                                <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                                    <span className="material-icons-round text-sm">check</span>
                                    {imageUploadSuccess}
                                </p>
                            )}

                            {imageUploadError && (
                                <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                                    <span className="material-icons-round text-sm">error_outline</span>
                                    {imageUploadError}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* 3D Model Upload & Configuration Card */}
                    <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm space-y-6">
                        <div className="flex items-center justify-between border-b border-border/40 pb-4">
                            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                                <span className="material-icons-round text-primary text-xl">view_in_ar</span>
                                3D Model Asset (.glb)
                            </h2>
                            <span className="text-xs bg-secondary text-secondary-foreground font-semibold px-2.5 py-1 rounded-full border border-border">
                                WebAR glTF Binary
                            </span>
                        </div>

                        {/* Model Dropzone / Upload button */}
                        <div className="border-2 border-dashed border-border/80 hover:border-primary/50 transition-colors rounded-2xl p-6 text-center bg-background/50 space-y-3">
                            <input
                                ref={modelFileInputRef}
                                type="file"
                                accept=".glb,model/gltf-binary"
                                onChange={handleModelFileUpload}
                                className="hidden"
                                id="glb-file-input"
                            />

                            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
                                <span className="material-icons-round text-2xl">
                                    {isUploadingModel ? 'cloud_upload' : 'file_upload'}
                                </span>
                            </div>

                            <div>
                                <p className="text-sm font-bold text-foreground">
                                    Upload or Replace Demo 3D Model (.glb)
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Strict file validation: Only <code className="bg-secondary px-1 py-0.5 rounded">.glb</code> files under 30 MB.
                                </p>
                            </div>

                            <Button
                                type="button"
                                disabled={isUploadingModel}
                                onClick={() => modelFileInputRef.current?.click()}
                                className="gap-2 bg-primary text-primary-foreground text-xs shadow-md shadow-primary/20"
                            >
                                <span className="material-icons-round text-sm">file_open</span>
                                {isUploadingModel ? 'Uploading to Supabase Storage...' : 'Select GLB File from Device'}
                            </Button>
                        </div>

                        {/* Upload Progress Bar */}
                        {isUploadingModel && modelUploadProgress !== null && (
                            <div className="space-y-1.5 bg-secondary/30 p-3 rounded-xl border border-border/50">
                                <div className="flex justify-between text-xs font-semibold text-foreground">
                                    <span className="flex items-center gap-1.5">
                                        <span className="material-icons-round animate-spin text-sm text-primary">sync</span>
                                        Uploading to Supabase Storage (media bucket)...
                                    </span>
                                    <span className="font-mono">{modelUploadProgress}%</span>
                                </div>
                                <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                                    <div
                                        className="bg-primary h-full transition-all duration-200"
                                        style={{ width: `${modelUploadProgress}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Model Upload Feedback Messages */}
                        {modelUploadSuccess && (
                            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-700 dark:text-green-300 text-xs flex items-start gap-2">
                                <span className="material-icons-round text-base shrink-0 mt-0.5">check_circle</span>
                                <div>
                                    <p className="font-bold">Upload Succeeded & Persisted</p>
                                    <p className="mt-0.5 opacity-90">{modelUploadSuccess}</p>
                                </div>
                            </div>
                        )}

                        {modelUploadError && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-700 dark:text-red-300 text-xs flex items-start gap-2">
                                <span className="material-icons-round text-base shrink-0 mt-0.5">error_outline</span>
                                <div>
                                    <p className="font-bold">Upload Failed — Current Model Preserved</p>
                                    <p className="mt-0.5 opacity-90">{modelUploadError}</p>
                                </div>
                            </div>
                        )}

                        {/* Direct Model URL Input */}
                        <div>
                            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                                Current Active Model URL
                            </label>
                            <input
                                type="text"
                                value={glbUrl}
                                onChange={(e) => setGlbUrl(e.target.value)}
                                placeholder="https://...supabase.co/.../model.glb or /assets/pizza-source.glb"
                                className="w-full px-4 py-2.5 bg-background border border-input rounded-xl text-foreground text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                            />
                            <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1">
                                <span className="material-icons-round text-xs">info</span>
                                Uploading a file updates this field automatically to the permanent Supabase Storage URL.
                            </p>
                        </div>

                        {/* ── AR Target Physical Sizing & Calibration Controls ── */}
                        <div className="border-t border-border/40 pt-5 space-y-5">
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                                        <span className="material-icons-round text-primary text-sm">straighten</span>
                                        Target Physical Diameter
                                    </label>
                                    <span className="font-mono text-sm font-bold bg-primary/10 text-primary px-3 py-1 rounded-lg border border-primary/20">
                                        {targetDiameterCm.toFixed(1)} cm
                                    </span>
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                    Set the real-world diameter in centimetres. VisionDine calculates the precise model scale for AR.
                                </p>
                            </div>

                            {/* Centimetre Stepper & Direct Input */}
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const next = Math.max(3.0, Number((targetDiameterCm - 0.5).toFixed(1)));
                                        setTargetDiameterCm(next);
                                        setRelativeScaleSlider(Number((next / 20.0).toFixed(2)));
                                    }}
                                    className="px-3 py-2 bg-secondary hover:bg-secondary/80 text-foreground text-xs font-bold rounded-xl border border-border/60 active:scale-95 transition-all"
                                >
                                    -0.5 cm
                                </button>
                                <div className="relative flex-1">
                                    <input
                                        type="number"
                                        min="3.0"
                                        max="120.0"
                                        step="0.5"
                                        value={targetDiameterCm}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            if (!isNaN(val) && val > 0) {
                                                setTargetDiameterCm(val);
                                                setRelativeScaleSlider(Number((val / 20.0).toFixed(2)));
                                            }
                                        }}
                                        className="w-full px-3 py-2 bg-background border border-input rounded-xl text-center font-mono font-bold text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono pointer-events-none">
                                        cm
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const next = Math.min(120.0, Number((targetDiameterCm + 0.5).toFixed(1)));
                                        setTargetDiameterCm(next);
                                        setRelativeScaleSlider(Number((next / 20.0).toFixed(2)));
                                    }}
                                    className="px-3 py-2 bg-secondary hover:bg-secondary/80 text-foreground text-xs font-bold rounded-xl border border-border/60 active:scale-95 transition-all"
                                >
                                    +0.5 cm
                                </button>
                            </div>

                            {/* Quick Dish Size Presets */}
                            <div>
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                                    Quick Presets
                                </label>
                                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                                    {[
                                        { label: 'Cup / Shot', cm: 6.0 },
                                        { label: 'Small Bowl', cm: 9.0 },
                                        { label: 'Side / Salad', cm: 15.0 },
                                        { label: 'Standard (20cm)', cm: 20.0 },
                                        { label: 'Dinner Plate', cm: 26.0 },
                                    ].map((preset) => (
                                        <button
                                            key={preset.cm}
                                            type="button"
                                            onClick={() => {
                                                setTargetDiameterCm(preset.cm);
                                                setRelativeScaleSlider(Number((preset.cm / 20.0).toFixed(2)));
                                            }}
                                            className={`py-1.5 px-2 rounded-lg text-[10px] font-medium border text-center transition-all ${
                                                Math.abs(targetDiameterCm - preset.cm) < 0.1
                                                    ? 'bg-primary text-primary-foreground border-primary shadow-sm font-bold'
                                                    : 'bg-secondary/60 hover:bg-secondary text-foreground border-border/50'
                                            }`}
                                        >
                                            {preset.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Relative Multiplier Slider (Synchronized) */}
                            <div className="space-y-2 pt-1">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-[11px] text-muted-foreground font-medium">Relative Scale Slider</span>
                                    <span className="font-mono text-xs font-bold text-foreground">
                                        {relativeScaleSlider.toFixed(2)}×
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="0.1"
                                    max="3.0"
                                    step="0.05"
                                    value={relativeScaleSlider}
                                    onChange={(e) => {
                                        const s = parseFloat(e.target.value);
                                        setRelativeScaleSlider(s);
                                        setTargetDiameterCm(Number((s * 20.0).toFixed(1)));
                                    }}
                                    className="w-full accent-primary cursor-pointer"
                                />
                                <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                                    <span>0.10× (2 cm)</span>
                                    <span>1.00× (20 cm)</span>
                                    <span>3.00× (60 cm)</span>
                                </div>
                            </div>

                            {/* Calculated Real-World Placed Dimensions */}
                            <div className="bg-secondary/40 rounded-xl p-4 border border-border/50 space-y-0">
                                <div className="flex justify-between items-center mb-3">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                        Configured AR Physical Dimensions
                                    </p>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                        calibrationFactor === 1.0
                                            ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                                            : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                    }`}>
                                        {calibrationFactor === 1.0 ? 'Estimated · Uncalibrated' : `Calibrated (${calibrationFactor.toFixed(2)}×)`}
                                    </span>
                                </div>
                                <div className="space-y-0 divide-y divide-border/40">
                                    {([
                                        { label: 'Width (Side-to-Side)', icon: 'open_in_full', val: physicalDims.width },
                                        { label: 'Height (Thickness)', icon: 'height', val: physicalDims.height },
                                        { label: 'Depth (Front-to-Back)', icon: 'settings_ethernet', val: physicalDims.depth },
                                    ] as { label: string; icon: string; val: number }[]).map(({ label, icon, val }) => (
                                        <div key={label} className="flex justify-between items-center py-2.5">
                                            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                                                <span className="material-icons-round text-xs">{icon}</span>
                                                {label}
                                            </span>
                                            <span className="text-xs font-mono font-bold text-foreground">
                                                {dimsReady ? `${val.toFixed(1)} cm` : '— cm'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-3 pt-2.5 border-t border-border/30 flex justify-between items-center text-[11px] text-muted-foreground">
                                    <span>Model AR Scale (<code className="bg-secondary px-1 rounded text-[10px]">ar_scale</code>):</span>
                                    <span className="font-mono font-bold text-foreground">{currentArScale.toFixed(6)}</span>
                                </div>
                            </div>

                            {/* Calibration Panel (Collapsible) */}
                            <div className="border border-border/50 rounded-xl p-3 bg-background/50 space-y-2">
                                <div className="flex justify-between items-center">
                                    <button
                                        type="button"
                                        onClick={() => setShowCalibration(!showCalibration)}
                                        className="text-xs font-bold text-foreground hover:text-primary flex items-center gap-1.5 transition-colors"
                                    >
                                        <span className="material-icons-round text-xs">
                                            {showCalibration ? 'expand_less' : 'expand_more'}
                                        </span>
                                        Asset Calibration Settings
                                    </button>
                                    <span className="text-[10px] text-muted-foreground font-mono">
                                        Raw GLB: {(rawMaxMeters * 100).toFixed(1)} cm
                                    </span>
                                </div>
                                {showCalibration && (
                                    <div className="pt-2 border-t border-border/40 space-y-3 text-xs">
                                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                                            If your 3D model was authored with non-standard units (e.g., radius instead of diameter, or photogrammetry scans with extra boundary), calibrate the reference conversion factor below:
                                        </p>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setCalibrationFactor(1.0)}
                                                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium border ${
                                                    calibrationFactor === 1.0
                                                        ? 'bg-primary text-primary-foreground border-primary font-bold'
                                                        : 'bg-secondary text-foreground border-border/60'
                                                }`}
                                            >
                                                1.0× (Standard Meter GLB)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setCalibrationFactor(0.5)}
                                                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium border ${
                                                    calibrationFactor === 0.5
                                                        ? 'bg-primary text-primary-foreground border-primary font-bold'
                                                        : 'bg-secondary text-foreground border-border/60'
                                                }`}
                                            >
                                                0.5× (Half-scale Scan)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setCalibrationFactor(2.0)}
                                                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium border ${
                                                    calibrationFactor === 2.0
                                                        ? 'bg-primary text-primary-foreground border-primary font-bold'
                                                        : 'bg-secondary text-foreground border-border/60'
                                                }`}
                                            >
                                                2.0× (Double-scale Scan)
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Live 3D Preview & QR Tester (5 cols) */}
                <div className="lg:col-span-5 space-y-6">
                    {/* Live 3D Viewport Card */}
                    <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-border/40 pb-3">
                            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                                <span className="material-icons-round text-primary text-base">3d_rotation</span>
                                Interactive 3D Viewport
                            </h2>
                            <button
                                type="button"
                                onClick={() => setAutoRotate(!autoRotate)}
                                className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                                    autoRotate
                                        ? 'bg-primary/10 text-primary border-primary/20'
                                        : 'bg-secondary text-muted-foreground border-border'
                                }`}
                            >
                                {autoRotate ? 'Auto-Rotate: ON' : 'Auto-Rotate: OFF'}
                            </button>
                        </div>

                        {/* 3D Model-Viewer Frame */}
                        <div className="w-full h-80 rounded-2xl bg-gradient-to-b from-secondary/40 to-secondary/10 border border-border/70 overflow-hidden relative flex items-center justify-center">
                            {modelViewerLoading && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm z-10 gap-2">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                    <span className="text-xs text-muted-foreground font-medium">Loading 3D asset...</span>
                                </div>
                            )}

                            {modelViewerError ? (
                                <div className="p-6 text-center text-muted-foreground z-10 space-y-2">
                                    <span className="material-icons-round text-4xl text-amber-500">warning</span>
                                    <p className="text-xs font-bold text-foreground">3D Model Failed to Load</p>
                                    <p className="text-[11px] max-w-xs mx-auto">
                                        Verify the GLB URL is accessible, CORS is allowed, and the file exists.
                                    </p>
                                </div>
                            ) : null}

                            {/* Reset View Button */}
                            <button
                                type="button"
                                onClick={() => {
                                    const v = modelViewerRef.current;
                                    if (v) {
                                        v.cameraOrbit = '35deg 55deg auto';
                                        if (typeof v.updateFraming === 'function') v.updateFraming();
                                    }
                                }}
                                className="absolute bottom-3 right-3 z-20 bg-background/80 hover:bg-background backdrop-blur-sm text-foreground text-[11px] px-2.5 py-1 rounded-lg border border-border/60 shadow-sm flex items-center gap-1 transition-all"
                                title="Reset View Framing"
                            >
                                <span className="material-icons-round text-xs">center_focus_strong</span>
                                Reset View
                            </button>

                            {/* @ts-ignore - Custom Web Component */}
                            <model-viewer
                                ref={modelViewerRef}
                                src={glbUrl}
                                alt={dishName || '3D Demo Dish'}
                                camera-controls
                                auto-rotate={autoRotate ? true : undefined}
                                rotation-per-second="25deg"
                                shadow-intensity="1"
                                exposure="1"
                                bounds="tight"
                                camera-orbit="35deg 55deg auto"
                                field-of-view="32deg"
                                camera-target="auto auto auto"
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    backgroundColor: 'transparent'
                                }}
                            />
                        </div>

                        <div className="bg-secondary/40 rounded-xl p-3 border border-border/50 flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Active Model</span>
                            <span className="font-mono font-medium text-foreground truncate max-w-[200px]" title={glbUrl}>
                                {glbUrl.split('/').pop() || 'None'}
                            </span>
                        </div>
                    </div>

                    {/* QR Code & Mobile Testing Card */}
                    <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-border/40 pb-3">
                            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                                <span className="material-icons-round text-primary text-base">qr_code_2</span>
                                Scan to Test on Mobile
                            </h2>
                            <span className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                Live Ready
                            </span>
                        </div>

                        <p className="text-xs text-muted-foreground">
                            Scan with your iOS or Android camera to open the AR Demo directly in the public WebAR viewer.
                        </p>

                        <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-border/60 shadow-inner">
                            <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(publicDemoUrl)}`}
                                alt="Demo QR Code"
                                className="w-44 h-44 object-contain rounded-lg"
                            />
                            <p className="text-[10px] text-gray-500 font-mono mt-2 text-center">
                                Scan with phone camera
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={copyDemoUrl}
                                className="w-full gap-2 text-xs"
                            >
                                <span className="material-icons-round text-sm">content_copy</span>
                                Copy Demo Link
                            </Button>

                            <a
                                href="/menu/khansaab/dish/wood-fired-pizza"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 transition-all text-center"
                            >
                                <span className="material-icons-round text-sm">launch</span>
                                Open Public WebAR Route
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
