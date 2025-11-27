import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import type { Booking, Property } from '../../types';
import { Badge, Avatar } from '../ui';

interface BookingCardProps {
    booking: Booking;
    property?: Property;
    variant?: 'guest' | 'host';
    onAction?: (action: string, bookingId: string) => void;
}

export default function BookingCard({
    booking,
    property,
    variant = 'guest',
    onAction,
}: BookingCardProps) {
    const getStatusColor = (status: Booking['status']): 'success' | 'warning' | 'error' | 'info' | 'default' => {
        switch (status) {
            case 'confirmed':
                return 'success';
            case 'pending':
                return 'warning';
            case 'cancelled':
                return 'error';
            case 'completed':
                return 'default';
            default:
                return 'default';
        }
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'PHP',
            minimumFractionDigits: 0,
        }).format(price);
    };

    // Safely convert dates (handle both Timestamp and Date objects)
    const toDate = (date: any): Date => {
        if (date instanceof Date) return date;
        if (date?.toDate) return date.toDate();
        if (date?.seconds) return new Date(date.seconds * 1000);
        return new Date(date);
    };

    const checkInDate = toDate(booking.checkIn);
    const checkOutDate = toDate(booking.checkOut);
    const now = new Date();
    const isUpcoming = checkOutDate > now; // Can cancel if checkout hasn't passed
    const isOngoing = checkInDate <= now && checkOutDate >= now;
    const canCancel = isUpcoming && (booking.status === 'confirmed' || booking.status === 'pending');
    const totalPrice = booking.pricing.total;

    return (
        <div className="bg-white border border-secondary-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow">
            <div className="flex flex-col sm:flex-row">
                {/* Property Image */}
                {property && (
                    <Link
                        to={`/property/${property.id}`}
                        className="sm:w-48 h-32 sm:h-auto flex-shrink-0"
                    >
                        <img
                            src={property.photos[0]?.url}
                            alt={property.title}
                            className="w-full h-full object-cover"
                        />
                    </Link>
                )}

                {/* Booking Details */}
                <div className="flex-1 p-4">
                    <div className="flex items-start justify-between">
                        <div>
                            {property && (
                                <Link
                                    to={`/property/${property.id}`}
                                    className="font-medium hover:underline"
                                >
                                    {property.title}
                                </Link>
                            )}
                            {property && (
                                <p className="text-sm text-secondary-500">
                                    {property.location.city}, {property.location.country}
                                </p>
                            )}
                        </div>
                        <Badge variant={getStatusColor(booking.status)}>
                            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                        </Badge>
                    </div>

                    {/* Dates */}
                    <div className="mt-3 text-sm text-secondary-600">
                        <p>
                            {format(checkInDate, 'MMM d')} – {format(checkOutDate, 'MMM d, yyyy')}
                        </p>
                        <p>
                            {booking.guests.adults + booking.guests.children} guest
                            {booking.guests.adults + booking.guests.children !== 1 ? 's' : ''}
                        </p>
                    </div>

                    {/* Guest Info (for host view) */}
                    {variant === 'host' && booking.guestName && (
                        <div className="mt-3 flex items-center space-x-2">
                            <Avatar
                                src={booking.guestPhoto}
                                alt={booking.guestName}
                                size="sm"
                            />
                            <span className="text-sm">{booking.guestName}</span>
                        </div>
                    )}

                    {/* Price */}
                    <div className="mt-3 flex items-center justify-between">
                        <span className="font-semibold">{formatPrice(totalPrice)}</span>

                        {/* Actions */}
                        <div className="flex items-center space-x-3">
                            {variant === 'guest' && (
                                <>
                                    {canCancel && (
                                        <button
                                            onClick={() => onAction?.('cancel', booking.id)}
                                            className="px-3 py-1 text-sm bg-red-100 text-red-600 hover:bg-red-200 rounded-lg font-medium"
                                        >
                                            Cancel
                                        </button>
                                    )}
                                    {booking.status === 'completed' && !booking.hasReview && (
                                        <button
                                            onClick={() => onAction?.('review', booking.id)}
                                            className="text-sm text-primary-500 hover:text-primary-600 font-medium"
                                        >
                                            Leave a review
                                        </button>
                                    )}
                                    <Link
                                        to={`/messages?bookingId=${booking.id}`}
                                        className="text-sm text-secondary-600 hover:text-secondary-900 underline"
                                    >
                                        Message host
                                    </Link>
                                </>
                            )}

                            {variant === 'host' && (
                                <>
                                    {booking.status === 'pending' && (
                                        <>
                                            <button
                                                onClick={() => onAction?.('accept', booking.id)}
                                                className="px-3 py-1 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600"
                                            >
                                                Accept
                                            </button>
                                            <button
                                                onClick={() => onAction?.('decline', booking.id)}
                                                className="px-3 py-1 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600"
                                            >
                                                Decline
                                            </button>
                                        </>
                                    )}
                                    <Link
                                        to={`/messages?bookingId=${booking.id}`}
                                        className="text-sm text-secondary-600 hover:text-secondary-900 underline"
                                    >
                                        Message guest
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Status Banner */}
            {(isUpcoming || isOngoing) && booking.status === 'confirmed' && (
                <div className={`px-4 py-2 text-sm ${isOngoing
                    ? 'bg-green-50 text-green-700'
                    : 'bg-blue-50 text-blue-700'
                    }`}>
                    {isOngoing ? (
                        <span>Currently staying – Check out on {format(checkOutDate, 'MMM d')}</span>
                    ) : (
                        <span>Check in on {format(checkInDate, 'MMM d, yyyy')}</span>
                    )}
                </div>
            )}
        </div>
    );
}
