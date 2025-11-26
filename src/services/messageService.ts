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
} from 'firebase/firestore';
import type { Unsubscribe } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Conversation, Message } from '../types';

const CONVERSATIONS_COLLECTION = 'conversations';

// Get conversation by ID
export async function getConversation(conversationId: string): Promise<Conversation | null> {
    const docRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Conversation;
    }
    return null;
}

// Get conversations for user
export async function getUserConversations(userId: string): Promise<Conversation[]> {
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
}

// Get or create conversation between two users
export async function getOrCreateConversation(
    userId1: string,
    userId2: string,
    propertyId?: string,
    bookingId?: string
): Promise<Conversation> {
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

    // Create new conversation
    const newConversation: Omit<Conversation, 'id'> = {
        participants: [userId1, userId2],
        propertyId,
        bookingId,
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

    const docRef = await addDoc(collection(db, CONVERSATIONS_COLLECTION), newConversation);
    return { id: docRef.id, ...newConversation };
}

// Send message
export async function sendMessage(
    conversationId: string,
    senderId: string,
    text: string,
    attachments?: Message['attachments']
): Promise<Message> {
    const conversationRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
    const conversationDoc = await getDoc(conversationRef);

    if (!conversationDoc.exists()) {
        throw new Error('Conversation not found');
    }

    const conversation = conversationDoc.data() as Conversation;
    const recipientId = conversation.participants.find((p) => p !== senderId);

    const newMessage: Message = {
        id: `msg_${Date.now()}`,
        senderId,
        text,
        timestamp: Timestamp.now(),
        read: false,
        attachments,
    };

    // Check if conversation has messages (for reference - can be used later)
    // const hasMessages = conversation.lastMessage.id
    //     ? await getMessages(conversationId)
    //     : [];

    // Update conversation with new message
    await updateDoc(conversationRef, {
        lastMessage: newMessage,
        lastMessageTime: Timestamp.now(),
        [`unreadCount.${recipientId}`]: (conversation.unreadCount[recipientId!] || 0) + 1,
    });

    // Add message to subcollection
    await addDoc(collection(db, CONVERSATIONS_COLLECTION, conversationId, 'messages'), newMessage);

    return newMessage;
}

// Get messages for conversation
export async function getMessages(
    conversationId: string,
    messageLimit: number = 50
): Promise<Message[]> {
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
}

// Subscribe to messages (real-time)
export function subscribeToMessages(
    conversationId: string,
    callback: (messages: Message[]) => void
): Unsubscribe {
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
    });
}

// Subscribe to conversations (real-time)
export function subscribeToConversations(
    userId: string,
    callback: (conversations: Conversation[]) => void
): Unsubscribe {
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
    });
}

// Mark messages as read
export async function markMessagesAsRead(
    conversationId: string,
    userId: string
): Promise<void> {
    const conversationRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);

    await updateDoc(conversationRef, {
        [`unreadCount.${userId}`]: 0,
    });

    // Mark individual messages as read
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
}

// Get unread message count for user
export async function getUnreadMessageCount(userId: string): Promise<number> {
    const conversations = await getUserConversations(userId);
    return conversations.reduce(
        (total, conv) => total + (conv.unreadCount[userId] || 0),
        0
    );
}
