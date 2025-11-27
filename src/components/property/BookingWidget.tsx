import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import { differenceInDays, format } from 'date-fns';
import type { Property, Booking } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useUIStore, useBookingStore } from '../../store';
import { calculateBookingPrice, getUserActiveBookingForProperty } from '../../services/bookingService';
import { checkPropertyAvailability } from '../../services/propertyService';
import { Button } from '../ui';
import toast from 'react-hot-toast';

interface BookingWidgetProps {
    property: Property;
}

export default function BookingWidget({ property }: BookingWidgetProps) {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const { openLoginModal } = useUIStore();
    const { setCurrentBooking } = useBookingStore();

    const [checkIn, setCheckIn] = useState<Date | null>(null);
    const [checkOut, setCheckOut] = useState<Date | null>(null);
    const [guests, setGuests] = useState({
        adults: 1,
        children: 0,
        infants: 0,
    });
    const [showGuestsDropdown, setShowGuestsDropdown] = useState(false);
    const [loading, setLoading] = useState(false);
    const [existingBooking, setExistingBooking] = useState<Booking | null>(null);
    const [checkingBooking, setCheckingBooking] = useState(false);

    // Check if user already has an active booking for this property
    useEffect(() => {
        const checkExistingBooking = async () => {
            if (!currentUser) {
                setExistingBooking(null);
                return;
            }

            setCheckingBooking(true);
            try {
                const booking = await getUserActiveBookingForProperty(currentUser.uid, property.id);
                setExistingBooking(booking);
            } catch (error) {
                console.error('Error checking existing booking:', error);
            } finally {
                setCheckingBooking(false);
            }
        };

        checkExistingBooking();
    }, [currentUser, property.id]);

    const totalGuests = guests.adults + guests.children;
    const nights = checkIn && checkOut ? differenceInDays(checkOut, checkIn) : 0;

    const pricing = checkIn && checkOut
        ? calculateBookingPrice(property, checkIn, checkOut, guests)
        : null;

    const updateGuestCount = (type: 'adults' | 'children' | 'infants', delta: number) => {
        setGuests((prev) => {
            const newCount = prev[type] + delta;
            if (type === 'adults' && newCount < 1) return prev;
            if (newCount < 0) return prev;
            const newTotal = (type === 'adults' ? newCount : prev.adults) +
                (type === 'children' ? newCount : prev.children);
            if (newTotal > property.maxGuests) {
                toast.error(`Maximum ${property.maxGuests} guests allowed`);
                return prev;
            }
            return { ...prev, [type]: newCount };
        });
    };

    const handleReserve = async () => {
        if (!currentUser) {
            openLoginModal();
            return;
        }

        if (!checkIn || !checkOut) {
            toast.error('Please select check-in and check-out dates');
            return;
        }

        if (nights < property.minimumStay) {
            toast.error(`Minimum stay is ${property.minimumStay} nights`);
            return;
        }

        if (property.maximumStay && nights > property.maximumStay) {
            toast.error(`Maximum stay is ${property.maximumStay} nights`);
            return;
        }

        setLoading(true);
        try {
            // Check availability
            console.log('Checking availability for property:', property.id, 'dates:', checkIn, '-', checkOut);
            const isAvailable = await checkPropertyAvailability(property.id, checkIn, checkOut);
            console.log('Availability result:', isAvailable);
            if (!isAvailable) {
                toast.error('Sorry, these dates are already booked. Please select different dates.');
                setLoading(false);
                return;
            }

            // Set booking data and navigate to booking page
            setCurrentBooking({
                propertyId: property.id,
                hostId: property.hostId,
                checkIn: checkIn as any,
                checkOut: checkOut as any,
                guests,
                pricing: pricing!,
            });

            navigate(`/booking/confirm`);
        } catch (error) {
            console.error('Error in handleReserve:', error);
            toast.error('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'PHP',
            minimumFractionDigits: 0,
        }).format(price);
    };

    // Generate blocked dates for the date picker
    const blockedDates = (property.blockedDates || []).map((date) => new Date(date));

    return (
        <div className="sticky top-24 border border-secondary-200 rounded-xl shadow-card p-6">
            {/* Price */}
            <div className="mb-6">
                <span className="text-2xl font-semibold">
                    {formatPrice(property.pricing.basePrice)}
                </span>
                <span className="text-secondary-600"> night</span>
            </div>

            {/* Date Selection */}
            <div className="border border-secondary-300 rounded-xl overflow-hidden mb-4">
                <div className="grid grid-cols-2">
                    <div className="p-3 border-r border-secondary-300">
                        <label className="block text-xs font-semibold text-secondary-800 uppercase">
                            Check-in
                        </label>
                        <DatePicker
                            selected={checkIn}
                            onChange={(date) => setCheckIn(date)}
                            selectsStart
                            startDate={checkIn}
                            endDate={checkOut}
                            minDate={new Date()}
                            excludeDates={blockedDates}
                            placeholderText="Add date"
                            className="w-full text-sm mt-1 outline-none"
                        />
                    </div>
                    <div className="p-3">
                        <label className="block text-xs font-semibold text-secondary-800 uppercase">
                            Checkout
                        </label>
                        <DatePicker
                            selected={checkOut}
                            onChange={(date) => setCheckOut(date)}
                            selectsEnd
                            startDate={checkIn}
                            endDate={checkOut}
                            minDate={checkIn || new Date()}
                            excludeDates={blockedDates}
                            placeholderText="Add date"
                            className="w-full text-sm mt-1 outline-none"
                        />
                    </div>
                </div>

                {/* Guests */}
                <div className="border-t border-secondary-300 p-3 relative">
                    <button
                        onClick={() => setShowGuestsDropdown(!showGuestsDropdown)}
                        className="w-full text-left"
                    >
                        <label className="block text-xs font-semibold text-secondary-800 uppercase">
                            Guests
                        </label>
                        <p className="text-sm mt-1">
                            {totalGuests} guest{totalGuests !== 1 ? 's' : ''}
                            {guests.infants > 0 && `, ${guests.infants} infant${guests.infants !== 1 ? 's' : ''}`}
                        </p>
                    </button>

                    {/* Guests Dropdown */}
                    {showGuestsDropdown && (
                        <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-secondary-200 rounded-xl shadow-lg p-4 z-10">
                            {/* Adults */}
                            <div className="flex items-center justify-between py-3">
                                <div>
                                    <p className="font-medium">Adults</p>
                                    <p className="text-sm text-secondary-500">Ages 13 or above</p>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <button
                                        onClick={() => updateGuestCount('adults', -1)}
                                        disabled={guests.adults <= 1}
                                        className="w-8 h-8 rounded-full border border-secondary-300 flex items-center justify-center disabled:opacity-50"
                                    >
                                        -
                                    </button>
                                    <span className="w-8 text-center">{guests.adults}</span>
                                    <button
                                        onClick={() => updateGuestCount('adults', 1)}
                                        className="w-8 h-8 rounded-full border border-secondary-300 flex items-center justify-center"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            {/* Children */}
                            <div className="flex items-center justify-between py-3 border-t border-secondary-100">
                                <div>
                                    <p className="font-medium">Children</p>
                                    <p className="text-sm text-secondary-500">Ages 2–12</p>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <button
                                        onClick={() => updateGuestCount('children', -1)}
                                        disabled={guests.children <= 0}
                                        className="w-8 h-8 rounded-full border border-secondary-300 flex items-center justify-center disabled:opacity-50"
                                    >
                                        -
                                    </button>
                                    <span className="w-8 text-center">{guests.children}</span>
                                    <button
                                        onClick={() => updateGuestCount('children', 1)}
                                        className="w-8 h-8 rounded-full border border-secondary-300 flex items-center justify-center"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            {/* Infants */}
                            <div className="flex items-center justify-between py-3 border-t border-secondary-100">
                                <div>
                                    <p className="font-medium">Infants</p>
                                    <p className="text-sm text-secondary-500">Under 2</p>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <button
                                        onClick={() => updateGuestCount('infants', -1)}
                                        disabled={guests.infants <= 0}
                                        className="w-8 h-8 rounded-full border border-secondary-300 flex items-center justify-center disabled:opacity-50"
                                    >
                                        -
                                    </button>
                                    <span className="w-8 text-center">{guests.infants}</span>
                                    <button
                                        onClick={() => updateGuestCount('infants', 1)}
                                        className="w-8 h-8 rounded-full border border-secondary-300 flex items-center justify-center"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            <p className="text-xs text-secondary-500 mt-3">
                                This place has a maximum of {property.maxGuests} guests, not including infants.
                            </p>

                            <button
                                onClick={() => setShowGuestsDropdown(false)}
                                className="w-full mt-4 text-sm font-medium underline"
                            >
                                Close
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Reserve Button */}
            {existingBooking ? (
                <div>
                    <Button
                        onClick={() => navigate('/trips')}
                        fullWidth
                        size="lg"
                        variant="secondary"
                        className="bg-green-600 hover:bg-green-700 text-white border-green-600"
                    >
                        Already Reserved
                    </Button>
                    <p className="text-center text-sm text-secondary-600 mt-2">
                        You have a booking from{' '}
                        {existingBooking.checkIn?.toDate
                            ? format(existingBooking.checkIn.toDate(), 'MMM d')
                            : existingBooking.checkIn?.seconds
                                ? format(new Date(existingBooking.checkIn.seconds * 1000), 'MMM d')
                                : 'N/A'}{' '}
                        -{' '}
                        {existingBooking.checkOut?.toDate
                            ? format(existingBooking.checkOut.toDate(), 'MMM d, yyyy')
                            : existingBooking.checkOut?.seconds
                                ? format(new Date(existingBooking.checkOut.seconds * 1000), 'MMM d, yyyy')
                                : 'N/A'}
                    </p>
                </div>
            ) : (
                <>
                    <Button onClick={handleReserve} loading={loading || checkingBooking} fullWidth size="lg">
                        {checkingBooking ? 'Checking...' : property.instantBook ? 'Reserve' : 'Request to book'}
                    </Button>

                    {property.instantBook && (
                        <p className="text-center text-sm text-secondary-500 mt-2">
                            You won't be charged yet
                        </p>
                    )}
                </>
            )}

            {/* Price Breakdown */}
            {pricing && nights > 0 && (
                <div className="mt-6 space-y-3">
                    <div className="flex justify-between">
                        <span className="underline">
                            {formatPrice(pricing.nightlyRate)} x {nights} night{nights !== 1 ? 's' : ''}
                        </span>
                        <span>{formatPrice(pricing.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="underline">Cleaning fee</span>
                        <span>{formatPrice(pricing.cleaningFee)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="underline">Service fee</span>
                        <span>{formatPrice(pricing.serviceFee)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="underline">Taxes</span>
                        <span>{formatPrice(pricing.taxes)}</span>
                    </div>
                    <div className="flex justify-between pt-3 border-t border-secondary-200 font-semibold">
                        <span>Total</span>
                        <span>{formatPrice(pricing.total)}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
