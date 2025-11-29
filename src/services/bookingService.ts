import {
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    query,
    where,
    orderBy,
    Timestamp,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../config/firebase';
import type { Booking, BookingPricing, BookingStatus, Property } from '../types';
import { APP_CONFIG } from '../config/constants';
import { differenceInDays, isWeekend } from 'date-fns';

const BOOKINGS_COLLECTION = 'bookings';

// Calculate booking price
export function calculateBookingPrice(
    property: Property,
    checkIn: Date,
    checkOut: Date,
    _guests: { adults: number; children: number; infants: number }
): BookingPricing {
    const nights = differenceInDays(checkOut, checkIn);

    let subtotal = 0;
    const currentDate = new Date(checkIn);

    for (let i = 0; i < nights; i++) {
        // Check for custom pricing
        const dateStr = currentDate.toISOString().split('T')[0];
        const customPrice = property.pricing.customPricing?.find(
            (cp) => cp.date === dateStr
        );

        if (customPrice) {
            subtotal += customPrice.price;
        } else if (isWeekend(currentDate) && property.pricing.weekendPrice) {
            subtotal += property.pricing.weekendPrice;
        } else {
            subtotal += property.pricing.basePrice;
        }

        currentDate.setDate(currentDate.getDate() + 1);
    }

    // Apply length of stay discounts
    if (nights >= 28 && property.pricing.monthlyDiscount) {
        subtotal = subtotal * (1 - property.pricing.monthlyDiscount / 100);
    } else if (nights >= 7 && property.pricing.weeklyDiscount) {
        subtotal = subtotal * (1 - property.pricing.weeklyDiscount / 100);
    }

    const cleaningFee = property.pricing.cleaningFee;
    const serviceFee = subtotal * APP_CONFIG.SERVICE_FEE_GUEST_PERCENT;
    const taxes = (subtotal + cleaningFee + serviceFee) * APP_CONFIG.TAX_RATE;
    const total = subtotal + cleaningFee + serviceFee + taxes;

    return {
        nightlyRate: property.pricing.basePrice,
        nights,
        subtotal: Math.round(subtotal * 100) / 100,
        cleaningFee,
        serviceFee: Math.round(serviceFee * 100) / 100,
        taxes: Math.round(taxes * 100) / 100,
        total: Math.round(total * 100) / 100,
    };
}

// Get booking by ID
export async function getBooking(bookingId: string): Promise<Booking | null> {
    const docRef = doc(db, BOOKINGS_COLLECTION, bookingId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Booking;
    }
    return null;
}

// Get bookings by guest
export async function getGuestBookings(guestId: string): Promise<Booking[]> {
    console.log('getGuestBookings: Fetching bookings for guest:', guestId);

    try {
        const q = query(
            collection(db, BOOKINGS_COLLECTION),
            where('guestId', '==', guestId),
            orderBy('createdAt', 'desc')
        );

        const snapshot = await getDocs(q);
        console.log('getGuestBookings: Fetched', snapshot.docs.length, 'bookings with index');
        return snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as Booking[];
    } catch (error: unknown) {
        const err = error as { code?: string; message?: string };
        console.warn('getGuestBookings: Ordered query failed:', err?.code, err?.message);

        // Fallback: query without ordering
        const q = query(
            collection(db, BOOKINGS_COLLECTION),
            where('guestId', '==', guestId)
        );
        const snapshot = await getDocs(q);
        console.log('getGuestBookings: Fetched', snapshot.docs.length, 'bookings without order');

        const bookings = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as Booking[];

        // Sort client-side
        return bookings.sort((a, b) => {
            const dateA = a.createdAt?.toDate?.() || new Date(0);
            const dateB = b.createdAt?.toDate?.() || new Date(0);
            return dateB.getTime() - dateA.getTime();
        });
    }
}

// Get bookings by host
export async function getHostBookings(hostId: string): Promise<Booking[]> {
    console.log('getHostBookings: Fetching bookings for host:', hostId);

    try {
        const q = query(
            collection(db, BOOKINGS_COLLECTION),
            where('hostId', '==', hostId),
            orderBy('createdAt', 'desc')
        );

        const snapshot = await getDocs(q);
        console.log('getHostBookings: Fetched', snapshot.docs.length, 'bookings with index');
        return snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as Booking[];
    } catch (error: unknown) {
        const err = error as { code?: string; message?: string };
        console.warn('getHostBookings: Ordered query failed:', err?.code, err?.message);

        // Fallback: query without ordering
        const q = query(
            collection(db, BOOKINGS_COLLECTION),
            where('hostId', '==', hostId)
        );
        const snapshot = await getDocs(q);
        console.log('getHostBookings: Fetched', snapshot.docs.length, 'bookings without order');

        const bookings = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as Booking[];

        // Sort client-side
        return bookings.sort((a, b) => {
            const dateA = a.createdAt?.toDate?.() || new Date(0);
            const dateB = b.createdAt?.toDate?.() || new Date(0);
            return dateB.getTime() - dateA.getTime();
        });
    }
}

// Get bookings by property
export async function getPropertyBookings(propertyId: string): Promise<Booking[]> {
    const q = query(
        collection(db, BOOKINGS_COLLECTION),
        where('propertyId', '==', propertyId),
        where('status', 'in', ['pending', 'confirmed']),
        orderBy('checkIn', 'asc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    })) as Booking[];
}

// Create booking (client-side for instant book, or via Cloud Function)
export async function createBooking(
    bookingData: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
    // For instant book, create directly
    const docRef = await addDoc(collection(db, BOOKINGS_COLLECTION), {
        ...bookingData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
    });

    return docRef.id;
}

// Create booking via Cloud Function (handles validation and notifications)
export async function createBookingWithValidation(bookingData: {
    propertyId: string;
    checkIn: Date;
    checkOut: Date;
    guests: { adults: number; children: number; infants: number };
    specialRequests?: string;
}): Promise<{ bookingId: string; success: boolean; message?: string }> {
    const createBookingFn = httpsCallable<
        typeof bookingData,
        { bookingId: string; success: boolean; message?: string }
    >(functions, 'createBooking');

    const result = await createBookingFn(bookingData);
    return result.data;
}

// Update booking status
export async function updateBookingStatus(
    bookingId: string,
    status: BookingStatus,
    reason?: string
): Promise<void> {
    console.log('updateBookingStatus: Updating booking', bookingId, 'to status:', status);

    const docRef = doc(db, BOOKINGS_COLLECTION, bookingId);
    const updateData: Partial<Booking> = {
        status,
        updatedAt: Timestamp.now() as unknown as Timestamp,
    };

    if (status === 'cancelled' && reason) {
        updateData.cancelledAt = Timestamp.now() as unknown as Timestamp;
        updateData.cancellationReason = reason;
    }

    await updateDoc(docRef, updateData);
    console.log('updateBookingStatus: Successfully updated booking', bookingId, 'to status:', status);
}

// Confirm booking (host accepts request)
export async function confirmBooking(bookingId: string): Promise<void> {
    const confirmBookingFn = httpsCallable<
        { bookingId: string },
        { success: boolean; message?: string }
    >(functions, 'confirmBooking');

    await confirmBookingFn({ bookingId });
}

// Cancel booking
export async function cancelBooking(
    bookingId: string,
    reason: string
): Promise<{ refundAmount: number }> {
    const cancelBookingFn = httpsCallable<
        { bookingId: string; reason: string },
        { success: boolean; refundAmount: number; message?: string }
    >(functions, 'cancelBooking');

    const result = await cancelBookingFn({ bookingId, reason });
    return { refundAmount: result.data.refundAmount };
}

// Get upcoming bookings for guest
export async function getUpcomingBookings(guestId: string): Promise<Booking[]> {
    const now = Timestamp.now();
    const q = query(
        collection(db, BOOKINGS_COLLECTION),
        where('guestId', '==', guestId),
        where('status', 'in', ['pending', 'confirmed']),
        where('checkIn', '>=', now),
        orderBy('checkIn', 'asc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    })) as Booking[];
}

// Get past bookings for guest
export async function getPastBookings(guestId: string): Promise<Booking[]> {
    const now = Timestamp.now();
    const q = query(
        collection(db, BOOKINGS_COLLECTION),
        where('guestId', '==', guestId),
        where('checkOut', '<', now),
        orderBy('checkOut', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    })) as Booking[];
}

// Get pending reservation requests for host
export async function getPendingReservations(hostId: string): Promise<Booking[]> {
    const q = query(
        collection(db, BOOKINGS_COLLECTION),
        where('hostId', '==', hostId),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    })) as Booking[];
}

// Check if user has an active booking for a property
export async function getUserActiveBookingForProperty(
    userId: string,
    propertyId: string
): Promise<Booking | null> {
    try {
        const q = query(
            collection(db, BOOKINGS_COLLECTION),
            where('guestId', '==', userId),
            where('propertyId', '==', propertyId)
        );

        const snapshot = await getDocs(q);

        // Find an active booking (pending or confirmed) that hasn't passed checkout
        const now = new Date();
        for (const doc of snapshot.docs) {
            const booking = doc.data();
            const status = String(booking.status || '').toLowerCase();

            // Only consider pending or confirmed bookings
            if (status !== 'pending' && status !== 'confirmed') {
                continue;
            }

            // Check if checkout date hasn't passed
            let checkOut: Date;
            if (booking.checkOut?.toDate) {
                checkOut = booking.checkOut.toDate();
            } else if (booking.checkOut?.seconds) {
                checkOut = new Date(booking.checkOut.seconds * 1000);
            } else {
                checkOut = new Date(booking.checkOut);
            }

            if (checkOut > now) {
                return { id: doc.id, ...booking } as Booking;
            }
        }

        return null;
    } catch (error) {
        console.error('getUserActiveBookingForProperty: Error:', error);
        return null;
    }
}
