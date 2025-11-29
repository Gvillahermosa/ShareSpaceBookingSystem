/* eslint-disable react-refresh/only-export-components */
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
    deleteUser,
    reauthenticateWithPopup,
    EmailAuthProvider,
    reauthenticateWithCredential,
} from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { auth, googleProvider, db } from '../config/firebase';
import type { User } from '../types';

interface AuthContextType {
    currentUser: FirebaseUser | null;
    userProfile: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    signup: (email: string, password: string, name: string) => Promise<void>;
    loginWithGoogle: () => Promise<void>;
    signupWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    updateUserProfile: (data: Partial<User>) => Promise<void>;
    sendVerificationEmail: () => Promise<void>;
    deleteAccount: (password?: string) => Promise<void>;
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
        const newUser: Record<string, unknown> = {
            email,
            name,
            isHost: false,
            createdAt: Timestamp.now(),
            verified: {
                email: false,
                phone: false,
                identity: false,
            },
        };

        // Only add photoURL if it exists (Firestore doesn't accept undefined)
        if (photoURL) {
            newUser.photoURL = photoURL;
        }

        await setDoc(doc(db, 'users', uid), newUser);
        return { id: uid, ...newUser } as User;
    }

    async function login(email: string, password: string) {
        // First, try to sign in with Firebase Auth
        const { user } = await signInWithEmailAndPassword(auth, email, password);

        // Check if email is verified
        if (!user.emailVerified) {
            await signOut(auth);
            throw new Error('Please verify your email before logging in. Check your inbox for the verification link.');
        }

        // Check if user profile exists in Firestore
        const existingProfile = await fetchUserProfile(user.uid);

        if (!existingProfile) {
            // User exists in Firebase Auth but not in our database
            // Sign them out and throw an error
            await signOut(auth);
            throw new Error('Account not found. Please sign up first.');
        }
    }

    async function signup(email: string, password: string, name: string) {
        const { user } = await createUserWithEmailAndPassword(auth, email, password);

        // Update display name in Firebase Auth
        await updateProfile(user, { displayName: name });

        // Create user profile in Firestore
        await createUserProfile(user.uid, email, name);

        // Send verification email
        await sendEmailVerification(user);

        // Sign out the user - they need to verify email first
        await signOut(auth);
    }

    async function loginWithGoogle() {
        const { user } = await signInWithPopup(auth, googleProvider);

        // Check if user profile exists
        const existingProfile = await fetchUserProfile(user.uid);

        if (!existingProfile) {
            // User doesn't have a profile - sign them out and show error
            await signOut(auth);
            throw new Error('Account not found. Please sign up with Google first.');
        }
    }

    async function signupWithGoogle() {
        const { user } = await signInWithPopup(auth, googleProvider);

        // Check if user profile already exists
        const existingProfile = await fetchUserProfile(user.uid);

        if (existingProfile) {
            // User already has an account - just log them in
            return;
        }

        // Create new user profile
        await createUserProfile(
            user.uid,
            user.email || '',
            user.displayName || 'User',
            user.photoURL || undefined
        );
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

    async function deleteAccount(password?: string) {
        if (!currentUser) throw new Error('No user logged in');

        try {
            // Check the provider to determine re-authentication method
            const providerData = currentUser.providerData[0];
            const isGoogleUser = providerData?.providerId === 'google.com';

            // Re-authenticate the user before deletion
            if (isGoogleUser) {
                // Re-authenticate with Google
                await reauthenticateWithPopup(currentUser, googleProvider);
            } else if (password && currentUser.email) {
                // Re-authenticate with email/password
                const credential = EmailAuthProvider.credential(currentUser.email, password);
                await reauthenticateWithCredential(currentUser, credential);
            }

            // Delete user profile from Firestore first
            await deleteDoc(doc(db, 'users', currentUser.uid));

            // Delete the Firebase Auth user
            await deleteUser(currentUser);

            // Clear local state
            setUserProfile(null);
            setCurrentUser(null);
        } catch (error: unknown) {
            console.error('Error deleting account:', error);
            const firebaseError = error as { code?: string };
            if (firebaseError.code === 'auth/requires-recent-login') {
                throw new Error('Please re-authenticate to delete your account.');
            }
            if (firebaseError.code === 'auth/wrong-password') {
                throw new Error('Incorrect password. Please try again.');
            }
            throw new Error('Failed to delete account. Please try again.');
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
        signupWithGoogle,
        logout,
        resetPassword,
        updateUserProfile,
        sendVerificationEmail,
        deleteAccount,
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

export default AuthContext;
