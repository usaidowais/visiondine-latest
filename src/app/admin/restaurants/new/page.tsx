'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { supabaseService, supabase } from '@/lib/services/supabaseService';

export default function NewRestaurantPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [bannerPreview, setBannerPreview] = useState<string | null>(null);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [bannerFile, setBannerFile] = useState<File | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        contact: '',
        location: ''
    });

    // Refs for file inputs
    const logoInputRef = useRef<HTMLInputElement>(null);
    const bannerInputRef = useRef<HTMLInputElement>(null);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'banner') => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validation
        const maxSize = type === 'logo' ? 1 * 1024 * 1024 : 2 * 1024 * 1024; // 1MB for logo, 2MB for banner
        if (file.size > maxSize) {
            setUploadError(`${type === 'logo' ? 'Logo' : 'Banner'} must be less than ${type === 'logo' ? '1MB' : '2MB'}`);
            // Clear input
            e.target.value = '';
            return;
        }

        setUploadError(null);
        const url = URL.createObjectURL(file);

        if (type === 'logo') {
            setLogoFile(file);
            setLogoPreview(url);
        } else {
            setBannerFile(file);
            setBannerPreview(url);
        }
    };

    const handleCreateAccount = async () => {
        if (!formData.name) return; // Basic validation

        setIsLoading(true);
        setUploadError(null);

        try {
            // 1. Upload Images if they exist
            let logoUrl = null;
            let bannerUrl = null;

            if (logoFile) {
                logoUrl = await supabaseService.uploadImage('media', logoFile);
            }
            if (bannerFile) {
                bannerUrl = await supabaseService.uploadImage('media', bannerFile);
            }

            // 2. Generate Slug
            const slug = formData.name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
                .replace(/(^-|-$)+/g, '') // Remove distinct leading/trailing hyphens
                + '-' + Math.floor(Math.random() * 1000); // Add random suffix to ensure uniqueness

            // 3. Verify authenticated administrator before database mutation
            const { data: { session } } = await supabase.auth.getSession();
            let user = session?.user ?? null;
            if (!user) {
                const { data: userData } = await supabase.auth.getUser();
                user = userData?.user ?? null;
            }

            if (!user) {
                setUploadError('Active administrator authentication required. Please sign in to create a restaurant.');
                setIsLoading(false);
                return;
            }

            const newRestaurant = await supabaseService.createRestaurant({
                name: formData.name,
                slug: slug,
                status: 'active',
                owner_id: user.id,
                contact_number: formData.contact,
                logo_url: logoUrl || undefined,
                banner_url: bannerUrl || undefined
            });

            if (newRestaurant) {
                router.push('/admin/restaurants');
            } else {
                setUploadError('Failed to create restaurant in database. Please verify your connection to Supabase and try again.');
            }

        } catch (error: any) {
            console.error('Failed to create restaurant', error);
            setUploadError(error.message || JSON.stringify(error) || 'An unexpected error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">

            {/* Header */}
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-foreground">Add New Restaurant</h2>
                <p className="text-muted-foreground mt-1">Configure basic details to initialize a new tenant workspace.</p>
            </div>

            <div className="space-y-6">

                {/* Error Message */}
                {uploadError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
                        <span className="material-icons-round text-red-500">error</span>
                        <span className="text-sm font-medium">{uploadError}</span>
                    </div>
                )}

                {/* Restaurant Name */}
                <div className="glass-card p-8 rounded-2xl border border-border/50">
                    <h3 className="font-bold text-lg text-foreground mb-4">Restaurant Name</h3>
                    <p className="text-sm text-muted-foreground mb-4">Enter the official name of the restaurant as it should appear in the menu.</p>
                    <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="e.g. The Coastal Catch"
                        className="w-full bg-secondary/30 border border-input rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                    />
                </div>

                {/* Visual Identity */}
                <div className="glass-card p-8 rounded-2xl border border-border/50">
                    <h3 className="font-bold text-lg text-foreground mb-6">Visual Identity</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Logo Upload */}
                        <div>
                            <label className="block text-sm font-bold text-foreground mb-2">Brand Logo</label>
                            <input
                                type="file"
                                ref={logoInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={(e) => handleFileChange(e, 'logo')}
                            />
                            <div
                                className={`border-2 border-dashed ${logoPreview ? 'border-primary' : 'border-border'} rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-secondary/30 transition-colors h-48 relative overflow-hidden group`}
                                onClick={() => logoInputRef.current?.click()}
                            >
                                {logoPreview ? (
                                    <img src={logoPreview} alt="Logo Preview" className="w-full h-full object-contain" />
                                ) : (
                                    <>
                                        <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-3 group-hover:bg-primary/10 transition-colors">
                                            <span className="material-icons-round text-muted-foreground group-hover:text-primary">cloud_upload</span>
                                        </div>
                                        <span className="font-bold text-foreground text-sm">Upload Logo</span>
                                        <span className="text-xs text-muted-foreground mt-1">1:1 Ratio, Max 1MB</span>
                                    </>
                                )}
                                {logoPreview && (
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-white font-bold text-sm">Change Logo</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Banner Upload */}
                        <div>
                            <label className="block text-sm font-bold text-foreground mb-2">Background Banner</label>
                            <input
                                type="file"
                                ref={bannerInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={(e) => handleFileChange(e, 'banner')}
                            />
                            <div
                                className={`border-2 border-dashed ${bannerPreview ? 'border-primary' : 'border-border'} rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-secondary/30 transition-colors h-48 relative overflow-hidden group`}
                                onClick={() => bannerInputRef.current?.click()}
                            >
                                {bannerPreview ? (
                                    <img src={bannerPreview} alt="Banner Preview" className="w-full h-full object-cover rounded-lg" />
                                ) : (
                                    <>
                                        <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-3 group-hover:bg-primary/10 transition-colors">
                                            <span className="material-icons-round text-muted-foreground group-hover:text-primary">image</span>
                                        </div>
                                        <span className="font-bold text-foreground text-sm">Upload Banner</span>
                                        <span className="text-xs text-muted-foreground mt-1">Landscape, Max 2MB</span>
                                    </>
                                )}
                                {bannerPreview && (
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-white font-bold text-sm">Change Banner</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Admin & Location */}
                <div className="glass-card p-8 rounded-2xl border border-border/50">
                    <h3 className="font-bold text-lg text-foreground mb-6">Contact & Location</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <label className="block text-sm font-bold text-foreground mb-2">Owner Email</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                placeholder="owner@example.com"
                                className="w-full bg-secondary/30 border border-input rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-foreground mb-2">Contact Number</label>
                            <input
                                type="tel"
                                name="contact"
                                value={formData.contact}
                                onChange={handleInputChange}
                                placeholder="+1 (555) 000-0000"
                                className="w-full bg-secondary/30 border border-input rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-foreground mb-2">Location</label>
                        <div className="relative">
                            <span className="material-icons-round absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">place</span>
                            <input
                                type="text"
                                name="location"
                                value={formData.location}
                                onChange={handleInputChange}
                                placeholder="Search for a location"
                                className="w-full bg-secondary/30 border border-input rounded-xl pl-12 pr-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                            />
                        </div>
                    </div>
                </div>

            </div>

            {/* Footer Actions */}
            <div className="flex justify-end gap-3 pt-4">
                <Button variant="ghost" onClick={() => router.back()} disabled={isLoading}>Cancel</Button>
                <Button
                    className="shadow-lg shadow-primary/25 min-w-[140px]"
                    onClick={handleCreateAccount}
                    disabled={isLoading || !formData.name}
                >
                    {isLoading ? (
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Creating...
                        </div>
                    ) : (
                        'Create Account'
                    )}
                </Button>
            </div>
        </div>
    );
}
