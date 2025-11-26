import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    signInWithPopup,
    sendPasswordResetEmail,
    updateProfile,
    onAuthStateChanged,
    sendEmailVerification,
} from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { auth, googleProvider, db } from '../config/firebase';
import type { User } from '../types';

interface AuthContextType {
    currentUser: FirebaseUser | null;
    userProfile: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    signup: (email: string, password: string, name: string) => Promise<void>;
    loginWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    updateUserProfile: (data: Partial<User>) => Promise<void>;
    sendVerificationEmail: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
    const [userProfile, setUserProfile] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // Fetch user profile from Firestore
    async function fetchUserProfile(uid: string): Promise<User | null> {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
            return { id: userDoc.id, ...userDoc.data() } as User;
        }
        return null;
    }

    // Create user profile in Firestore
    async function createUserProfile(
        uid: string,
        email: string,
        name: string,
        photoURL?: string
    ): Promise<User> {
        const newUser: Omit<User, 'id'> = {
            email,
            name,
            photoURL: photoURL || undefined,
            isHost: false,
            createdAt: Timestamp.now(),
            verified: {
                email: false,
                phone: false,
                identity: false,
            },
        };

        await setDoc(doc(db, 'users', uid), newUser);
        return { id: uid, ...newUser };
    }

    async function login(email: string, password: string) {
        await signInWithEmailAndPassword(auth, email, password);
    }

    async function signup(email: string, password: string, name: string) {
        const { user } = await createUserWithEmailAndPassword(auth, email, password);

        // Update display name in Firebase Auth
        await updateProfile(user, { displayName: name });

        // Create user profile in Firestore
        await createUserProfile(user.uid, email, name);

        // Send verification email
        await sendEmailVerification(user);
    }

    async function loginWithGoogle() {
        const { user } = await signInWithPopup(auth, googleProvider);

        // Check if user profile exists
        const existingProfile = await fetchUserProfile(user.uid);

        if (!existingProfile) {
            // Create new user profile
            await createUserProfile(
                user.uid,
                user.email || '',
                user.displayName || 'User',
                user.photoURL || undefined
            );
        }
    }

    async function logout() {
        await signOut(auth);
        setUserProfile(null);
    }

    async function resetPassword(email: string) {
        await sendPasswordResetEmail(auth, email);
    }

    async function updateUserProfile(data: Partial<User>) {
        if (!currentUser) throw new Error('No user logged in');

        const userRef = doc(db, 'users', currentUser.uid);
        await setDoc(userRef, data, { merge: true });

        // Update local state
        setUserProfile((prev) => (prev ? { ...prev, ...data } : null));

        // Update Firebase Auth profile if name or photo changed
        if (data.name || data.photoURL) {
            await updateProfile(currentUser, {
                displayName: data.name || currentUser.displayName,
                photoURL: data.photoURL || currentUser.photoURL,
            });
        }
    }

    async function sendVerificationEmail() {
        if (currentUser) {
            await sendEmailVerification(currentUser);
        }
    }

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);

            if (user) {
                const profile = await fetchUserProfile(user.uid);
                setUserProfile(profile);
            } else {
                setUserProfile(null);
            }

            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const value: AuthContextType = {
        currentUser,
        userProfile,
        loading,
        login,
        signup,
        loginWithGoogle,
        logout,
        resetPassword,
        updateUserProfile,
        sendVerificationEmail,
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

export default AuthContext;
