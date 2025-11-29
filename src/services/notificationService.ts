import {
    collection,
    doc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    Timestamp,
    onSnapshot,
    writeBatch,
} from 'firebase/firestore';
import type { Unsubscribe } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Notification } from '../types';

const NOTIFICATIONS_COLLECTION = 'notifications';

// Create a notification
export async function createNotification(
    userId: string,
    type: Notification['type'],
    title: string,
    body: string,
    data?: Record<string, unknown>
): Promise<string> {
    try {
        const notification: Omit<Notification, 'id'> = {
            userId,
            type,
            title,
            body,
            read: false,
            createdAt: Timestamp.now(),
        };

        if (data) {
            notification.data = data;
        }

        const docRef = await addDoc(collection(db, NOTIFICATIONS_COLLECTION), notification);
        return docRef.id;
    } catch (error) {
        console.error('createNotification error:', error);
        throw error;
    }
}

// Get notifications for user
export async function getUserNotifications(
    userId: string,
    notificationLimit: number = 50
): Promise<Notification[]> {
    try {
        const q = query(
            collection(db, NOTIFICATIONS_COLLECTION),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc'),
            limit(notificationLimit)
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as Notification[];
    } catch (error: unknown) {
        const err = error as { message?: string };
        console.warn('getUserNotifications ordered query failed:', err?.message);

        // Fallback without ordering
        try {
            const q = query(
                collection(db, NOTIFICATIONS_COLLECTION),
                where('userId', '==', userId),
                limit(notificationLimit)
            );

            const snapshot = await getDocs(q);
            const notifications = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Notification[];

            // Sort client-side
            return notifications.sort((a, b) => {
                const timeA = a.createdAt?.seconds || 0;
                const timeB = b.createdAt?.seconds || 0;
                return timeB - timeA;
            });
        } catch (fallbackError) {
            console.error('getUserNotifications fallback error:', fallbackError);
            return [];
        }
    }
}

// Subscribe to notifications (real-time)
export function subscribeToNotifications(
    userId: string,
    callback: (notifications: Notification[]) => void
): Unsubscribe {
    try {
        const q = query(
            collection(db, NOTIFICATIONS_COLLECTION),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc'),
            limit(50)
        );

        return onSnapshot(
            q,
            (snapshot) => {
                const notifications = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Notification[];
                callback(notifications);
            },
            (error) => {
                console.warn('subscribeToNotifications error:', error);
                // Try without ordering
                const fallbackQuery = query(
                    collection(db, NOTIFICATIONS_COLLECTION),
                    where('userId', '==', userId),
                    limit(50)
                );

                onSnapshot(fallbackQuery, (snapshot) => {
                    const notifications = snapshot.docs.map((doc) => ({
                        id: doc.id,
                        ...doc.data(),
                    })) as Notification[];

                    notifications.sort((a, b) => {
                        const timeA = a.createdAt?.seconds || 0;
                        const timeB = b.createdAt?.seconds || 0;
                        return timeB - timeA;
                    });

                    callback(notifications);
                });
            }
        );
    } catch (error) {
        console.error('subscribeToNotifications setup error:', error);
        callback([]);
        return () => { };
    }
}

// Mark notification as read
export async function markNotificationAsRead(notificationId: string): Promise<void> {
    try {
        const docRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
        await updateDoc(docRef, { read: true });
    } catch (error) {
        console.error('markNotificationAsRead error:', error);
    }
}

// Mark all notifications as read
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
    try {
        const q = query(
            collection(db, NOTIFICATIONS_COLLECTION),
            where('userId', '==', userId),
            where('read', '==', false)
        );

        const snapshot = await getDocs(q);
        const batch = writeBatch(db);

        snapshot.docs.forEach((doc) => {
            batch.update(doc.ref, { read: true });
        });

        await batch.commit();
    } catch (error) {
        console.error('markAllNotificationsAsRead error:', error);
    }
}

// Delete notification
export async function deleteNotification(notificationId: string): Promise<void> {
    try {
        const docRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
        await deleteDoc(docRef);
    } catch (error) {
        console.error('deleteNotification error:', error);
    }
}

// Get unread notification count
export async function getUnreadNotificationCount(userId: string): Promise<number> {
    try {
        const q = query(
            collection(db, NOTIFICATIONS_COLLECTION),
            where('userId', '==', userId),
            where('read', '==', false)
        );

        const snapshot = await getDocs(q);
        return snapshot.size;
    } catch (error) {
        console.error('getUnreadNotificationCount error:', error);
        return 0;
    }
}

// Helper function to create booking notification
export async function notifyBookingCreated(
    hostId: string,
    guestName: string,
    propertyTitle: string,
    bookingId: string
): Promise<void> {
    await createNotification(
        hostId,
        'booking',
        'New Booking Request',
        `${guestName} has requested to book ${propertyTitle}`,
        { bookingId }
    );
}

// Helper function to create booking confirmed notification
export async function notifyBookingConfirmed(
    guestId: string,
    propertyTitle: string,
    bookingId: string
): Promise<void> {
    await createNotification(
        guestId,
        'booking',
        'Booking Confirmed',
        `Your booking for ${propertyTitle} has been confirmed!`,
        { bookingId }
    );
}

// Helper function to create cancellation notification
export async function notifyBookingCancelled(
    userId: string,
    propertyTitle: string,
    bookingId: string,
    cancelledBy: 'guest' | 'host'
): Promise<void> {
    await createNotification(
        userId,
        'booking',
        'Booking Cancelled',
        `The booking for ${propertyTitle} has been cancelled by the ${cancelledBy}`,
        { bookingId }
    );
}

// Helper function to create message notification
export async function notifyNewMessage(
    userId: string,
    senderName: string,
    conversationId: string
): Promise<void> {
    await createNotification(
        userId,
        'message',
        'New Message',
        `You have a new message from ${senderName}`,
        { conversationId }
    );
}

// Helper function to create review notification
export async function notifyNewReview(
    hostId: string,
    guestName: string,
    propertyTitle: string,
    reviewId: string
): Promise<void> {
    await createNotification(
        hostId,
        'review',
        'New Review',
        `${guestName} left a review for ${propertyTitle}`,
        { reviewId }
    );
}
