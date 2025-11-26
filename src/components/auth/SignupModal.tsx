import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../contexts/AuthContext';
import { useUIStore } from '../../store';
import { Modal } from '../ui/Modal';
import { Button, Input } from '../ui';
import toast from 'react-hot-toast';

const signupSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
});

type SignupForm = z.infer<typeof signupSchema>;

export default function SignupModal() {
    const { isSignupModalOpen, closeSignupModal, openLoginModal } = useUIStore();
    const { signup, loginWithGoogle } = useAuth();
    const [loading, setLoading] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm<SignupForm>({
        resolver: zodResolver(signupSchema),
    });

    const onSubmit = async (data: SignupForm) => {
        setLoading(true);
        try {
            await signup(data.email, data.password, data.name);
            toast.success('Account created! Please verify your email.');
            closeSignupModal();
            reset();
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to create account';
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignup = async () => {
        setLoading(true);
        try {
            await loginWithGoogle();
            toast.success('Welcome to ShareSpace!');
            closeSignupModal();
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to sign up with Google';
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const switchToLogin = () => {
        closeSignupModal();
        openLoginModal();
    };

    return (
        <Modal isOpen={isSignupModalOpen} onClose={closeSignupModal} size="sm" showCloseButton={true}>
            <div className="px-2 pb-2">
                {/* Header with Icon */}
                <div className="text-center mb-8">
                    <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-secondary-900">Create your account</h2>
                    <p className="text-secondary-500 mt-1">Join ShareSpace and start exploring</p>
                </div>

                {/* Social Signup Buttons */}
                <div className="space-y-3 mb-6">
                    <button
                        onClick={handleGoogleSignup}
                        disabled={loading}
                        className="w-full flex items-center justify-center space-x-3 px-4 py-3.5 border-2 border-secondary-200 rounded-xl hover:border-primary-300 hover:bg-primary-50 transition-all duration-200 group"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        <span className="font-medium text-secondary-700 group-hover:text-secondary-900">Continue with Google</span>
                    </button>
                </div>

                {/* Divider */}
                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-secondary-200" />
                    </div>
                    <div className="relative flex justify-center">
                        <span className="px-4 bg-white text-sm text-secondary-400 font-medium">or sign up with email</span>
                    </div>
                </div>

                {/* Email Form */}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <Input
                        {...register('name')}
                        type="text"
                        label="Full name"
                        placeholder="John Doe"
                        error={errors.name?.message}
                    />
                    <Input
                        {...register('email')}
                        type="email"
                        label="Email address"
                        placeholder="you@example.com"
                        error={errors.email?.message}
                    />
                    <Input
                        {...register('password')}
                        type="password"
                        label="Password"
                        placeholder="••••••••"
                        error={errors.password?.message}
                    />
                    <Input
                        {...register('confirmPassword')}
                        type="password"
                        label="Confirm password"
                        placeholder="••••••••"
                        error={errors.confirmPassword?.message}
                    />

                    {/* Terms & Conditions */}
                    <div className="bg-secondary-50 rounded-xl p-4 border border-secondary-100">
                        <p className="text-xs text-secondary-500 leading-relaxed">
                            By creating an account, you agree to our{' '}
                            <a href="/terms" className="text-primary-500 hover:text-primary-600 font-medium">
                                Terms of Service
                            </a>{' '}
                            and{' '}
                            <a href="/privacy" className="text-primary-500 hover:text-primary-600 font-medium">
                                Privacy Policy
                            </a>
                            .
                        </p>
                    </div>

                    <Button type="submit" loading={loading} fullWidth size="lg">
                        Create account
                    </Button>
                </form>

                {/* Login link */}
                <div className="mt-8 pt-6 border-t border-secondary-100 text-center">
                    <p className="text-secondary-600">
                        Already have an account?{' '}
                        <button
                            onClick={switchToLogin}
                            className="text-primary-500 font-semibold hover:text-primary-600 transition-colors"
                        >
                            Sign in
                        </button>
                    </p>
                </div>
            </div>
        </Modal>
    );
}
