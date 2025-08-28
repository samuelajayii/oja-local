import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';

// Initialize storage with proper credentials
let storage;

if (process.env.NODE_ENV === 'production') {
    // In production (Cloud Run), use the service account attached to the instance
    storage = new Storage({
        projectId: process.env.NEXT_PUBLIC_PROJECT_ID || 'oja-local-46990'
    });
} else {
    // In development, you might need explicit credentials
    storage = new Storage({
        projectId: process.env.NEXT_PUBLIC_PROJECT_ID || 'oja-local-46990',
        keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS_STORAGE,
    });
}

const bucket = storage.bucket(process.env.GOOGLE_CLOUD_STORAGE_BUCKET);

export async function generateSignedUploadUrl(filename, contentType) {
    try {
        const uniqueFilename = `listings/${uuidv4()}-${filename}`;
        const file = bucket.file(uniqueFilename);

        // For Cloud Run, we'll use a different approach that doesn't require signBlob permission
        if (process.env.NODE_ENV === 'production') {
            // Generate a simple upload URL using resumable upload
            const [url] = await file.getSignedUrl({
                version: 'v4',
                action: 'write',
                expires: Date.now() + 15 * 60 * 1000, // 15 minutes
                contentType,
                extensionHeaders: {
                    'x-goog-resumable': 'start'
                }
            });

            return {
                uploadUrl: url,
                publicUrl: `https://storage.googleapis.com/${process.env.GOOGLE_CLOUD_STORAGE_BUCKET}/${uniqueFilename}`
            };
        } else {
            // Development approach
            const [url] = await file.getSignedUrl({
                version: 'v4',
                action: 'write',
                expires: Date.now() + 15 * 60 * 1000, // 15 minutes
                contentType,
            });

            return {
                uploadUrl: url,
                publicUrl: `https://storage.googleapis.com/${process.env.GOOGLE_CLOUD_STORAGE_BUCKET}/${uniqueFilename}`
            };
        }
    } catch (error) {
        console.error('Error generating signed URL:', error);
        
        // Fallback: return a direct upload endpoint that your app can handle
        throw new Error('Failed to generate upload URL: ' + error.message);
    }
}

export async function deleteImage(imageUrl) {
    try {
        // Extract filename from the URL
        const urlParts = imageUrl.split('/');
        const bucketIndex = urlParts.findIndex(part => part === process.env.GOOGLE_CLOUD_STORAGE_BUCKET);
        
        if (bucketIndex === -1) {
            console.error('Invalid image URL format:', imageUrl);
            return false;
        }
        
        // Get everything after the bucket name
        const filename = urlParts.slice(bucketIndex + 1).join('/');
        
        await bucket.file(filename).delete();
        console.log('Successfully deleted:', filename);
        return true;
    } catch (error) {
        console.error('Error deleting image:', error);
        return false;
    }
}

// Alternative direct upload function for when signed URLs fail
export async function directUpload(buffer, filename, contentType) {
    try {
        const uniqueFilename = `listings/${uuidv4()}-${filename}`;
        const file = bucket.file(uniqueFilename);
        
        await file.save(buffer, {
            metadata: {
                contentType,
            },
            public: true,
        });

        return {
            publicUrl: `https://storage.googleapis.com/${process.env.GOOGLE_CLOUD_STORAGE_BUCKET}/${uniqueFilename}`
        };
    } catch (error) {
        console.error('Direct upload error:', error);
        throw error;
    }
}