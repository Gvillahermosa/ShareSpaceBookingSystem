import { useState, useEffect, useCallback } from 'react';
import { Modal } from '../ui/Modal';

interface PhotoGalleryProps {
    photos: { id: string; url: string; caption?: string }[];
    title: string;
}

export default function PhotoGallery({ photos, title }: PhotoGalleryProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');

    const openGallery = (index: number = 0) => {
        setCurrentIndex(index);
        setIsOpen(true);
    };

    const nextImage = useCallback(() => {
        if (isAnimating) return;
        setSlideDirection('right');
        setIsAnimating(true);
        setTimeout(() => {
            setCurrentIndex((prev) => (prev + 1) % photos.length);
            setIsAnimating(false);
        }, 300);
    }, [isAnimating, photos.length]);

    const prevImage = useCallback(() => {
        if (isAnimating) return;
        setSlideDirection('left');
        setIsAnimating(true);
        setTimeout(() => {
            setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
            setIsAnimating(false);
        }, 300);
    }, [isAnimating, photos.length]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;
            if (e.key === 'ArrowRight') nextImage();
            if (e.key === 'ArrowLeft') prevImage();
            if (e.key === 'Escape') setIsOpen(false);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, nextImage, prevImage]);

    if (photos.length === 0) {
        return (
            <div className="aspect-video bg-secondary-100 rounded-xl flex items-center justify-center">
                <p className="text-secondary-400">No photos available</p>
            </div>
        );
    }

    return (
        <>
            {/* Grid Layout */}
            <div className="relative">
                <div className="grid grid-cols-4 gap-2 rounded-xl overflow-hidden">
                    {/* Main Image */}
                    <div
                        className="col-span-2 row-span-2 cursor-pointer"
                        onClick={() => openGallery(0)}
                    >
                        <img
                            src={photos[0].url}
                            alt={title}
                            className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                            style={{ aspectRatio: '1/1' }}
                        />
                    </div>

                    {/* Secondary Images */}
                    {photos.slice(1, 5).map((photo, index) => (
                        <div
                            key={photo.id}
                            className="cursor-pointer"
                            onClick={() => openGallery(index + 1)}
                        >
                            <img
                                src={photo.url}
                                alt={`${title} ${index + 2}`}
                                className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                                style={{ aspectRatio: '1/1' }}
                            />
                        </div>
                    ))}
                </div>

                {/* Show All Photos Button */}
                {photos.length > 5 && (
                    <button
                        onClick={() => openGallery(0)}
                        className="absolute bottom-4 right-4 px-4 py-2 bg-white rounded-lg shadow-md text-sm font-medium hover:bg-secondary-50 transition-colors"
                    >
                        Show all photos ({photos.length})
                    </button>
                )}
            </div>

            {/* Full Screen Gallery Modal */}
            <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} size="full">
                <div className="h-[85vh] flex flex-col bg-white">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-secondary-200">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 hover:bg-secondary-100 rounded-full transition-colors"
                            >
                                <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                            <h3 className="font-semibold text-lg">{title}</h3>
                        </div>
                        <p className="text-secondary-600 font-medium">
                            {currentIndex + 1} / {photos.length}
                        </p>
                    </div>

                    {/* Main Image Area */}
                    <div className="flex-1 relative flex items-center justify-center bg-secondary-50 overflow-hidden">
                        <div className="w-full h-full flex items-center justify-center p-4">
                            <div
                                className={`transition-all duration-300 ease-out ${isAnimating
                                        ? slideDirection === 'right'
                                            ? 'opacity-0 -translate-x-8 scale-95'
                                            : 'opacity-0 translate-x-8 scale-95'
                                        : 'opacity-100 translate-x-0 scale-100'
                                    }`}
                            >
                                <img
                                    src={photos[currentIndex].url}
                                    alt={photos[currentIndex].caption || `Photo ${currentIndex + 1}`}
                                    className="max-h-[60vh] max-w-full w-auto h-auto object-contain rounded-lg shadow-lg"
                                    style={{ maxWidth: 'min(100%, 1000px)' }}
                                />
                            </div>
                        </div>

                        {/* Navigation Arrows */}
                        {photos.length > 1 && (
                            <>
                                <button
                                    onClick={prevImage}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center hover:bg-white hover:scale-105 transition-all"
                                >
                                    <svg
                                        className="w-6 h-6"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M15 19l-7-7 7-7"
                                        />
                                    </svg>
                                </button>
                                <button
                                    onClick={nextImage}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center hover:bg-white hover:scale-105 transition-all"
                                >
                                    <svg
                                        className="w-6 h-6"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9 5l7 7-7 7"
                                        />
                                    </svg>
                                </button>
                            </>
                        )}
                    </div>

                    {/* Caption */}
                    {photos[currentIndex].caption && (
                        <p className="text-center text-secondary-600 py-2 px-4 bg-white border-t border-secondary-100">
                            {photos[currentIndex].caption}
                        </p>
                    )}

                    {/* Thumbnails */}
                    <div className="bg-white border-t border-secondary-200 px-4 py-3">
                        <div className="flex space-x-2 overflow-x-auto justify-center">
                            {photos.map((photo, index) => (
                                <button
                                    key={photo.id}
                                    onClick={() => setCurrentIndex(index)}
                                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${index === currentIndex
                                        ? 'border-primary-500 ring-2 ring-primary-200'
                                        : 'border-transparent opacity-60 hover:opacity-100 hover:border-secondary-300'
                                        }`}
                                >
                                    <img
                                        src={photo.url}
                                        alt={`Thumbnail ${index + 1}`}
                                        className="w-full h-full object-cover"
                                    />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </Modal>
        </>
    );
}
