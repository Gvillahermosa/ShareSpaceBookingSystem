import { format } from 'date-fns';
import type { User } from '../../types';
import { Avatar, Badge } from '../ui';

interface HostInfoProps {
    host: User;
    onContact: () => void;
}

export default function HostInfo({ host, onContact }: HostInfoProps) {
    const memberSince = host.createdAt
        ? format(host.createdAt.toDate(), 'MMMM yyyy')
        : 'Unknown';

    const hostDisplayName = host.name || 'Host';

    return (
        <div className="py-8 border-t border-secondary-200">
            {/* Host Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-center space-x-4">
                    <Avatar
                        src={host.photoURL}
                        alt={hostDisplayName}
                        size="lg"
                    />
                    <div>
                        <h2 className="text-xl font-semibold">
                            Hosted by {hostDisplayName}
                        </h2>
                        <p className="text-secondary-500">Joined in {memberSince}</p>
                    </div>
                </div>
            </div>

            {/* Host Stats */}
            <div className="flex items-center space-x-6 mt-6">
                {host.reviewCount && host.reviewCount > 0 && (
                    <div className="flex items-center space-x-2">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span>{host.reviewCount} Reviews</span>
                    </div>
                )}
                {host.verified?.identity && (
                    <div className="flex items-center space-x-2">
                        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>Identity verified</span>
                    </div>
                )}
                {host.isSuperhost && (
                    <Badge variant="success">Superhost</Badge>
                )}
            </div>

            {/* Host Description */}
            {host.bio && (
                <div className="mt-6">
                    <h3 className="font-medium mb-2">About {hostDisplayName.split(' ')[0]}</h3>
                    <p className="text-secondary-700 leading-relaxed">{host.bio}</p>
                </div>
            )}

            {/* Host Languages & Response */}
            <div className="mt-6 space-y-3">
                {host.languages && host.languages.length > 0 && (
                    <div className="flex items-start">
                        <span className="font-medium w-40">Languages:</span>
                        <span className="text-secondary-700">{host.languages.join(', ')}</span>
                    </div>
                )}
                {host.responseRate && (
                    <div className="flex items-start">
                        <span className="font-medium w-40">Response rate:</span>
                        <span className="text-secondary-700">{host.responseRate}%</span>
                    </div>
                )}
                {host.responseTime && (
                    <div className="flex items-start">
                        <span className="font-medium w-40">Response time:</span>
                        <span className="text-secondary-700">{host.responseTime}</span>
                    </div>
                )}
            </div>

            {/* Contact Button */}
            <button
                onClick={onContact}
                className="mt-8 px-6 py-3 border border-secondary-900 rounded-lg font-medium hover:bg-secondary-50 transition-colors"
            >
                Contact Host
            </button>

            {/* Safety Notice */}
            <div className="mt-6 flex items-start space-x-3 p-4 bg-secondary-50 rounded-lg">
                <svg className="w-6 h-6 text-primary-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                <p className="text-sm text-secondary-600">
                    To protect your payment, never transfer money or communicate outside of the platform.
                </p>
            </div>
        </div>
    );
}
