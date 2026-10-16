'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { useParams, useRouter } from 'next/navigation';
import { supabaseService } from '@/lib/services/supabaseService';
import { Restaurant, Dish } from '@/lib/types';
import { UnifiedMobileSimulator } from '@/components/mobile-menu/UnifiedMobileSimulator';
import { computeActiveTheme } from '@/lib/utils/themeManager';
import { QRCodeCanvas } from 'qrcode.react';

export default function TenantSettingsPage() {
    const router = useRouter();
    const params = useParams();
    const idParam = params.id as string;

    const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
    const [dishes, setDishes] = useState<Dish[]>([]);

    // Real UUID state
    const [realRestaurantId, setRealRestaurantId] = useState<string>('');


    // Branding State (ThemeConfig) - Local Overrides Form
    const [themeConfig, setThemeConfig] = useState({
        primaryColor: '',
        secondaryColor: '',
        backgroundColor: '',
        surfaceColor: '',
        headingFont: '',
        bodyFont: '',
        textColor: ''
    });

    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [bannerPreview, setBannerPreview] = useState<string | null>(null);
    const [qrPreview, setQrPreview] = useState<string | null>(null);

    // File State
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [bannerFile, setBannerFile] = useState<File | null>(null);
    const [qrFile, setQrFile] = useState<File | null>(null);

    // UI State
    const [isSaving, setIsSaving] = useState(false);
    const [showARModal, setShowARModal] = useState(false);

    const fonts = {
        headings: ['Playfair Display', 'Merriweather', 'Outfit', 'Inter'],
        body: ['Inter', 'Roboto', 'Open Sans', 'Lato']
    };

    useEffect(() => {
        const loadData = async () => {
            try {
                // 1. Fetch Restaurant with Theme Data
                const found = await supabaseService.getRestaurantWithTheme(idParam);

                if (found) {
                    setRestaurant(found);
                    setRealRestaurantId(found.id);
                    setLogoPreview(found.logo_url || null);
                    if (found.banner_url) setBannerPreview(found.banner_url);
                    if (found.custom_qr_url) setQrPreview(found.custom_qr_url);

                    // 2. Set Form State from Local Settings (or Defaults)
                    const currentSettings = found.theme_settings || {};

                    // We merge with DEFAULT_THEME to ensure every field has a valid value for the inputs
                    // This effectively "fills in" any missing overrides with the system default
                    const activeTheme = computeActiveTheme(currentSettings);

                    setThemeConfig({
                        primaryColor: activeTheme.primaryColor || '#001f3f',
                        secondaryColor: activeTheme.secondaryColor || '#000000',
                        backgroundColor: activeTheme.backgroundColor || '#F8F9FA',
                        surfaceColor: activeTheme.surfaceColor || '#FFFFFF',
                        headingFont: activeTheme.headingFont || 'Inter',
                        bodyFont: activeTheme.bodyFont || 'Inter',
                        textColor: activeTheme.textColor || '#000000'
                    });
                }


                // 3. Load Dishes using Real ID (if found)
                if (found) {
                    const restaurantDishes = await supabaseService.getRestaurantDishes(found.id);
                    setDishes(restaurantDishes);
                }
            } catch (error) {
                console.error("Failed to load settings data", error);
            }
        };

        loadData();
    }, [idParam]);

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setLogoPreview(URL.createObjectURL(file));
            setLogoFile(file);
        }
    };

    const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setBannerPreview(URL.createObjectURL(file));
            setBannerFile(file);
        }
    };

    const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setQrPreview(URL.createObjectURL(file));
            setQrFile(file);
        }
    };

    const handleDownloadQR = () => {
        const canvas = document.getElementById('restaurant-qr-code') as HTMLCanvasElement;
        if (!canvas) {
            alert('QR code not found.');
            return;
        }

        try {
            const pngUrl = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
            const link = document.createElement('a');
            link.href = pngUrl;
            link.download = `${restaurant?.name || 'restaurant'}-QR-Code.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Download failed:', error);
            alert('Failed to download QR code. Try right-clicking the image and "Save Image As".');
        }
    };

    const handleSaveChanges = async () => {
        if (!realRestaurantId || !restaurant) {
            console.error('Missing restaurant ID or data', { realRestaurantId, restaurant });
            alert('Error: Restaurant data not fully loaded. Please refresh.');
            return;
        }

        setIsSaving(true);
        try {
            // 1. Upload Images if changed
            let logoUrl = restaurant.logo_url;
            let bannerUrl = restaurant.banner_url;

            if (logoFile) {
                const uploadedLogo = await supabaseService.uploadImage('media', logoFile);
                if (uploadedLogo) logoUrl = uploadedLogo;
            }

            if (bannerFile) {
                const uploadedBanner = await supabaseService.uploadImage('media', bannerFile);
                if (uploadedBanner) bannerUrl = uploadedBanner;
            }

            let customQrUrl = restaurant.custom_qr_url;
            if (qrFile) {
                const uploadedQr = await supabaseService.uploadImage('media', qrFile);
                if (uploadedQr) customQrUrl = uploadedQr;
            }

            // 2. & 3. Update Restaurant Theme & Branding in ONE call
            // This prevents the stale 'restaurant' state from overwriting the just-updated theme settings

            // Ensure we strictly pass strings and avoid undefined
            const overrides: Record<string, any> = {
                primaryColor: themeConfig.primaryColor || '#001f3f',
                secondaryColor: themeConfig.secondaryColor || '#000000',
                backgroundColor: themeConfig.backgroundColor || '#F8F9FA',
                surfaceColor: themeConfig.surfaceColor || '#FFFFFF',
                headingFont: themeConfig.headingFont || 'Inter',
                bodyFont: themeConfig.bodyFont || 'Inter',
                textColor: themeConfig.textColor || '#000000'
            };

            await supabaseService.updateRestaurant({
                ...restaurant,
                logo_url: logoUrl,
                banner_url: bannerUrl,
                custom_qr_url: customQrUrl,
                theme_settings: overrides // Explicitly pass the NEW overrides here
            });

            // Update local state to reflect saved URLs
            setRestaurant(prev => prev ? ({ ...prev, logo_url: logoUrl, banner_url: bannerUrl, custom_qr_url: customQrUrl }) : null);

            alert('Changes saved successfully!');
            router.refresh();
        } catch (error: any) {
            console.error('Failed to save settings:', error);
            alert(`Failed to save changes: ${error.message || 'Unknown error'}`);
        } finally {
            setIsSaving(false);
        }
    };

    // Construct Preview Props (Matches ThemeConfig)
    // Dynamic Merge: Local Form Values + Defaults
    const previewPreset = computeActiveTheme(themeConfig);

    const categories = Array.from(new Set(dishes.map(d => d.category || 'Other')));
    const fullCategories = categories.length > 0 ? categories : ['All'];

    // Construct preview restaurant object (using local state for instant image updates)
    const previewRestaurant = {
        ...restaurant,
        name: restaurant?.name || 'Restaurant',
        logo_url: logoPreview, // Use preview URL which updates reliably on file selection
        banner_url: bannerPreview,
        // Ensure other required fields fallback correctly
    } as any; // Type casting for convenience, or strictly match interface

    return (
        <div className="p-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex justify-between items-center mb-10">
                <div>
                    <span onClick={() => router.push('/admin/dashboard')} className="hover:text-foreground cursor-pointer">Dashboard</span>
                    <span>/</span>
                    <span onClick={() => router.push('/admin/restaurants')} className="hover:text-foreground cursor-pointer">Restaurants</span>
                    <span>/</span>
                    <span onClick={() => router.push(`/admin/restaurants/${idParam}`)} className="hover:text-foreground cursor-pointer">{restaurant?.name || 'Loading...'}</span>
                    <span>/</span>
                    <span className="text-foreground font-medium">Menu Settings</span>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Menu Settings</h1>
                </div>
                <Button
                    className="bg-[#001f3f] text-white min-w-[140px]"
                    onClick={handleSaveChanges}
                    disabled={isSaving}
                >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Left Column: Settings Form */}
                <div className="lg:col-span-2 space-y-10">

                    {/* Visual Identity Section */}
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-xl font-bold text-foreground">Visual Identity</h2>
                            <p className="text-muted-foreground">Manage your restaurant&apos;s logo and banner image displayed in the AR menu.</p>
                        </div>

                        {/* Logo Upload */}
                        <div className="glass-card p-6 rounded-2xl border border-border/50">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                                <div>
                                    <label className="block text-sm font-bold text-foreground mb-2">Restaurant Logo</label>
                                    <div className="bg-secondary/30 rounded-xl p-4 flex flex-col items-center justify-center text-center h-40 border border-border/50">
                                        <div className="w-20 h-20 rounded-full bg-white shadow-sm flex items-center justify-center overflow-hidden mb-2">
                                            {logoPreview ? (
                                                <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-2xl font-bold text-muted-foreground">{restaurant?.name?.charAt(0) || 'L'}</span>
                                            )}
                                        </div>
                                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Current</span>
                                    </div>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-foreground mb-2">Upload New</label>
                                    <label className="border-2 border-dashed border-border rounded-xl p-4 flex flex-col items-center justify-center text-center h-40 cursor-pointer hover:bg-secondary/30 transition-all group">
                                        <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                                        <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                            <span className="material-icons-round text-blue-500">cloud_upload</span>
                                        </div>
                                        <span className="text-sm font-medium text-foreground">Click to upload or drag and drop</span>
                                        <span className="text-xs text-muted-foreground mt-1">SVG, PNG, JPG or GIF (max. 2MB)</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Banner Upload */}
                        <div className="glass-card p-6 rounded-2xl border border-border/50">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                                <div>
                                    <label className="block text-sm font-bold text-foreground mb-2">Banner Image</label>
                                    <div className="bg-secondary/30 rounded-xl p-2 flex flex-col items-center justify-center text-center h-32 border border-border/50 relative overflow-hidden">
                                        {bannerPreview ? (
                                            <img src={bannerPreview} alt="Banner" className="w-full h-full object-cover rounded-lg" />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg"></div>
                                        )}
                                    </div>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-foreground mb-2">Upload New</label>
                                    <label className="border-2 border-dashed border-border rounded-xl p-4 flex flex-col items-center justify-center text-center h-32 cursor-pointer hover:bg-secondary/30 transition-all group">
                                        <input type="file" className="hidden" accept="image/*" onChange={handleBannerUpload} />
                                        <span className="material-icons-round text-2xl text-muted-foreground mb-2 group-hover:text-primary transition-colors">image</span>
                                        <span className="text-sm font-medium text-foreground">Click to upload or drag and drop</span>
                                        <span className="text-xs text-muted-foreground mt-1">Recommended size 1200x600px</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Typography Section (Added) */}
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-xl font-bold text-foreground">Typography</h2>
                            <p className="text-muted-foreground">Select fonts for headings and body text.</p>
                        </div>
                        <div className="glass-card p-8 rounded-2xl border border-border/50 grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <label className="block text-sm font-bold text-foreground mb-3">Headings Font</label>
                                <select
                                    value={themeConfig.headingFont}
                                    onChange={(e) => setThemeConfig({ ...themeConfig, headingFont: e.target.value })}
                                    className="w-full bg-secondary/30 border border-input rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 appearance-none font-medium"
                                >
                                    {fonts.headings.map(font => (
                                        <option key={font} value={font} style={{ fontFamily: font }}>{font}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-foreground mb-3">Body Font</label>
                                <select
                                    value={themeConfig.bodyFont}
                                    onChange={(e) => setThemeConfig({ ...themeConfig, bodyFont: e.target.value })}
                                    className="w-full bg-secondary/30 border border-input rounded-xl bg-no-repeat bg-[right_1rem_center] px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 appearance-none font-medium"
                                >
                                    {fonts.body.map(font => (
                                        <option key={font} value={font} style={{ fontFamily: font }}>{font}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Color Palette (Expanded) */}
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-xl font-bold text-foreground">Color Palette</h2>
                            <p className="text-muted-foreground">Customize the full color scheme of your AR menu interface.</p>
                        </div>

                        <div className="glass-card p-8 rounded-2xl border border-border/50 grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Primary Color */}
                            <div className="col-span-full md:col-span-1">
                                <label className="block text-sm font-bold text-foreground mb-3">Primary Color (Buttons/Actions)</label>
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl shadow-lg border border-white/20 flex-shrink-0" style={{ backgroundColor: themeConfig.primaryColor }} />
                                    <input
                                        type="text"
                                        value={themeConfig.primaryColor}
                                        onChange={(e) => setThemeConfig({ ...themeConfig, primaryColor: e.target.value })}
                                        className="flex-1 min-w-0 bg-secondary/30 border border-input rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 font-mono text-sm uppercase"
                                    />
                                    <input
                                        type="color"
                                        value={themeConfig.primaryColor}
                                        onChange={(e) => setThemeConfig({ ...themeConfig, primaryColor: e.target.value })}
                                        className="w-12 h-12 p-1 bg-white border border-input rounded-xl cursor-pointer flex-shrink-0"
                                    />
                                </div>
                            </div>

                            {/* Secondary Color */}
                            <div className="col-span-full md:col-span-1">
                                <label className="block text-sm font-bold text-foreground mb-3">Secondary Color (Accents)</label>
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl shadow-lg border border-white/20 flex-shrink-0" style={{ backgroundColor: themeConfig.secondaryColor }} />
                                    <input
                                        type="text"
                                        value={themeConfig.secondaryColor}
                                        onChange={(e) => setThemeConfig({ ...themeConfig, secondaryColor: e.target.value })}
                                        className="flex-1 min-w-0 bg-secondary/30 border border-input rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 font-mono text-sm uppercase"
                                    />
                                    <input
                                        type="color"
                                        value={themeConfig.secondaryColor}
                                        onChange={(e) => setThemeConfig({ ...themeConfig, secondaryColor: e.target.value })}
                                        className="w-12 h-12 p-1 bg-white border border-input rounded-xl cursor-pointer flex-shrink-0"
                                    />
                                </div>
                            </div>

                            {/* Background Color */}
                            <div className="col-span-full md:col-span-1">
                                <label className="block text-sm font-bold text-foreground mb-3">Background Color</label>
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl shadow-lg border border-white/20 flex-shrink-0" style={{ backgroundColor: themeConfig.backgroundColor }} />
                                    <input
                                        type="text"
                                        value={themeConfig.backgroundColor}
                                        onChange={(e) => setThemeConfig({ ...themeConfig, backgroundColor: e.target.value })}
                                        className="flex-1 min-w-0 bg-secondary/30 border border-input rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 font-mono text-sm uppercase"
                                    />
                                    <input
                                        type="color"
                                        value={themeConfig.backgroundColor}
                                        onChange={(e) => setThemeConfig({ ...themeConfig, backgroundColor: e.target.value })}
                                        className="w-12 h-12 p-1 bg-white border border-input rounded-xl cursor-pointer flex-shrink-0"
                                    />
                                </div>
                            </div>

                            {/* Surface Color */}
                            <div className="col-span-full md:col-span-1">
                                <label className="block text-sm font-bold text-foreground mb-3">Surface Color (Cards)</label>
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl shadow-lg border border-white/20 flex-shrink-0" style={{ backgroundColor: themeConfig.surfaceColor }} />
                                    <input
                                        type="text"
                                        value={themeConfig.surfaceColor}
                                        onChange={(e) => setThemeConfig({ ...themeConfig, surfaceColor: e.target.value })}
                                        className="flex-1 min-w-0 bg-secondary/30 border border-input rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 font-mono text-sm uppercase"
                                    />
                                    <input
                                        type="color"
                                        value={themeConfig.surfaceColor}
                                        onChange={(e) => setThemeConfig({ ...themeConfig, surfaceColor: e.target.value })}
                                        className="w-12 h-12 p-1 bg-white border border-input rounded-xl cursor-pointer flex-shrink-0"
                                    />
                                </div>
                            </div>

                            {/* Text Color */}
                            <div className="col-span-full md:col-span-1">
                                <label className="block text-sm font-bold text-foreground mb-3">Text Color</label>
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl shadow-lg border border-white/20 flex-shrink-0" style={{ backgroundColor: themeConfig.textColor }} />
                                    <input
                                        type="text"
                                        value={themeConfig.textColor}
                                        onChange={(e) => setThemeConfig({ ...themeConfig, textColor: e.target.value })}
                                        className="flex-1 min-w-0 bg-secondary/30 border border-input rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 font-mono text-sm uppercase"
                                    />
                                    <input
                                        type="color"
                                        value={themeConfig.textColor}
                                        onChange={(e) => setThemeConfig({ ...themeConfig, textColor: e.target.value })}
                                        className="w-12 h-12 p-1 bg-white border border-input rounded-xl cursor-pointer flex-shrink-0"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Right Column: Preview & Distribution */}
                <div className="space-y-8">
                    <div>
                        <h2 className="text-xl font-bold text-foreground mb-4">Preview & Distribution</h2>

                        {/* Mobile Preview - Unified Master Simulator */}
                        {/* Matches create-preset preview logic */}
                        <div className="flex justify-center w-full">
                            <UnifiedMobileSimulator
                                mode="live"
                                className="transform hover:scale-[1.02] transition-transform duration-300"
                                data={{
                                    restaurant: previewRestaurant,
                                    dishes: dishes
                                }}
                                theme={previewPreset} /* Now passing full ThemeConfig */
                            />
                        </div>

                    </div>
                    {/* Distribution Card */}
                    <div className="bg-white rounded-3xl p-8 shadow-sm border border-border/50 text-center">
                        <div className="bg-white border border-gray-100 rounded-2xl w-48 h-48 mx-auto mb-6 flex items-center justify-center shadow-inner overflow-hidden">
                            {typeof window !== 'undefined' && restaurant ? (
                                <QRCodeCanvas
                                    id="restaurant-qr-code"
                                    value={`${window.location.origin}/menu/${restaurant.slug || restaurant.id}`}
                                    size={512}
                                    fgColor="#000000"
                                    bgColor="#FFFFFF"
                                    style={{ width: '100%', height: 'auto', maxWidth: '192px' }}
                                />
                            ) : (
                                <span className="material-icons-round text-8xl text-[#001f3f]">qr_code_2</span>
                            )}
                        </div>

                        <h3 className="text-lg font-bold text-gray-900 mb-2">Scan to View Menu</h3>
                        <p className="text-sm text-gray-500 mb-8 max-w-[280px] mx-auto leading-relaxed">
                            Point your camera at the QR code to open the menu on your device.
                        </p>
                        <Button
                            className="w-full bg-[#001f3f] hover:bg-[#001f3f]/90 text-white rounded-xl py-6 text-base font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-900/10 transition-all mb-4"
                            onClick={handleDownloadQR}
                        >
                            <span className="material-icons-round">download</span>
                            Download High-Quality QR
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
