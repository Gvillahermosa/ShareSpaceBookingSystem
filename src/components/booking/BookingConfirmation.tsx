import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import type { Property, User } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useBookingStore } from '../../store';
import { createBooking } from '../../services/bookingService';
import { getPropertyById } from '../../services/propertyService';
import { getUserById } from '../../services/propertyService';
import { CANCELLATION_POLICIES } from '../../config/constants';
import { Button, Spinner } from '../ui';
import toast from 'react-hot-toast';

export default function BookingConfirmation() {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const { currentBooking, clearCurrentBooking } = useBookingStore();

    const [property, setProperty] = useState<Property | null>(null);
    const [host, setHost] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [agreedToRules, setAgreedToRules] = useState(false);

    useEffect(() => {
        if (!currentBooking?.propertyId || !currentBooking?.hostId) {
            navigate('/');
            return;
        }

        const fetchData = async () => {
            try {
                const propertyId = currentBooking.propertyId;
                const hostId = currentBooking.hostId;
                if (!propertyId || !hostId) {
                    navigate('/');
                    return;
                }
                const [propertyData, hostData] = await Promise.all([
                    getPropertyById(propertyId),
                    getUserById(hostId),
                ]);
                setProperty(propertyData);
                setHost(hostData);
            } catch (error) {
                console.error('Error fetching data:', error);
                toast.error('Failed to load booking details');
                navigate('/');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [currentBooking, navigate]);

    const handleConfirmBooking = async () => {
        if (!currentUser || !currentBooking || !property) return;

        if (!agreedToRules) {
            toast.error('Please agree to the house rules and cancellation policy');
            return;
        }

        setSubmitting(true);
        try {
            const bookingData = {
                propertyId: currentBooking.propertyId,
                hostId: currentBooking.hostId,
                guestId: currentUser.uid,
                guestName: currentUser.displayName ?? 'Guest',
                guestPhoto: currentUser.photoURL ?? undefined,
                checkIn: currentBooking.checkIn,
                checkOut: currentBooking.checkOut,
                guests: currentBooking.guests,
                pricing: currentBooking.pricing,
                specialRequests: message,
                status: property.instantBook ? 'confirmed' : 'pending',
                paymentStatus: 'pending',
            };

            const bookingId = await createBooking(bookingData as never);
            clearCurrentBooking();
            navigate(`/booking/${bookingId}/success`);
            toast.success(
                property.instantBook
                    ? 'Booking confirmed!'
                    : 'Booking request sent to host'
            );
        } catch (error) {
            console.error('Error creating booking:', error);
            toast.error('Failed to create booking. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
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

    if (!currentBooking || !property) {
        return null;
    }

    const pricing = currentBooking.pricing;
    const checkIn = currentBooking.checkIn;
    const checkOut = currentBooking.checkOut;
    const guests = currentBooking.guests;

    if (!pricing || !checkIn || !checkOut || !guests) {
        return null;
    }

    const cancellationPolicy = CANCELLATION_POLICIES.find(
        (p) => p.id === property.cancellationPolicy
    );
    const hostName = host?.name?.split(' ')[0] ?? 'the host';
    const propertyRating = property.averageRating ?? 0;
    const propertyReviewCount = property.reviewCount ?? 0;

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <button
                onClick={() => navigate(-1)}
                className="flex items-center text-secondary-600 hover:text-secondary-900 mb-6"
            >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
            </button>

            <h1 className="text-3xl font-semibold mb-8">Confirm and pay</h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Left Column - Booking Details */}
                <div className="space-y-8">
                    {/* Trip Details */}
                    <section>
                        <h2 className="text-xl font-semibold mb-4">Your trip</h2>

                        <div className="space-y-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-medium">Dates</p>
                                    <p className="text-secondary-600">
                                        {format(checkIn.toDate(), 'MMM d')} –{' '}
                                        {format(checkOut.toDate(), 'MMM d, yyyy')}
                                    </p>
                                </div>
                                <button className="text-sm font-medium underline">Edit</button>
                            </div>

                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-medium">Guests</p>
                                    <p className="text-secondary-600">
                                        {guests.adults + guests.children} guest
                                        {guests.adults + guests.children !== 1 ? 's' : ''}
                                        {guests.infants > 0 && `, ${guests.infants} infant`}
                                    </p>
                                </div>
                                <button className="text-sm font-medium underline">Edit</button>
                            </div>
                        </div>
                    </section>

                    {/* Message to Host */}
                    <section className="pb-6 border-b border-secondary-200">
                        <h2 className="text-xl font-semibold mb-4">Message the host</h2>
                        <p className="text-secondary-600 mb-4">
                            Let {hostName} know a little about your trip.
                        </p>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Hi! I'm excited to stay at your place..."
                            className="w-full p-3 border border-secondary-300 rounded-lg resize-none h-32 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </section>

                    {/* Cancellation Policy */}
                    <section className="pb-6 border-b border-secondary-200">
                        <h2 className="text-xl font-semibold mb-4">Cancellation policy</h2>
                        <p className="text-secondary-600">
                            <span className="font-medium">{cancellationPolicy?.name}:</span>{' '}
                            {cancellationPolicy?.description}
                        </p>
                    </section>

                    {/* Ground Rules */}
                    <section className="pb-6 border-b border-secondary-200">
                        <h2 className="text-xl font-semibold mb-4">Ground rules</h2>
                        <p className="text-secondary-600 mb-4">
                            We ask every guest to remember a few simple things about what makes a great guest.
                        </p>
                        <ul className="space-y-2 text-secondary-600">
                            <li className="flex items-start">
                                <span className="mr-2">•</span>
                                Follow the house rules
                            </li>
                            <li className="flex items-start">
                                <span className="mr-2">•</span>
                                Treat your Host's home like your own
                            </li>
                        </ul>
                    </section>

                    {/* Agreement */}
                    <section>
                        <label className="flex items-start space-x-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={agreedToRules}
                                onChange={(e) => setAgreedToRules(e.target.checked)}
                                className="mt-1 w-5 h-5 rounded border-secondary-300 text-primary-500 focus:ring-primary-500"
                            />
                            <span className="text-sm text-secondary-600">
                                I agree to the house rules, cancellation policy, and the{' '}
                                <a href="/terms" className="text-primary-500 underline">Guest Refund Policy</a>.
                            </span>
                        </label>
                    </section>

                    {/* Confirm Button */}
                    <Button
                        onClick={handleConfirmBooking}
                        loading={submitting}
                        disabled={!agreedToRules}
                        fullWidth
                        size="lg"
                    >
                        {property.instantBook ? 'Confirm and pay' : 'Request to book'}
                    </Button>
                </div>

                {/* Right Column - Property Summary */}
                <div>
                    <div className="sticky top-24 border border-secondary-200 rounded-xl p-6">
                        {/* Property Info */}
                        <div className="flex space-x-4 pb-6 border-b border-secondary-200">
                            <img
                                src={property.photos[0]?.url}
                                alt={property.title}
                                className="w-32 h-24 object-cover rounded-lg"
                            />
                            <div className="flex-1">
                                <p className="text-sm text-secondary-500">{property.propertyType}</p>
                                <p className="font-medium">{property.title}</p>
                                <div className="flex items-center mt-1 text-sm">
                                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                    <span>{propertyRating.toFixed(2)}</span>
                                    <span className="text-secondary-400 mx-1">·</span>
                                    <span className="text-secondary-500">
                                        {propertyReviewCount} review{propertyReviewCount !== 1 ? 's' : ''}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Price Details */}
                        <div className="py-6 border-b border-secondary-200">
                            <h3 className="text-xl font-semibold mb-4">Price details</h3>

                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span>
                                        {formatPrice(pricing.nightlyRate)} x {pricing.nights} night
                                        {pricing.nights !== 1 ? 's' : ''}
                                    </span>
                                    <span>{formatPrice(pricing.subtotal)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Cleaning fee</span>
                                    <span>{formatPrice(pricing.cleaningFee)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Service fee</span>
                                    <span>{formatPrice(pricing.serviceFee)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Taxes</span>
                                    <span>{formatPrice(pricing.taxes)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Total */}
                        <div className="flex justify-between pt-6 text-lg font-semibold">
                            <span>Total (USD)</span>
                            <span>{formatPrice(pricing.total)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
