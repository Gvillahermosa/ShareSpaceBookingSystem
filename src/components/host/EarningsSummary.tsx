import { useState, useEffect } from 'react';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import type { Booking } from '../../types';
import { getHostBookings } from '../../services/bookingService';
import { useAuth } from '../../contexts/AuthContext';
import { Spinner } from '../ui';

interface EarningsSummaryProps {
    period?: 'week' | 'month' | 'year' | 'all';
}

export default function EarningsSummary({ period = 'month' }: EarningsSummaryProps) {
    const { currentUser } = useAuth();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPeriod, setSelectedPeriod] = useState(period);

    useEffect(() => {
        const fetchBookings = async () => {
            if (!currentUser) return;
            try {
                const allBookings = await getHostBookings(currentUser.uid);
                setBookings(allBookings.filter((b) => b.status === 'completed' || b.status === 'confirmed'));
            } catch (error) {
                console.error('Error fetching bookings:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchBookings();
    }, [currentUser]);

    const getDateRange = () => {
        const now = new Date();
        switch (selectedPeriod) {
            case 'week':
                return { start: subDays(now, 7), end: now };
            case 'month':
                return { start: startOfMonth(now), end: endOfMonth(now) };
            case 'year':
                return { start: new Date(now.getFullYear(), 0, 1), end: now };
            default:
                return { start: new Date(0), end: now };
        }
    };

    const filteredBookings = bookings.filter((booking) => {
        if (selectedPeriod === 'all') return true;

        const { start, end } = getDateRange();
        // Use booking creation date or checkIn date for filtering (more intuitive for hosts)
        const bookingDate = booking.createdAt?.toDate?.() || booking.checkIn?.toDate?.() || new Date();
        return bookingDate >= start && bookingDate <= end;
    });

    const calculateEarnings = () => {
        return filteredBookings.reduce((total, booking) => total + booking.pricing.total, 0);
    };

    const calculatePayout = () => {
        // Assuming 97% payout after 3% service fee
        return calculateEarnings() * 0.97;
    };

    const calculateAverageNightlyRate = () => {
        if (filteredBookings.length === 0) return 0;
        const totalNightlyRates = filteredBookings.reduce((sum, b) => sum + b.pricing.nightlyRate, 0);
        return totalNightlyRates / filteredBookings.length;
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'PHP',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    // Generate chart data for the last 30 days
    const generateChartData = () => {
        const days = eachDayOfInterval({
            start: subDays(new Date(), 30),
            end: new Date(),
        });

        return days.map((day) => {
            const dayBookings = bookings.filter((b) => {
                const bookingDate = b.createdAt?.toDate?.() || b.checkIn?.toDate?.() || new Date();
                return format(bookingDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
            });
            const earnings = dayBookings.reduce((sum, b) => sum + b.pricing.total, 0);
            return { date: day, earnings };
        });
    }; const chartData = generateChartData();
    const maxEarnings = Math.max(...chartData.map((d) => d.earnings), 1);

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
                <h3 className="text-xl font-semibold">Earnings</h3>
                <select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value as typeof selectedPeriod)}
                    className="px-4 py-2 border border-secondary-200 rounded-lg text-sm"
                >
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="year">This Year</option>
                    <option value="all">All Time</option>
                </select>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                <div>
                    <p className="text-sm text-secondary-500">Total Earnings</p>
                    <p className="text-2xl font-bold">{formatCurrency(calculateEarnings())}</p>
                </div>
                <div>
                    <p className="text-sm text-secondary-500">Net Payout</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(calculatePayout())}</p>
                </div>
                <div>
                    <p className="text-sm text-secondary-500">Bookings</p>
                    <p className="text-2xl font-bold">{filteredBookings.length}</p>
                </div>
                <div>
                    <p className="text-sm text-secondary-500">Avg. Nightly Rate</p>
                    <p className="text-2xl font-bold">{formatCurrency(calculateAverageNightlyRate())}</p>
                </div>
            </div>

            {/* Simple Bar Chart */}
            <div className="mt-6">
                <h4 className="text-sm font-medium text-secondary-600 mb-4">Last 30 Days</h4>
                <div className="flex items-end space-x-1 h-32">
                    {chartData.map((data, index) => (
                        <div
                            key={index}
                            className="flex-1 bg-primary-100 hover:bg-primary-200 rounded-t transition-colors group relative"
                            style={{ height: `${(data.earnings / maxEarnings) * 100}%`, minHeight: '4px' }}
                        >
                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-secondary-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                {format(data.date, 'MMM d')}: {formatCurrency(data.earnings)}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="flex justify-between text-xs text-secondary-400 mt-2">
                    <span>{format(subDays(new Date(), 30), 'MMM d')}</span>
                    <span>Today</span>
                </div>
            </div>

            {/* Recent Payouts */}
            {filteredBookings.length > 0 && (
                <div className="mt-8">
                    <h4 className="text-sm font-medium text-secondary-600 mb-4">Recent Transactions</h4>
                    <div className="space-y-3">
                        {filteredBookings.slice(0, 5).map((booking) => (
                            <div
                                key={booking.id}
                                className="flex items-center justify-between p-3 bg-secondary-50 rounded-lg"
                            >
                                <div>
                                    <p className="font-medium">{booking.guestName ?? 'Guest'}</p>
                                    <p className="text-sm text-secondary-500">
                                        {format(booking.checkIn.toDate(), 'MMM d')} – {format(booking.checkOut.toDate(), 'MMM d')}
                                    </p>
                                </div>
                                <span className="font-semibold text-green-600">
                                    +{formatCurrency(booking.pricing.total * 0.97)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
