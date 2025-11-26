import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../contexts/AuthContext';
import { useUIStore } from '../../store';
import { Modal } from '../ui/Modal';
import { Button, Input } from '../ui';
import toast from 'react-hot-toast';

const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginModal() {
    const { isLoginModalOpen, closeLoginModal, openSignupModal } = useUIStore();
    const { login, loginWithGoogle, resetPassword } = useAuth();
    const [loading, setLoading] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
        getValues,
        reset,
    } = useForm<LoginForm>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (data: LoginForm) => {
        setLoading(true);
        try {
            await login(data.email, data.password);
            toast.success('Welcome back!');
            closeLoginModal();
            reset();
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to log in';
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        try {
            await loginWithGoogle();
            toast.success('Welcome back!');
            closeLoginModal();
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to log in with Google';
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        const email = getValues('email');
        if (!email) {
            toast.error('Please enter your email address');
            return;
        }

        setLoading(true);
        try {
            await resetPassword(email);
            toast.success('Password reset email sent!');
            setShowForgotPassword(false);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to send reset email';
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const switchToSignup = () => {
        closeLoginModal();
        openSignupModal();
    };

    return (
        <Modal isOpen={isLoginModalOpen} onClose={closeLoginModal} size="sm" showCloseButton={true}>
            <div className="px-2 pb-2">
                {/* Header with Icon */}
                <div className="text-center mb-8">
                    <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-secondary-900">Welcome back</h2>
                    <p className="text-secondary-500 mt-1">Sign in to continue to ShareSpace</p>
                </div>

                {showForgotPassword ? (
                    <div className="space-y-5">
                        <div className="bg-primary-50 border border-primary-100 rounded-xl p-4">
                            <div className="flex items-start space-x-3">
                                <svg className="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <p className="text-sm text-primary-700">
                                    Enter your email address and we'll send you a link to reset your password.
                                </p>
                            </div>
                        </div>
                        <Input
                            {...register('email')}
                            type="email"
                            label="Email address"
                            placeholder="you@example.com"
                            error={errors.email?.message}
                        />
                        <div className="flex space-x-3 pt-2">
                            <Button
                                variant="outline"
                                onClick={() => setShowForgotPassword(false)}
                                fullWidth
                            >
                                Back
                            </Button>
                            <Button onClick={handleForgotPassword} loading={loading} fullWidth>
                                Send Reset Link
                            </Button>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Social Login Buttons */}
                        <div className="space-y-3 mb-6">
                            <button
                                onClick={handleGoogleLogin}
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
                                <span className="px-4 bg-white text-sm text-secondary-400 font-medium">or continue with email</span>
                            </div>
                        </div>

                        {/* Email Form */}
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <Input
                                {...register('email')}
                                type="email"
                                label="Email address"
                                placeholder="you@example.com"
                                error={errors.email?.message}
                            />
                            <div>
                                <Input
                                    {...register('password')}
                                    type="password"
                                    label="Password"
                                    placeholder="••••••••"
                                    error={errors.password?.message}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowForgotPassword(true)}
                                    className="mt-2 text-sm text-primary-500 hover:text-primary-600 font-medium transition-colors"
                                >
                                    Forgot your password?
                                </button>
                            </div>
                            <Button type="submit" loading={loading} fullWidth size="lg" className="mt-6">
                                Sign in
                            </Button>
                        </form>

                        {/* Sign up link */}
                        <div className="mt-8 pt-6 border-t border-secondary-100 text-center">
                            <p className="text-secondary-600">
                                Don't have an account?{' '}
                                <button
                                    onClick={switchToSignup}
                                    className="text-primary-500 font-semibold hover:text-primary-600 transition-colors"
                                >
                                    Create one now
                                </button>
                            </p>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
}
