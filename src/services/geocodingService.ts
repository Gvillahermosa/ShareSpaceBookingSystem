

import { MAP_CONFIG } from '../config/constants';

export interface GeocodingResult {
    lat: number;
    lng: number;
    displayName: string;
    address: {
        city?: string;
        state?: string;
        country?: string;
        zipCode?: string;
    };
}

export interface LocationSuggestion {
    displayName: string;
    lat: number;
    lng: number;
    type: string;
}

// Geocode address to coordinates using Nominatim
export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
    try {
        const encodedAddress = encodeURIComponent(address);
        const response = await fetch(
            `${MAP_CONFIG.NOMINATIM_URL}/search?format=json&q=${encodedAddress}&limit=1&addressdetails=1`
        );

        if (!response.ok) {
            throw new Error('Geocoding request failed');
        }

        const data = await response.json();

        if (data.length === 0) {
            return null;
        }

        const result = data[0];
        return {
            lat: parseFloat(result.lat),
            lng: parseFloat(result.lon),
            displayName: result.display_name,
            address: {
                city: result.address?.city || result.address?.town || result.address?.village,
                state: result.address?.state,
                country: result.address?.country,
                zipCode: result.address?.postcode,
            },
        };
    } catch (error) {
        console.error('Geocoding error:', error);
        return null;
    }
}

// Reverse geocode coordinates to address
export async function reverseGeocode(
    lat: number,
    lng: number
): Promise<GeocodingResult | null> {
    try {
        const response = await fetch(
            `${MAP_CONFIG.NOMINATIM_URL}/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`
        );

        if (!response.ok) {
            throw new Error('Reverse geocoding request failed');
        }

        const data = await response.json();

        if (data.error) {
            return null;
        }

        return {
            lat: parseFloat(data.lat),
            lng: parseFloat(data.lon),
            displayName: data.display_name,
            address: {
                city: data.address?.city || data.address?.town || data.address?.village,
                state: data.address?.state,
                country: data.address?.country,
                zipCode: data.address?.postcode,
            },
        };
    } catch (error) {
        console.error('Reverse geocoding error:', error);
        return null;
    }
}

// Get location suggestions for autocomplete
export async function getLocationSuggestions(
    query: string
): Promise<LocationSuggestion[]> {
    if (!query || query.length < 2) {
        return [];
    }

    try {
        const encodedQuery = encodeURIComponent(query);
        const response = await fetch(
            `${MAP_CONFIG.NOMINATIM_URL}/search?format=json&q=${encodedQuery}&limit=5&addressdetails=1`
        );

        if (!response.ok) {
            throw new Error('Location search request failed');
        }

        const data = await response.json();

        return data.map((item: any) => ({
            displayName: item.display_name,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
            type: item.type,
        }));
    } catch (error) {
        console.error('Location search error:', error);
        return [];
    }
}

// Calculate distance between two points (Haversine formula)
export function calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return Math.round(distance * 100) / 100;
}

function toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
}

// Get user's current location
export function getCurrentLocation(): Promise<{ lat: number; lng: number }> {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported by your browser'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                });
            },
            (error) => {
                reject(error);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000, // 5 minutes
            }
        );
    });
}

// Convert bounds to search radius
export function boundsToRadius(bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
}): { center: { lat: number; lng: number }; radiusKm: number } {
    const centerLat = (bounds.north + bounds.south) / 2;
    const centerLng = (bounds.east + bounds.west) / 2;

    // Calculate the distance from center to corner
    const radiusKm = calculateDistance(
        centerLat,
        centerLng,
        bounds.north,
        bounds.east
    );

    return {
        center: { lat: centerLat, lng: centerLng },
        radiusKm,
    };
}

// Format distance for display
export function formatDistance(distanceKm: number): string {
    if (distanceKm < 1) {
        return `${Math.round(distanceKm * 1000)} m`;
    }
    return `${distanceKm.toFixed(1)} km`;
}
