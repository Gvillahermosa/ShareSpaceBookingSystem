import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import { LoginModal, SignupModal } from '../auth';

interface LayoutProps {
    hideFooter?: boolean;
}

export default function Layout({ hideFooter = false }: LayoutProps) {
    return (
        <div className="min-h-screen min-h-[100dvh] flex flex-col w-full max-w-full overflow-x-hidden bg-white">
            <Header />
            <main className="flex-1 w-full max-w-full overflow-x-hidden">
                <Outlet />
            </main>
            {!hideFooter && <Footer />}

            {/* Auth Modals */}
            <LoginModal />
            <SignupModal />
        </div>
    );
}
