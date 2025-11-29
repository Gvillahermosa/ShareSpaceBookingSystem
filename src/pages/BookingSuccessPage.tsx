import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import type { Booking, Property } from '../types';
import { getBooking } from '../services/bookingService';
import { getPropertyById } from '../services/propertyService';
import { Button, Spinner } from '../components/ui';

export default function BookingSuccessPage() {
    const { bookingId } = useParams<{ bookingId: string }>();
    const navigate = useNavigate();
    const [booking, setBooking] = useState<Booking | null>(null);
    const [property, setProperty] = useState<Property | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!bookingId) {
                navigate('/');
                return;
            }

            try {
                const bookingData = await getBooking(bookingId);
                if (!bookingData) {
                    navigate('/');
                    return;
                }
                setBooking(bookingData);

                const propertyData = await getPropertyById(bookingData.propertyId);
                setProperty(propertyData);
            } catch (error) {
                console.error('Error fetching booking:', error);
                navigate('/');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [bookingId, navigate]);

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'PHP',
            minimumFractionDigits: 0,
        }).format(price);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    if (!booking || !property) {
        return null;
    }

    const isConfirmed = booking.status === 'confirmed';

    return (
        <div className="max-w-3xl mx-auto px-3 sm:px-4 py-6 sm:py-12 w-full overflow-x-hidden">
            {/* Success Icon */}
            <div className="text-center mb-6 sm:mb-8">
                <div className={`w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full flex items-center justify-center mb-4 sm:mb-6 ${isConfirmed ? 'bg-green-100' : 'bg-yellow-100'
                    }`}>
                    {isConfirmed ? (
                        <svg className="w-8 h-8 sm:w-10 sm:h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    ) : (
                        <svg className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    )}
                </div>

                <h1 className="text-2xl sm:text-3xl font-semibold mb-2">
                    {isConfirmed ? 'Booking Confirmed!' : 'Request Sent!'}
                </h1>
                <p className="text-secondary-600 text-base sm:text-lg">
                    {isConfirmed
                        ? 'Your reservation has been confirmed. Get ready for your trip!'
                        : 'Your booking request has been sent to the host. You\'ll hear back soon!'}
                </p>
            </div>

            {/* Booking Details Card */}
            <div className="bg-white border border-secondary-200 rounded-xl overflow-hidden mb-6 sm:mb-8">
                {/* Property Header */}
                <div className="flex gap-3 sm:gap-4 p-4 sm:p-6 border-b border-secondary-200">
                    <img
                        src={property.photos[0]?.url}
                        alt={property.title}
                        className="w-20 h-20 sm:w-32 sm:h-24 object-cover rounded-lg flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm text-secondary-500 capitalize">{property.propertyType.replace('_', ' ')}</p>
                        <h2 className="font-semibold text-base sm:text-lg truncate">{property.title}</h2>
                        <p className="text-secondary-600 text-xs sm:text-sm">
                            {property.location.city}, {property.location.country}
                        </p>
                    </div>
                </div>

                {/* Trip Details */}
                <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                    <div className="flex justify-between items-center py-2 sm:py-3 border-b border-secondary-100">
                        <div>
                            <p className="text-xs sm:text-sm text-secondary-500">Check-in</p>
                            <p className="font-medium text-sm sm:text-base">{format(booking.checkIn.toDate(), 'EEE, MMM d, yyyy')}</p>
                            <p className="text-xs sm:text-sm text-secondary-500">{property.checkInTime}</p>
                        </div>
                        <svg className="w-5 h-5 sm:w-6 sm:h-6 text-secondary-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                        <div className="text-right">
                            <p className="text-xs sm:text-sm text-secondary-500">Check-out</p>
                            <p className="font-medium text-sm sm:text-base">{format(booking.checkOut.toDate(), 'EEE, MMM d, yyyy')}</p>
                            <p className="text-xs sm:text-sm text-secondary-500">{property.checkOutTime}</p>
                        </div>
                    </div>

                    <div className="flex justify-between py-2 sm:py-3 border-b border-secondary-100">
                        <div>
                            <p className="text-xs sm:text-sm text-secondary-500">Guests</p>
                            <p className="font-medium text-sm sm:text-base">
                                {booking.guests.adults + booking.guests.children} guest{booking.guests.adults + booking.guests.children !== 1 ? 's' : ''}
                                {booking.guests.infants > 0 && `, ${booking.guests.infants} infant${booking.guests.infants !== 1 ? 's' : ''}`}
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-between py-2 sm:py-3 border-b border-secondary-100">
                        <div>
                            <p className="text-xs sm:text-sm text-secondary-500">Confirmation Code</p>
                            <p className="font-mono font-semibold text-base sm:text-lg">{booking.id.slice(0, 8).toUpperCase()}</p>
                        </div>
                    </div>

                    <div className="flex justify-between pt-2 sm:pt-3">
                        <p className="font-semibold text-base sm:text-lg">Total</p>
                        <p className="font-semibold text-base sm:text-lg">{formatPrice(booking.pricing.total)}</p>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/trips" className="flex-1">
                    <Button fullWidth variant="primary" size="lg">
                        View My Trips
                    </Button>
                </Link>
                <Link to={`/property/${property.id}`} className="flex-1">
                    <Button fullWidth variant="outline" size="lg">
                        View Property
                    </Button>
                </Link>
            </div>

            {/* Next Steps */}
            <div className="mt-8 sm:mt-10 bg-secondary-50 rounded-xl p-4 sm:p-6">
                <h3 className="font-semibold text-base sm:text-lg mb-3 sm:mb-4">What's next?</h3>
                <ul className="space-y-2 sm:space-y-3">
                    <li className="flex items-start gap-2 sm:gap-3">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-primary-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span className="text-secondary-700 text-sm sm:text-base">
                            Check your email for a confirmation with all the details
                        </span>
                    </li>
                    <li className="flex items-start gap-2 sm:gap-3">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-primary-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <span className="text-secondary-700 text-sm sm:text-base">
                            Message your host to introduce yourself and ask any questions
                        </span>
                    </li>
                    <li className="flex items-start gap-2 sm:gap-3">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-primary-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                        <span className="text-secondary-700 text-sm sm:text-base">
                            Review the house rules and check-in instructions before your trip
                        </span>
                    </li>
                </ul>
            </div>
        </div>
    );
}
