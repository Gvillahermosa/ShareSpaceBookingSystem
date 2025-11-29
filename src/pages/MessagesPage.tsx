import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import type { Conversation, Message, User } from '../types';
import {
    getOrCreateConversation,
    sendMessage,
    markMessagesAsRead,
    subscribeToConversations,
    subscribeToMessages,
    deleteConversation,
} from '../services/messageService';
import { getUserById } from '../services/propertyService';
import { useAuth } from '../contexts/AuthContext';
import { Avatar, Spinner, Button } from '../components/ui';
import { ConfirmDialog } from '../components/ui/Modal';
import toast from 'react-hot-toast';

type TimestampLike = Date | { toDate: () => Date } | { seconds: number } | string | number | null | undefined;

// Helper to safely convert timestamp to Date
const toDate = (timestamp: TimestampLike): Date => {
    if (!timestamp) return new Date();
    if (timestamp instanceof Date) return timestamp;
    if (typeof timestamp === 'object' && 'toDate' in timestamp) return timestamp.toDate();
    if (typeof timestamp === 'object' && 'seconds' in timestamp) return new Date(timestamp.seconds * 1000);
    return new Date(timestamp);
};

export default function MessagesPage() {
    const [searchParams] = useSearchParams();
    const { currentUser } = useAuth();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const isInitialLoad = useRef(true);
    const prevMessageCount = useRef(0);

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [participants, setParticipants] = useState<Record<string, User>>({});
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sendingMessage, setSendingMessage] = useState(false);
    const [showMobileMessages, setShowMobileMessages] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Check for new conversation params
    const hostIdParam = searchParams.get('hostId');
    const propertyIdParam = searchParams.get('propertyId');

    // Subscribe to conversations
    useEffect(() => {
        if (!currentUser) return;

        setLoading(true);

        const unsubscribe = subscribeToConversations(currentUser.uid, async (convos) => {
            setConversations(convos);

            // Fetch participants
            const participantIds = new Set<string>();
            convos.forEach((c) => c.participants.forEach((id: string) => participantIds.add(id)));

            const participantData: Record<string, User> = {};
            await Promise.all(
                Array.from(participantIds).map(async (id) => {
                    if (!participants[id]) {
                        const user = await getUserById(id);
                        if (user) {
                            participantData[id] = user;
                        }
                    }
                })
            );
            setParticipants((prev) => ({ ...prev, ...participantData }));

            // Handle new conversation from URL params
            if (hostIdParam && propertyIdParam && !selectedConversation) {
                const existingConvo = convos.find((c) =>
                    c.participants.includes(hostIdParam) &&
                    c.propertyId === propertyIdParam
                );

                if (existingConvo) {
                    setSelectedConversation(existingConvo);
                    setShowMobileMessages(true);
                } else {
                    // Create new conversation
                    try {
                        const newConvo = await getOrCreateConversation(
                            currentUser.uid,
                            hostIdParam,
                            propertyIdParam
                        );
                        setSelectedConversation(newConvo);
                        setShowMobileMessages(true);

                        // Fetch host data
                        const hostData = await getUserById(hostIdParam);
                        if (hostData) {
                            setParticipants((prev) => ({ ...prev, [hostIdParam]: hostData }));
                        }
                    } catch (error) {
                        console.error('Error creating conversation:', error);
                        toast.error('Failed to start conversation');
                    }
                }
            } else if (convos.length > 0 && !selectedConversation) {
                setSelectedConversation(convos[0]);
            }

            setLoading(false);
        });

        return () => unsubscribe();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser, hostIdParam, propertyIdParam]);

    // Subscribe to messages for selected conversation
    useEffect(() => {
        if (!selectedConversation || !currentUser) return;

        const unsubscribe = subscribeToMessages(selectedConversation.id, async (msgs) => {
            setMessages(msgs);

            // Mark as read
            if (selectedConversation.unreadCount?.[currentUser.uid] > 0) {
                try {
                    await markMessagesAsRead(selectedConversation.id, currentUser.uid);
                } catch (error) {
                    console.error('Error marking messages as read:', error);
                }
            }
        });

        return () => unsubscribe();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedConversation?.id, currentUser]);

    // Scroll to bottom only when new messages are added (not on initial load)
    useEffect(() => {
        // Skip initial load - don't auto-scroll when opening the page
        if (isInitialLoad.current && messages.length > 0) {
            isInitialLoad.current = false;
            prevMessageCount.current = messages.length;
            return;
        }

        // Only scroll if new messages were added
        if (messages.length > prevMessageCount.current) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
        prevMessageCount.current = messages.length;
    }, [messages]);

    // Reset initial load flag when conversation changes
    useEffect(() => {
        isInitialLoad.current = true;
        prevMessageCount.current = 0;
    }, [selectedConversation?.id]);

    const getOtherParticipant = (conversation: Conversation): User | undefined => {
        if (!currentUser) return undefined;
        const otherId = conversation.participants.find((id) => id !== currentUser.uid);
        return otherId ? participants[otherId] : undefined;
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !selectedConversation || !currentUser) return;

        setSendingMessage(true);
        try {
            await sendMessage(selectedConversation.id, currentUser.uid, newMessage.trim());
            setNewMessage('');
        } catch (error) {
            console.error('Error sending message:', error);
            toast.error('Failed to send message');
        } finally {
            setSendingMessage(false);
        }
    };

    const handleSelectConversation = (conversation: Conversation) => {
        setSelectedConversation(conversation);
        setShowMobileMessages(true);
    };

    const handleBackToList = () => {
        setShowMobileMessages(false);
    };

    const handleDeleteClick = (e: React.MouseEvent, conversationId: string) => {
        e.stopPropagation();
        setConversationToDelete(conversationId);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!conversationToDelete) return;

        setDeleting(true);
        try {
            await deleteConversation(conversationToDelete);

            // If the deleted conversation was selected, clear selection
            if (selectedConversation?.id === conversationToDelete) {
                setSelectedConversation(null);
                setShowMobileMessages(false);
            }

            toast.success('Conversation deleted');
            setDeleteDialogOpen(false);
            setConversationToDelete(null);
        } catch (error) {
            console.error('Error deleting conversation:', error);
            toast.error('Failed to delete conversation');
        } finally {
            setDeleting(false);
        }
    };

    const handleCloseDeleteDialog = () => {
        if (!deleting) {
            setDeleteDialogOpen(false);
            setConversationToDelete(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-80px)] h-[calc(100dvh-80px)] flex overflow-hidden">
            {/* Conversations List */}
            <div className={`w-full md:w-80 lg:w-96 border-r border-secondary-200 flex flex-col ${showMobileMessages ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-3 sm:p-4 border-b border-secondary-200">
                    <h1 className="text-lg sm:text-xl font-semibold">Messages</h1>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {conversations.length === 0 ? (
                        <div className="p-4 text-center text-secondary-500">
                            <svg className="w-16 h-16 mx-auto mb-4 text-secondary-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <p className="font-medium">No conversations yet</p>
                            <p className="text-sm mt-1">Start a conversation by contacting a host</p>
                        </div>
                    ) : (
                        conversations.map((conversation) => {
                            const otherUser = getOtherParticipant(conversation);
                            const isSelected = selectedConversation?.id === conversation.id;
                            const unreadCount = currentUser ? conversation.unreadCount?.[currentUser.uid] || 0 : 0;
                            const lastMessageTime = conversation.lastMessageTime ? toDate(conversation.lastMessageTime) : null;

                            return (
                                <div
                                    key={conversation.id}
                                    className={`relative group w-full p-4 text-left flex items-start space-x-3 hover:bg-secondary-50 transition-colors cursor-pointer ${isSelected ? 'bg-secondary-100' : ''
                                        }`}
                                    onClick={() => handleSelectConversation(conversation)}
                                >
                                    <Avatar
                                        src={otherUser?.photoURL}
                                        alt={otherUser?.name || 'User'}
                                        size="md"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <p className={`font-medium truncate ${unreadCount > 0 ? 'text-secondary-900' : 'text-secondary-700'}`}>
                                                {otherUser?.name || 'Unknown User'}
                                            </p>
                                            <div className="flex items-center space-x-2">
                                                {unreadCount > 0 && (
                                                    <span className="bg-primary-500 text-white text-xs px-2 py-0.5 rounded-full">
                                                        {unreadCount}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <p className={`text-sm truncate ${unreadCount > 0 ? 'text-secondary-700 font-medium' : 'text-secondary-500'}`}>
                                            {conversation.lastMessage?.text || 'No messages yet'}
                                        </p>
                                        {lastMessageTime && (
                                            <p className="text-xs text-secondary-400 mt-1">
                                                {format(lastMessageTime, 'MMM d, h:mm a')}
                                            </p>
                                        )}
                                    </div>
                                    {/* Delete button - appears on hover */}
                                    <button
                                        onClick={(e) => handleDeleteClick(e, conversation.id)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-secondary-400 hover:text-red-500 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Delete conversation"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Messages Panel */}
            <div className={`flex-1 flex flex-col ${showMobileMessages ? 'flex' : 'hidden md:flex'}`}>
                {selectedConversation ? (
                    <>
                        {/* Header */}
                        <div className="p-4 border-b border-secondary-200 flex items-center space-x-3">
                            <button
                                onClick={handleBackToList}
                                className="md:hidden p-2 -ml-2 hover:bg-secondary-100 rounded-full"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <Avatar
                                src={getOtherParticipant(selectedConversation)?.photoURL}
                                alt={getOtherParticipant(selectedConversation)?.name || 'User'}
                                size="md"
                            />
                            <div>
                                <p className="font-medium">
                                    {getOtherParticipant(selectedConversation)?.name || 'Unknown User'}
                                </p>
                                <p className="text-sm text-secondary-500">
                                    {getOtherParticipant(selectedConversation)?.responseTime || 'Direct message'}
                                </p>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.length === 0 ? (
                                <div className="flex-1 flex items-center justify-center text-secondary-500">
                                    <div className="text-center">
                                        <svg className="w-12 h-12 mx-auto mb-3 text-secondary-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                        </svg>
                                        <p>No messages yet</p>
                                        <p className="text-sm">Start the conversation!</p>
                                    </div>
                                </div>
                            ) : (
                                messages.map((message) => {
                                    const isOwn = message.senderId === currentUser?.uid;
                                    const messageTime = toDate(message.timestamp);
                                    return (
                                        <div
                                            key={message.id}
                                            className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div
                                                className={`max-w-[70%] rounded-2xl px-4 py-2 ${isOwn
                                                    ? 'bg-primary-500 text-white'
                                                    : 'bg-secondary-100 text-secondary-900'
                                                    }`}
                                            >
                                                <p className="whitespace-pre-wrap break-words">{message.text}</p>
                                                <p
                                                    className={`text-xs mt-1 ${isOwn ? 'text-primary-100' : 'text-secondary-400'
                                                        }`}
                                                >
                                                    {format(messageTime, 'h:mm a')}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="p-4 border-t border-secondary-200">
                            <div className="flex items-center space-x-3">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                                    placeholder="Type a message..."
                                    className="flex-1 px-4 py-3 border border-secondary-300 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                                <Button
                                    onClick={handleSendMessage}
                                    loading={sendingMessage}
                                    disabled={!newMessage.trim()}
                                >
                                    Send
                                </Button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-secondary-500">
                        <div className="text-center">
                            <svg className="w-16 h-16 mx-auto mb-4 text-secondary-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <p className="font-medium">Select a conversation</p>
                            <p className="text-sm mt-1">Choose from your existing conversations</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                isOpen={deleteDialogOpen}
                onClose={handleCloseDeleteDialog}
                onConfirm={handleConfirmDelete}
                title="Delete Conversation"
                message="Are you sure you want to delete this conversation? This will permanently delete all messages and cannot be undone."
                confirmText={deleting ? 'Deleting...' : 'Delete'}
                variant="danger"
                loading={deleting}
            />
        </div>
    );
}
