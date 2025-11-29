import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../contexts/AuthContext';
import { uploadProfilePhoto } from '../services/storageService';
import { Button, Input, Avatar, Spinner } from '../components/ui';
import { Modal } from '../components/ui/Modal';
import toast from 'react-hot-toast';

const profileSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
    phone: z.string().optional(),
    languages: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function ProfilePage() {
    const { currentUser, userProfile, updateUserProfile, deleteAccount } = useAuth();
    const navigate = useNavigate();
    const [uploading, setUploading] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [deletePassword, setDeletePassword] = useState('');
    const [deleting, setDeleting] = useState(false);

    // Check if user signed up with Google
    const isGoogleUser = currentUser?.providerData[0]?.providerId === 'google.com';

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<ProfileFormData>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            name: userProfile?.name || currentUser?.displayName || '',
            bio: userProfile?.bio || '',
            phone: userProfile?.phone || '',
            languages: userProfile?.languages?.join(', ') || '',
        },
    });

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !currentUser) return;

        setUploading(true);
        try {
            const photoURL = await uploadProfilePhoto(currentUser.uid, file);
            await updateUserProfile({ photoURL });
            toast.success('Photo updated successfully');
        } catch (error) {
            console.error('Error uploading photo:', error);
            toast.error('Failed to upload photo');
        } finally {
            setUploading(false);
        }
    };

    const onSubmit = async (data: ProfileFormData) => {
        try {
            await updateUserProfile({
                name: data.name,
                bio: data.bio,
                phone: data.phone,
                languages: data.languages?.split(',').map((l) => l.trim()).filter(Boolean),
            });
            toast.success('Profile updated successfully');
        } catch (error) {
            console.error('Error updating profile:', error);
            toast.error('Failed to update profile');
        }
    };

    const handleDeleteAccount = async () => {
        if (deleteConfirmText !== 'DELETE') {
            toast.error('Please type DELETE to confirm');
            return;
        }

        // For email/password users, require password
        if (!isGoogleUser && !deletePassword) {
            toast.error('Please enter your password to confirm');
            return;
        }

        setDeleting(true);
        try {
            await deleteAccount(isGoogleUser ? undefined : deletePassword);
            toast.success('Your account has been deleted');
            navigate('/');
        } catch (error) {
            console.error('Error deleting account:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to delete account';
            toast.error(errorMessage);
        } finally {
            setDeleting(false);
            setShowDeleteModal(false);
            setDeleteConfirmText('');
            setDeletePassword('');
        }
    };

    if (!currentUser) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-semibold mb-8">Profile</h1>

            <div className="bg-white border border-secondary-200 rounded-xl p-6 mb-6">
                {/* Profile Photo */}
                <div className="flex items-center space-x-6 mb-8">
                    <div className="relative">
                        <Avatar
                            src={userProfile?.photoURL || currentUser.photoURL || undefined}
                            alt={currentUser.displayName || 'User'}
                            size="xl"
                        />
                        {uploading && (
                            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                                <Spinner size="sm" />
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="cursor-pointer">
                            <span className="inline-block px-4 py-2 border border-secondary-300 rounded-lg font-medium hover:bg-secondary-50 transition-colors">
                                {uploading ? 'Uploading...' : 'Change photo'}
                            </span>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handlePhotoUpload}
                                disabled={uploading}
                                className="sr-only"
                            />
                        </label>
                        <p className="text-sm text-secondary-500 mt-2">
                            JPG, PNG or GIF. Max size 5MB.
                        </p>
                    </div>
                </div>

                {/* Profile Form */}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <Input
                        label="Display Name"
                        {...register('name')}
                        error={errors.name?.message}
                    />

                    <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-1">
                            Bio
                        </label>
                        <textarea
                            {...register('bio')}
                            rows={4}
                            className="w-full px-4 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="Tell guests about yourself..."
                        />
                        {errors.bio && (
                            <p className="mt-1 text-sm text-red-500">{errors.bio.message}</p>
                        )}
                    </div>

                    <Input
                        label="Phone Number"
                        type="tel"
                        {...register('phone')}
                        placeholder="+1 (555) 000-0000"
                    />

                    <Input
                        label="Languages (comma-separated)"
                        {...register('languages')}
                        placeholder="English, Spanish, French"
                    />

                    <Button type="submit" loading={isSubmitting}>
                        Save Changes
                    </Button>
                </form>
            </div>

            {/* Account Settings */}
            <div className="bg-white border border-secondary-200 rounded-xl p-6">
                <h2 className="text-xl font-semibold mb-4">Account Settings</h2>

                <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b border-secondary-100">
                        <div>
                            <p className="font-medium">Email</p>
                            <p className="text-sm text-secondary-500">{currentUser.email}</p>
                        </div>
                        <Button variant="outline" size="sm">
                            Change
                        </Button>
                    </div>

                    <div className="flex items-center justify-between py-3 border-b border-secondary-100">
                        <div>
                            <p className="font-medium">Password</p>
                            <p className="text-sm text-secondary-500">Last changed 30 days ago</p>
                        </div>
                        <Button variant="outline" size="sm">
                            Update
                        </Button>
                    </div>

                    <div className="flex items-center justify-between py-3 border-b border-secondary-100">
                        <div>
                            <p className="font-medium">Identity Verification</p>
                            <p className="text-sm text-secondary-500">
                                {userProfile?.verified?.identity ? 'Verified' : 'Not verified'}
                            </p>
                        </div>
                        {!userProfile?.verified?.identity && (
                            <Button variant="outline" size="sm">
                                Verify
                            </Button>
                        )}
                    </div>

                    <div className="flex items-center justify-between py-3">
                        <div>
                            <p className="font-medium text-red-600">Delete Account</p>
                            <p className="text-sm text-secondary-500">
                                Permanently delete your account and all data
                            </p>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => setShowDeleteModal(true)}
                        >
                            Delete
                        </Button>
                    </div>
                </div>
            </div>

            {/* Delete Account Confirmation Modal */}
            <Modal
                isOpen={showDeleteModal}
                onClose={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirmText('');
                    setDeletePassword('');
                }}
                size="sm"
                showCloseButton={true}
            >
                <div className="p-2">
                    <div className="text-center mb-6">
                        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-secondary-900">Delete Account?</h2>
                        <p className="text-secondary-500 mt-2">
                            This action cannot be undone. All your data, bookings, and listings will be permanently deleted.
                        </p>
                        {isGoogleUser && (
                            <p className="text-sm text-secondary-400 mt-2">
                                You will be asked to re-authenticate with Google.
                            </p>
                        )}
                    </div>

                    <div className="space-y-4 mb-6">
                        {!isGoogleUser && (
                            <div>
                                <label className="block text-sm font-medium text-secondary-700 mb-2">
                                    Enter your password
                                </label>
                                <input
                                    type="password"
                                    value={deletePassword}
                                    onChange={(e) => setDeletePassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full px-4 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                />
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-secondary-700 mb-2">
                                Type <span className="font-bold text-red-600">DELETE</span> to confirm
                            </label>
                            <input
                                type="text"
                                value={deleteConfirmText}
                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                placeholder="DELETE"
                                className="w-full px-4 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    <div className="flex space-x-3">
                        <Button
                            variant="outline"
                            fullWidth
                            onClick={() => {
                                setShowDeleteModal(false);
                                setDeleteConfirmText('');
                                setDeletePassword('');
                            }}
                            disabled={deleting}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="danger"
                            fullWidth
                            onClick={handleDeleteAccount}
                            loading={deleting}
                            disabled={deleteConfirmText !== 'DELETE' || (!isGoogleUser && !deletePassword)}
                        >
                            Delete Account
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
