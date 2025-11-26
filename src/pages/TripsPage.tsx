import { useState, useEffect } from 'react';
import type { Booking, Property } from '../types';
import { getGuestBookings } from '../services/bookingService';
import { getPropertyById } from '../services/propertyService';
import { useAuth } from '../contexts/AuthContext';
import { BookingCard } from '../components/booking';
import { Spinner, Button } from '../components/ui';
import toast from 'react-hot-toast';

type TabType = 'upcoming' | 'past' | 'cancelled';

export default function TripsPage() {
    const { currentUser } = useAuth();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [properties, setProperties] = useState<Record<string, Property>>({});
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('upcoming');

    useEffect(() => {
        const fetchBookings = async () => {
            if (!currentUser) return;

            try {
                const userBookings = await getGuestBookings(currentUser.uid);
                setBookings(userBookings);

                // Fetch all properties for the bookings
                const propertyIds = [...new Set(userBookings.map((b) => b.propertyId))];
                const propertyData: Record<string, Property> = {};

                await Promise.all(
                    propertyIds.map(async (id) => {
                        const property = await getPropertyById(id);
                        if (property) {
                            propertyData[id] = property;
                        }
                    })
                );

                setProperties(propertyData);
            } catch (error) {
                console.error('Error fetching bookings:', error);
                toast.error('Failed to load trips');
            } finally {
                setLoading(false);
            }
        };

        fetchBookings();
    }, [currentUser]);

    const filterBookings = (tab: TabType): Booking[] => {
        const now = new Date();
        return bookings.filter((booking) => {
            const checkOut = booking.checkOut.toDate();

            switch (tab) {
                case 'upcoming':
                    return checkOut >= now && booking.status !== 'cancelled';
                case 'past':
                    return checkOut < now && booking.status !== 'cancelled';
                case 'cancelled':
                    return booking.status === 'cancelled';
                default:
                    return true;
            }
        });
    };

    const handleAction = async (action: string, _bookingId: string) => {
        switch (action) {
            case 'cancel':
                if (window.confirm('Are you sure you want to cancel this booking?')) {
                    // TODO: Implement cancellation
                    toast.success('Booking cancelled');
                }
                break;
            case 'review':
                // TODO: Open review modal
                toast('Review feature coming soon');
                break;
        }
    };

    const filteredBookings = filterBookings(activeTab);

    const tabs: { id: TabType; label: string }[] = [
        { id: 'upcoming', label: 'Upcoming' },
        { id: 'past', label: 'Past' },
        { id: 'cancelled', label: 'Cancelled' },
    ];

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-semibold mb-8">Trips</h1>

            {/* Tabs */}
            <div className="border-b border-secondary-200 mb-8">
                <div className="flex space-x-8">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`pb-4 font-medium transition-colors relative ${activeTab === tab.id
                                ? 'text-secondary-900'
                                : 'text-secondary-500 hover:text-secondary-700'
                                }`}
                        >
                            {tab.label}
                            {activeTab === tab.id && (
                                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-secondary-900" />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <Spinner size="lg" />
                </div>
            ) : filteredBookings.length === 0 ? (
                <div className="text-center py-20">
                    <svg
                        className="w-16 h-16 mx-auto text-secondary-300 mb-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                        />
                    </svg>
                    <h3 className="text-xl font-medium text-secondary-900 mb-2">
                        {activeTab === 'upcoming'
                            ? 'No upcoming trips'
                            : activeTab === 'past'
                                ? 'No past trips'
                                : 'No cancelled trips'}
                    </h3>
                    <p className="text-secondary-500 mb-6">
                        {activeTab === 'upcoming'
                            ? "Time to dust off your bags and start planning your next adventure"
                            : "You don't have any trips in this category"}
                    </p>
                    {activeTab === 'upcoming' && (
                        <Button onClick={() => (window.location.href = '/')}>
                            Start searching
                        </Button>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredBookings.map((booking) => (
                        <BookingCard
                            key={booking.id}
                            booking={booking}
                            property={properties[booking.propertyId]}
                            variant="guest"
                            onAction={handleAction}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
