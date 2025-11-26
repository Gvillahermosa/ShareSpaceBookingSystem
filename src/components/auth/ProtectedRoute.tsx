import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useUIStore } from '../../store';

export interface ProtectedRouteProps {
    children?: React.ReactNode;
    requireHost?: boolean;
}

export default function ProtectedRoute({
    children,
    requireHost = false,
}: ProtectedRouteProps) {
    const { currentUser, userProfile, loading } = useAuth();
    const location = useLocation();
    const { openLoginModal } = useUIStore();

    useEffect(() => {
        // Open login modal if user is not logged in
        if (!loading && !currentUser) {
            openLoginModal();
        }
    }, [loading, currentUser, openLoginModal]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
            </div>
        );
    }

    if (!currentUser) {
        // Redirect to home page while modal is open
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    // If requireHost is true and user is not a host, redirect to become host page
    if (requireHost && !userProfile?.isHost) {
        return <Navigate to="/become-host" replace />;
    }

    return children ? <>{children}</> : <Outlet />;
}
