import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import { LoginModal, SignupModal } from '../auth';

interface LayoutProps {
    hideFooter?: boolean;
}

export default function Layout({ hideFooter = false }: LayoutProps) {
    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">
                <Outlet />
            </main>
            {!hideFooter && <Footer />}

            {/* Auth Modals */}
            <LoginModal />
            <SignupModal />
        </div>
    );
}
