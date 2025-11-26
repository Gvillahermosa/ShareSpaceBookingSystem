import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import type { Conversation, Message, User } from '../types';
import {
    getUserConversations,
    getMessages,
    sendMessage,
    markMessagesAsRead,
    getOrCreateConversation,
} from '../services/messageService';
import { getUserById } from '../services/propertyService';
import { useAuth } from '../contexts/AuthContext';
import { Avatar, Spinner, Button } from '../components/ui';
import toast from 'react-hot-toast';

export default function MessagesPage() {
    const [searchParams] = useSearchParams();
    const { currentUser } = useAuth();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [participants, setParticipants] = useState<Record<string, User>>({});
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sendingMessage, setSendingMessage] = useState(false);

    // Check for new conversation params
    const hostIdParam = searchParams.get('hostId');
    const propertyIdParam = searchParams.get('propertyId');

    useEffect(() => {
        if (!currentUser) return;

        const fetchConversations = async () => {
            try {
                const convos = await getUserConversations(currentUser.uid);
                setConversations(convos);

                // Fetch participants
                const participantIds = new Set<string>();
                convos.forEach((c) => c.participants.forEach((id: string) => participantIds.add(id)));

                const participantData: Record<string, User> = {};
                await Promise.all(
                    Array.from(participantIds).map(async (id) => {
                        const user = await getUserById(id);
                        if (user) {
                            participantData[id] = user;
                        }
                    })
                );
                setParticipants(participantData);

                // Handle new conversation from URL params
                if (hostIdParam && propertyIdParam) {
                    const existingConvo = convos.find((c) =>
                        c.participants.includes(hostIdParam) &&
                        c.propertyId === propertyIdParam
                    );

                    if (existingConvo) {
                        setSelectedConversation(existingConvo);
                    } else {
                        // Create new conversation
                        const newConvo = await getOrCreateConversation(
                            currentUser.uid,
                            hostIdParam,
                            propertyIdParam
                        );
                        setConversations((prev) => [newConvo, ...prev]);
                        setSelectedConversation(newConvo);

                        // Fetch host data
                        const hostData = await getUserById(hostIdParam);
                        if (hostData) {
                            setParticipants((prev) => ({ ...prev, [hostIdParam]: hostData }));
                        }
                    }
                } else if (convos.length > 0) {
                    setSelectedConversation(convos[0]);
                }
            } catch (error) {
                console.error('Error fetching conversations:', error);
                toast.error('Failed to load messages');
            } finally {
                setLoading(false);
            }
        };

        fetchConversations();
    }, [currentUser, hostIdParam, propertyIdParam]);

    useEffect(() => {
        if (!selectedConversation || !currentUser) return;

        const fetchMessages = async () => {
            try {
                const msgs = await getMessages(selectedConversation.id);
                setMessages(msgs);

                // Mark as read
                if (selectedConversation.unreadCount[currentUser.uid] > 0) {
                    await markMessagesAsRead(selectedConversation.id, currentUser.uid);
                    setConversations((prev) =>
                        prev.map((c) =>
                            c.id === selectedConversation.id
                                ? { ...c, unreadCount: { ...c.unreadCount, [currentUser.uid]: 0 } }
                                : c
                        )
                    );
                }
            } catch (error) {
                console.error('Error fetching messages:', error);
            }
        };

        fetchMessages();
    }, [selectedConversation, currentUser]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

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

            // Refresh messages
            const msgs = await getMessages(selectedConversation.id);
            setMessages(msgs);
        } catch (error) {
            console.error('Error sending message:', error);
            toast.error('Failed to send message');
        } finally {
            setSendingMessage(false);
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
        <div className="h-[calc(100vh-80px)] flex">
            {/* Conversations List */}
            <div className="w-80 border-r border-secondary-200 flex flex-col">
                <div className="p-4 border-b border-secondary-200">
                    <h1 className="text-xl font-semibold">Messages</h1>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {conversations.length === 0 ? (
                        <div className="p-4 text-center text-secondary-500">
                            No conversations yet
                        </div>
                    ) : (
                        conversations.map((conversation) => {
                            const otherUser = getOtherParticipant(conversation);
                            const isSelected = selectedConversation?.id === conversation.id;
                            const unreadCount = currentUser ? conversation.unreadCount[currentUser.uid] || 0 : 0;

                            return (
                                <button
                                    key={conversation.id}
                                    onClick={() => setSelectedConversation(conversation)}
                                    className={`w-full p-4 text-left flex items-start space-x-3 hover:bg-secondary-50 transition-colors ${isSelected ? 'bg-secondary-100' : ''
                                        }`}
                                >
                                    <Avatar
                                        src={otherUser?.photoURL}
                                        alt={otherUser?.name || 'User'}
                                        size="md"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <p className="font-medium truncate">
                                                {otherUser?.name || 'Unknown User'}
                                            </p>
                                            {unreadCount > 0 && (
                                                <span className="bg-primary-500 text-white text-xs px-2 py-0.5 rounded-full">
                                                    {unreadCount}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-secondary-500 truncate">
                                            {conversation.lastMessage.text}
                                        </p>
                                        <p className="text-xs text-secondary-400 mt-1">
                                            {format(conversation.lastMessage.timestamp.toDate(), 'MMM d')}
                                        </p>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Messages Panel */}
            <div className="flex-1 flex flex-col">
                {selectedConversation ? (
                    <>
                        {/* Header */}
                        <div className="p-4 border-b border-secondary-200 flex items-center space-x-3">
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
                                    Direct message
                                </p>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.map((message) => {
                                const isOwn = message.senderId === currentUser?.uid;
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
                                            <p>{message.text}</p>
                                            <p
                                                className={`text-xs mt-1 ${isOwn ? 'text-primary-100' : 'text-secondary-400'
                                                    }`}
                                            >
                                                {format(message.timestamp.toDate(), 'HH:mm')}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="p-4 border-t border-secondary-200">
                            <div className="flex items-center space-x-3">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
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
                        Select a conversation to start messaging
                    </div>
                )}
            </div>
        </div>
    );
}
