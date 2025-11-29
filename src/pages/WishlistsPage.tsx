import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Property } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { getUserWishlist, removeFromWishlist } from '../services/wishlistService';
import { PropertyCard } from '../components/property';
import { Spinner, Button } from '../components/ui';
import toast from 'react-hot-toast';

export default function WishlistsPage() {
    const { currentUser } = useAuth();
    const [wishlistProperties, setWishlistProperties] = useState<Property[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchWishlists = async () => {
            if (!currentUser) return;

            try {
                const properties = await getUserWishlist(currentUser.uid);
                setWishlistProperties(properties);
            } catch (error) {
                console.error('Error fetching wishlists:', error);
                toast.error('Failed to load wishlists');
            } finally {
                setLoading(false);
            }
        };

        fetchWishlists();
    }, [currentUser]);

    const handleRemoveFromWishlist = async (propertyId: string) => {
        if (!currentUser) return;

        try {
            await removeFromWishlist(currentUser.uid, propertyId);
            setWishlistProperties((prev) => prev.filter((p) => p.id !== propertyId));
            toast.success('Removed from wishlist');
        } catch (error) {
            console.error('Error removing from wishlist:', error);
            toast.error('Failed to remove from wishlist');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
            {/* Header */}
            <div className="mb-4 sm:mb-8">
                <h1 className="text-2xl sm:text-3xl font-semibold">Wishlists</h1>
                <p className="text-secondary-500 mt-1 text-sm sm:text-base">
                    {wishlistProperties.length} saved {wishlistProperties.length === 1 ? 'place' : 'places'}
                </p>
            </div>

            {/* Wishlists Grid */}
            {wishlistProperties.length === 0 ? (
                <div className="text-center py-20">
                    <svg
                        className="w-16 h-16 mx-auto text-secondary-300 mb-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                        />
                    </svg>
                    <h3 className="text-xl font-medium text-secondary-900 mb-2">
                        No saved places yet
                    </h3>
                    <p className="text-secondary-500 mb-6">
                        Start exploring and save places you love!
                    </p>
                    <Link to="/search">
                        <Button>Start exploring</Button>
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {wishlistProperties.map((property) => (
                        <div key={property.id} className="relative group">
                            <PropertyCard property={property} />
                            {/* Delete button - positioned at top-left to avoid overlap with heart icon */}
                            <button
                                onClick={() => handleRemoveFromWishlist(property.id)}
                                className="absolute top-3 left-3 z-20 p-2 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 hover:bg-red-50"
                                title="Remove from wishlist"
                            >
                                <svg
                                    className="w-4 h-4 text-red-500"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    strokeWidth={2}
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
