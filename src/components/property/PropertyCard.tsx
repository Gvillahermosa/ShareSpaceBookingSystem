import { useState, useEffect } from 'react';
import type { MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import type { Property } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { togglePropertyInWishlist, isPropertyInAnyWishlist } from '../../services/wishlistService';
import toast from 'react-hot-toast';

interface PropertyCardProps {
    property: Property;
}

export default function PropertyCard({ property }: PropertyCardProps) {
    const { currentUser } = useAuth();
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isWishlisted, setIsWishlisted] = useState(false);
    const [isLoadingWishlist, setIsLoadingWishlist] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');

    // Check if property is wishlisted on mount
    useEffect(() => {
        const checkWishlist = async () => {
            if (currentUser) {
                const result = await isPropertyInAnyWishlist(currentUser.uid, property.id);
                setIsWishlisted(result);
            }
        };
        checkWishlist();
    }, [currentUser, property.id]);

    const handleWishlistToggle = async (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!currentUser) {
            toast.error('Please log in to save to wishlist');
            return;
        }

        setIsLoadingWishlist(true);
        try {
            const { added } = await togglePropertyInWishlist(currentUser.uid, property.id);
            setIsWishlisted(added);
            toast.success(added ? 'Saved to wishlist' : 'Removed from wishlist');
        } catch {
            toast.error('Failed to update wishlist');
        } finally {
            setIsLoadingWishlist(false);
        }
    };

    const nextImage = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (currentImageIndex < property.photos.length - 1 && !isAnimating) {
            setSlideDirection('right');
            setIsAnimating(true);
            setTimeout(() => {
                setCurrentImageIndex((prev) => prev + 1);
                setIsAnimating(false);
            }, 200);
        }
    };

    const prevImage = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (currentImageIndex > 0 && !isAnimating) {
            setSlideDirection('left');
            setIsAnimating(true);
            setTimeout(() => {
                setCurrentImageIndex((prev) => prev - 1);
                setIsAnimating(false);
            }, 200);
        }
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'PHP',
            minimumFractionDigits: 0,
        }).format(price);
    };

    return (
        <Link to={`/property/${property.id}`} className="group">
            <div className="relative">
                {/* Image Carousel */}
                <div className="aspect-square rounded-xl overflow-hidden bg-secondary-100">
                    {property.photos.length > 0 ? (
                        <div
                            className={`w-full h-full transition-all duration-200 ease-out ${isAnimating
                                ? slideDirection === 'right'
                                    ? 'opacity-0 -translate-x-4 scale-95'
                                    : 'opacity-0 translate-x-4 scale-95'
                                : 'opacity-100 translate-x-0 scale-100'
                                }`}
                        >
                            <img
                                src={property.photos[currentImageIndex]?.url}
                                alt={property.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                        </div>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-secondary-400">
                            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                            </svg>
                        </div>
                    )}

                    {/* Navigation Arrows */}
                    {property.photos.length > 1 && (
                        <>
                            <button
                                onClick={prevImage}
                                className={`absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${currentImageIndex === 0 ? 'invisible' : ''
                                    }`}
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <button
                                onClick={nextImage}
                                className={`absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${currentImageIndex === property.photos.length - 1 ? 'invisible' : ''
                                    }`}
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </>
                    )}

                    {/* Dots */}
                    {property.photos.length > 1 && (
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-1">
                            {property.photos.slice(0, 5).map((_, index) => (
                                <div
                                    key={index}
                                    className={`w-1.5 h-1.5 rounded-full transition-colors ${index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                                        }`}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Wishlist Button */}
                <button
                    onClick={handleWishlistToggle}
                    disabled={isLoadingWishlist}
                    className="absolute top-3 right-3 z-10"
                >
                    <svg
                        className={`w-7 h-7 ${isWishlisted ? 'text-primary-500 fill-current' : 'text-white'
                            }`}
                        fill={isWishlisted ? 'currentColor' : 'none'}
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={isWishlisted ? 0 : 1.5}
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                        />
                    </svg>
                </button>

                {/* Guest Favorite Badge */}
                {property.averageRating && property.averageRating >= 4.9 && property.reviewCount >= 10 && (
                    <div className="absolute top-3 left-3 bg-white px-2 py-1 rounded-full text-xs font-semibold shadow-sm">
                        Guest favorite
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="mt-3">
                <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-secondary-900 truncate flex-1">
                        {property.location.city}, {property.location.state}
                    </h3>
                    {property.averageRating !== undefined && property.averageRating > 0 && (
                        <div className="flex items-center ml-2">
                            <svg className="w-4 h-4 text-secondary-800" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            <span className="ml-1 text-sm">{property.averageRating.toFixed(2)}</span>
                        </div>
                    )}
                </div>
                <p className="text-secondary-500 text-sm truncate">{property.title}</p>
                <p className="text-secondary-500 text-sm">
                    {property.bedrooms} bedroom{property.bedrooms !== 1 ? 's' : ''} · {property.beds} bed{property.beds !== 1 ? 's' : ''}
                </p>
                <p className="mt-1">
                    <span className="font-semibold">{formatPrice(property.pricing.basePrice)}</span>
                    <span className="text-secondary-600"> night</span>
                </p>
            </div>
        </Link>
    );
}
