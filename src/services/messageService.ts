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
    onSnapshot,
    writeBatch,
} from 'firebase/firestore';
import type { Unsubscribe } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Conversation, Message } from '../types';
import { notifyNewMessage } from './notificationService';

const CONVERSATIONS_COLLECTION = 'conversations';

// Get conversation by ID
export async function getConversation(conversationId: string): Promise<Conversation | null> {
    try {
        const docRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as Conversation;
        }
        return null;
    } catch (error) {
        console.error('getConversation error:', error);
        return null;
    }
}

// Get conversations for user
export async function getUserConversations(userId: string): Promise<Conversation[]> {
    try {
        // Try with ordering first
        const q = query(
            collection(db, CONVERSATIONS_COLLECTION),
            where('participants', 'array-contains', userId),
            orderBy('lastMessageTime', 'desc')
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as Conversation[];
    } catch (error: unknown) {
        const err = error as { message?: string };
        console.warn('getUserConversations: Ordered query failed, trying without order:', err?.message);

        // Fallback without ordering
        try {
            const q = query(
                collection(db, CONVERSATIONS_COLLECTION),
                where('participants', 'array-contains', userId)
            );

            const snapshot = await getDocs(q);
            const conversations = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Conversation[];

            // Sort client-side
            return conversations.sort((a, b) => {
                const timeA = a.lastMessageTime?.seconds || 0;
                const timeB = b.lastMessageTime?.seconds || 0;
                return timeB - timeA;
            });
        } catch (fallbackError) {
            console.error('getUserConversations fallback error:', fallbackError);
            return [];
        }
    }
}

// Get or create conversation between two users
export async function getOrCreateConversation(
    userId1: string,
    userId2: string,
    propertyId?: string,
    bookingId?: string
): Promise<Conversation> {
    try {
        // Check if conversation already exists
        const q = query(
            collection(db, CONVERSATIONS_COLLECTION),
            where('participants', 'array-contains', userId1)
        );

        const snapshot = await getDocs(q);
        const existingConversation = snapshot.docs.find((doc) => {
            const data = doc.data();
            return data.participants.includes(userId2);
        });

        if (existingConversation) {
            return {
                id: existingConversation.id,
                ...existingConversation.data(),
            } as Conversation;
        }

        // Create new conversation - only include defined fields
        const newConversation: Record<string, unknown> = {
            participants: [userId1, userId2],
            lastMessage: {
                id: '',
                senderId: '',
                text: '',
                timestamp: Timestamp.now(),
                read: false,
            },
            lastMessageTime: Timestamp.now(),
            unreadCount: {
                [userId1]: 0,
                [userId2]: 0,
            },
            createdAt: Timestamp.now(),
        };

        // Only add optional fields if they are defined
        if (propertyId) {
            newConversation.propertyId = propertyId;
        }
        if (bookingId) {
            newConversation.bookingId = bookingId;
        }

        console.log('Creating new conversation:', newConversation);
        const docRef = await addDoc(collection(db, CONVERSATIONS_COLLECTION), newConversation);
        console.log('Conversation created with ID:', docRef.id);
        return { id: docRef.id, ...newConversation } as Conversation;
    } catch (error: unknown) {
        const err = error as { code?: string; message?: string };
        console.error('getOrCreateConversation error:', error);
        console.error('Error code:', err?.code);
        console.error('Error message:', err?.message);
        throw new Error(`Failed to create conversation: ${err?.message || 'Unknown error'}`);
    }
}

// Send message
export async function sendMessage(
    conversationId: string,
    senderId: string,
    text: string,
    attachments?: Message['attachments']
): Promise<Message> {
    try {
        const conversationRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
        const conversationDoc = await getDoc(conversationRef);

        if (!conversationDoc.exists()) {
            throw new Error('Conversation not found');
        }

        const conversation = conversationDoc.data() as Conversation;
        const recipientId = conversation.participants.find((p) => p !== senderId);

        // Build message object without undefined fields
        const newMessage: Record<string, unknown> = {
            id: `msg_${Date.now()}`,
            senderId,
            text,
            timestamp: Timestamp.now(),
            read: false,
        };

        // Only add attachments if defined
        if (attachments && attachments.length > 0) {
            newMessage.attachments = attachments;
        }

        // Build update object for conversation
        const updateData: Record<string, unknown> = {
            lastMessage: newMessage,
            lastMessageTime: Timestamp.now(),
        };

        if (recipientId) {
            updateData[`unreadCount.${recipientId}`] = (conversation.unreadCount?.[recipientId] || 0) + 1;
        }

        // Update conversation with new message
        await updateDoc(conversationRef, updateData);

        // Add message to subcollection
        await addDoc(collection(db, CONVERSATIONS_COLLECTION, conversationId, 'messages'), newMessage);

        // Create notification for the recipient
        if (recipientId) {
            // Get sender's name for the notification
            const senderDoc = await getDoc(doc(db, 'users', senderId));
            const senderName = senderDoc.exists()
                ? senderDoc.data()?.displayName || 'Someone'
                : 'Someone';

            await notifyNewMessage(recipientId, senderName, conversationId);
        }

        return newMessage as unknown as Message;
    } catch (error: unknown) {
        console.error('sendMessage error:', error);
        throw error;
    }
}

// Get messages for conversation
export async function getMessages(
    conversationId: string,
    messageLimit: number = 50
): Promise<Message[]> {
    try {
        const q = query(
            collection(db, CONVERSATIONS_COLLECTION, conversationId, 'messages'),
            orderBy('timestamp', 'desc'),
            limit(messageLimit)
        );

        const snapshot = await getDocs(q);
        return snapshot.docs
            .map((doc) => ({
                id: doc.id,
                ...doc.data(),
            } as Message))
            .reverse();
    } catch (error: unknown) {
        const err = error as { message?: string };
        console.warn('getMessages: Ordered query failed, trying without order:', err?.message);

        // Fallback without ordering
        try {
            const q = query(
                collection(db, CONVERSATIONS_COLLECTION, conversationId, 'messages'),
                limit(messageLimit)
            );

            const snapshot = await getDocs(q);
            const messages = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            } as Message));

            // Sort client-side
            return messages.sort((a, b) => {
                const timeA = a.timestamp?.seconds || 0;
                const timeB = b.timestamp?.seconds || 0;
                return timeA - timeB;
            });
        } catch (fallbackError) {
            console.error('getMessages fallback error:', fallbackError);
            return [];
        }
    }
}

