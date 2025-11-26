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
    Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Wishlist, Property } from '../types';
import { getProperty } from './propertyService';

const WISHLISTS_COLLECTION = 'wishlists';

// Get wishlist by ID
export async function getWishlist(wishlistId: string): Promise<Wishlist | null> {
    const docRef = doc(db, WISHLISTS_COLLECTION, wishlistId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Wishlist;
    }
    return null;
}

// Get user's wishlists
export async function getUserWishlists(userId: string): Promise<Wishlist[]> {
    const q = query(
        collection(db, WISHLISTS_COLLECTION),
        where('userId', '==', userId)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    })) as Wishlist[];
}

// Create wishlist
export async function createWishlist(
    userId: string,
    name: string
): Promise<string> {
    const docRef = await addDoc(collection(db, WISHLISTS_COLLECTION), {
        userId,
        name,
        propertyIds: [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
    });

    return docRef.id;
}

// Update wishlist name
export async function updateWishlistName(
    wishlistId: string,
    name: string
): Promise<void> {
    const docRef = doc(db, WISHLISTS_COLLECTION, wishlistId);
    await updateDoc(docRef, {
        name,
        updatedAt: Timestamp.now(),
    });
}

// Delete wishlist
export async function deleteWishlist(wishlistId: string): Promise<void> {
    const docRef = doc(db, WISHLISTS_COLLECTION, wishlistId);
    await deleteDoc(docRef);
}

// Add property to wishlist
export async function addPropertyToWishlist(
    wishlistId: string,
    propertyId: string
): Promise<void> {
    const wishlist = await getWishlist(wishlistId);
    if (!wishlist) throw new Error('Wishlist not found');

    if (!wishlist.propertyIds.includes(propertyId)) {
        const docRef = doc(db, WISHLISTS_COLLECTION, wishlistId);
        await updateDoc(docRef, {
            propertyIds: [...wishlist.propertyIds, propertyId],
            updatedAt: Timestamp.now(),
        });
    }
}

// Remove property from wishlist
export async function removePropertyFromWishlist(
    wishlistId: string,
    propertyId: string
): Promise<void> {
    const wishlist = await getWishlist(wishlistId);
    if (!wishlist) throw new Error('Wishlist not found');

    const docRef = doc(db, WISHLISTS_COLLECTION, wishlistId);
    await updateDoc(docRef, {
        propertyIds: wishlist.propertyIds.filter((id) => id !== propertyId),
        updatedAt: Timestamp.now(),
    });
}

// Toggle property in default wishlist (creates one if doesn't exist)
export async function togglePropertyInWishlist(
    userId: string,
    propertyId: string
): Promise<{ added: boolean; wishlistId: string }> {
    // Get or create default wishlist
    let wishlists = await getUserWishlists(userId);
    let defaultWishlist = wishlists.find((w) => w.name === 'Favorites');

    if (!defaultWishlist) {
        const wishlistId = await createWishlist(userId, 'Favorites');
        defaultWishlist = {
            id: wishlistId,
            userId,
            name: 'Favorites',
            propertyIds: [],
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        };
    }

    const isInWishlist = defaultWishlist.propertyIds.includes(propertyId);

    if (isInWishlist) {
        await removePropertyFromWishlist(defaultWishlist.id, propertyId);
        return { added: false, wishlistId: defaultWishlist.id };
    } else {
        await addPropertyToWishlist(defaultWishlist.id, propertyId);
        return { added: true, wishlistId: defaultWishlist.id };
    }
}

// Check if property is in any of user's wishlists
export async function isPropertyInAnyWishlist(
    userId: string,
    propertyId: string
): Promise<boolean> {
    const wishlists = await getUserWishlists(userId);
    return wishlists.some((w) => w.propertyIds.includes(propertyId));
}

// Get all properties in user's wishlists
export async function getWishlistPropertyIds(userId: string): Promise<string[]> {
    const wishlists = await getUserWishlists(userId);
    const propertyIds = new Set<string>();

    wishlists.forEach((wishlist) => {
        wishlist.propertyIds.forEach((id) => propertyIds.add(id));
    });

    return Array.from(propertyIds);
}

// Get all properties in user's wishlists as Property objects
export async function getUserWishlist(userId: string): Promise<Property[]> {
    const propertyIds = await getWishlistPropertyIds(userId);
    const properties: Property[] = [];

    for (const propertyId of propertyIds) {
        const property = await getProperty(propertyId);
        if (property) {
            properties.push(property);
        }
    }

    return properties;
}

// Remove property from all user's wishlists
export async function removeFromWishlist(
    userId: string,
    propertyId: string
): Promise<void> {
    const wishlists = await getUserWishlists(userId);

    for (const wishlist of wishlists) {
        if (wishlist.propertyIds.includes(propertyId)) {
            await removePropertyFromWishlist(wishlist.id, propertyId);
        }
    }
}
