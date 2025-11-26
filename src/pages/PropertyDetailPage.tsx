import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Property, User } from '../types';
import { getPropertyById, getUserById } from '../services/propertyService';
import { useAuth } from '../contexts/AuthContext';
import { useUIStore } from '../store';
import {
    PhotoGallery,
    BookingWidget,
    ReviewList,
    AmenitiesList,
    HostInfo,
} from '../components/property';
import { PropertyMap } from '../components/map';
import { Spinner, Badge } from '../components/ui';
import { PROPERTY_TYPE_LABELS } from '../config/constants';
import toast from 'react-hot-toast';

export default function PropertyDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const { openLoginModal } = useUIStore();

    const [property, setProperty] = useState<Property | null>(null);
    const [host, setHost] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;

            try {
                const propertyData = await getPropertyById(id);
                if (!propertyData) {
                    toast.error('Property not found');
                    navigate('/');
                    return;
                }
                setProperty(propertyData);

                const hostData = await getUserById(propertyData.hostId);
                setHost(hostData);
            } catch (error) {
                console.error('Error fetching property:', error);
                toast.error('Failed to load property');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id, navigate]);

    const handleContactHost = () => {
        if (!currentUser) {
            openLoginModal();
            return;
        }
        navigate(`/messages?hostId=${property?.hostId}&propertyId=${property?.id}`);
    };

    const handleShare = async () => {
        try {
            if (navigator.share) {
                await navigator.share({
                    title: property?.title,
                    url: window.location.href,
                });
            } else {
                await navigator.clipboard.writeText(window.location.href);
                toast.success('Link copied to clipboard!');
            }
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    if (!property) {
        return null;
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Title Section */}
            <div className="mb-6">
                <h1 className="text-2xl md:text-3xl font-semibold mb-2">{property.title}</h1>
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center space-x-2 text-sm">
                        <div className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            <span className="font-medium">{property.averageRating?.toFixed(2) || 'New'}</span>
                        </div>
                        <span>·</span>
                        <span className="underline">{property.reviewCount || 0} reviews</span>
                        <span>·</span>
                        {host?.isSuperhost && (
                            <>
                                <Badge variant="default">Superhost</Badge>
                                <span>·</span>
                            </>
                        )}
                        <span className="underline">
                            {property.location.city}, {property.location.country}
                        </span>
                    </div>

                    <div className="flex items-center space-x-4">
                        <button
                            onClick={handleShare}
                            className="flex items-center text-sm font-medium hover:underline"
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                            </svg>
                            Share
                        </button>
                        <button className="flex items-center text-sm font-medium hover:underline">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                            Save
                        </button>
                    </div>
                </div>
            </div>

            {/* Photo Gallery */}
            <PhotoGallery photos={property.photos} title={property.title} />

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mt-8">
                {/* Left Column - Property Info */}
                <div className="lg:col-span-2">
                    {/* Property Overview */}
                    <div className="pb-6 border-b border-secondary-200">
                        <div className="flex items-start justify-between">
                            <div>
                                <h2 className="text-xl font-semibold">
                                    {PROPERTY_TYPE_LABELS[property.propertyType] || property.propertyType} hosted by{' '}
                                    {host?.name?.split(' ')[0]}
                                </h2>
                                <p className="text-secondary-600 mt-1">
                                    {property.maxGuests} guest{property.maxGuests !== 1 ? 's' : ''} · {property.bedrooms}{' '}
                                    bedroom{property.bedrooms !== 1 ? 's' : ''} · {property.beds} bed
                                    {property.beds !== 1 ? 's' : ''} · {property.bathrooms} bath
                                    {property.bathrooms !== 1 ? 's' : ''}
                                </p>
                            </div>
                            {host && (
                                <img
                                    src={host.photoURL || '/default-avatar.png'}
                                    alt={host.name}
                                    className="w-14 h-14 rounded-full object-cover"
                                />
                            )}
                        </div>
                    </div>

                    {/* Highlights */}
                    <div className="py-6 border-b border-secondary-200 space-y-6">
                        {host?.isSuperhost && (
                            <div className="flex items-start space-x-4">
                                <svg className="w-6 h-6 text-secondary-700" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <div>
                                    <p className="font-medium">{host.name} is a Superhost</p>
                                    <p className="text-sm text-secondary-500">
                                        Superhosts are experienced, highly rated hosts who are committed to providing great stays.
                                    </p>
                                </div>
                            </div>
                        )}

                        {property.instantBook && (
                            <div className="flex items-start space-x-4">
                                <svg className="w-6 h-6 text-secondary-700" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                                </svg>
                                <div>
                                    <p className="font-medium">Instant Book</p>
                                    <p className="text-sm text-secondary-500">
                                        Book immediately without waiting for host approval.
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="flex items-start space-x-4">
                            <svg className="w-6 h-6 text-secondary-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <div>
                                <p className="font-medium">Free cancellation for 48 hours</p>
                                <p className="text-sm text-secondary-500">
                                    Get a full refund if you change your mind.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="py-6 border-b border-secondary-200">
                        <p className="text-secondary-700 leading-relaxed whitespace-pre-line">
                            {property.description}
                        </p>
                    </div>

                    {/* Amenities */}
                    <AmenitiesList amenities={property.amenities} />

                    {/* Location Map */}
                    <div className="py-8 border-t border-secondary-200">
                        <h2 className="text-2xl font-semibold mb-6">Where you'll be</h2>
                        {property.location?.coordinates?.latitude && property.location?.coordinates?.longitude ? (
                            <div className="h-[400px] rounded-xl overflow-hidden mb-4">
                                <PropertyMap
                                    properties={[property]}
                                    center={[
                                        property.location.coordinates.latitude,
                                        property.location.coordinates.longitude,
                                    ]}
                                    zoom={14}
                                    showClusters={false}
                                />
                            </div>
                        ) : (
                            <div className="h-[200px] rounded-xl bg-secondary-100 flex items-center justify-center mb-4">
                                <p className="text-secondary-500">Map not available</p>
                            </div>
                        )}
                        <p className="font-medium">
                            {property.location?.city || 'City'}, {property.location?.state || 'State'}, {property.location?.country || 'Country'}
                        </p>
                        <p className="text-secondary-600 mt-2">
                            Great location in the heart of the city.
                        </p>
                    </div>

                    {/* Host Info */}
                    {host && <HostInfo host={host} onContact={handleContactHost} />}

                    {/* House Rules */}
                    <div className="py-8 border-t border-secondary-200">
                        <h2 className="text-2xl font-semibold mb-6">Things to know</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div>
                                <h3 className="font-medium mb-4">House rules</h3>
                                <ul className="space-y-2 text-secondary-600">
                                    <li>Check-in: {property.checkInTime || '3:00 PM'}</li>
                                    <li>Checkout: {property.checkOutTime || '11:00 AM'}</li>
                                    <li>{property.maxGuests} guests maximum</li>
                                    {Array.isArray(property.houseRules) && property.houseRules.map((rule, index) => (
                                        <li key={index}>{rule}</li>
                                    ))}
                                </ul>
                            </div>
                            <div>
                                <h3 className="font-medium mb-4">Safety & property</h3>
                                <ul className="space-y-2 text-secondary-600">
                                    {property.amenities?.includes('carbon_monoxide_alarm') && <li>Carbon monoxide alarm</li>}
                                    {property.amenities?.includes('smoke_alarm') && <li>Smoke alarm</li>}
                                    {property.amenities?.includes('fire_extinguisher') && <li>Fire extinguisher</li>}
                                    {property.amenities?.includes('first_aid_kit') && <li>First aid kit</li>}
                                    {property.amenities?.includes('security_cameras') && <li>Security cameras on property</li>}
                                    {!property.amenities?.some(a => ['carbon_monoxide_alarm', 'smoke_alarm', 'fire_extinguisher', 'first_aid_kit', 'security_cameras'].includes(a)) && (
                                        <li>Contact host for safety information</li>
                                    )}
                                </ul>
                            </div>
                            <div>
                                <h3 className="font-medium mb-4">Cancellation policy</h3>
                                <p className="text-secondary-600">
                                    {property.cancellationPolicy === 'flexible'
                                        ? 'Free cancellation for 48 hours. After that, cancel before check-in and get a full refund, minus the service fee.'
                                        : property.cancellationPolicy === 'moderate'
                                            ? 'Cancel up to 5 days before check-in and get a full refund. Cancel within 5 days and get a 50% refund.'
                                            : 'Cancel up to 7 days before check-in and get a 50% refund. No refund for cancellations after that.'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Reviews */}
                    <ReviewList
                        propertyId={property.id}
                        averageRating={property.averageRating || 0}
                        totalReviews={property.reviewCount || 0}
                    />
                </div>

                {/* Right Column - Booking Widget */}
                <div className="lg:col-span-1">
                    <BookingWidget property={property} />
                </div>
            </div>
        </div>
    );
}
