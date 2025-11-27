import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useUIStore } from '../../store';
import { Button, Avatar } from '../ui';
import { Dropdown, DropdownItem } from '../ui/Modal';
import { ROUTES } from '../../config/constants';
import SearchBar from '../search/SearchBar';
import NotificationDropdown from './NotificationDropdown';

export default function Header() {
    const { currentUser, userProfile, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { openLoginModal, openSignupModal } = useUIStore();
    const [_isMobileMenuOpen, _setIsMobileMenuOpen] = useState(false);

    const isHomePage = location.pathname === '/';
    const isHostPage = location.pathname.startsWith('/host');

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    return (
        <header
            className={`
        sticky top-0 z-40 bg-white
        ${isHomePage ? '' : 'border-b border-secondary-200'}
      `}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-20">
                    {/* Logo */}
                    <Link to="/" className="flex items-center space-x-2">
                        <img
                            src="/logo.png"
                            alt="ShareSpace Logo"
                            className="w-10 h-10 object-contain"
                        />
                        <span className="text-xl font-bold text-primary-500">ShareSpace</span>
                    </Link>

                    {/* Search Bar - Hidden on mobile */}
                    {!isHomePage && (
                        <div className="hidden md:block flex-1 max-w-2xl mx-8 relative">
                            <SearchBar compact />
                        </div>
                    )}

                    {/* Right Side */}
                    <div className="flex items-center space-x-4">
                        {/* Switch between Host and Guest views */}
                        {currentUser && (
                            <Link
                                to={isHostPage ? '/' : (userProfile?.isHost ? ROUTES.HOST.DASHBOARD : '/become-host')}
                                className="hidden md:block text-sm font-medium text-secondary-700 hover:text-secondary-900 transition-colors"
                            >
                                {isHostPage ? 'Switch to traveling' : (userProfile?.isHost ? 'Switch to hosting' : 'Become a Host')}
                            </Link>
                        )}

                        {/* Become a Host link for non-logged in users */}
                        {!currentUser && (
                            <button
                                onClick={openLoginModal}
                                className="hidden md:block text-sm font-medium text-secondary-700 hover:text-secondary-900 transition-colors"
                            >
                                Become a Host
                            </button>
                        )}

                        {/* Notification Bell - Only for logged in users */}
                        {currentUser && <NotificationDropdown />}

                        {/* User Menu */}
                        {currentUser ? (
                            <Dropdown
                                trigger={
                                    <button className="flex items-center space-x-2 px-3 py-2 border border-secondary-200 rounded-full hover:shadow-md transition-shadow">
                                        <svg
                                            className="w-5 h-5 text-secondary-600"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M4 6h16M4 12h16M4 18h16"
                                            />
                                        </svg>
                                        <Avatar
                                            src={userProfile?.photoURL}
                                            fallback={userProfile?.name || currentUser.email || ''}
                                            size="sm"
                                        />
                                    </button>
                                }
                            >
                                {/* Guest/Traveler Section */}
                                <div className="py-2 border-b border-secondary-100">
                                    <p className="px-4 py-1 text-xs font-semibold text-secondary-400 uppercase">Traveling</p>
                                    <DropdownItem onClick={() => navigate('/')}>
                                        <span className="flex items-center">
                                            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                            </svg>
                                            Explore Homes
                                        </span>
                                    </DropdownItem>
                                    <DropdownItem onClick={() => navigate(ROUTES.MESSAGES)}>
                                        Messages
                                    </DropdownItem>
                                    <DropdownItem onClick={() => navigate(ROUTES.TRIPS)}>
                                        Trips
                                    </DropdownItem>
                                    <DropdownItem onClick={() => navigate(ROUTES.WISHLISTS)}>
                                        Wishlists
                                    </DropdownItem>
                                </div>

                                {/* Host Section */}
                                <div className="py-2 border-b border-secondary-100">
                                    <p className="px-4 py-1 text-xs font-semibold text-secondary-400 uppercase">Hosting</p>
                                    {userProfile?.isHost ? (
                                        <>
                                            <DropdownItem onClick={() => navigate(ROUTES.HOST.DASHBOARD)}>
                                                <span className="flex items-center">
                                                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                                                    </svg>
                                                    Host Dashboard
                                                </span>
                                            </DropdownItem>
                                            <DropdownItem onClick={() => navigate(ROUTES.HOST.LISTINGS)}>
                                                Manage Listings
                                            </DropdownItem>
                                            <DropdownItem onClick={() => navigate(ROUTES.HOST.RESERVATIONS)}>
                                                Reservations
                                            </DropdownItem>
                                            <DropdownItem onClick={() => navigate(ROUTES.HOST.EARNINGS)}>
                                                Earnings
                                            </DropdownItem>
                                        </>
                                    ) : (
                                        <DropdownItem onClick={() => navigate('/become-host')}>
                                            <span className="flex items-center">
                                                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                                </svg>
                                                Become a Host
                                            </span>
                                        </DropdownItem>
                                    )}
                                </div>

                                {/* Account Section */}
                                <div className="py-2">
                                    <DropdownItem onClick={() => navigate(ROUTES.PROFILE)}>
                                        Account Settings
                                    </DropdownItem>
                                    <DropdownItem onClick={handleLogout} danger>
                                        Log out
                                    </DropdownItem>
                                </div>
                            </Dropdown>
                        ) : (
                            <div className="flex items-center space-x-2">
                                <Button variant="ghost" onClick={openLoginModal}>
                                    Log in
                                </Button>
                                <Button onClick={openSignupModal}>Sign up</Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {_isMobileMenuOpen && (
                <div className="md:hidden border-t border-secondary-200 py-4">
                    <div className="px-4 space-y-4">
                        <SearchBar />
                    </div>
                </div>
            )}
        </header>
    );
}
