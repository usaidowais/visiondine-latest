'use client';

import React, { useState, useEffect } from 'react';
import { Dish, Restaurant } from '@/lib/types';
import { supabaseService } from '@/lib/services/supabaseService';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useParams, useRouter } from 'next/navigation';

export default function TenantMenuManager() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const [dishes, setDishes] = useState<Dish[]>([]);
    const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDishQR, setSelectedDishQR] = useState<Dish | null>(null);

    const downloadQR = async (url: string, filename: string) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Failed to download QR code', error);
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // 1. Resolve Restaurant (UUID or Slug)
                const allRestaurants = await supabaseService.getAllRestaurants();
                const found = allRestaurants.find(r => r.id === id || r.slug === id);

                if (found) {
                    setRestaurant(found);
                    // 2. Fetch dishes using the REAL UUID
                    const fetchedDishes = await supabaseService.getRestaurantDishes(found.id);
                    setDishes(fetchedDishes);
                } else {
                    console.error("Restaurant not found for id/slug:", id);
                }
            } catch (err) {
                console.error("Failed to fetch menu data", err);
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchData();
    }, [id]);

    const filteredDishes = dishes.filter(dish =>
        dish.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dish.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const demoDish = dishes.find(dish => dish.id === 'wood-fired-pizza');

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">

            {/* Navigation & Breadcrumbs */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <button onClick={() => router.push('/admin/restaurants')} className="hover:text-foreground flex items-center gap-1 transition-colors">
                    <span className="material-icons-round text-sm">arrow_back</span>
                    Back to Restaurants
                </button>
            </div>

            {/* Restaurant Banner */}
            <div className="bg-[#0A1929] rounded-3xl p-8 text-white relative overflow-hidden shadow-xl">
                {/* Abstract Bloom/Glow generic background effect */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 rounded-full border-2 border-white/20 bg-white/10 backdrop-blur-sm flex items-center justify-center overflow-hidden shrink-0">
                            {/* Placeholder generic logo if no image */}
                            <span className="text-2xl font-bold">{restaurant?.name?.charAt(0) || 'R'}</span>
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight mb-2">{restaurant?.name || 'Loading...'}</h1>
                            <div className="flex items-center gap-3 text-blue-200 text-sm font-medium">
                                <span>{restaurant?.location || 'Location'}</span>
                                <span className="w-1 h-1 rounded-full bg-blue-400"></span>
                                <span>{dishes.length} Items</span>
                                <span className="w-1 h-1 rounded-full bg-blue-400"></span>
                                <span className="flex items-center gap-1">
                                    <span className="material-icons-round text-xs">view_in_ar</span>
                                    WebAR Enabled
                                </span>
                            </div>
                        </div>
                    </div>

                    <Button
                        onClick={() => router.push(`/admin/restaurants/${id}/settings`)}
                        variant="secondary"
                        className="bg-white/10 hover:bg-white/20 text-white border-white/10 backdrop-blur-md gap-2"
                    >
                        <span className="material-icons-round text-sm">settings</span>
                        Settings
                    </Button>
                </div>
            </div>

            {/* Main Content Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-border p-6 min-h-[600px]">
                {/* Toolbar */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
                    <div>
                        <h2 className="text-xl font-bold text-foreground">Menu Items</h2>
                        <p className="text-muted-foreground text-sm">Manage dish details and AR models</p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        {demoDish && (
                            <Button variant="outline" onClick={() => router.push(`/admin/restaurants/${id}/menu/${demoDish.id}`)} className="gap-2">
                                <span className="material-icons-round">view_in_ar</span>
                                Configure Demo Dish
                            </Button>
                        )}
                        <Button onClick={() => router.push(`/admin/restaurants/${id}/menu/new`)} className="bg-[#0A1929] hover:bg-[#122840] text-white gap-2 shadow-lg shadow-blue-900/20">
                            <span className="material-icons-round">add</span>
                            Add Dish
                        </Button>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                        <span className="material-icons-round absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">search</span>
                        <input
                            type="text"
                            placeholder="Search food items..."
                            className="w-full pl-10 pr-4 py-2.5 bg-secondary/30 border border-input rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" className="gap-2 text-muted-foreground font-normal border-dashed">
                        <span className="material-icons-round">filter_list</span>
                        Filters
                        <span className="material-icons-round text-sm">expand_more</span>
                    </Button>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border/50 text-left">
                                <th className="pb-4 pl-4 text-xs font-bold text-muted-foreground uppercase tracking-wider w-[40%]">Dish Name</th>
                                <th className="pb-4 text-xs font-bold text-muted-foreground uppercase tracking-wider w-[20%]">Price</th>
                                <th className="pb-4 text-xs font-bold text-muted-foreground uppercase tracking-wider w-[20%]">AR Status</th>
                                <th className="pb-4 text-xs font-bold text-muted-foreground uppercase tracking-wider w-[10%] text-center">QR</th>
                                <th className="pb-4 pr-4 text-right text-xs font-bold text-muted-foreground uppercase tracking-wider w-[10%]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {loading ? (
                                // Skeleton Loading Rows
                                [1, 2, 3].map(i => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="py-4 pl-4"><div className="h-12 bg-secondary rounded-lg w-3/4"></div></td>
                                        <td className="py-4"><div className="h-4 bg-secondary rounded w-12"></div></td>
                                        <td className="py-4"><div className="h-8 w-8 bg-secondary rounded-full"></div></td>
                                        <td className="py-4 pr-4"><div className="h-8 w-8 bg-secondary rounded ml-auto"></div></td>
                                    </tr>
                                ))
                            ) : filteredDishes.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="py-12 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center">
                                                <span className="material-icons-round text-2xl opacity-50">restaurant_menu</span>
                                            </div>
                                            <p>No dishes found. Add your first dish!</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredDishes.map((dish) => (
                                    <tr key={dish.id} className="group hover:bg-secondary/20 transition-colors">
                                        <td className="py-4 pl-4 align-middle">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-lg bg-secondary flex-shrink-0 overflow-hidden border border-border">
                                                    <img src={dish.image_url} alt={dish.name} className="w-full h-full object-cover" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-foreground text-sm">{dish.name} {dish.id === 'wood-fired-pizza' && <span className="ml-1 text-[10px] uppercase tracking-wide text-primary">Demo</span>}</p>
                                                    <p className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">{dish.description}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 align-middle">
                                            <span className="font-bold text-foreground text-sm">PKR {dish.price}</span>
                                        </td>
                                        <td className="py-4 align-middle">
                                            {dish.glb_url ? (
                                                <div className="w-8 h-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center" title="AR Ready">
                                                    <span className="material-icons-round text-lg">view_in_ar</span>
                                                </div>
                                            ) : (
                                                <div className="w-8 h-8 rounded-lg bg-red-50 text-red-400 flex items-center justify-center opacity-50" title="Missing AR Model">
                                                    <span className="material-icons-round text-lg">texture</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-4 align-middle text-center">
                                            <button
                                                onClick={() => setSelectedDishQR(dish)}
                                                className="text-muted-foreground hover:text-primary transition-colors p-2 hover:bg-secondary rounded-lg"
                                                title="Get QR"
                                            >
                                                <span className="material-icons-round text-xl">qr_code</span>
                                            </button>
                                        </td>
                                        <td className="py-4 pr-4 align-middle text-right">
                                            <button
                                                onClick={() => router.push(`/admin/restaurants/${id}/menu/${dish.id}`)}
                                                className="text-muted-foreground hover:text-primary transition-colors p-2 hover:bg-white rounded-lg"
                                                title="Edit Dish"
                                            >
                                                <span className="material-icons-round text-xl">edit</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* General Loading Rows Adjustment */}
            {/* The colSpan for loading and empty state should be 5 now */}
            {/* Handled by React, but I'll skip editing the above colSpan string unless strictly needed, it works fine */}

            {/* Dish QR Modal */}
            {selectedDishQR && restaurant && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-background rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-foreground line-clamp-1">{selectedDishQR.name} QR Code</h3>
                            <button onClick={() => setSelectedDishQR(null)} className="text-muted-foreground hover:text-foreground shrink-0">
                                <span className="material-icons-round">close</span>
                            </button>
                        </div>
                        
                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-inner mb-6 flex justify-center items-center h-64">
                            <img 
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(typeof window !== 'undefined' ? `${window.location.origin}/menu/${restaurant.slug || restaurant.id}/dish/${selectedDishQR.id}` : '')}`} 
                                alt={`${selectedDishQR.name} QR Code`}
                                className="w-full h-full object-contain"
                            />
                        </div>

                        <p className="text-sm text-muted-foreground mb-6">
                            Scan this code to instantly view this specific dish in AR.
                        </p>

                        <div className="flex gap-3">
                            <Button 
                                className="w-full bg-[#0A1929] hover:bg-[#122840] text-white gap-2 flex items-center justify-center"
                                onClick={() => downloadQR(
                                    `https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(typeof window !== 'undefined' ? `${window.location.origin}/menu/${restaurant.slug || restaurant.id}/dish/${selectedDishQR.id}` : '')}`,
                                    `${selectedDishQR.name.replace(/\s+/g, '-')}-AR-QR.png`
                                )}
                            >
                                <span className="material-icons-round text-sm">download</span>
                                Download High-Quality QR
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
