'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { useRouter, useParams } from 'next/navigation';
import { supabaseService } from '@/lib/services/supabaseService';

export default function EditDishPage() {
    const router = useRouter();
    const params = useParams();
    const idParam = params.id as string;
    const dishIdParam = params.dishId as string;

    const [isLoading, setIsLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [saveNotice, setSaveNotice] = useState<string | null>(null);

    // Restaurant State
    const [restaurantId, setRestaurantId] = useState<string | null>(null);

    const [arModelFile, setArModelFile] = useState<File | null>(null);
    const [currentArUrl, setCurrentArUrl] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [arUploadWarning, setArUploadWarning] = useState<string | null>(null);

    // Scaling State
    const modelViewerRef = useRef<any>(null);
    const [currentScale, setCurrentScale] = useState<number>(1.0);
    const [baseDim, setBaseDim] = useState({ x: 0, y: 0, z: 0 });
    const [autoScaleFactor, setAutoScaleFactor] = useState<number>(1.0);
    const [initialArScale, setInitialArScale] = useState<number | null>(null);

    useEffect(() => {
        const viewer = modelViewerRef.current;
        if (!viewer) return;

        const handleLoad = () => {
            const dims = viewer.getDimensions();
            setBaseDim({ x: dims.x, y: dims.y, z: dims.z });

            // Auto-Normalization
            const maxDim = Math.max(dims.x, dims.y, dims.z);
            if (maxDim > 0) {
                const calculatedAutoScale = 0.2 / maxDim;
                setAutoScaleFactor(calculatedAutoScale);
                
                // Back-calculate relative UI slider position if dish already has a saved scale
                if (initialArScale) {
                    setCurrentScale(initialArScale / calculatedAutoScale);
                } else {
                    setCurrentScale(1.0);
                }
            }
        };

        viewer.addEventListener('load', handleLoad);
        return () => viewer.removeEventListener('load', handleLoad);
    }, [arModelFile, currentArUrl, initialArScale]);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        price: '',
        category: '',
        description: '',
        availability: 'Available' // Available, Sold Out, Hidden
    });

    const categories = ['Appetizers', 'Main Course', 'Desserts', 'Beverages', 'Sides'];

    // Refs
    const imageInputRef = useRef<HTMLInputElement>(null);
    const arInputRef = useRef<HTMLInputElement>(null);

    // Fetch Data
    useEffect(() => {
        const loadData = async () => {
            setPageLoading(true);
            try {
                // 1. Resolve Restaurant
                // Note: ideally we fetch dish directly, but we need restaurant ID for breadcrumbs/navigation context
                const allRestaurants = await supabaseService.getAllRestaurants();
                const foundRest = allRestaurants.find(r => r.id === idParam || r.slug === idParam);

                if (foundRest) {
                    setRestaurantId(foundRest.id);

                    // Use the application data service so the editor works with
                    // the same Supabase-or-demo fallback used by the public route.
                    const dish = await supabaseService.getDishById(dishIdParam);

                    if (!dish || dish.restaurant_id !== foundRest.id) {
                        setUploadError('Dish not found.');
                    } else {
                        // Populate Form
                        setFormData({
                            name: dish.name,
                            price: dish.price.toString(),
                            category: dish.category,
                            description: dish.description || '',
                            availability: 'Available'
                        });
                        setImagePreview(dish.image_url);
                        setCurrentArUrl(dish.glb_url || null);
                        if (dish.ar_scale) setInitialArScale(dish.ar_scale);
                    }
                } else {
                    setUploadError('Restaurant not found.');
                }
            } catch (error) {
                console.error('Error loading dish:', error);
            } finally {
                setPageLoading(false);
            }
        };

        if (idParam && dishIdParam) loadData();
    }, [idParam, dishIdParam]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validation: Max 1MB
        if (file.size > 1 * 1024 * 1024) {
            setUploadError('Dish image must be less than 1MB');
            e.target.value = ''; // Clear input
            return;
        }

        setUploadError(null);
        setImageFile(file);
        const url = URL.createObjectURL(file);
        setImagePreview(url);
    };

    const handleArModelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validation: Only .glb
        if (!file.name.toLowerCase().endsWith('.glb')) {
            setUploadError('Only .glb files are supported for AR models.');
            e.target.value = ''; // Clear input
            return;
        }

        // Soft warning for large models (> 15MB)
        if (file.size > 15 * 1024 * 1024) {
            setArUploadWarning('Warning: Large models may take longer for customers to load on mobile data.');
        } else {
            setArUploadWarning(null);
        }

        setUploadError(null);
        setArModelFile(file);
        setUploadProgress(0);
        // Fake progress for UX
        const interval = setInterval(() => {
            setUploadProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    return 100;
                }
                return prev + 10;
            });
        }, 200);
    };

    const handleSave = async () => {
        if (!formData.name || !formData.price || !formData.category || !restaurantId) return;
        setIsLoading(true);
        setUploadError(null);
        setSaveNotice(null);

        try {
            // 1. Upload New Image if selected
            let uploadedImageUrl = imagePreview; // Default to existing
            let mediaPersisted = true;
            if (imageFile) {
                const upload = await supabaseService.uploadImageWithStatus('media', imageFile);
                if (upload.url) uploadedImageUrl = upload.url;
                mediaPersisted = upload.persisted;
            }

            // 2. Upload New AR Model (.glb file)
            // Real upload to Supabase storage

            let finalArUrl = currentArUrl;
            if (arModelFile) {
                const upload = await supabaseService.uploadImageWithStatus('media', arModelFile);
                if (upload.url) finalArUrl = upload.url;
                mediaPersisted = mediaPersisted && upload.persisted;
            }

            // 3. Update Dish
            const trueScale = currentScale * autoScaleFactor;
            
            const result = await supabaseService.updateDishWithStatus(dishIdParam, {
                name: formData.name,
                description: formData.description,
                price: parseFloat(formData.price),
                image_url: uploadedImageUrl || undefined,
                category: formData.category,
                glb_url: finalArUrl || undefined,
                ar_scale: trueScale
            });

            if (!result.dish) {
                throw new Error('The dish could not be updated.');
            }

            if (!result.persisted || !mediaPersisted) {
                setSaveNotice(!result.persisted
                    ? 'Saved for this browser session only. Supabase was unavailable, so this demo change will not survive a refresh or appear on the public deployment.'
                    : 'The dish details were saved, but the selected file could not be uploaded. Its preview is available only in this browser session.');
                setIsLoading(false);
                return;
            }

            // Brief delay for UX then redirect
            setTimeout(() => {
                setIsLoading(false);
                router.push(`/admin/restaurants/${idParam}/menu`);
            }, 500);

        } catch (error: any) {
            console.error('Error in handleSave:', error);
            setUploadError(`Update Failed: ${error.message}`);
            setIsLoading(false);
        }
    };

    if (pageLoading) {
        return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
    }

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Breadcrumb & Header */}
            <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <span onClick={() => router.push('/admin/dashboard')} className="hover:text-foreground cursor-pointer">Dashboard</span>
                    <span>/</span>
                    <span onClick={() => router.push(`/admin/restaurants/${idParam}`)} className="hover:text-foreground cursor-pointer">Restaurant</span>
                    <span>/</span>
                    <span onClick={() => router.push(`/admin/restaurants/${idParam}/menu`)} className="hover:text-foreground cursor-pointer">Menu</span>
                    <span>/</span>
                    <span className="font-medium text-foreground">Edit Dish</span>
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Edit Dish</h1>
                <p className="text-muted-foreground mt-1">Update dish details.</p>
            </div>

            {/* Error Message */}
            {uploadError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2 mb-4">
                    <span className="material-icons-round text-red-500">error</span>
                    <span className="text-sm font-medium">{uploadError}</span>
                </div>
            )}

            {saveNotice && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl flex items-center gap-2 mb-4">
                    <span className="material-icons-round text-amber-600">info</span>
                    <span className="text-sm font-medium">{saveNotice}</span>
                </div>
            )}

            {/* Warning Message */}
            {arUploadWarning && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl flex items-center gap-2 mb-4">
                    <span className="material-icons-round text-amber-500">warning</span>
                    <span className="text-sm font-medium">{arUploadWarning}</span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Form Details */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="glass-card p-8 rounded-2xl border border-border/50 space-y-6">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="material-icons-round text-primary">edit_note</span>
                            <h3 className="font-bold text-lg text-foreground">Dish Details</h3>
                        </div>

                        {/* Name */}
                        <div>
                            <label className="block text-sm font-bold text-foreground mb-2">Dish Name <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                placeholder="e.g., Truffle Mushroom Burger"
                                className="w-full bg-secondary/30 border border-input rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                            />
                        </div>

                        {/* Price & Category */}
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-foreground mb-2">Price <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">PKR</span>
                                    <input
                                        type="number"
                                        name="price"
                                        value={formData.price}
                                        onChange={handleInputChange}
                                        placeholder="0.00"
                                        className="w-full bg-secondary/30 border border-input rounded-xl pl-12 pr-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-foreground mb-2">Category <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <select
                                        name="category"
                                        value={formData.category}
                                        onChange={handleInputChange}
                                        className="w-full bg-secondary/30 border border-input rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="" disabled>Select Category</option>
                                        {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                    </select>
                                    <span className="material-icons-round absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">expand_more</span>
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-bold text-foreground mb-2">Description</label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                placeholder="Describe the ingredients..."
                                className="w-full bg-secondary/30 border border-input rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 transition-all min-h-[120px] resize-none"
                            ></textarea>
                            <div className="text-right text-xs text-muted-foreground mt-1">0/300 characters</div>
                        </div>

                        {/* Availability Status (Visual Only for now as per AddPage) */}
                        <div>
                            <label className="block text-sm font-bold text-foreground mb-3">Availability Status</label>
                            <div className="flex items-center gap-4 bg-secondary/30 p-2 rounded-xl border border-input w-fit">
                                {['Available', 'Sold Out', 'Hidden'].map((status) => (
                                    <button
                                        key={status}
                                        onClick={() => setFormData(prev => ({ ...prev, availability: status }))}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${formData.availability === status
                                            ? 'bg-white shadow-sm text-foreground'
                                            : 'text-muted-foreground hover:bg-white/50'
                                            }`}
                                    >
                                        <div className={`w-2 h-2 rounded-full ${status === 'Available' ? 'bg-green-500' : status === 'Sold Out' ? 'bg-orange-500' : 'bg-gray-400'
                                            }`} />
                                        {status}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Media */}
                <div className="space-y-6">

                    {/* Dish Image */}
                    <div className="glass-card p-6 rounded-2xl border border-border/50">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                                <span className="material-icons-round text-primary">image</span>
                                Dish Image
                            </h3>
                            <span className="text-[10px] uppercase font-bold bg-secondary text-muted-foreground px-2 py-0.5 rounded">Required</span>
                        </div>

                        <input
                            type="file"
                            ref={imageInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleImageChange}
                        />

                        <div
                            className={`border-2 border-dashed ${imagePreview ? 'border-primary p-0' : 'border-border p-8'} rounded-xl flex flex-col items-center justify-center text-center cursor-pointer hover:bg-secondary/30 transition-all h-64 relative overflow-hidden group`}
                            onClick={() => imageInputRef.current?.click()}
                        >
                            {imagePreview ? (
                                <div className="relative w-full h-full">
                                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-white font-bold text-sm flex items-center gap-2">
                                            <span className="material-icons-round">edit</span> Change Image
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4 text-blue-500 group-hover:scale-110 transition-transform">
                                        <span className="material-icons-round text-3xl">add_photo_alternate</span>
                                    </div>
                                    <h4 className="font-bold text-foreground">Click to upload</h4>
                                    <p className="text-sm text-muted-foreground mt-1">SVG, PNG, JPG or GIF (max. 1MB)</p>
                                </>
                            )}
                        </div>
                    </div>

                    {/* 3D AR Model */}
                    <div className="glass-card p-6 rounded-2xl border border-border/50">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                                <span className="material-icons-round text-primary">view_in_ar</span>
                                3D AR Model
                            </h3>
                            <span className="text-[10px] uppercase font-bold bg-secondary text-muted-foreground px-2 py-0.5 rounded">Optional</span>
                        </div>

                        <input
                            type="file"
                            ref={arInputRef}
                            className="hidden"
                            accept=".glb,.usdz"
                            onChange={handleArModelChange}
                        />

                        {(!arModelFile && !currentArUrl) ? (
                            <div
                                className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-secondary/30 transition-all"
                                onClick={() => arInputRef.current?.click()}
                            >
                                <span className="material-icons-round text-3xl text-muted-foreground mb-2">cloud_upload</span>
                                <span className="text-sm font-medium text-foreground">Upload .GLB or .USDZ</span>
                            </div>
                        ) : (
                            <div className="bg-secondary/30 border border-border rounded-xl p-4">
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                                            <span className="material-icons-round">deployed_code</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-foreground truncate max-w-[150px]">{arModelFile ? arModelFile.name : 'Current Model'}</p>
                                            {arModelFile && <p className="text-xs text-muted-foreground">{(arModelFile.size / 1024 / 1024).toFixed(2)} MB</p>}
                                        </div>
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); setArModelFile(null); setCurrentArUrl(null); }} className="text-muted-foreground hover:text-red-500">
                                        <span className="material-icons-round text-sm">close</span>
                                    </button>
                                </div>

                                {uploadProgress < 100 && arModelFile ? (
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs font-medium">
                                            <span className="text-blue-600">Uploading...</span>
                                            <span className="text-blue-600">{uploadProgress}%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-blue-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-blue-500 rounded-full transition-all duration-200" style={{ width: `${uploadProgress}%` }}></div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1 text-xs font-medium text-green-600 mt-2">
                                        <span className="material-icons-round text-sm">check_circle</span>
                                        {arModelFile || currentArUrl ? 'Model Ready' : 'Upload Complete'}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Size & Scaling Tool - Moved OUTSIDE the right column so it spans horizontally */}
            {(arModelFile || currentArUrl) && (
                <div className="glass-card p-6 rounded-2xl border border-border/50 w-full mb-8">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-xl text-foreground flex items-center gap-2">
                            <span className="material-icons-round text-primary">straighten</span>
                            AR Live Dimension Scaling
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full items-start">
                        {/* Left Column: 3D Preview */}
                        <div className="w-full min-h-[400px] lg:min-h-[500px] bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden relative flex items-center justify-center">
                            {/* @ts-ignore */}
                            <model-viewer
                                ref={modelViewerRef}
                                src={arModelFile ? URL.createObjectURL(arModelFile) : (currentArUrl || '')}
                                bounds="tight"
                                disable-zoom
                                camera-controls
                                auto-rotate
                                className="w-full h-full absolute inset-0"
                                style={{ 
                                    width: '100%', 
                                    height: '100%',
                                    transform: `scale(${currentScale * 0.75})`,
                                    transformOrigin: 'center',
                                    transition: 'transform 0.1s ease-out'
                                }}
                            />
                        </div>

                        {/* Right Column: Controls */}
                        <div className="w-full flex flex-col gap-6">
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-sm font-bold text-slate-900">Scale Factor</label>
                                    <span className="text-sm font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-900">{currentScale.toFixed(2)}x</span>
                                </div>
                                <input
                                    type="range"
                                    min="0.1"
                                    max="3.0"
                                    step="0.05"
                                    value={currentScale}
                                    onChange={(e) => setCurrentScale(parseFloat(e.target.value))}
                                    className="w-full accent-slate-900"
                                />
                                <p className="text-xs text-slate-500 mt-2">
                                    Measure your physical dish. Drag the slider until one of these numbers matches your real-world measurement.
                                </p>
                            </div>

                            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                                <h4 className="text-sm font-bold text-slate-900 mb-4 text-center">Estimated Real-World Size</h4>
                                <div className="flex flex-col">
                                    <div className="flex justify-between items-center py-3 border-b border-slate-100 last:border-0">
                                        <span className="text-slate-500 flex items-center gap-2">
                                            <span className="material-icons-round text-xs">open_in_full</span> Width (Side to Side)
                                        </span>
                                        <span className="whitespace-nowrap font-medium text-slate-900">{(baseDim.x * currentScale * autoScaleFactor * 100).toFixed(1)} cm</span>
                                    </div>
                                    <div className="flex justify-between items-center py-3 border-b border-slate-100 last:border-0">
                                        <span className="text-slate-500 flex items-center gap-2">
                                            <span className="material-icons-round text-xs">height</span> Height (Bottom to Top)
                                        </span>
                                        <span className="whitespace-nowrap font-medium text-slate-900">{(baseDim.y * currentScale * autoScaleFactor * 100).toFixed(1)} cm</span>
                                    </div>
                                    <div className="flex justify-between items-center py-3 border-b border-slate-100 last:border-0">
                                        <span className="text-slate-500 flex items-center gap-2">
                                            <span className="material-icons-round text-xs">settings_ethernet</span> Length (Front to Back)
                                        </span>
                                        <span className="whitespace-nowrap font-medium text-slate-900">{(baseDim.z * currentScale * autoScaleFactor * 100).toFixed(1)} cm</span>
                                    </div>
                                </div>
                            </div>

                            <Button 
                                className="w-full py-3 rounded-lg bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors" 
                                onClick={handleSave}
                            >
                                <span className="material-icons-round text-sm mr-2">save</span>
                                Save Scale
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Footer Actions */}
            <div className="flex justify-end gap-4 pt-4 border-t border-border">
                <Button variant="outline" className="min-w-[120px]" onClick={() => router.back()}>
                    Cancel
                </Button>
                <Button
                    className="shadow-lg shadow-primary/25 min-w-[140px]"
                    onClick={handleSave}
                    disabled={isLoading || !formData.name || !restaurantId}
                >
                    {isLoading ? (
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Saving...
                        </div>
                    ) : (
                        'Save Changes'
                    )}
                </Button>
            </div>
        </div>
    );
}
