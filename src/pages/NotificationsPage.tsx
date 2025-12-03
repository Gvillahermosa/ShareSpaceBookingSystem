import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import type { Notification } from '../types';
import { useAuth } from '../contexts/AuthContext';
import {
    subscribeToNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
} from '../services/notificationService';
import { Spinner, Button } from '../components/ui';

type TimestampLike = Date | { toDate: () => Date } | { seconds: number } | string | number | null | undefined;

// Helper to safely convert timestamp to Date
const toDate = (timestamp: TimestampLike): Date => {
    if (!timestamp) return new Date();
    if (timestamp instanceof Date) return timestamp;
    if (typeof timestamp === 'object' && 'toDate' in timestamp) return timestamp.toDate();
    if (typeof timestamp === 'object' && 'seconds' in timestamp) return new Date(timestamp.seconds * 1000);
    return new Date(timestamp);
};

export default function NotificationsPage() {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'unread'>('all');

    useEffect(() => {
        if (!currentUser) return;

        const unsubscribe = subscribeToNotifications(currentUser.uid, (notifs) => {
            setNotifications(notifs);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser]);

    const handleNotificationClick = async (notification: Notification) => {
        // Mark as read
        if (!notification.read) {
            await markNotificationAsRead(notification.id);
        }

        // Navigate based on type
        switch (notification.type) {
            case 'booking':
                if (notification.data?.bookingId) {
                    navigate('/trips');
                }
                break;
            case 'message':
                if (notification.data?.conversationId) {
                    navigate('/messages');
                }
                break;
            case 'review':
                navigate('/host');
                break;
            default:
                break;
        }
    };

    const handleMarkAllRead = async () => {
        if (currentUser) {
            await markAllNotificationsAsRead(currentUser.uid);
        }
    };

    const handleDelete = async (e: React.MouseEvent, notificationId: string) => {
        e.stopPropagation();
        await deleteNotification(notificationId);
    };

    const getNotificationIcon = (type: Notification['type']) => {
        switch (type) {
            case 'booking':
                return (
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                );
            case 'message':
                return (
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                    </div>
                );
            case 'review':
                return (
                    <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                    </div>
                );
            case 'payout':
                return (
                    <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                );
            default:
                return (
                    <div className="w-12 h-12 rounded-full bg-secondary-100 flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-secondary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                    </div>
                );
        }
    };

    const filteredNotifications = filter === 'unread'
        ? notifications.filter(n => !n.read)
        : notifications;

    const unreadCount = notifications.filter(n => !n.read).length;

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-semibold">Notifications</h1>
                    <p className="text-secondary-500 mt-1">
                        {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
                    </p>
                </div>
                {unreadCount > 0 && (
                    <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
                        Mark all as read
                    </Button>
                )}
            </div>

            {/* Filter Tabs */}
            <div className="flex space-x-1 bg-secondary-100 rounded-lg p-1 mb-6">
                <button
                    onClick={() => setFilter('all')}
                    className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${filter === 'all'
                            ? 'bg-white text-secondary-900 shadow-sm'
                            : 'text-secondary-600 hover:text-secondary-900'
                        }`}
                >
                    All ({notifications.length})
                </button>
                <button
                    onClick={() => setFilter('unread')}
                    className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${filter === 'unread'
                            ? 'bg-white text-secondary-900 shadow-sm'
                            : 'text-secondary-600 hover:text-secondary-900'
                        }`}
                >
                    Unread ({unreadCount})
                </button>
            </div>

            {/* Notifications List */}
            <div className="bg-white border border-secondary-200 rounded-xl overflow-hidden">
                {filteredNotifications.length === 0 ? (
                    <div className="p-12 text-center text-secondary-500">
                        <svg className="w-16 h-16 mx-auto mb-4 text-secondary-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        <p className="font-medium text-lg">
                            {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                        </p>
                        <p className="text-sm mt-1">
                            {filter === 'unread' ? 'You\'re all caught up!' : 'We\'ll notify you when something happens'}
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-secondary-100">
                        {filteredNotifications.map((notification) => (
                            <div
                                key={notification.id}
                                onClick={() => handleNotificationClick(notification)}
                                className={`flex items-start gap-4 p-4 sm:p-5 hover:bg-secondary-50 active:bg-secondary-100 cursor-pointer transition-colors ${!notification.read ? 'bg-primary-50/50' : ''
                                    }`}
                            >
                                {getNotificationIcon(notification.type)}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className={`text-sm sm:text-base ${!notification.read ? 'font-semibold text-secondary-900' : 'font-medium text-secondary-700'}`}>
                                            {notification.title}
                                        </p>
                                        {!notification.read && (
                                            <span className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0 mt-2" />
                                        )}
                                    </div>
                                    <p className="text-sm text-secondary-600 mt-1">
                                        {notification.body}
                                    </p>
                                    <p className="text-xs text-secondary-400 mt-2">
                                        {format(toDate(notification.createdAt), 'MMMM d, yyyy \'at\' h:mm a')}
                                    </p>
                                </div>
                                <button
                                    onClick={(e) => handleDelete(e, notification.id)}
                                    className="flex-shrink-0 p-2 text-secondary-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                    title="Delete notification"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
