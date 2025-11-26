import { create } from 'zustand';
import type { Property, SearchFilters, SortOption, Booking, Conversation, Wishlist, Notification } from '../types';

// Property Store
interface PropertyState {
    properties: Property[];
    selectedProperty: Property | null;
    filters: SearchFilters;
    sortBy: SortOption;
    viewMode: 'list' | 'map';
    loading: boolean;
    error: string | null;
    setProperties: (properties: Property[]) => void;
    setSelectedProperty: (property: Property | null) => void;
    setFilters: (filters: Partial<SearchFilters>) => void;
    clearFilters: () => void;
    setSortBy: (sortBy: SortOption) => void;
    setViewMode: (mode: 'list' | 'map') => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
}

const defaultFilters: SearchFilters = {
    guests: { adults: 1, children: 0, infants: 0 },
};

export const usePropertyStore = create<PropertyState>((set) => ({
    properties: [],
    selectedProperty: null,
    filters: defaultFilters,
    sortBy: 'price_low',
    viewMode: 'list',
    loading: false,
    error: null,
    setProperties: (properties) => set({ properties }),
    setSelectedProperty: (property) => set({ selectedProperty: property }),
    setFilters: (filters) =>
        set((state) => ({ filters: { ...state.filters, ...filters } })),
    clearFilters: () => set({ filters: defaultFilters }),
    setSortBy: (sortBy) => set({ sortBy }),
    setViewMode: (viewMode) => set({ viewMode }),
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),
}));

// Booking Store
interface BookingState {
    bookings: Booking[];
    currentBooking: Partial<Booking> | null;
    loading: boolean;
    setBookings: (bookings: Booking[]) => void;
    setCurrentBooking: (booking: Partial<Booking> | null) => void;
    updateCurrentBooking: (data: Partial<Booking>) => void;
    clearCurrentBooking: () => void;
    setLoading: (loading: boolean) => void;
}

export const useBookingStore = create<BookingState>((set) => ({
    bookings: [],
    currentBooking: null,
    loading: false,
    setBookings: (bookings) => set({ bookings }),
    setCurrentBooking: (booking) => set({ currentBooking: booking }),
    updateCurrentBooking: (data) =>
        set((state) => ({
            currentBooking: state.currentBooking
                ? { ...state.currentBooking, ...data }
                : data,
        })),
    clearCurrentBooking: () => set({ currentBooking: null }),
    setLoading: (loading) => set({ loading }),
}));

// Message Store
interface MessageState {
    conversations: Conversation[];
    activeConversation: Conversation | null;
    unreadCount: number;
    setConversations: (conversations: Conversation[]) => void;
    setActiveConversation: (conversation: Conversation | null) => void;
    setUnreadCount: (count: number) => void;
}

export const useMessageStore = create<MessageState>((set) => ({
    conversations: [],
    activeConversation: null,
    unreadCount: 0,
    setConversations: (conversations) => set({ conversations }),
    setActiveConversation: (conversation) => set({ activeConversation: conversation }),
    setUnreadCount: (count) => set({ unreadCount: count }),
}));

// Wishlist Store
interface WishlistState {
    wishlists: Wishlist[];
    setWishlists: (wishlists: Wishlist[]) => void;
    addToWishlist: (wishlistId: string, propertyId: string) => void;
    removeFromWishlist: (wishlistId: string, propertyId: string) => void;
    isPropertyInWishlist: (propertyId: string) => boolean;
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
    wishlists: [],
    setWishlists: (wishlists) => set({ wishlists }),
    addToWishlist: (wishlistId, propertyId) =>
        set((state) => ({
            wishlists: state.wishlists.map((w) =>
                w.id === wishlistId
                    ? { ...w, propertyIds: [...w.propertyIds, propertyId] }
                    : w
            ),
        })),
    removeFromWishlist: (wishlistId, propertyId) =>
        set((state) => ({
            wishlists: state.wishlists.map((w) =>
                w.id === wishlistId
                    ? { ...w, propertyIds: w.propertyIds.filter((id) => id !== propertyId) }
                    : w
            ),
        })),
    isPropertyInWishlist: (propertyId) => {
        const { wishlists } = get();
        return wishlists.some((w) => w.propertyIds.includes(propertyId));
    },
}));

// Notification Store
interface NotificationState {
    notifications: Notification[];
    unreadCount: number;
    setNotifications: (notifications: Notification[]) => void;
    addNotification: (notification: Notification) => void;
    markAsRead: (notificationId: string) => void;
    markAllAsRead: () => void;
    setUnreadCount: (count: number) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
    notifications: [],
    unreadCount: 0,
    setNotifications: (notifications) => set({ notifications }),
    addNotification: (notification) =>
        set((state) => ({
            notifications: [notification, ...state.notifications],
            unreadCount: state.unreadCount + 1,
        })),
    markAsRead: (notificationId) =>
        set((state) => ({
            notifications: state.notifications.map((n) =>
                n.id === notificationId ? { ...n, read: true } : n
            ),
            unreadCount: Math.max(0, state.unreadCount - 1),
        })),
    markAllAsRead: () =>
        set((state) => ({
            notifications: state.notifications.map((n) => ({ ...n, read: true })),
            unreadCount: 0,
        })),
    setUnreadCount: (count) => set({ unreadCount: count }),
}));

// UI Store
interface UIState {
    isMobileMenuOpen: boolean;
    isSearchOpen: boolean;
    isLoginModalOpen: boolean;
    isSignupModalOpen: boolean;
    modalContent: React.ReactNode | null;
    toggleMobileMenu: () => void;
    toggleSearch: () => void;
    openLoginModal: () => void;
    closeLoginModal: () => void;
    openSignupModal: () => void;
    closeSignupModal: () => void;
    setModalContent: (content: React.ReactNode | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
    isMobileMenuOpen: false,
    isSearchOpen: false,
    isLoginModalOpen: false,
    isSignupModalOpen: false,
    modalContent: null,
    toggleMobileMenu: () =>
        set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen })),
    toggleSearch: () => set((state) => ({ isSearchOpen: !state.isSearchOpen })),
    openLoginModal: () => set({ isLoginModalOpen: true, isSignupModalOpen: false }),
    closeLoginModal: () => set({ isLoginModalOpen: false }),
    openSignupModal: () => set({ isSignupModalOpen: true, isLoginModalOpen: false }),
    closeSignupModal: () => set({ isSignupModalOpen: false }),
    setModalContent: (content) => set({ modalContent: content }),
}));
