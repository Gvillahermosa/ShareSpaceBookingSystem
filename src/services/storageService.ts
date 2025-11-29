import {
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject,
    listAll,
} from 'firebase/storage';
import { storage } from '../config/firebase';
import imageCompression from 'browser-image-compression';
import { v4 as uuidv4 } from 'uuid';
import { APP_CONFIG } from '../config/constants';

// Compress image before upload
async function compressImage(file: File): Promise<File> {
    const options = {
        maxSizeMB: APP_CONFIG.MAX_PHOTO_SIZE_MB,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
    };

    try {
        return await imageCompression(file, options);
    } catch (error) {
        console.error('Image compression failed:', error);
        return file;
    }
}

// Validate image file
function validateImage(file: File): { valid: boolean; error?: string } {
    if (!APP_CONFIG.SUPPORTED_IMAGE_TYPES.includes(file.type)) {
        return {
            valid: false,
            error: 'Unsupported file type. Please upload JPEG, PNG, or WebP images.',
        };
    }

    if (file.size > APP_CONFIG.MAX_PHOTO_SIZE_MB * 1024 * 1024) {
        return {
            valid: false,
            error: `File too large. Maximum size is ${APP_CONFIG.MAX_PHOTO_SIZE_MB}MB.`,
        };
    }

    return { valid: true };
}

// Upload user profile photo
export async function uploadProfilePhoto(
    userId: string,
    file: File
): Promise<string> {
    const validation = validateImage(file);
    if (!validation.valid) {
        throw new Error(validation.error);
    }

    const compressedFile = await compressImage(file);
    const storageRef = ref(storage, `users/${userId}/profile.jpg`);

    await uploadBytes(storageRef, compressedFile);
    return getDownloadURL(storageRef);
}

// Upload government ID
export async function uploadGovernmentId(
    userId: string,
    file: File
): Promise<string> {
    const validation = validateImage(file);
    if (!validation.valid) {
        throw new Error(validation.error);
    }

    const compressedFile = await compressImage(file);
    const storageRef = ref(storage, `users/${userId}/id.jpg`);

    await uploadBytes(storageRef, compressedFile);
    return getDownloadURL(storageRef);
}

// Upload property photo
export async function uploadPropertyPhoto(
    propertyId: string,
    file: File,
    _onProgress?: (progress: number) => void
): Promise<{ id: string; url: string }> {
    const validation = validateImage(file);
    if (!validation.valid) {
        throw new Error(validation.error);
    }

    const compressedFile = await compressImage(file);
    const photoId = uuidv4();
    const extension = file.name.split('.').pop() || 'jpg';
    const storageRef = ref(storage, `properties/${propertyId}/${photoId}.${extension}`);

    await uploadBytes(storageRef, compressedFile);
    const url = await getDownloadURL(storageRef);

    return { id: photoId, url };
}

// Upload multiple property photos
export async function uploadPropertyPhotos(
    propertyId: string,
    files: File[],
    onProgress?: (completed: number, total: number) => void
): Promise<{ id: string; url: string }[]> {
    const results: { id: string; url: string }[] = [];

    for (let i = 0; i < files.length; i++) {
        const result = await uploadPropertyPhoto(propertyId, files[i]);
        results.push(result);
        onProgress?.(i + 1, files.length);
    }

    return results;
}

// Delete property photo
export async function deletePropertyPhoto(
    propertyId: string,
    photoId: string
): Promise<void> {
    // Try different extensions
    const extensions = ['jpg', 'jpeg', 'png', 'webp'];

    for (const ext of extensions) {
        try {
            const storageRef = ref(storage, `properties/${propertyId}/${photoId}.${ext}`);
            await deleteObject(storageRef);
            return;
        } catch {
            // Continue trying other extensions
        }
    }
}

// Delete all photos for a property
export async function deleteAllPropertyPhotos(propertyId: string): Promise<void> {
    const folderRef = ref(storage, `properties/${propertyId}`);

    try {
        const { items } = await listAll(folderRef);
        await Promise.all(items.map((item) => deleteObject(item)));
    } catch (error) {
        console.error('Error deleting property photos:', error);
    }
}

// Upload message attachment
export async function uploadMessageAttachment(
    conversationId: string,
    file: File
): Promise<{ url: string; name: string; type: 'image' | 'document' }> {
    const isImage = APP_CONFIG.SUPPORTED_IMAGE_TYPES.includes(file.type);

    let processedFile = file;
    if (isImage) {
        processedFile = await compressImage(file);
    }

    const fileId = uuidv4();
    const extension = file.name.split('.').pop() || '';
    const storageRef = ref(
        storage,
        `messages/${conversationId}/${fileId}.${extension}`
    );

    await uploadBytes(storageRef, processedFile);
    const url = await getDownloadURL(storageRef);

    return {
        url,
        name: file.name,
        type: isImage ? 'image' : 'document',
    };
}

// Upload review photo
export async function uploadReviewPhoto(
    reviewId: string,
    file: File
): Promise<string> {
    const validation = validateImage(file);
    if (!validation.valid) {
        throw new Error(validation.error);
    }

    const compressedFile = await compressImage(file);
    const photoId = uuidv4();
    const storageRef = ref(storage, `reviews/${reviewId}/${photoId}.jpg`);

    await uploadBytes(storageRef, compressedFile);
    return getDownloadURL(storageRef);
}

// Get file size formatted
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
