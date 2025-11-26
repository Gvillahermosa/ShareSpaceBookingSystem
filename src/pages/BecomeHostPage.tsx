import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui';
import toast from 'react-hot-toast';

const HOSTING_BENEFITS = [
    {
        icon: '💰',
        title: 'Earn extra income',
        description: 'Turn your extra space into extra income. List your property and start earning today.',
    },
    {
        icon: '🛡️',
        title: 'Host with confidence',
        description: 'Every booking includes $1M property damage protection and $1M liability insurance.',
    },
    {
        icon: '📱',
        title: 'Easy management',
        description: 'Manage your listing, calendar, and bookings all in one place with our intuitive dashboard.',
    },
    {
        icon: '🌍',
        title: 'Global reach',
        description: 'Reach millions of travelers worldwide looking for unique places to stay.',
    },
    {
        icon: '💬',
        title: '24/7 support',
        description: 'Our dedicated support team is here to help you every step of the way.',
    },
    {
        icon: '⭐',
        title: 'Build your reputation',
        description: 'Collect reviews from guests and build your reputation as a trusted host.',
    },
];

const STEPS = [
    {
        number: 1,
        title: 'Create your listing',
        description: 'Share details about your space: photos, amenities, location, and more.',
    },
    {
        number: 2,
        title: 'Set your price',
        description: 'Choose your nightly rate, cleaning fees, and any discounts you want to offer.',
    },
    {
        number: 3,
        title: 'Welcome guests',
        description: 'Once your listing is live, guests can book. Accept bookings and start earning!',
    },
];

export default function BecomeHostPage() {
    const navigate = useNavigate();
    const { currentUser, userProfile, updateUserProfile } = useAuth();
    const [loading, setLoading] = useState(false);

    const handleBecomeHost = async () => {
        if (!currentUser) {
            toast.error('Please log in to become a host');
            return;
        }

        setLoading(true);
        try {
            // Update user profile to become a host
            await updateUserProfile({ isHost: true });
            toast.success('Congratulations! You are now a host!');
            navigate('/host/listings/new');
        } catch (error) {
            console.error('Error becoming host:', error);
            toast.error('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // If already a host, redirect to dashboard
    if (userProfile?.isHost) {
        navigate('/host');
        return null;
    }

    return (
        <div className="min-h-screen">
            {/* Hero Section */}
            <section className="relative bg-gradient-to-br from-primary-500 to-primary-700 text-white py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-3xl">
                        <h1 className="text-4xl md:text-5xl font-bold mb-6">
                            Share your space,<br />earn extra income
                        </h1>
                        <p className="text-xl text-primary-100 mb-8">
                            Join thousands of hosts who are earning money by sharing their homes with travelers from around the world.
                        </p>
                        <Button
                            onClick={handleBecomeHost}
                            loading={loading}
                            size="lg"
                            className="bg-white text-primary-600 hover:bg-primary-50"
                        >
                            {currentUser ? 'Start hosting' : 'Sign up to host'}
                        </Button>
                    </div>
                </div>

                {/* Decorative element */}
                <div className="absolute right-0 bottom-0 w-1/3 h-full hidden lg:block">
                    <div className="absolute inset-0 bg-gradient-to-l from-primary-600/50 to-transparent" />
                </div>
            </section>

            {/* How it works */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-3xl font-bold text-center mb-12">
                        How it works
                    </h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        {STEPS.map((step) => (
                            <div key={step.number} className="text-center">
                                <div className="w-16 h-16 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                                    {step.number}
                                </div>
                                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                                <p className="text-secondary-600">{step.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Benefits */}
            <section className="py-20 bg-secondary-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-3xl font-bold text-center mb-12">
                        Why host with ShareSpace?
                    </h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {HOSTING_BENEFITS.map((benefit, index) => (
                            <div
                                key={index}
                                className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow"
                            >
                                <span className="text-4xl mb-4 block">{benefit.icon}</span>
                                <h3 className="text-lg font-semibold mb-2">{benefit.title}</h3>
                                <p className="text-secondary-600">{benefit.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Earnings Calculator */}
            <section className="py-20 bg-white">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-3xl font-bold mb-4">
                        See what you could earn
                    </h2>
                    <p className="text-secondary-600 mb-8">
                        Most hosts in your area earn an average of $1,500 per month
                    </p>
                    <div className="bg-secondary-50 rounded-2xl p-8">
                        <div className="grid md:grid-cols-3 gap-8 mb-8">
                            <div>
                                <p className="text-4xl font-bold text-primary-600">$150</p>
                                <p className="text-secondary-600">Average per night</p>
                            </div>
                            <div>
                                <p className="text-4xl font-bold text-primary-600">12</p>
                                <p className="text-secondary-600">Nights booked/month</p>
                            </div>
                            <div>
                                <p className="text-4xl font-bold text-green-600">$1,800</p>
                                <p className="text-secondary-600">Monthly earnings</p>
                            </div>
                        </div>
                        <p className="text-xs text-secondary-500">
                            * Estimates are based on average earnings in your area. Actual earnings may vary.
                        </p>
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <section className="py-20 bg-secondary-50">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-3xl font-bold text-center mb-12">
                        Frequently asked questions
                    </h2>
                    <div className="space-y-6">
                        <details className="bg-white p-6 rounded-xl shadow-sm group">
                            <summary className="font-semibold cursor-pointer list-none flex justify-between items-center">
                                How do I get paid?
                                <svg className="w-5 h-5 text-secondary-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </summary>
                            <p className="mt-4 text-secondary-600">
                                Payouts are sent 24 hours after your guest checks in. You can receive payments via PayPal, bank transfer, or other methods available in your region.
                            </p>
                        </details>

                        <details className="bg-white p-6 rounded-xl shadow-sm group">
                            <summary className="font-semibold cursor-pointer list-none flex justify-between items-center">
                                What if something gets damaged?
                                <svg className="w-5 h-5 text-secondary-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </summary>
                            <p className="mt-4 text-secondary-600">
                                Every booking includes $1 million in property damage protection. In the rare case something is damaged, we'll help you get reimbursed.
                            </p>
                        </details>

                        <details className="bg-white p-6 rounded-xl shadow-sm group">
                            <summary className="font-semibold cursor-pointer list-none flex justify-between items-center">
                                Can I choose who stays at my place?
                                <svg className="w-5 h-5 text-secondary-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </summary>
                            <p className="mt-4 text-secondary-600">
                                You can set house rules, require guests to have verified IDs, and choose to manually approve each booking request. Or, enable Instant Book to let guests book instantly.
                            </p>
                        </details>

                        <details className="bg-white p-6 rounded-xl shadow-sm group">
                            <summary className="font-semibold cursor-pointer list-none flex justify-between items-center">
                                How much does it cost to list?
                                <svg className="w-5 h-5 text-secondary-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </summary>
                            <p className="mt-4 text-secondary-600">
                                Creating a listing is completely free! We only charge a small service fee (3%) when you receive a booking.
                            </p>
                        </details>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-20 bg-primary-600 text-white">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-3xl font-bold mb-6">
                        Ready to start hosting?
                    </h2>
                    <p className="text-primary-100 mb-8">
                        Join our community of hosts and start earning money from your space today.
                    </p>
                    <Button
                        onClick={handleBecomeHost}
                        loading={loading}
                        size="lg"
                        className="bg-white text-primary-600 hover:bg-primary-50"
                    >
                        Get started
                    </Button>
                </div>
            </section>
        </div>
    );
}
