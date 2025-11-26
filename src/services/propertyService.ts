import {
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    startAfter,
    Timestamp,
} from 'firebase/firestore';
import type { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Property, PropertyStatus, SearchFilters, User } from '../types';

const PROPERTIES_COLLECTION = 'properties';
const USERS_COLLECTION = 'users';

// Get user by ID
export async function getUserById(userId: string): Promise<User | null> {
    const docRef = doc(db, USERS_COLLECTION, userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as User;
    }
    return null;
}

// Get property by ID
export async function getProperty(propertyId: string): Promise<Property | null> {
    const docRef = doc(db, PROPERTIES_COLLECTION, propertyId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Property;
    }
    return null;
}

// Alias for getProperty
export const getPropertyById = getProperty;

// Get properties with filters
export async function getProperties(
    filters: SearchFilters,
    sortBy: string = 'createdAt',
    pageSize: number = 20,
    lastDoc?: QueryDocumentSnapshot<DocumentData>
): Promise<{ properties: Property[]; lastDoc: QueryDocumentSnapshot<DocumentData> | null }> {
    let q = query(
        collection(db, PROPERTIES_COLLECTION),
        where('status', '==', 'active' as PropertyStatus)
    );

    // Apply filters
    if (filters.propertyType && filters.propertyType.length > 0) {
        q = query(q, where('propertyType', 'in', filters.propertyType));
    }

    if (filters.bedrooms) {
        q = query(q, where('bedrooms', '>=', filters.bedrooms));
    }

    if (filters.bathrooms) {
        q = query(q, where('bathrooms', '>=', filters.bathrooms));
    }

    if (filters.guests) {
        const totalGuests = filters.guests.adults + filters.guests.children;
        q = query(q, where('maxGuests', '>=', totalGuests));
    }

    if (filters.instantBook) {
        q = query(q, where('instantBook', '==', true));
    }

    // Sort
    if (sortBy === 'price_low') {
        q = query(q, orderBy('pricing.basePrice', 'asc'));
    } else if (sortBy === 'price_high') {
        q = query(q, orderBy('pricing.basePrice', 'desc'));
    } else if (sortBy === 'rating') {
        q = query(q, orderBy('averageRating', 'desc'));
    } else if (sortBy === 'reviews') {
        q = query(q, orderBy('reviewCount', 'desc'));
    } else {
        q = query(q, orderBy('createdAt', 'desc'));
    }

    // Pagination
    q = query(q, limit(pageSize));
    if (lastDoc) {
        q = query(q, startAfter(lastDoc));
    }

    const snapshot = await getDocs(q);
    const properties = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    })) as Property[];

    const newLastDoc = snapshot.docs[snapshot.docs.length - 1] || null;

    // Apply client-side filters that can't be done in Firestore
    let filteredProperties = properties;

    if (filters.priceRange) {
        filteredProperties = filteredProperties.filter(
            (p) =>
                p.pricing.basePrice >= (filters.priceRange?.min || 0) &&
                p.pricing.basePrice <= (filters.priceRange?.max || Infinity)
        );
    }

    if (filters.amenities && filters.amenities.length > 0) {
        filteredProperties = filteredProperties.filter((p) =>
            filters.amenities!.every((amenity) => p.amenities.includes(amenity))
        );
    }

    return { properties: filteredProperties, lastDoc: newLastDoc };
}

// Get properties by host
export async function getPropertiesByHost(hostId: string): Promise<Property[]> {
    // Just delegate to getHostProperties to avoid duplication
    return getHostProperties(hostId);
}

// Create property
export async function createProperty(
    propertyData: Omit<Property, 'id' | 'createdAt' | 'updatedAt' | 'views' | 'reviewCount'>
): Promise<string> {
    const dataToSave = {
        ...propertyData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        views: 0,
        reviewCount: 0,
        status: 'active' as PropertyStatus,
    };

    console.log('Creating property with data:', dataToSave);

    const docRef = await addDoc(collection(db, PROPERTIES_COLLECTION), dataToSave);

    console.log('Property created with ID:', docRef.id);
    return docRef.id;
}

// Update property
export async function updateProperty(
    propertyId: string,
    data: Partial<Property>
): Promise<void> {
    const docRef = doc(db, PROPERTIES_COLLECTION, propertyId);
    await updateDoc(docRef, {
        ...data,
        updatedAt: Timestamp.now(),
    });
}

