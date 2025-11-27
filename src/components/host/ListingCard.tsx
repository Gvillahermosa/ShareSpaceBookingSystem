import { Link } from 'react-router-dom';
import { subDays, differenceInDays } from 'date-fns';
import type { Property, Booking } from '../../types';
import { Badge, Button } from '../ui';

interface ListingCardProps {
    property: Property;
    bookings?: Booking[];
    onEdit?: () => void;
    onDelete?: () => void;
    onToggleStatus?: () => void;
}

// Helper to safely convert Firestore Timestamp to Date
const toDate = (timestamp: any): Date => {
    if (!timestamp) return new Date();
    if (timestamp instanceof Date) return timestamp;
    if (timestamp.toDate) return timestamp.toDate();
    if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
    return new Date(timestamp);
};

export default function ListingCard({
    property,
    bookings = [],
    onEdit,
    onDelete,
    onToggleStatus,
}: ListingCardProps) {
    const getStatusBadge = () => {
        switch (property.status) {
            case 'active':
                return <Badge variant="success">Active</Badge>;
            case 'paused':
                return <Badge variant="default">Paused</Badge>;
            case 'pending':
                return <Badge variant="warning">Pending Review</Badge>;
            case 'rejected':
                return <Badge variant="error">Rejected</Badge>;
            default:
                return null;
        }
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'PHP',
            minimumFractionDigits: 0,
        }).format(price);
    };

    const propertyRating = property.averageRating ?? 0;
    const propertyReviewCount = property.reviewCount ?? 0;

    // Calculate stats from bookings data
    const calculateStats = () => {
        const now = new Date();
        const thirtyDaysAgo = subDays(now, 30);

        // Filter bookings for this property in the last 30 days
        const propertyBookings = bookings.filter((b) => b.propertyId === property.id);

        // Bookings created in last 30 days (confirmed or completed)
        const recentBookings = propertyBookings.filter((b) => {
            const createdAt = toDate(b.createdAt);
            return (
                createdAt >= thirtyDaysAgo &&
                (b.status === 'confirmed' || b.status === 'completed')
            );
        });

        // Calculate occupied nights in the last 30 days
        let occupiedNights = 0;
        propertyBookings
            .filter((b) => b.status === 'confirmed' || b.status === 'completed')
            .forEach((booking) => {
                const checkIn = toDate(booking.checkIn);
                const checkOut = toDate(booking.checkOut);

                // Calculate overlap with last 30 days
                const periodStart = thirtyDaysAgo > checkIn ? thirtyDaysAgo : checkIn;
                const periodEnd = now < checkOut ? now : checkOut;

                if (periodStart < periodEnd) {
                    const overlap = differenceInDays(periodEnd, periodStart);
                    occupiedNights += Math.max(0, overlap);
                }
            });

        const occupancyRate = Math.min(100, Math.round((occupiedNights / 30) * 100));

        return {
            views: property.views || 0,
            bookingsCount: recentBookings.length,
            occupancyRate,
        };
    };

    const stats = calculateStats();

    return (
        <div className="bg-white border border-secondary-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow">
            <div className="flex flex-col sm:flex-row">
                {/* Property Image */}
                <Link
                    to={`/property/${property.id}`}
                    className="sm:w-48 h-36 sm:h-auto flex-shrink-0 relative"
                >
                    <img
                        src={property.photos[0]?.url}
                        alt={property.title}
                        className="w-full h-full object-cover"
                    />
                    {property.instantBook && (
                        <span className="absolute top-2 left-2 bg-white px-2 py-1 rounded text-xs font-medium flex items-center">
                            <svg className="w-3 h-3 mr-1 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                            </svg>
                            Instant Book
                        </span>
                    )}
                </Link>

                {/* Property Details */}
                <div className="flex-1 p-4">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <Link
                                to={`/property/${property.id}`}
                                className="font-semibold text-lg hover:underline"
                            >
                                {property.title}
                            </Link>
                            <p className="text-sm text-secondary-500 mt-1">
                                {property.location.city}, {property.location.country}
                            </p>
                        </div>
                        {getStatusBadge()}
                    </div>

                    {/* Stats */}
                    <div className="flex items-center space-x-6 mt-4 text-sm text-secondary-600">
                        <div className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            {propertyRating.toFixed(1)} ({propertyReviewCount})
                        </div>
                        <div>
                            {property.bedrooms} bed{property.bedrooms !== 1 ? 's' : ''}
                        </div>
                        <div>
                            {property.bathrooms} bath{property.bathrooms !== 1 ? 's' : ''}
                        </div>
                    </div>

                    {/* Price and Actions */}
                    <div className="flex items-center justify-between mt-4">
                        <div>
                            <span className="font-semibold text-lg">
                                {formatPrice(property.pricing.basePrice)}
                            </span>
                            <span className="text-secondary-500"> /night</span>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onToggleStatus}
                            >
                                {property.status === 'active' ? 'Deactivate' : 'Activate'}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onEdit}
                            >
                                Edit
                            </Button>
                            <button
                                onClick={onDelete}
                                className="p-2 text-secondary-400 hover:text-red-500 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Stats Bar */}
            <div className="border-t border-secondary-200 px-4 py-3 bg-secondary-50 grid grid-cols-3 gap-4">
                <div className="text-center">
                    <p className="text-2xl font-semibold">{stats.views}</p>
                    <p className="text-xs text-secondary-500">Views (30d)</p>
                </div>
                <div className="text-center">
                    <p className="text-2xl font-semibold">{stats.bookingsCount}</p>
                    <p className="text-xs text-secondary-500">Bookings (30d)</p>
                </div>
                <div className="text-center">
                    <p className="text-2xl font-semibold">{stats.occupancyRate}%</p>
                    <p className="text-xs text-secondary-500">Occupancy</p>
                </div>
            </div>
        </div>
    );
}
