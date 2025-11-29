import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Property } from '../types';
import { getAllProperties } from '../services/propertyService';
import { PropertyCard } from '../components/property';
import { PROPERTY_TYPES } from '../config/constants';
import { Spinner } from '../components/ui';

export default function HomePage() {
    const [properties, setProperties] = useState<Property[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    useEffect(() => {
        const fetchProperties = async () => {
            try {
                setError(null);
                const data = await getAllProperties();
                console.log('Fetched properties:', data);
                setProperties(data);
            } catch (error: unknown) {
                console.error('Error fetching properties:', error);
                const errorMessage = error instanceof Error ? error.message : 'Failed to load properties';
                setError(errorMessage);
            } finally {
                setLoading(false);
            }
        };

        fetchProperties();
    }, []);

    const filteredProperties = selectedCategory
        ? properties.filter((p) => p.propertyType === selectedCategory)
        : properties;

    return (
        <div className="w-full max-w-full overflow-x-hidden">
            {/* Category Filter */}
            <div className="border-b border-secondary-200 sticky top-[80px] bg-white z-20">
                <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
                    <div className="flex items-center space-x-4 sm:space-x-8 py-3 sm:py-4 overflow-x-auto scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0">
                        <button
                            onClick={() => setSelectedCategory(null)}
                            className={`flex flex-col items-center space-y-2 min-w-fit pb-2 border-b-2 transition-colors ${selectedCategory === null
                                ? 'border-secondary-900 text-secondary-900'
                                : 'border-transparent text-secondary-500 hover:text-secondary-700'
                                }`}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                            </svg>
                            <span className="text-xs font-medium">All</span>
                        </button>

                        {PROPERTY_TYPES.map((type) => (
                            <button
                                key={type.id}
                                onClick={() => setSelectedCategory(type.id)}
                                className={`flex flex-col items-center space-y-2 min-w-fit pb-2 border-b-2 transition-colors ${selectedCategory === type.id
                                    ? 'border-secondary-900 text-secondary-900'
                                    : 'border-transparent text-secondary-500 hover:text-secondary-700'
                                    }`}
                            >
                                <span className="text-2xl">{type.icon}</span>
                                <span className="text-xs font-medium">{type.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Properties Grid */}
            <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
                {loading ? (
                    <div className="flex justify-center py-20">
                        <Spinner size="lg" />
                    </div>
                ) : error ? (
                    <div className="text-center py-20">
                        <svg
                            className="w-16 h-16 mx-auto text-red-400 mb-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                        </svg>
                        <h3 className="text-xl font-medium text-secondary-900 mb-2">
                            Error loading properties
                        </h3>
                        <p className="text-secondary-500 mb-6">{error}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="text-primary-500 font-medium hover:underline"
                        >
                            Try again
                        </button>
                    </div>
                ) : filteredProperties.length === 0 ? (
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
                                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                            />
                        </svg>
                        <h3 className="text-xl font-medium text-secondary-900 mb-2">
                            No properties found
                        </h3>
                        <p className="text-secondary-500 mb-6">
                            {selectedCategory
                                ? 'No properties match this category. Try another one.'
                                : 'No properties are available at the moment.'}
                        </p>
                        {selectedCategory && (
                            <button
                                onClick={() => setSelectedCategory(null)}
                                className="text-primary-500 font-medium hover:underline"
                            >
                                View all properties
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredProperties.map((property) => (
                            <PropertyCard key={property.id} property={property} />
                        ))}
                    </div>
                )}
            </main>

            {/* Show Map Toggle - Fixed bottom */}
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-30">
                <Link
                    to="/search?showMap=true"
                    className="inline-flex items-center px-6 py-3 bg-secondary-900 text-white rounded-full shadow-lg hover:bg-secondary-800 transition-colors"
                >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    Show map
                </Link>
            </div>
        </div>
    );
}