// Delete property
export async function deleteProperty(propertyId: string): Promise<void> {
    const docRef = doc(db, PROPERTIES_COLLECTION, propertyId);
    await deleteDoc(docRef);
}

// Increment property views
export async function incrementPropertyViews(propertyId: string): Promise<void> {
    const docRef = doc(db, PROPERTIES_COLLECTION, propertyId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const currentViews = docSnap.data().views || 0;
        await updateDoc(docRef, { views: currentViews + 1 });
    }
}

// Search properties by location (using bounds)
export async function searchPropertiesByBounds(
    bounds: {
        north: number;
        south: number;
        east: number;
        west: number;
    },
    _filters?: SearchFilters
): Promise<Property[]> {
    // Note: Firestore doesn't support geospatial queries natively
    // This is a simplified version - for production, use Geohashing or a service like Algolia
    const q = query(
        collection(db, PROPERTIES_COLLECTION),
        where('status', '==', 'active' as PropertyStatus),
        limit(100)
    );

    const snapshot = await getDocs(q);
    const properties = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    })) as Property[];

    // Filter by bounds client-side
    return properties.filter((p) => {
        const lat = p.location.coordinates.latitude;
        const lng = p.location.coordinates.longitude;
        return (
            lat >= bounds.south &&
            lat <= bounds.north &&
            lng >= bounds.west &&
            lng <= bounds.east
        );
    });
}

// Get featured properties
export async function getFeaturedProperties(count: number = 10): Promise<Property[]> {
    const q = query(
        collection(db, PROPERTIES_COLLECTION),
        where('status', '==', 'active' as PropertyStatus),
        orderBy('averageRating', 'desc'),
        limit(count)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    })) as Property[];
}

// Get property availability (check for blocked dates and existing bookings)
export async function checkPropertyAvailability(
    propertyId: string,
    checkIn: Date,
    checkOut: Date
): Promise<boolean> {
    const property = await getProperty(propertyId);
    if (!property) return false;

    // Check blocked dates
    const checkInStr = checkIn.toISOString().split('T')[0];
    const checkOutStr = checkOut.toISOString().split('T')[0];

    for (const blockedDate of property.blockedDates) {
        if (blockedDate >= checkInStr && blockedDate < checkOutStr) {
            return false;
        }
    }

    // Check existing bookings (this would be done in Cloud Functions in production)
    const bookingsQuery = query(
        collection(db, 'bookings'),
        where('propertyId', '==', propertyId),
        where('status', 'in', ['pending', 'confirmed'])
    );

    const bookingsSnapshot = await getDocs(bookingsQuery);

    for (const doc of bookingsSnapshot.docs) {
        const booking = doc.data();
        const existingCheckIn = booking.checkIn.toDate();
        const existingCheckOut = booking.checkOut.toDate();

        // Check for date overlap
        if (checkIn < existingCheckOut && checkOut > existingCheckIn) {
            return false;
        }
    }

    return true;
}

// Get all properties (for home page)
export async function getAllProperties(): Promise<Property[]> {
    console.log('getAllProperties: Starting to fetch properties...');

    try {
        // First try with ordering (requires composite index)
        const q = query(
            collection(db, PROPERTIES_COLLECTION),
            where('status', '==', 'active' as PropertyStatus),
            orderBy('createdAt', 'desc'),
            limit(50)
        );

        const snapshot = await getDocs(q);
        console.log('getAllProperties: Fetched', snapshot.docs.length, 'properties with index');
        return snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as Property[];
    } catch (error: any) {
        console.warn('getAllProperties: First query failed:', error?.code, error?.message);

        // If index error, try without ordering
        if (error?.code === 'failed-precondition' || error?.message?.includes('index')) {
            console.warn('Firestore index not found, fetching without order. Please create the required index.');
            try {
                const q = query(
                    collection(db, PROPERTIES_COLLECTION),
                    where('status', '==', 'active' as PropertyStatus),
                    limit(50)
                );
                const snapshot = await getDocs(q);
                console.log('getAllProperties: Fetched', snapshot.docs.length, 'properties without order');
                const properties = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Property[];
                // Sort client-side
                return properties.sort((a, b) => {
                    const dateA = a.createdAt?.toDate?.() || new Date(0);
                    const dateB = b.createdAt?.toDate?.() || new Date(0);
                    return dateB.getTime() - dateA.getTime();
                });
            } catch (innerError: any) {
                console.warn('getAllProperties: Status query also failed:', innerError?.message);
            }
        }

        // Final fallback: fetch all properties without any filter
        console.warn('getAllProperties: Using final fallback - fetching all properties');
        const q = query(
            collection(db, PROPERTIES_COLLECTION),
            limit(50)
        );
        const snapshot = await getDocs(q);
        console.log('getAllProperties: Fetched', snapshot.docs.length, 'total properties (unfiltered)');

        // Filter and sort client-side
        const allProperties = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as Property[];

        // Only return active ones (or all if no status field exists)
        return allProperties
            .filter(p => !p.status || p.status === 'active')
            .sort((a, b) => {
                const dateA = a.createdAt?.toDate?.() || new Date(0);
                const dateB = b.createdAt?.toDate?.() || new Date(0);
                return dateB.getTime() - dateA.getTime();
            });
    }
}

