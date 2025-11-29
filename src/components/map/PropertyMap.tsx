import { useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Icon, LatLngBounds, DivIcon } from 'leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { Link } from 'react-router-dom';
import type { Property } from '../../types';
import { MAP_CONFIG } from '../../config/constants';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet
const defaultIcon = new Icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

// Create price marker icon (Airbnb style)
function createPriceIcon(price: number, isActive: boolean = false) {
    const formatPrice = (price: number) => {
        if (price >= 1000) {
            return `₱${(price / 1000).toFixed(0)}k`;
        }
        return `₱${price}`;
    };

    return new DivIcon({
        className: 'custom-price-marker',
        html: `
            <div class="price-marker ${isActive ? 'active' : ''}">
                ${formatPrice(price)}
            </div>
        `,
        iconSize: [60, 30],
        iconAnchor: [30, 15],
    });
}

// Simple preview card for map popups
function MapPropertyPreview({ property }: { property: Property }) {
    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'PHP',
            minimumFractionDigits: 0,
        }).format(price);
    };

    return (
        <div className="w-64">
            {/* Image */}
            <div className="aspect-[4/3] rounded-lg overflow-hidden bg-secondary-100 mb-2">
                {property.photos.length > 0 ? (
                    <img
                        src={property.photos[0]?.url}
                        alt={property.title}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-secondary-400">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                )}
            </div>

            {/* Content */}
            <div>
                <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-gray-900 text-sm truncate flex-1">
                        {property.location.city}, {property.location.state}
                    </h3>
                    {(property.averageRating ?? 0) > 0 && (
                        <div className="flex items-center ml-2">
                            <svg className="w-3 h-3 text-gray-900" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            <span className="ml-1 text-xs text-gray-900">{property.averageRating?.toFixed(1)}</span>
                        </div>
                    )}
                </div>
                <p className="text-gray-600 text-xs truncate mt-0.5">{property.title}</p>
                <p className="text-gray-600 text-xs">
                    {property.bedrooms} bed{property.bedrooms !== 1 ? 's' : ''} · {property.bathrooms} bath{property.bathrooms !== 1 ? 's' : ''}
                </p>
                <p className="mt-1 text-sm">
                    <span className="font-semibold text-gray-900">{formatPrice(property.pricing.basePrice)}</span>
                    <span className="text-gray-600"> night</span>
                </p>

                {/* View Details Button */}
                <Link
                    to={`/property/${property.id}`}
                    className="mt-2 block w-full text-center py-2 px-3 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 transition-colors"
                    style={{ color: 'white' }}
                >
                    View Details
                </Link>
            </div>
        </div>
    );
}

interface PropertyMapProps {
    properties: Property[];
    center?: [number, number];
    zoom?: number;
    onPropertyClick?: (property: Property) => void;
    activePropertyId?: string;
    showClusters?: boolean;
    className?: string;
}

// Component to fit bounds to markers
function FitBounds({ properties }: { properties: Property[] }) {
    const map = useMap();

    useEffect(() => {
        // Filter properties with valid coordinates
        const validProperties = properties.filter(hasValidCoordinates);

        if (validProperties.length > 0) {
            const bounds = new LatLngBounds(
                validProperties.map((p) => getCoordinates(p))
            );
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        }
    }, [properties, map]);

    return null;
}

// Helper function to check if coordinates are valid
function hasValidCoordinates(property: Property): boolean {
    const coords = property.location?.coordinates;
    if (!coords) return false;

    // Handle both GeoPoint object and plain object with lat/lng
    const lat = typeof coords.latitude === 'number' ? coords.latitude : (coords as unknown as { lat: number }).lat;
    const lng = typeof coords.longitude === 'number' ? coords.longitude : (coords as unknown as { lng: number }).lng;

    // Check for valid coordinates (not 0,0 which is the default)
    return lat !== 0 || lng !== 0;
}

// Helper function to get coordinates from property
function getCoordinates(property: Property): [number, number] {
    const coords = property.location.coordinates;
    // Handle both GeoPoint object and plain object with lat/lng
    const lat = typeof coords.latitude === 'number' ? coords.latitude : (coords as unknown as { lat: number }).lat;
    const lng = typeof coords.longitude === 'number' ? coords.longitude : (coords as unknown as { lng: number }).lng;
    return [lat, lng];
}

export default function PropertyMap({
    properties,
    center = [MAP_CONFIG.DEFAULT_CENTER.lat, MAP_CONFIG.DEFAULT_CENTER.lng],
    zoom = MAP_CONFIG.DEFAULT_ZOOM,
    onPropertyClick,
    activePropertyId,
    showClusters = true,
    className = 'h-full w-full min-h-[400px]',
}: PropertyMapProps) {
    // Filter properties with valid coordinates
    const validProperties = useMemo(() => {
        const valid = properties.filter(hasValidCoordinates);
        const invalidCount = properties.length - valid.length;
        if (invalidCount > 0) {
            console.warn(`PropertyMap: ${invalidCount} property(ies) hidden due to missing/invalid coordinates (0,0)`);
        }
        return valid;
    }, [properties]);

    const markers = useMemo(() => {
        return validProperties.map((property) => {
            const position = getCoordinates(property);
            const isActive = activePropertyId === property.id;

            return (
                <Marker
                    key={property.id}
                    position={position}
                    icon={createPriceIcon(property.pricing.basePrice, isActive)}
                    eventHandlers={{
                        click: () => onPropertyClick?.(property),
                    }}
                >
                    <Popup className="property-popup" maxWidth={280} minWidth={260}>
                        <MapPropertyPreview property={property} />
                    </Popup>
                </Marker>
            );
        });
    }, [validProperties, activePropertyId, onPropertyClick]);

    return (
        <MapContainer
            center={center}
            zoom={zoom}
            className={className}
            scrollWheelZoom={true}
            zoomControl={false}
        >
            <TileLayer
                attribution={MAP_CONFIG.TILE_ATTRIBUTION}
                url={MAP_CONFIG.TILE_URL}
            />

            {validProperties.length > 0 && <FitBounds properties={validProperties} />}

            {showClusters ? (
                <MarkerClusterGroup
                    chunkedLoading
                    spiderfyOnMaxZoom
                    showCoverageOnHover={false}
                    maxClusterRadius={50}
                    iconCreateFunction={(cluster: { getChildCount: () => number }) => {
                        const count = cluster.getChildCount();

                        return new DivIcon({
                            className: 'custom-cluster-marker',
                            html: `<div class="cluster-marker">${count}</div>`,
                            iconSize: [40, 40],
                            iconAnchor: [20, 20],
                        });
                    }}
                >
                    {markers}
                </MarkerClusterGroup>
            ) : (
                markers
            )}

            <MapControls />
        </MapContainer>
    );
}

function MapControls() {
    const map = useMap();

    const handleZoomIn = () => map.zoomIn();
    const handleZoomOut = () => map.zoomOut();
    const handleLocate = () => {
        map.locate().on('locationfound', (e) => {
            map.flyTo(e.latlng, 13);
        });
    };

    return (
        <div className="absolute right-4 top-4 z-[1000] flex flex-col space-y-2">
            <button
                onClick={handleZoomIn}
                className="w-10 h-10 bg-white rounded-lg shadow-md flex items-center justify-center hover:bg-secondary-50 transition-colors"
                aria-label="Zoom in"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
            </button>
            <button
                onClick={handleZoomOut}
                className="w-10 h-10 bg-white rounded-lg shadow-md flex items-center justify-center hover:bg-secondary-50 transition-colors"
                aria-label="Zoom out"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
            </button>
            <button
                onClick={handleLocate}
                className="w-10 h-10 bg-white rounded-lg shadow-md flex items-center justify-center hover:bg-secondary-50 transition-colors"
                aria-label="My location"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            </button>
        </div>
    );
}

// Export a simple location picker map for creating listings
interface LocationPickerProps {
    value?: { lat: number; lng: number };
    onChange: (location: { lat: number; lng: number }) => void;
    className?: string;
}

export function LocationPicker({ value, onChange, className = 'h-[400px]' }: LocationPickerProps) {
    const position: [number, number] = value
        ? [value.lat, value.lng]
        : [MAP_CONFIG.DEFAULT_CENTER.lat, MAP_CONFIG.DEFAULT_CENTER.lng];

    return (
        <MapContainer
            center={position}
            zoom={value ? 15 : MAP_CONFIG.DEFAULT_ZOOM}
            className={className}
            scrollWheelZoom={true}
        >
            <TileLayer
                attribution={MAP_CONFIG.TILE_ATTRIBUTION}
                url={MAP_CONFIG.TILE_URL}
            />
            <LocationPickerMarker value={value} onChange={onChange} />
        </MapContainer>
    );
}

function LocationPickerMarker({
    value,
    onChange,
}: {
    value?: { lat: number; lng: number };
    onChange: (location: { lat: number; lng: number }) => void;
}) {
    const map = useMap();

    useEffect(() => {
        const handleClick = (e: L.LeafletMouseEvent) => {
            onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
        };

        map.on('click', handleClick);
        return () => {
            map.off('click', handleClick);
        };
    }, [map, onChange]);

    if (!value) return null;

    return (
        <Marker position={[value.lat, value.lng]} icon={defaultIcon}>
            <Popup>Selected location</Popup>
        </Marker>
    );
}
