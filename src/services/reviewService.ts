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
    limit,
    Timestamp,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../config/firebase';
import type { Review, GuestReview } from '../types';

const REVIEWS_COLLECTION = 'reviews';
const GUEST_REVIEWS_COLLECTION = 'guestReviews';

// Get review by ID
export async function getReview(reviewId: string): Promise<Review | null> {
    const docRef = doc(db, REVIEWS_COLLECTION, reviewId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Review;
    }
    return null;
}

// Get reviews for property
export async function getPropertyReviews(propertyId: string): Promise<Review[]> {
    const q = query(
        collection(db, REVIEWS_COLLECTION),
        where('propertyId', '==', propertyId),
        orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    })) as Review[];
}

// Get reviews by guest
export async function getGuestReviews(guestId: string): Promise<Review[]> {
    const q = query(
        collection(db, REVIEWS_COLLECTION),
        where('guestId', '==', guestId),
        orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    })) as Review[];
}

// Get reviews for host's properties
export async function getHostPropertyReviews(hostId: string): Promise<Review[]> {
    const q = query(
        collection(db, REVIEWS_COLLECTION),
        where('hostId', '==', hostId),
        orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    })) as Review[];
}

// Create review
export async function createReview(
    reviewData: Omit<Review, 'id' | 'createdAt'>
): Promise<string> {
    const createReviewFn = httpsCallable<
        Omit<Review, 'id' | 'createdAt'>,
        { reviewId: string; success: boolean; message?: string }
    >(functions, 'createReview');

    const result = await createReviewFn(reviewData);
    return result.data.reviewId;
}

// Create review directly (fallback if Cloud Functions not available)
export async function createReviewDirect(
    reviewData: Omit<Review, 'id' | 'createdAt'>
): Promise<string> {
    const docRef = await addDoc(collection(db, REVIEWS_COLLECTION), {
        ...reviewData,
        createdAt: Timestamp.now(),
    });

    // Update property average rating
    await updatePropertyAverageRating(reviewData.propertyId);

    return docRef.id;
}

// Add host response to review
export async function addHostResponse(
    reviewId: string,
    comment: string
): Promise<void> {
    const docRef = doc(db, REVIEWS_COLLECTION, reviewId);
    await updateDoc(docRef, {
        hostResponse: {
            comment,
            createdAt: Timestamp.now(),
        },
    });
}

// Get guest reviews (reviews from hosts about guests)
export async function getGuestReviewsAbout(guestId: string): Promise<GuestReview[]> {
    const q = query(
        collection(db, GUEST_REVIEWS_COLLECTION),
        where('guestId', '==', guestId),
        orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    })) as GuestReview[];
}

// Create guest review (host reviewing guest)
export async function createGuestReview(
    reviewData: Omit<GuestReview, 'id' | 'createdAt'>
): Promise<string> {
    const docRef = await addDoc(collection(db, GUEST_REVIEWS_COLLECTION), {
        ...reviewData,
        createdAt: Timestamp.now(),
    });

    return docRef.id;
}

// Calculate and update property average rating
export async function updatePropertyAverageRating(propertyId: string): Promise<void> {
    const reviews = await getPropertyReviews(propertyId);

    if (reviews.length === 0) return;

    const totalRating = reviews.reduce((sum, review) => sum + review.ratings.overall, 0);
    const averageRating = totalRating / reviews.length;

    const propertyRef = doc(db, 'properties', propertyId);
    await updateDoc(propertyRef, {
        averageRating: Math.round(averageRating * 10) / 10,
        reviewCount: reviews.length,
    });
}

// Get review statistics for property
export async function getPropertyReviewStats(propertyId: string): Promise<{
    averageRating: number;
    totalReviews: number;
    categoryAverages: {
        cleanliness: number;
        accuracy: number;
        communication: number;
        location: number;
        checkIn: number;
        value: number;
    };
    ratingDistribution: { [key: number]: number };
}> {
    const reviews = await getPropertyReviews(propertyId);

    if (reviews.length === 0) {
        return {
            averageRating: 0,
            totalReviews: 0,
            categoryAverages: {
                cleanliness: 0,
                accuracy: 0,
                communication: 0,
                location: 0,
                checkIn: 0,
                value: 0,
            },
            ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        };
    }

    const totalReviews = reviews.length;

    // Calculate averages
    const sums = reviews.reduce(
        (acc, review) => ({
            overall: acc.overall + review.ratings.overall,
            cleanliness: acc.cleanliness + review.ratings.cleanliness,
            accuracy: acc.accuracy + review.ratings.accuracy,
            communication: acc.communication + review.ratings.communication,
            location: acc.location + review.ratings.location,
            checkIn: acc.checkIn + review.ratings.checkIn,
            value: acc.value + review.ratings.value,
        }),
        {
            overall: 0,
            cleanliness: 0,
            accuracy: 0,
            communication: 0,
            location: 0,
            checkIn: 0,
            value: 0,
        }
    );

    // Calculate rating distribution
    const ratingDistribution = reviews.reduce(
        (acc, review) => {
            const rating = Math.round(review.ratings.overall);
            acc[rating] = (acc[rating] || 0) + 1;
            return acc;
        },
        { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as { [key: number]: number }
    );

    return {
        averageRating: Math.round((sums.overall / totalReviews) * 10) / 10,
        totalReviews,
        categoryAverages: {
            cleanliness: Math.round((sums.cleanliness / totalReviews) * 10) / 10,
            accuracy: Math.round((sums.accuracy / totalReviews) * 10) / 10,
            communication: Math.round((sums.communication / totalReviews) * 10) / 10,
            location: Math.round((sums.location / totalReviews) * 10) / 10,
            checkIn: Math.round((sums.checkIn / totalReviews) * 10) / 10,
            value: Math.round((sums.value / totalReviews) * 10) / 10,
        },
        ratingDistribution,
    };
}

// Check if guest can review a property (must have completed stay)
export async function canGuestReview(
    guestId: string,
    propertyId: string,
    bookingId: string
): Promise<boolean> {
    // Check if booking exists and is completed
    const bookingDoc = await getDoc(doc(db, 'bookings', bookingId));
    if (!bookingDoc.exists()) return false;

    const booking = bookingDoc.data();
    if (booking.guestId !== guestId || booking.propertyId !== propertyId) return false;
    if (booking.status !== 'completed') return false;

    // Check if already reviewed
    const existingReviewQuery = query(
        collection(db, REVIEWS_COLLECTION),
        where('bookingId', '==', bookingId),
        where('guestId', '==', guestId),
        limit(1)
    );

    const existingReview = await getDocs(existingReviewQuery);
    return existingReview.empty;
}