// Search properties with filters
export async function searchProperties(filters: SearchFilters): Promise<Property[]> {
    let q = query(
        collection(db, PROPERTIES_COLLECTION),
        where('status', '==', 'active' as PropertyStatus)
    );

    // Apply property type filter
    if (filters.propertyType && filters.propertyType.length > 0) {
        q = query(q, where('propertyType', 'in', filters.propertyType));
    }

    // Apply bedrooms filter
    if (filters.bedrooms) {
        q = query(q, where('bedrooms', '>=', filters.bedrooms));
    }

    // Apply instant book filter
    if (filters.instantBook) {
        q = query(q, where('instantBook', '==', true));
    }

    q = query(q, orderBy('createdAt', 'desc'), limit(100));

    const snapshot = await getDocs(q);
    let properties = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    })) as Property[];

    // Apply client-side filters
    if (filters.priceRange) {
        properties = properties.filter(
            (p) =>
                p.pricing.basePrice >= (filters.priceRange?.min || 0) &&
                p.pricing.basePrice <= (filters.priceRange?.max || Infinity)
        );
    }

    if (filters.amenities && filters.amenities.length > 0) {
        properties = properties.filter((p) =>
            filters.amenities!.every((amenity) => p.amenities.includes(amenity))
        );
    }

    if (filters.guests) {
        const totalGuests = filters.guests.adults + filters.guests.children;
        properties = properties.filter((p) => p.maxGuests >= totalGuests);
    }

    if (filters.bathrooms) {
        properties = properties.filter((p) => p.bathrooms >= filters.bathrooms!);
    }

    if (filters.beds) {
        properties = properties.filter((p) => p.beds >= filters.beds!);
    }

    return properties;
}

// Get host properties
export async function getHostProperties(hostId: string): Promise<Property[]> {
    console.log('getHostProperties: Fetching properties for host:', hostId);

    try {
        // First try with ordering (requires composite index)
        const q = query(
            collection(db, PROPERTIES_COLLECTION),
            where('hostId', '==', hostId),
            orderBy('createdAt', 'desc')
        );

        const snapshot = await getDocs(q);
        console.log('getHostProperties: Fetched', snapshot.docs.length, 'properties with index');
        return snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as Property[];
    } catch (error: any) {
        console.warn('getHostProperties: Ordered query failed:', error?.code, error?.message);

        // If index error, try without ordering
        if (error?.code === 'failed-precondition' || error?.message?.includes('index')) {
            console.warn('Firestore index not found for host properties, fetching without order.');
        }

        // Fallback: query without ordering
        const q = query(
            collection(db, PROPERTIES_COLLECTION),
            where('hostId', '==', hostId)
        );
        const snapshot = await getDocs(q);
        console.log('getHostProperties: Fetched', snapshot.docs.length, 'properties without order');

        const properties = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as Property[];

        // Sort client-side
        return properties.sort((a, b) => {
            const dateA = a.createdAt?.toDate?.() || new Date(0);
            const dateB = b.createdAt?.toDate?.() || new Date(0);
            return dateB.getTime() - dateA.getTime();
        });
    }
}
