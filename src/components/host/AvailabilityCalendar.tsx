import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isWithinInterval } from 'date-fns';
import type { Booking } from '../../types';
import { getHostBookings } from '../../services/bookingService';
import { useAuth } from '../../contexts/AuthContext';
import { Spinner } from '../ui';

interface AvailabilityCalendarProps {
    propertyId: string;
    blockedDates?: Date[];
    onDateSelect?: (dates: Date[]) => void;
    onBlockDates?: (dates: Date[]) => void;
}

export default function AvailabilityCalendar({
    propertyId,
    blockedDates = [],
    onDateSelect,
    onBlockDates,
}: AvailabilityCalendarProps) {
    const { currentUser } = useAuth();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDates, setSelectedDates] = useState<Date[]>([]);
    const [selectionStart, setSelectionStart] = useState<Date | null>(null);

    useEffect(() => {
        const fetchBookings = async () => {
            if (!currentUser) return;
            try {
                const allBookings = await getHostBookings(currentUser.uid);
                const propertyBookings = allBookings.filter(
                    (b) => b.propertyId === propertyId && ['confirmed', 'pending'].includes(b.status)
                );
                setBookings(propertyBookings);
            } catch (error) {
                console.error('Error fetching bookings:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchBookings();
    }, [currentUser, propertyId]);

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Get padding days for the start of the month
    const startDayOfWeek = monthStart.getDay();
    const paddingDays = Array.from({ length: startDayOfWeek }, () => null);

    const getDateStatus = (date: Date): 'available' | 'booked' | 'blocked' | 'selected' => {
        if (selectedDates.some((d) => isSameDay(d, date))) {
            return 'selected';
        }

        if (blockedDates.some((d) => isSameDay(d, date))) {
            return 'blocked';
        }

        const booking = bookings.find((b) => {
            const checkIn = b.checkIn.toDate();
            const checkOut = b.checkOut.toDate();
            return isWithinInterval(date, { start: checkIn, end: checkOut });
        });

        if (booking) {
            return 'booked';
        }

        return 'available';
    };

    const getBookingForDate = (date: Date): Booking | undefined => {
        return bookings.find((b) => {
            const checkIn = b.checkIn.toDate();
            const checkOut = b.checkOut.toDate();
            return isWithinInterval(date, { start: checkIn, end: checkOut });
        });
    };

    const handleDateClick = (date: Date) => {
        if (!onDateSelect && !onBlockDates) return;

        if (!selectionStart) {
            setSelectionStart(date);
            setSelectedDates([date]);
        } else {
            const start = selectionStart < date ? selectionStart : date;
            const end = selectionStart < date ? date : selectionStart;
            const dateRange = eachDayOfInterval({ start, end });
            setSelectedDates(dateRange);
            setSelectionStart(null);
            onDateSelect?.(dateRange);
        }
    };

    const handleBlockSelected = () => {
        onBlockDates?.(selectedDates);
        setSelectedDates([]);
    };

    const getStatusClasses = (status: ReturnType<typeof getDateStatus>) => {
        switch (status) {
            case 'booked':
                return 'bg-blue-100 text-blue-800 cursor-default';
            case 'blocked':
                return 'bg-secondary-200 text-secondary-500 line-through cursor-default';
            case 'selected':
                return 'bg-primary-500 text-white';
            default:
                return 'hover:bg-secondary-100 cursor-pointer';
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-secondary-200 p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Availability Calendar</h3>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                        className="p-2 hover:bg-secondary-100 rounded-full"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <span className="font-medium min-w-[140px] text-center">
                        {format(currentMonth, 'MMMM yyyy')}
                    </span>
                    <button
                        onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                        className="p-2 hover:bg-secondary-100 rounded-full"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center space-x-4 mb-4 text-sm">
                <div className="flex items-center">
                    <span className="w-4 h-4 rounded bg-white border border-secondary-200 mr-2" />
                    Available
                </div>
                <div className="flex items-center">
                    <span className="w-4 h-4 rounded bg-blue-100 mr-2" />
                    Booked
                </div>
                <div className="flex items-center">
                    <span className="w-4 h-4 rounded bg-secondary-200 mr-2" />
                    Blocked
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
                {/* Day Headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div key={day} className="text-center text-sm font-medium text-secondary-500 py-2">
                        {day}
                    </div>
                ))}

                {/* Padding Days */}
                {paddingDays.map((_, index) => (
                    <div key={`padding-${index}`} className="aspect-square" />
                ))}

                {/* Calendar Days */}
                {daysInMonth.map((date) => {
                    const status = getDateStatus(date);
                    const booking = getBookingForDate(date);
                    const isPast = date < new Date();

                    return (
                        <div
                            key={date.toISOString()}
                            onClick={() => !isPast && status !== 'booked' && handleDateClick(date)}
                            className={`
                aspect-square flex flex-col items-center justify-center rounded-lg text-sm
                ${isPast ? 'text-secondary-300 cursor-default' : getStatusClasses(status)}
                ${isSameDay(date, new Date()) ? 'ring-2 ring-primary-500' : ''}
              `}
                            title={booking ? `${booking.guestName ?? 'Guest'} - ${format(booking.checkIn.toDate(), 'MMM d')} to ${format(booking.checkOut.toDate(), 'MMM d')}` : undefined}
                        >
                            <span>{format(date, 'd')}</span>
                            {booking && status === 'booked' && (
                                <span className="text-xs truncate max-w-full px-1">
                                    {(booking.guestName ?? 'Guest').split(' ')[0]}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Actions */}
            {selectedDates.length > 0 && onBlockDates && (
                <div className="mt-6 flex items-center justify-between p-4 bg-secondary-50 rounded-lg">
                    <span className="text-sm">
                        {selectedDates.length} date{selectedDates.length !== 1 ? 's' : ''} selected
                    </span>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => setSelectedDates([])}
                            className="px-4 py-2 text-sm text-secondary-600 hover:text-secondary-900"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleBlockSelected}
                            className="px-4 py-2 text-sm bg-secondary-900 text-white rounded-lg hover:bg-secondary-800"
                        >
                            Block dates
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
