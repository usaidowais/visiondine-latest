'use client';

import React, { useState, useEffect } from 'react';
import { Restaurant, Dish, UIPreset } from '@/lib/types';
import { supabaseService } from '@/lib/services/supabaseService';
import { ARModelViewer } from '@/components/ARModelViewer';
import { ARExperience } from '@/components/ar/ARExperience';
import { useParams, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { computeActiveTheme } from '@/lib/utils/themeManager';
import { MobileMenuRenderer } from '@/components/mobile-menu/MobileMenuRenderer';

export default function PublicMenuPage() {
    const params = useParams();
    const slug = typeof params.slug === 'string' ? params.slug : '';

    const [activeTab, setActiveTab] = useState('Desi');
    const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
    const [arDish, setArDish] = useState<Dish | null>(null); // New state for AR Experience
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<{ restaurant: Restaurant, dishes: Dish[], preset: UIPreset } | null>(null);

    const searchParams = useSearchParams();
    const dishParam = searchParams.get('dish');

    useEffect(() => {
        // Auto-launch AR view if a dish query param is present
        if (data && dishParam && !arDish) {
            const targetDish = data.dishes.find(d => d.id === dishParam);
            if (targetDish) {
                setArDish(targetDish);
            }
        }
    }, [data, dishParam]);
    useEffect(() => {
        if (slug) {
            supabaseService.getMenuBySlug(slug).then(res => {
                setData(res);
                setLoading(false);
            }).catch(() => setLoading(false));
        }
    }, [slug]);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center text-primary bg-background">
                <span className="material-icons-round animate-spin text-4xl">sync</span>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="flex h-screen flex-col items-center justify-center bg-background text-foreground">
                <span className="material-icons-round text-6xl text-muted-foreground mb-4 opacity-50">search_off</span>
                <h2 className="text-2xl font-bold mb-2">Menu Not Found</h2>
                <p className="text-muted-foreground">This restaurant menu doesn't exist or is currently unavailable.</p>
            </div>
        );
    }

    // Use theme settings purely to compute active theme
    const { restaurant, dishes } = data;
    const effectivePreset = computeActiveTheme(restaurant.theme_settings);

    const bodyFont = effectivePreset.bodyFont || 'Inter';
    const headingFont = effectivePreset.headingFont || 'Inter';
    // Apply surface color from preset if active, otherwise keep light theme
    const surfaceColor = effectivePreset.surfaceColor || 'var(--background)';

    return (
        <div
            className="min-h-screen bg-secondary/30 font-sans pb-24 md:pb-0"
            style={{
                fontFamily: bodyFont,
                backgroundColor: effectivePreset.backgroundColor || '#F8F9FA'
            }}
        >
            {/* --- NEW HEADER LAYOUT (Left-Aligned Match) --- */}
            {/* Matches Settings Preview Layout exactly */}
            <div className="relative w-full aspect-[3/1] bg-slate-100 overflow-hidden shadow-sm">
                {restaurant.banner_url ? (
                    <img src={restaurant.banner_url} alt="Banner" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-slate-800 flex items-center justify-center text-white/10">
                        <span className="material-icons-round text-6xl">store</span>
                    </div>
                )}

                {/* Logo & Info Overlay (Left Aligned) */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-4 pb-4">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-full border-2 border-white bg-white shadow-xl overflow-hidden flex items-center justify-center shrink-0"
                        >
                            {restaurant.logo_url ? (
                                <img src={restaurant.logo_url} alt="Logo" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-base font-bold text-gray-400">{restaurant.name?.charAt(0)}</span>
                            )}
                        </div>
                        <div className="text-white">
                            <h1 style={{ fontFamily: headingFont }} className="font-bold text-lg leading-tight drops-shadow-md">{restaurant.name}</h1>
                            <p className="text-[10px] text-white/80 uppercase tracking-widest">Modern Cuisine</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sticky Category Pills (Below Banner) */}
            <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md shadow-sm border-b border-border/50 py-3">
                <div className="px-4 flex gap-3 overflow-x-auto no-scrollbar max-w-md mx-auto mask-gradient-right justify-center">
                    {['Desi', 'Continental', 'Italian', 'Beverages'].map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveTab(cat)}
                            style={{
                                backgroundColor: activeTab === cat ? effectivePreset.primaryColor : 'transparent',
                                color: activeTab === cat ? 'white' : 'var(--muted-foreground)',
                                borderColor: activeTab === cat ? 'transparent' : 'var(--border)',
                                fontFamily: bodyFont
                            }}
                            className="px-5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shadow-sm border"
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            <div className="max-w-md mx-auto pt-4">
                {/* Dish Grid */}
                <div className="p-4 grid grid-cols-2 gap-3">
                    {dishes.map((dish) => (
                        <div
                            key={dish.id}
                            className="flex flex-col gap-3 group cursor-pointer bg-[#FDFBF7] p-2 rounded-xl shadow-sm border border-border/50 hover:shadow-md transition-all active:scale-[0.98]"
                            onClick={() => setSelectedDish(dish)}
                        >
                            <div className="aspect-square relative bg-gray-100">
                                <img src={dish.image_url} alt={dish.name} className="w-full h-full object-cover" />
                                <span className="absolute top-2 right-2 bg-white/95 backdrop-blur text-[10px] font-bold px-2 py-1 rounded-md text-gray-900 shadow-sm">
                                    PKR {dish.price}
                                </span>
                            </div>
                            <div className="p-3 flex flex-col flex-1">
                                <h4 className="font-bold text-gray-900 text-xs mb-1 leading-tight line-clamp-2">{dish.name}</h4>
                                <p className="text-[9px] text-gray-500 line-clamp-2 mb-3 flex-1">{dish.description}</p>
                                <button
                                    style={{ backgroundColor: effectivePreset.primaryColor }}
                                    className="w-full py-2 rounded-lg text-white text-[9px] font-bold uppercase tracking-wide flex items-center justify-center gap-1 active:scale-95 transition-transform shadow-sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setArDish(dish);
                                    }}
                                >
                                    <span className="material-icons-round text-[10px]">view_in_ar</span>
                                    View in AR
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Full Screen AR Modal (Details) */}
            {selectedDish && (
                <div className="fixed inset-0 z-[40] bg-background animate-in slide-in-from-bottom duration-300 flex flex-col">
                    {/* Reuse ARModelViewer for Detail View Preview (or should we remove it?) 
                         User didn't say to remove the detail view, but integrating Professional AR Viewer usually implies replacing the interaction.
                         If I keep SelectedDish modal, I should update the Viewer there too or allow launching ARExperience from there.
                     */}
                    <div className="relative flex-1 bg-black">
                        {/* Header Overlay */}
                        <div className="absolute top-0 left-0 right-0 p-4 z-50 flex justify-between items-start bg-gradient-to-b from-black/60 to-transparent h-32">
                            <button onClick={() => setSelectedDish(null)} className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white/30 transition-colors">
                                <span className="material-icons-round">arrow_back</span>
                            </button>
                            <button className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white/30 transition-colors">
                                <span className="material-icons-round">share</span>
                            </button>
                        </div>

                        {/* We will keep ARModelViewer here for "Preview" but maybe we should add a button to launch full ARExperience?
                            Or simply Launch ARExperience directly if user clicks "View in AR" in the modal.
                            The ARModelViewer already has a "View in AR" button internally.
                            Ideally we'd replacing ARModelViewer with something that launches ARExperience.
                            But for now I will leave it to avoid breaking changes not requested, 
                            and focus on the "Seamless transition" which is satisfied by the "View in AR" button in the GRID launching ARExperience.
                        */}
                        <ARModelViewer
                            src={selectedDish.glb_url || ''}
                            poster={selectedDish.image_url}
                            alt={selectedDish.name}
                            onView={() => {
                                supabaseService.logEvent({
                                    restaurant_id: selectedDish.restaurant_id,
                                    dish_id: selectedDish.id,
                                    event_type: 'view_ar'
                                });
                                // Launch Full Experience from here too?
                                setArDish(selectedDish);
                            }}
                        />
                    </div>

                    {/* Product Details Sheet */}
                    <div className="bg-background rounded-t-[2.5rem] -mt-8 relative z-10 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.3)] border-t border-border/50">
                        <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mt-3 mb-6 opacity-50"></div>
                        <div className="px-8 pb-8">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-3/4">
                                    <h2 style={{ fontFamily: headingFont }} className="text-3xl font-bold text-foreground leading-tight">{selectedDish.name}</h2>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="text-xs font-bold px-2 py-0.5 bg-secondary text-secondary-foreground rounded-md">Desi</span>
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <span className="material-icons-round text-[14px] text-yellow-400">star</span>
                                            4.8 (120+)
                                        </span>
                                    </div>
                                </div>
                                <span style={{ fontFamily: headingFont, color: effectivePreset.primaryColor }} className="text-3xl font-bold">PKR {selectedDish.price}</span>
                            </div>

                            <p className="text-muted-foreground text-sm leading-relaxed mb-8">{selectedDish.description}</p>

                            <div className="flex gap-4">
                                <div className="flex items-center gap-4 bg-secondary rounded-xl px-4 py-3 h-14">
                                    <button className="text-xl text-muted-foreground hover:text-foreground">-</button>
                                    <span className="font-bold text-foreground w-4 text-center">1</span>
                                    <button className="text-xl text-muted-foreground hover:text-foreground">+</button>
                                </div>
                                <Button className="flex-1 h-14 text-lg rounded-xl shadow-xl shadow-primary/20" onClick={() => alert('Added to cart!')}>
                                    Add to Order
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Professional AR Experience Overlay */}
            {arDish && (
                <ARExperience
                    src={arDish.glb_url || ''}
                    iosSrc={arDish.usdz_url}
                    alt={arDish.name}
                    dishName={arDish.name}
                    dishPrice={`PKR ${arDish.price}`}
                    secondaryColor={effectivePreset.secondaryColor}
                    arScale={arDish.ar_scale || 1.0}
                    restaurantName={restaurant.name}
                    isOpen={!!arDish}
                    onClose={() => setArDish(null)}
                />
            )}
        </div>
    );
}
