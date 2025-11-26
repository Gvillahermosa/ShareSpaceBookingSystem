import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Property, Booking } from '../types';
import { getHostProperties } from '../services/propertyService';
import { getHostBookings } from '../services/bookingService';
import { useAuth } from '../contexts/AuthContext';
import { ListingCard, EarningsSummary } from '../components/host';
import { BookingCard } from '../components/booking';
import { Spinner, Button } from '../components/ui';
import toast from 'react-hot-toast';

type TabType = 'overview' | 'listings' | 'reservations' | 'earnings';

export default function HostDashboardPage() {
    const { currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [properties, setProperties] = useState<Property[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!currentUser) {
                console.log('HostDashboard: No current user');
                setLoading(false);
                return;
            }

            console.log('HostDashboard: Fetching data for user:', currentUser.uid);

            try {
                const [propertiesData, bookingsData] = await Promise.all([
                    getHostProperties(currentUser.uid),
                    getHostBookings(currentUser.uid),
                ]);
                console.log('HostDashboard: Fetched properties:', propertiesData.length);
                console.log('HostDashboard: Fetched bookings:', bookingsData.length);
                setProperties(propertiesData);
                setBookings(bookingsData);
            } catch (error) {
                console.error('Error fetching data:', error);
                toast.error('Failed to load dashboard data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [currentUser]);

    const pendingBookings = bookings.filter((b) => b.status === 'pending');
    const upcomingBookings = bookings.filter(
        (b) => b.status === 'confirmed' && b.checkIn.toDate() > new Date()
    );
    const activeListings = properties.filter((p) => p.status === 'active');

    const calculateTotalEarnings = () => {
        return bookings
            .filter((b) => b.status === 'completed' || b.status === 'confirmed')
            .reduce((sum, b) => sum + b.pricing.total, 0);
    };

    const handleBookingAction = async (action: string, bookingId: string) => {
        // TODO: Implement booking actions
        console.log(action, bookingId);
        toast.success(`Booking ${action}ed`);
    };

    const tabs: { id: TabType; label: string }[] = [
        { id: 'overview', label: 'Overview' },
        { id: 'listings', label: 'Listings' },
        { id: 'reservations', label: 'Reservations' },
        { id: 'earnings', label: 'Earnings' },
    ];

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
                <div>
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold">Welcome back, {currentUser?.displayName?.split(' ')[0]}</h1>
                    <p className="text-secondary-500 mt-1 text-sm sm:text-base">Here's what's happening with your properties</p>
                </div>
                <Link to="/host/listings/new" className="flex-shrink-0">
                    <Button size="sm" className="sm:hidden">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="text-xs">New Listing</span>
                    </Button>
                    <Button className="hidden sm:flex">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        New Listing
                    </Button>
                </Link>
            </div>

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
            {activeTab === 'overview' && (
                <div className="space-y-8">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="bg-white border border-secondary-200 rounded-xl p-6">
                            <p className="text-sm text-secondary-500">Active Listings</p>
                            <p className="text-3xl font-bold mt-2">{activeListings.length}</p>
                        </div>
                        <div className="bg-white border border-secondary-200 rounded-xl p-6">
                            <p className="text-sm text-secondary-500">Pending Requests</p>
                            <p className="text-3xl font-bold mt-2">{pendingBookings.length}</p>
                        </div>
                        <div className="bg-white border border-secondary-200 rounded-xl p-6">
                            <p className="text-sm text-secondary-500">Upcoming Check-ins</p>
                            <p className="text-3xl font-bold mt-2">{upcomingBookings.length}</p>
                        </div>
                        <div className="bg-white border border-secondary-200 rounded-xl p-6">
                            <p className="text-sm text-secondary-500">Total Earnings</p>
                            <p className="text-3xl font-bold mt-2 text-green-600">
                                ${calculateTotalEarnings().toLocaleString()}
                            </p>
                        </div>
                    </div>

                    {/* Pending Requests */}
                    {pendingBookings.length > 0 && (
                        <div>
                            <h2 className="text-xl font-semibold mb-4">Action Required</h2>
                            <div className="space-y-4">
                                {pendingBookings.map((booking) => (
                                    <BookingCard
                                        key={booking.id}
                                        booking={booking}
                                        property={properties.find((p) => p.id === booking.propertyId)}
                                        variant="host"
                                        onAction={handleBookingAction}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Upcoming Check-ins */}
                    {upcomingBookings.length > 0 && (
                        <div>
                            <h2 className="text-xl font-semibold mb-4">Upcoming Check-ins</h2>
                            <div className="space-y-4">
                                {upcomingBookings.slice(0, 3).map((booking) => (
                                    <BookingCard
                                        key={booking.id}
                                        booking={booking}
                                        property={properties.find((p) => p.id === booking.propertyId)}
                                        variant="host"
                                        onAction={handleBookingAction}
                                    />
                                ))}
                            </div>
                            {upcomingBookings.length > 3 && (
                                <button
                                    onClick={() => setActiveTab('reservations')}
                                    className="mt-4 text-primary-500 font-medium hover:underline"
                                >
                                    View all {upcomingBookings.length} upcoming check-ins
                                </button>
                            )}
                        </div>
                    )}

                    {/* Quick Earnings Summary */}
                    <EarningsSummary period="month" />
                </div>
            )}

            {activeTab === 'listings' && (
                <div>
                    {properties.length === 0 ? (
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
                                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                                />
                            </svg>
                            <h3 className="text-xl font-medium text-secondary-900 mb-2">
                                No listings yet
                            </h3>
                            <p className="text-secondary-500 mb-6">
                                Create your first listing to start earning
                            </p>
                            <Link to="/host/listings/new">
                                <Button>Create your first listing</Button>
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {properties.map((property) => (
                                <ListingCard
                                    key={property.id}
                                    property={property}
                                    onEdit={() => console.log('Edit', property.id)}
                                    onDelete={() => console.log('Delete', property.id)}
                                    onToggleStatus={() => console.log('Toggle', property.id)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'reservations' && (
                <div>
                    {bookings.length === 0 ? (
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
                                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                            </svg>
                            <h3 className="text-xl font-medium text-secondary-900 mb-2">
                                No reservations yet
                            </h3>
                            <p className="text-secondary-500">
                                When guests book your properties, they'll appear here
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {bookings.map((booking) => (
                                <BookingCard
                                    key={booking.id}
                                    booking={booking}
                                    property={properties.find((p) => p.id === booking.propertyId)}
                                    variant="host"
                                    onAction={handleBookingAction}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'earnings' && <EarningsSummary />}
        </div>
    );
}