// Subscribe to messages (real-time)
export function subscribeToMessages(
    conversationId: string,
    callback: (messages: Message[]) => void
): Unsubscribe {
    try {
        const q = query(
            collection(db, CONVERSATIONS_COLLECTION, conversationId, 'messages'),
            orderBy('timestamp', 'asc')
        );

        return onSnapshot(q, (snapshot) => {
            const messages = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Message[];
            callback(messages);
        }, (error) => {
            console.error('subscribeToMessages error:', error);
            // Return empty messages on error
            callback([]);
        });
    } catch (error) {
        console.error('subscribeToMessages setup error:', error);
        callback([]);
        // Return a no-op unsubscribe function
        return () => { };
    }
}

// Subscribe to conversations (real-time)
export function subscribeToConversations(
    userId: string,
    callback: (conversations: Conversation[]) => void
): Unsubscribe {
    try {
        const q = query(
            collection(db, CONVERSATIONS_COLLECTION),
            where('participants', 'array-contains', userId),
            orderBy('lastMessageTime', 'desc')
        );

        return onSnapshot(q, (snapshot) => {
            const conversations = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Conversation[];
            callback(conversations);
        }, (error) => {
            console.warn('subscribeToConversations ordered query error:', error);

            // Fallback: try without ordering
            const fallbackQuery = query(
                collection(db, CONVERSATIONS_COLLECTION),
                where('participants', 'array-contains', userId)
            );

            return onSnapshot(fallbackQuery, (snapshot) => {
                const conversations = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Conversation[];

                // Sort client-side
                conversations.sort((a, b) => {
                    const timeA = a.lastMessageTime?.seconds || 0;
                    const timeB = b.lastMessageTime?.seconds || 0;
                    return timeB - timeA;
                });

                callback(conversations);
            });
        });
    } catch (error) {
        console.error('subscribeToConversations setup error:', error);
        callback([]);
        // Return a no-op unsubscribe function
        return () => { };
    }
}

// Mark messages as read
export async function markMessagesAsRead(
    conversationId: string,
    userId: string
): Promise<void> {
    try {
        const conversationRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);

        await updateDoc(conversationRef, {
            [`unreadCount.${userId}`]: 0,
        });

        // Try to mark individual messages as read (may fail if index is missing)
        try {
            const messagesQuery = query(
                collection(db, CONVERSATIONS_COLLECTION, conversationId, 'messages'),
                where('read', '==', false),
                where('senderId', '!=', userId)
            );

            const snapshot = await getDocs(messagesQuery);
            const updates = snapshot.docs.map((doc) =>
                updateDoc(doc.ref, { read: true })
            );

            await Promise.all(updates);
        } catch (msgError) {
            // Silently fail - unread count is still updated
            console.warn('Could not mark individual messages as read:', msgError);
        }
    } catch (error) {
        console.error('markMessagesAsRead error:', error);
    }
}

// Get unread message count for user
export async function getUnreadMessageCount(userId: string): Promise<number> {
    const conversations = await getUserConversations(userId);
    return conversations.reduce(
        (total, conv) => total + (conv.unreadCount[userId] || 0),
        0
    );
}

// Delete conversation and all its messages
export async function deleteConversation(conversationId: string): Promise<void> {
    try {
        // First, delete all messages in the subcollection
        const messagesRef = collection(db, CONVERSATIONS_COLLECTION, conversationId, 'messages');
        const messagesSnapshot = await getDocs(messagesRef);

        const batch = writeBatch(db);
        messagesSnapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });

        // Delete the conversation document
        const conversationRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
        batch.delete(conversationRef);

        await batch.commit();
        console.log('Conversation deleted:', conversationId);
    } catch (error) {
        console.error('deleteConversation error:', error);
        throw error;
    }
}
