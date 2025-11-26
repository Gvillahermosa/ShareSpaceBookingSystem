import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import type { Review } from '../../types';
import { getPropertyReviews } from '../../services/reviewService';
import { Avatar, Button } from '../ui';

interface ReviewListProps {
    propertyId: string;
    averageRating: number;
    totalReviews: number;
}

interface RatingBreakdown {
    category: string;
    rating: number;
}

export default function ReviewList({ propertyId, averageRating, totalReviews }: ReviewListProps) {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAllReviews, setShowAllReviews] = useState(false);

    useEffect(() => {
        const fetchReviews = async () => {
            try {
                const fetchedReviews = await getPropertyReviews(propertyId);
                setReviews(fetchedReviews);
            } catch (error) {
                console.error('Error fetching reviews:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchReviews();
    }, [propertyId]);

    const calculateCategoryAverages = (): RatingBreakdown[] => {
        if (reviews.length === 0) return [];

        const categoryTotals: Record<string, number> = {
            Cleanliness: 0,
            Accuracy: 0,
            Communication: 0,
            Location: 0,
            'Check-in': 0,
            Value: 0,
        };

        reviews.forEach((review) => {
            categoryTotals.Cleanliness += review.ratings.cleanliness;
            categoryTotals.Accuracy += review.ratings.accuracy;
            categoryTotals.Communication += review.ratings.communication;
            categoryTotals.Location += review.ratings.location;
            categoryTotals['Check-in'] += review.ratings.checkIn;
            categoryTotals.Value += review.ratings.value;
        });

        return Object.entries(categoryTotals).map(([category, total]) => ({
            category,
            rating: total / reviews.length,
        }));
    };

    const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 6);
    const categoryAverages = calculateCategoryAverages();

    if (loading) {
        return (
            <div className="py-12 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            </div>
        );
    }

    if (reviews.length === 0) {
        return (
            <div className="py-12">
                <h2 className="text-2xl font-semibold mb-4">No reviews yet</h2>
                <p className="text-secondary-600">
                    Be the first to leave a review for this property.
                </p>
            </div>
        );
    }

    return (
        <div className="py-12 border-t border-secondary-200">
            {/* Rating Summary */}
            <div className="flex items-center gap-2 mb-8">
                <svg className="w-6 h-6 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="text-2xl font-semibold">{averageRating.toFixed(2)}</span>
                <span className="text-2xl">·</span>
                <span className="text-2xl font-semibold">{totalReviews} review{totalReviews !== 1 ? 's' : ''}</span>
            </div>

            {/* Rating Categories Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                {categoryAverages.map(({ category, rating }) => (
                    <div key={category} className="flex items-center justify-between">
                        <span className="text-secondary-700">{category}</span>
                        <div className="flex items-center gap-2">
                            <div className="w-24 h-1 bg-secondary-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-secondary-900 rounded-full"
                                    style={{ width: `${(rating / 5) * 100}%` }}
                                />
                            </div>
                            <span className="text-sm font-medium w-8">{rating.toFixed(1)}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Reviews Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {displayedReviews.map((review) => (
                    <ReviewCard key={review.id} review={review} />
                ))}
            </div>

            {/* Show All Button */}
            {reviews.length > 6 && !showAllReviews && (
                <div className="mt-8">
                    <Button variant="outline" onClick={() => setShowAllReviews(true)}>
                        Show all {reviews.length} reviews
                    </Button>
                </div>
            )}
        </div>
    );
}

interface ReviewCardProps {
    review: Review;
}

function ReviewCard({ review }: ReviewCardProps) {
    const [expanded, setExpanded] = useState(false);
    const maxLength = 200;
    const reviewComment = review.comment || '';
    const isLongReview = reviewComment.length > maxLength;

    return (
        <div className="space-y-4">
            {/* Guest Info */}
            <div className="flex items-center space-x-3">
                <Avatar
                    src={undefined}
                    alt="Guest"
                    size="md"
                />
                <div>
                    <p className="font-medium">Guest</p>
                    <p className="text-sm text-secondary-500">
                        {format(review.createdAt.toDate(), 'MMMM yyyy')}
                    </p>
                </div>
            </div>

            {/* Overall Rating */}
            <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                    <svg
                        key={i}
                        className={`w-4 h-4 ${i < Math.round(review.ratings.overall)
                            ? 'text-secondary-900'
                            : 'text-secondary-200'
                            }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                    >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                ))}
            </div>

            {/* Review Content */}
            <p className="text-secondary-700 leading-relaxed">
                {expanded || !isLongReview
                    ? reviewComment
                    : `${reviewComment.substring(0, maxLength)}...`}
                {isLongReview && (
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="ml-2 font-medium underline"
                    >
                        {expanded ? 'Show less' : 'Show more'}
                    </button>
                )}
            </p>

            {/* Host Response */}
            {review.hostResponse && (
                <div className="bg-secondary-50 rounded-lg p-4 mt-3">
                    <p className="font-medium text-sm mb-2">Response from host</p>
                    <p className="text-sm text-secondary-600">{review.hostResponse.comment}</p>
                    <p className="text-xs text-secondary-400 mt-2">
                        {format(review.hostResponse.createdAt.toDate(), 'MMMM yyyy')}
                    </p>
                </div>
            )}
        </div>
    );
}
