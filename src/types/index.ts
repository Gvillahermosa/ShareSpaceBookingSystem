import type { Timestamp, GeoPoint } from 'firebase/firestore';

// User Types
export interface User {
    id: string;
    email: string;
    name: string;
    photoURL?: string;
    phone?: string;
    bio?: string;
    isHost: boolean;
    createdAt: Timestamp;
    governmentIdURL?: string;
    verified: {
        email: boolean;
        phone: boolean;
        identity: boolean;
    };
    // Host-specific fields
    isSuperhost?: boolean;
    responseRate?: number;
    responseTime?: string;
    languages?: string[];
    reviewCount?: number;
}

export interface UserProfile extends Omit<User, 'id'> {
    userId: string;
}

// Property Types
export type PropertyType = 'entire_place' | 'private_room' | 'shared_room';
export type CancellationPolicy = 'flexible' | 'moderate' | 'strict';
export type PropertyStatus = 'active' | 'paused' | 'pending' | 'rejected';

export interface PropertyLocation {
    address: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
    coordinates: GeoPoint;
}

export interface PricingRules {
    basePrice: number;
    weekendPrice?: number;
    cleaningFee: number;
    weeklyDiscount?: number;
    monthlyDiscount?: number;
    customPricing?: {
        date: string;
        price: number;
    }[];
}

export interface Property {
    id: string;
    hostId: string;
    title: string;
    description: string;
    propertyType: PropertyType;
    location: PropertyLocation;
    pricing: PricingRules;
    maxGuests: number;
    bedrooms: number;
    beds: number;
    bathrooms: number;
    amenities: string[];
    photos: PropertyPhoto[];
    houseRules: string[];
    checkInTime: string;
    checkOutTime: string;
    cancellationPolicy: CancellationPolicy;
    instantBook: boolean;
    minimumStay: number;
    maximumStay?: number;
    advanceNotice: number;
    preparationTime: number;
    blockedDates: string[];
    createdAt: Timestamp;
    updatedAt: Timestamp;
    status: PropertyStatus;
    views: number;
    averageRating?: number;
    reviewCount: number;
    // Additional analytics fields for host dashboard
    bookings?: number;
    occupancyRate?: number;
}

// Helper to get rating info from property
export const getPropertyRating = (property: Property) => ({
    average: property.averageRating ?? 0,
    count: property.reviewCount ?? 0,
});

export interface PropertyPhoto {
    id: string;
    url: string;
    caption?: string;
    room?: string;
    order: number;
}

// Booking Types
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';
export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'partial_refund';

export interface Booking {
    id: string;
    propertyId: string;
    guestId: string;
    guestName?: string;
    guestPhoto?: string;
    hostId: string;
    checkIn: Timestamp;
    checkOut: Timestamp;
    guests: {
        adults: number;
        children: number;
        infants: number;
    };
    pricing: BookingPricing;
    status: BookingStatus;
    paymentStatus: PaymentStatus;
    paymentIntentId?: string;
    specialRequests?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    cancelledAt?: Timestamp;
    cancellationReason?: string;
    refundAmount?: number;
    hasReview?: boolean;
}

export interface BookingPricing {
    nightlyRate: number;
    nights: number;
    subtotal: number;
    cleaningFee: number;
    serviceFee: number;
    taxes: number;
    discount?: number;
    total: number;
}

// Helper to get total price from booking
export const getBookingTotalPrice = (booking: Booking): number => booking.pricing.total;
export const getBookingNightlyRate = (booking: Booking): number => booking.pricing.nightlyRate;

// Review Types
export interface Review {
    id: string;
    propertyId: string;
    bookingId: string;
    guestId: string;
    hostId: string;
    ratings: {
        overall: number;
        cleanliness: number;
        accuracy: number;
        communication: number;
        location: number;
        checkIn: number;
        value: number;
    };
    comment: string;
    photos?: string[];
    createdAt: Timestamp;
    hostResponse?: {
        comment: string;
        createdAt: Timestamp;
    };
}

export interface GuestReview {
    id: string;
    bookingId: string;
    guestId: string;
    hostId: string;
    rating: number;
    comment: string;
    createdAt: Timestamp;
}

// Message Types
export interface Conversation {
    id: string;
    participants: string[];
    propertyId?: string;
    bookingId?: string;
    lastMessage: Message;
    lastMessageTime: Timestamp;
    unreadCount: {
        [userId: string]: number;
    };
    createdAt: Timestamp;
}

export interface Message {
    id: string;
    senderId: string;
    text: string;
    timestamp: Timestamp;
    read: boolean;
    attachments?: {
        type: 'image' | 'document';
        url: string;
        name: string;
    }[];
}

// Wishlist Types
export interface Wishlist {
    id: string;
    userId: string;
    name: string;
    propertyIds: string[];
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

// Search and Filter Types
export interface SearchFilters {
    location?: string;
    checkIn?: Date;
    checkOut?: Date;
    guests?: {
        adults: number;
        children: number;
        infants: number;
    };
    priceRange?: {
        min: number;
        max: number;
    };
    propertyType?: PropertyType[];
    bedrooms?: number;
    bathrooms?: number;
    beds?: number;
    amenities?: string[];
    instantBook?: boolean;
}

export interface SearchResult {
    properties: Property[];
    total: number;
    hasMore: boolean;
}

export type SortOption = 'price_low' | 'price_high' | 'rating' | 'reviews';

// Payout Types
export interface Payout {
    id: string;
    hostId: string;
    bookingId: string;
    amount: number;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    scheduledDate: Timestamp;
    paidDate?: Timestamp;
    paymentMethod: {
        type: 'bank_transfer' | 'paypal';
        details: string;
    };
}

export interface PayoutMethod {
    id: string;
    userId: string;
    type: 'bank_transfer' | 'paypal';
    isDefault: boolean;
    details: {
        accountName?: string;
        accountNumber?: string;
        routingNumber?: string;
        bankName?: string;
        paypalEmail?: string;
    };
    createdAt: Timestamp;
}

// Notification Types
export interface Notification {
    id: string;
    userId: string;
    type: 'booking' | 'message' | 'review' | 'payout' | 'system';
    title: string;
    body: string;
    data?: Record<string, unknown>;
    read: boolean;
    createdAt: Timestamp;
}

// Amenity Categories
export const AMENITY_CATEGORIES = {
    essentials: [
        'wifi',
        'kitchen',
        'washer',
        'dryer',
        'air_conditioning',
        'heating',
        'tv',
        'hair_dryer',
        'iron',
    ],
    features: [
        'pool',
        'hot_tub',
        'gym',
        'free_parking',
        'ev_charger',
        'breakfast',
        'indoor_fireplace',
        'bbq_grill',
        'patio',
        'outdoor_dining',
    ],
    location: [
        'beachfront',
        'waterfront',
        'ski_in_out',
    ],
    safety: [
        'smoke_alarm',
        'carbon_monoxide_alarm',
        'fire_extinguisher',
        'first_aid_kit',
        'security_cameras',
    ],
} as const;

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
