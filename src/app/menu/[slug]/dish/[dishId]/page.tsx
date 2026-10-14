'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Dish, Restaurant, UIPreset } from '@/lib/types';
import { supabaseService, supabase } from '@/lib/services/supabaseService';
import { ARExperience } from '@/components/ar/ARExperience';
import { computeActiveTheme } from '@/lib/utils/themeManager';
import { Button } from '@/components/ui/Button';

export default function SingleDishPage() {
    const params = useParams();
    const slug = typeof params.slug === 'string' ? params.slug : '';
    const dishId = typeof params.dishId === 'string' ? params.dishId : '';

    const [loading, setLoading] = useState(true);
    const [dish, setDish] = useState<Dish | null>(null);
    const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
    const [showAR, setShowAR] = useState(false);

    useEffect(() => {
        const loadDishData = async () => {
            if (!slug || !dishId) return;
            try {
                // Fetch the restaurant to get the theme (using slug or ID)
                const rData = await supabaseService.getRestaurantWithTheme(slug);
                if (rData) setRestaurant(rData);

                // Fetch the specific dish
                const fetchedDish = await supabaseService.getDishById(dishId);
                if (fetchedDish) {
                    setDish(fetchedDish);
                }
            } catch (error) {
                console.error("Failed to load dish", error);
            } finally {
                setLoading(false);
            }
        };

        loadDishData();
    }, [slug, dishId]);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background text-primary">
                <span className="material-icons-round animate-spin text-4xl">sync</span>
            </div>
        );
    }

    if (!dish || !restaurant) {
        return (
            <div className="flex h-screen flex-col items-center justify-center bg-background text-foreground">
                <span className="material-icons-round text-6xl text-muted-foreground mb-4 opacity-50">search_off</span>
                <h2 className="text-2xl font-bold mb-2">Item Not Found</h2>
                <p className="text-muted-foreground text-center px-6">This dish could not be found or is unavailable.</p>
            </div>
        );
    }

    const effectivePreset = computeActiveTheme(restaurant.theme_settings);
    const bodyFont = effectivePreset.bodyFont || 'Inter';
    const headingFont = effectivePreset.headingFont || 'Inter';

    return (
        <div
            className="min-h-screen pb-24 font-sans"
            style={{
                fontFamily: bodyFont,
                backgroundColor: effectivePreset.backgroundColor || '#F8F9FA'
            }}
        >
            {/* Header / Image Area */}
            <div className="relative w-full aspect-square bg-slate-100 overflow-hidden shadow-sm">
                {dish.image_url ? (
                    <img src={dish.image_url} alt={dish.name} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">
                        <span className="material-icons-round text-6xl">restaurant</span>
                    </div>
                )}

                <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
                    <div className="bg-white/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold shadow-sm" style={{ color: effectivePreset.primaryColor || '#000' }}>
                        {restaurant.name}
                    </div>
                    {dish.price && (
                        <div className="bg-black/80 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                            PKR {dish.price}
                        </div>
                    )}
                </div>

                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-6">
                    <h1 style={{ fontFamily: headingFont }} className="font-bold text-3xl leading-tight text-white drop-shadow-md">
                        {dish.name}
                    </h1>
                    {dish.category && (
                        <p className="text-xs text-white/80 uppercase tracking-widest mt-1">
                            {dish.category}
                        </p>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div className="p-6 max-w-md mx-auto bg-white rounded-t-3xl -mt-6 relative z-20 shadow-lg" style={{ backgroundColor: effectivePreset.surfaceColor || '#FFFFFF' }}>
                <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-6"></div>

                <h2 style={{ fontFamily: headingFont, color: effectivePreset.textColor || '#000000' }} className="text-xl font-bold mb-4">
                    About this dish
                </h2>

                <p className="text-sm leading-relaxed mb-8" style={{ color: effectivePreset.textColor || '#000000', opacity: 0.8 }}>
                    {dish.description || 'No description available for this item.'}
                </p>

                {/* Primary AR Action */}
                <Button
                    className="w-full py-6 text-lg rounded-2xl shadow-xl flex items-center justify-center gap-2 transition-transform active:scale-95"
                    style={{ backgroundColor: effectivePreset.primaryColor || '#000', color: '#fff' }}
                    onClick={() => setShowAR(true)}
                >
                    <span className="material-icons-round text-2xl">view_in_ar</span>
                    View in AR
                </Button>
            </div>

            {/* AR Experience Overlay */}
            {showAR && (
                <div className="fixed inset-0 z-[100] bg-black">
                    <ARExperience
                        src={dish.glb_url || ''}
                        iosSrc={dish.usdz_url}
                        alt={dish.name}
                        dishName={dish.name}
                        dishPrice={`PKR ${dish.price}`}
                        secondaryColor={effectivePreset.secondaryColor}
                        arScale={dish.ar_scale || 1.0}
                        restaurantName={restaurant.name}
                        onClose={() => setShowAR(false)}
                    />
                </div>
            )}
        </div>
    );
}
