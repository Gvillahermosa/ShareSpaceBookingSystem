// Environment variables
export const ENV = {
    FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
    FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    FIREBASE_STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    FIREBASE_MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID,
    STRIPE_PUBLISHABLE_KEY: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
    MAPBOX_ACCESS_TOKEN: import.meta.env.VITE_MAPBOX_ACCESS_TOKEN,
};

// App constants
export const APP_CONFIG = {
    APP_NAME: 'ShareSpace',
    SUPPORT_EMAIL: 'support@sharespace.com',
    MAX_PHOTOS_PER_LISTING: 20,
    MIN_PHOTOS_PER_LISTING: 5,
    MAX_PHOTO_SIZE_MB: 10,
    SUPPORTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
    DEFAULT_CURRENCY: 'USD',
    SERVICE_FEE_GUEST_PERCENT: 0.12,
    SERVICE_FEE_HOST_PERCENT: 0.03,
    TAX_RATE: 0.08,
    PAYOUT_DELAY_HOURS: 24,
};

// Map configuration
export const MAP_CONFIG = {
    DEFAULT_CENTER: { lat: 10.3157, lng: 123.8854 }, // Cebu, Philippines
    DEFAULT_ZOOM: 10, // Zoom level to show whole Cebu island
    MIN_ZOOM: 3,
    MAX_ZOOM: 18,
    TILE_URL: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    TILE_ATTRIBUTION: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    NOMINATIM_URL: 'https://nominatim.openstreetmap.org',
};

// Cancellation policies as array for ListingWizard dropdown
export const CANCELLATION_POLICIES = [
    {
        id: 'flexible',
        name: 'Flexible',
        description: 'Full refund up to 24 hours before check-in',
        refundPercentage: 100,
        cutoffHours: 24,
    },
    {
        id: 'moderate',
        name: 'Moderate',
        description: 'Full refund up to 5 days before check-in',
        refundPercentage: 100,
        cutoffHours: 120,
    },
    {
        id: 'strict',
        name: 'Strict',
        description: '50% refund up to 1 week before check-in',
        refundPercentage: 50,
        cutoffHours: 168,
    },
];

// Property type labels
export const PROPERTY_TYPE_LABELS = {
    entire_place: 'Entire place',
    private_room: 'Private room',
    shared_room: 'Shared room',
};

// Property types array for selection
export const PROPERTY_TYPES = [
    { id: 'entire_place', label: 'Entire place', description: 'Guests have the whole place to themselves', icon: '🏠' },
    { id: 'private_room', label: 'Private room', description: 'Guests have their own room but share some spaces', icon: '🚪' },
    { id: 'shared_room', label: 'Shared room', description: 'Guests sleep in a shared space', icon: '🛏️' },
] as const;

// Booking status labels
export const BOOKING_STATUS_LABELS = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    cancelled: 'Cancelled',
    completed: 'Completed',
};

// Amenity Categories as array for ListingWizard
export const AMENITY_CATEGORIES = [
    {
        name: 'Essentials',
        amenities: [
            { id: 'wifi', label: 'WiFi', icon: '📶' },
            { id: 'kitchen', label: 'Kitchen', icon: '🍳' },
            { id: 'washer', label: 'Washer', icon: '🧺' },
            { id: 'dryer', label: 'Dryer', icon: '👕' },
            { id: 'air_conditioning', label: 'Air conditioning', icon: '❄️' },
            { id: 'heating', label: 'Heating', icon: '🔥' },
            { id: 'tv', label: 'TV', icon: '📺' },
            { id: 'hair_dryer', label: 'Hair dryer', icon: '💇' },
            { id: 'iron', label: 'Iron', icon: '👔' },
        ],
    },
    {
        name: 'Features',
        amenities: [
            { id: 'pool', label: 'Pool', icon: '🏊' },
            { id: 'hot_tub', label: 'Hot tub', icon: '🛁' },
            { id: 'gym', label: 'Gym', icon: '🏋️' },
            { id: 'free_parking', label: 'Free parking', icon: '🅿️' },
            { id: 'ev_charger', label: 'EV charger', icon: '🔌' },
            { id: 'breakfast', label: 'Breakfast', icon: '🥐' },
            { id: 'indoor_fireplace', label: 'Indoor fireplace', icon: '🪵' },
            { id: 'bbq_grill', label: 'BBQ grill', icon: '🍖' },
            { id: 'patio', label: 'Patio', icon: '🌿' },
            { id: 'outdoor_dining', label: 'Outdoor dining', icon: '🍽️' },
        ],
    },
    {
        name: 'Location',
        amenities: [
            { id: 'beachfront', label: 'Beachfront', icon: '🏖️' },
            { id: 'waterfront', label: 'Waterfront', icon: '🌊' },
            { id: 'ski_in_out', label: 'Ski-in/Ski-out', icon: '⛷️' },
        ],
    },
    {
        name: 'Safety',
        amenities: [
            { id: 'smoke_alarm', label: 'Smoke alarm', icon: '🚨' },
            { id: 'carbon_monoxide_alarm', label: 'Carbon monoxide alarm', icon: '🔔' },
            { id: 'fire_extinguisher', label: 'Fire extinguisher', icon: '🧯' },
            { id: 'first_aid_kit', label: 'First aid kit', icon: '🩹' },
            { id: 'security_cameras', label: 'Security cameras', icon: '📹' },
        ],
    },
];

export const AMENITY_LABELS: Record<string, string> = {
    wifi: 'WiFi',
    kitchen: 'Kitchen',
    washer: 'Washer',
    dryer: 'Dryer',
    air_conditioning: 'Air conditioning',
    heating: 'Heating',
    tv: 'TV',
    hair_dryer: 'Hair dryer',
    iron: 'Iron',
    pool: 'Pool',
    hot_tub: 'Hot tub',
    gym: 'Gym',
    free_parking: 'Free parking',
    ev_charger: 'EV charger',
    breakfast: 'Breakfast',
    indoor_fireplace: 'Indoor fireplace',
    bbq_grill: 'BBQ grill',
    patio: 'Patio',
    outdoor_dining: 'Outdoor dining',
    beachfront: 'Beachfront',
    waterfront: 'Waterfront',
    ski_in_out: 'Ski-in/Ski-out',
    smoke_alarm: 'Smoke alarm',
    carbon_monoxide_alarm: 'Carbon monoxide alarm',
    fire_extinguisher: 'Fire extinguisher',
    first_aid_kit: 'First aid kit',
    security_cameras: 'Security cameras',
};

// Routes
export const ROUTES = {
    HOME: '/',
    SEARCH: '/search',
    PROPERTY: '/property/:id',
    BOOKING: '/booking/:id',
    TRIPS: '/trips',
    WISHLISTS: '/wishlists',
    MESSAGES: '/messages',
    NOTIFICATIONS: '/notifications',
    PROFILE: '/profile',
    SETTINGS: '/settings',
    LOGIN: '/login',
    SIGNUP: '/signup',
    HOST: {
        DASHBOARD: '/host',
        LISTINGS: '/host/listings',
        LISTING_NEW: '/host/listings/new',
        LISTING_EDIT: '/host/listings/:id/edit',
        RESERVATIONS: '/host/reservations',
        CALENDAR: '/host/calendar',
        EARNINGS: '/host/earnings',
        REVIEWS: '/host/reviews',
    },
    ADMIN: {
        DASHBOARD: '/admin',
        USERS: '/admin/users',
        PROPERTIES: '/admin/properties',
        BOOKINGS: '/admin/bookings',
        REPORTS: '/admin/reports',
    },
};
