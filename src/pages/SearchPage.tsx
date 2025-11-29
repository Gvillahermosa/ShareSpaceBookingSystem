import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Property, SearchFilters as SearchFiltersType, PropertyType } from '../types';
import { searchProperties } from '../services/propertyService';
import { PropertyCard } from '../components/property';
import { PropertyMap } from '../components/map';
import { FilterSidebar } from '../components/search';
import { Button, Spinner } from '../components/ui';

export default function SearchPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [properties, setProperties] = useState<Property[]>([]);
    const [loading, setLoading] = useState(true);
    const [showMap, setShowMap] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [activePropertyId, setActivePropertyId] = useState<string | undefined>();

    const parseGuests = () => {
        const guestsParam = searchParams.get('guests');
        if (!guestsParam) return undefined;
        const total = parseInt(guestsParam);
        return { adults: total, children: 0, infants: 0 };
    };

    const [filters, setFilters] = useState<SearchFiltersType>({
        location: searchParams.get('location') || undefined,
        checkIn: searchParams.get('checkIn') ? new Date(searchParams.get('checkIn')!) : undefined,
        checkOut: searchParams.get('checkOut') ? new Date(searchParams.get('checkOut')!) : undefined,
        guests: parseGuests(),
        propertyType: (searchParams.get('types')?.split(',').filter(Boolean) || []) as PropertyType[],
        priceRange: {
            min: searchParams.get('minPrice') ? parseInt(searchParams.get('minPrice')!) : 0,
            max: searchParams.get('maxPrice') ? parseInt(searchParams.get('maxPrice')!) : 100000,
        },
        bedrooms: searchParams.get('bedrooms') ? parseInt(searchParams.get('bedrooms')!) : undefined,
        beds: searchParams.get('beds') ? parseInt(searchParams.get('beds')!) : undefined,
        bathrooms: searchParams.get('bathrooms') ? parseInt(searchParams.get('bathrooms')!) : undefined,
        amenities: searchParams.get('amenities')?.split(',').filter(Boolean) || [],
        instantBook: searchParams.get('instantBook') === 'true',
    });

    useEffect(() => {
        const fetchProperties = async () => {
            setLoading(true);
            try {
                const results = await searchProperties(filters);
                setProperties(results);
            } catch (error) {
                console.error('Error searching properties:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchProperties();
    }, [filters]);

    const handleFilterChange = (newFilters: Partial<SearchFiltersType>) => {
        setFilters((prev) => ({ ...prev, ...newFilters }));
    };

    const handlePropertyHover = (propertyId: string) => {
        setActivePropertyId(propertyId);
    };

    const toggleMap = () => {
        setShowMap(!showMap);
        setSearchParams((prev) => {
            if (!showMap) {
                prev.set('showMap', 'true');
            } else {
                prev.delete('showMap');
            }
            return prev;
        });
    };

    return (
        <div className="flex flex-col h-[calc(100vh-80px)]">
            {/* Filter Bar */}
            <div className="border-b border-secondary-200 bg-white z-20 flex-shrink-0">
                <div className="max-w-7xl mx-auto px-2 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowFilters(!showFilters)}
                            className="flex items-center px-2 sm:px-3"
                        >
                            <svg className="w-4 h-4 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                            </svg>
                            <span className="hidden sm:inline">Filters</span>
                        </Button>

                        {/* Quick Filters - Hidden on very small screens */}
                        <Button
                            variant={filters.instantBook ? 'primary' : 'outline'}
                            size="sm"
                            onClick={() => handleFilterChange({ instantBook: !filters.instantBook })}
                            className="hidden xs:flex text-xs sm:text-sm px-2 sm:px-3"
                        >
                            <span className="hidden sm:inline">Instant Book</span>
                            <span className="sm:hidden">Instant</span>
                        </Button>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3">
                        <span className="text-xs sm:text-sm text-secondary-500 whitespace-nowrap">
                            {properties.length} <span className="hidden sm:inline">{properties.length === 1 ? 'property' : 'properties'}</span>
                        </span>
                        <Button variant="outline" size="sm" onClick={toggleMap} className="px-2 sm:px-3 whitespace-nowrap">
                            <svg className="w-4 h-4 sm:mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                            </svg>
                            <span className="hidden sm:inline">{showMap ? 'List' : 'Map'}</span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex flex-1 min-h-0 overflow-hidden relative">
                {/* Filter Sidebar - Overlay on mobile */}
                {showFilters && (
                    <>
                        {/* Mobile overlay backdrop */}
                        <div
                            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
                            onClick={() => setShowFilters(false)}
                        />
                        <div className="fixed left-0 top-0 h-full w-80 max-w-[85vw] border-r border-secondary-200 overflow-y-auto bg-white z-40 lg:relative lg:z-auto">
                            <FilterSidebar
                                onClose={() => setShowFilters(false)}
                            />
                        </div>
                    </>
                )}

                {/* Properties List */}
                <div className={`flex-1 overflow-y-auto transition-all duration-300 ${showMap ? 'hidden lg:block lg:w-1/2' : 'w-full'}`}>
                    <div className="p-2 sm:p-4">
                        {loading ? (
                            <div className="flex justify-center py-20">
                                <Spinner size="lg" />
                            </div>
                        ) : properties.length === 0 ? (
                            <div className="text-center py-12 sm:py-20 px-4">
                                <svg
                                    className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-secondary-300 mb-3 sm:mb-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={1.5}
                                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                    />
                                </svg>
                                <h3 className="text-lg sm:text-xl font-medium text-secondary-900 mb-2">
                                    No results found
                                </h3>
                                <p className="text-sm sm:text-base text-secondary-500 mb-4 sm:mb-6">
                                    Try adjusting your search or filters.
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setFilters({
                                        priceRange: { min: 0, max: 10000 },
                                        propertyType: [],
                                        amenities: [],
                                    })}
                                >
                                    Clear filters
                                </Button>
                            </div>
                        ) : (
                            <div className={`grid gap-3 sm:gap-4 lg:gap-6 ${showMap
                                ? 'grid-cols-1 xl:grid-cols-2'
                                : 'grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
                                }`}>
                                {properties.map((property) => (
                                    <div
                                        key={property.id}
                                        onMouseEnter={() => handlePropertyHover(property.id)}
                                        onMouseLeave={() => setActivePropertyId(undefined)}
                                    >
                                        <PropertyCard property={property} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Map - Full screen on mobile, side panel on desktop */}
                {showMap && (
                    <div className="absolute inset-0 lg:relative lg:w-1/2 lg:flex-shrink-0 z-10 lg:z-auto">
                        <PropertyMap
                            properties={properties}
                            activePropertyId={activePropertyId}
                            className="h-full w-full"
                        />
                        {/* Mobile: Show list button overlay */}
                        <button
                            onClick={toggleMap}
                            className="lg:hidden absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-secondary-900 text-white rounded-full shadow-lg flex items-center gap-2 text-sm font-medium"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                            </svg>
                            Show list
                        </button>
                    </div>
                )}

                {/* Mobile: Floating map button when list is showing */}
                {!showMap && properties.length > 0 && (
                    <button
                        onClick={toggleMap}
                        className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-secondary-900 text-white rounded-full shadow-lg flex items-center gap-2 text-sm font-medium z-20"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                        Map
                    </button>
                )}
            </div>
        </div>
    );
}
