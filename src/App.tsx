
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { Layout } from './components/layout';
import { ProtectedRoute } from './components/auth';
import { ListingWizard } from './components/host';
import { BookingConfirmation } from './components/booking';

// Pages
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import PropertyDetailPage from './pages/PropertyDetailPage';
import TripsPage from './pages/TripsPage';
import MessagesPage from './pages/MessagesPage';
import HostDashboardPage from './pages/HostDashboardPage';
import ProfilePage from './pages/ProfilePage';
import BecomeHostPage from './pages/BecomeHostPage';
import WishlistsPage from './pages/WishlistsPage';
import BookingSuccessPage from './pages/BookingSuccessPage';

// Import date picker styles
import 'react-datepicker/dist/react-datepicker.css';

function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    {/* Public routes with layout */}
                    <Route element={<Layout />}>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/property/:id" element={<PropertyDetailPage />} />

                        {/* Become a host page - accessible to logged-in non-hosts */}
                        <Route element={<ProtectedRoute />}>
                            <Route path="/become-host" element={<BecomeHostPage />} />
                        </Route>

                        {/* Protected guest routes */}
                        <Route element={<ProtectedRoute />}>
                            <Route path="/trips" element={<TripsPage />} />
                            <Route path="/wishlists" element={<WishlistsPage />} />
                            <Route path="/messages" element={<MessagesPage />} />
                            <Route path="/profile" element={<ProfilePage />} />
                            <Route path="/account" element={<ProfilePage />} />
                            <Route path="/settings" element={<Navigate to="/profile" replace />} />
                            <Route path="/booking/confirm" element={<BookingConfirmation />} />
                            <Route path="/booking/:bookingId/success" element={<BookingSuccessPage />} />
                        </Route>

                        {/* Protected host routes */}
                        <Route element={<ProtectedRoute requireHost />}>
                            <Route path="/host" element={<HostDashboardPage />} />
                        </Route>
                    </Route>

                    {/* Search page with no footer (map view) */}
                    <Route element={<Layout hideFooter />}>
                        <Route path="/search" element={<SearchPage />} />
                    </Route>

                    {/* Full-screen routes (no layout) */}
                    <Route element={<ProtectedRoute requireHost />}>
                        <Route path="/host/listings/new" element={<ListingWizard />} />
                        <Route path="/host/listings/:id/edit" element={<ListingWizard />} />
                    </Route>
                </Routes>

                {/* Toast notifications */}
                <Toaster
                    position="top-center"
                    toastOptions={{
                        duration: 4000,
                        style: {
                            background: '#1F2937',
                            color: '#fff',
                            borderRadius: '12px',
                            padding: '16px',
                        },
                        success: {
                            iconTheme: {
                                primary: '#10B981',
                                secondary: '#fff',
                            },
                        },
                        error: {
                            iconTheme: {
                                primary: '#EF4444',
                                secondary: '#fff',
                            },
                        },
                    }}
                />
            </Router>
        </AuthProvider>
    );
}

export default App;
