import { useState } from 'react';
import { usePropertyStore } from '../../store';
import type { PropertyType } from '../../types';
import { PROPERTY_TYPE_LABELS, AMENITY_CATEGORIES } from '../../config/constants';
import { Button, Checkbox } from '../ui';

interface FilterSidebarProps {
    onClose?: () => void;
}

export default function FilterSidebar({ onClose }: FilterSidebarProps) {
    const { filters, setFilters, clearFilters } = usePropertyStore();

    const [priceRange, setPriceRange] = useState({
        min: filters.priceRange?.min || 0,
        max: filters.priceRange?.max || 50000,
    });
    const [selectedTypes, setSelectedTypes] = useState<PropertyType[]>(
        filters.propertyType || []
    );
    const [bedrooms, setBedrooms] = useState(filters.bedrooms || 0);
    const [bathrooms, setBathrooms] = useState(filters.bathrooms || 0);
    const [selectedAmenities, setSelectedAmenities] = useState<string[]>(
        filters.amenities || []
    );
    const [instantBook, setInstantBook] = useState(filters.instantBook || false);

    const propertyTypes: PropertyType[] = ['entire_place', 'private_room', 'shared_room'];

    const togglePropertyType = (type: PropertyType) => {
        setSelectedTypes((prev) =>
            prev.includes(type)
                ? prev.filter((t) => t !== type)
                : [...prev, type]
        );
    };

    const toggleAmenity = (amenity: string) => {
        setSelectedAmenities((prev) =>
            prev.includes(amenity)
                ? prev.filter((a) => a !== amenity)
                : [...prev, amenity]
        );
    };

    const handleApply = () => {
        setFilters({
            priceRange,
            propertyType: selectedTypes.length > 0 ? selectedTypes : undefined,
            bedrooms: bedrooms > 0 ? bedrooms : undefined,
            bathrooms: bathrooms > 0 ? bathrooms : undefined,
            amenities: selectedAmenities.length > 0 ? selectedAmenities : undefined,
            instantBook: instantBook || undefined,
        });
        onClose?.();
    };

    const handleClear = () => {
        setPriceRange({ min: 0, max: 50000 });
        setSelectedTypes([]);
        setBedrooms(0);
        setBathrooms(0);
        setSelectedAmenities([]);
        setInstantBook(false);
        clearFilters();
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Price Range */}
                <div>
                    <h3 className="text-lg font-semibold text-secondary-900 mb-4">
                        Price range
                    </h3>
                    <div className="flex items-center space-x-4">
                        <div className="flex-1">
                            <label className="text-sm text-secondary-600">Minimum</label>
                            <div className="relative mt-1">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-500">
                                    $
                                </span>
                                <input
                                    type="number"
                                    value={priceRange.min}
                                    onChange={(e) =>
                                        setPriceRange({ ...priceRange, min: Number(e.target.value) })
                                    }
                                    className="w-full pl-7 pr-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                        <span className="text-secondary-400 pt-6">-</span>
                        <div className="flex-1">
                            <label className="text-sm text-secondary-600">Maximum</label>
                            <div className="relative mt-1">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-500">
                                    $
                                </span>
                                <input
                                    type="number"
                                    value={priceRange.max}
                                    onChange={(e) =>
                                        setPriceRange({ ...priceRange, max: Number(e.target.value) })
                                    }
                                    className="w-full pl-7 pr-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Property Type */}
                <div>
                    <h3 className="text-lg font-semibold text-secondary-900 mb-4">
                        Type of place
                    </h3>
                    <div className="space-y-3">
                        {propertyTypes.map((type) => (
                            <button
                                key={type}
                                onClick={() => togglePropertyType(type)}
                                className={`
                  w-full flex items-center justify-between p-4 rounded-xl border-2 transition-colors
                  ${selectedTypes.includes(type)
                                        ? 'border-secondary-800 bg-secondary-50'
                                        : 'border-secondary-200 hover:border-secondary-300'
                                    }
                `}
                            >
                                <div className="text-left">
                                    <p className="font-medium text-secondary-900">
                                        {PROPERTY_TYPE_LABELS[type]}
                                    </p>
                                    <p className="text-sm text-secondary-500">
                                        {type === 'entire_place' && 'A place all to yourself'}
                                        {type === 'private_room' && 'Your own room in a home'}
                                        {type === 'shared_room' && 'A shared space with others'}
                                    </p>
                                </div>
                                {selectedTypes.includes(type) && (
                                    <svg
                                        className="w-6 h-6 text-secondary-800"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M5 13l4 4L19 7"
                                        />
                                    </svg>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Rooms and Beds */}
                <div>
                    <h3 className="text-lg font-semibold text-secondary-900 mb-4">
                        Rooms and beds
                    </h3>

                    {/* Bedrooms */}
                    <div className="mb-4">
                        <p className="text-sm text-secondary-700 mb-2">Bedrooms</p>
                        <div className="flex flex-wrap gap-2">
                            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                                <button
                                    key={num}
                                    onClick={() => setBedrooms(num)}
                                    className={`
                    px-4 py-2 rounded-full text-sm font-medium transition-colors
                    ${bedrooms === num
                                            ? 'bg-secondary-800 text-white'
                                            : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200'
                                        }
                  `}
                                >
                                    {num === 0 ? 'Any' : num === 8 ? '8+' : num}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Bathrooms */}
                    <div>
                        <p className="text-sm text-secondary-700 mb-2">Bathrooms</p>
                        <div className="flex flex-wrap gap-2">
                            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                                <button
                                    key={num}
                                    onClick={() => setBathrooms(num)}
                                    className={`
                    px-4 py-2 rounded-full text-sm font-medium transition-colors
                    ${bathrooms === num
                                            ? 'bg-secondary-800 text-white'
                                            : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200'
                                        }
                  `}
                                >
                                    {num === 0 ? 'Any' : num === 8 ? '8+' : num}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Amenities */}
                <div>
                    <h3 className="text-lg font-semibold text-secondary-900 mb-4">
                        Amenities
                    </h3>

                    {AMENITY_CATEGORIES.map((category) => (
                        <div key={category.name} className="mb-4">
                            <p className="text-sm font-medium text-secondary-700 mb-2">
                                {category.name}
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                                {category.amenities.map((amenity) => (
                                    <Checkbox
                                        key={amenity.id}
                                        label={amenity.label}
                                        checked={selectedAmenities.includes(amenity.id)}
                                        onChange={() => toggleAmenity(amenity.id)}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Booking Options */}
                <div>
                    <h3 className="text-lg font-semibold text-secondary-900 mb-4">
                        Booking options
                    </h3>
                    <Checkbox
                        label="Instant Book"
                        checked={instantBook}
                        onChange={() => setInstantBook(!instantBook)}
                    />
                    <p className="text-sm text-secondary-500 mt-1 ml-7">
                        Listings you can book without waiting for Host approval
                    </p>
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-secondary-200 flex items-center justify-between">
                <button
                    onClick={handleClear}
                    className="text-secondary-800 font-medium hover:underline"
                >
                    Clear all
                </button>
                <Button onClick={handleApply}>Show places</Button>
            </div>
        </div>
    );
}
