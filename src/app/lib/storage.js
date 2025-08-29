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
        keyFilename: process.env.GOOGLE_CLOUD_STORAGE_CREDENTIALS,
    });
}

const bucket = storage.bucket(process.env.GOOGLE_CLOUD_STORAGE_BUCKET);

export async function generateSignedUploadUrl(filename, contentType) {
    try {
        const uniqueFilename = `listings/${uuidv4()}-${filename}`;
        const file = bucket.file(uniqueFilename);

        // Use a more compatible approach for Cloud Run
        const [url] = await file.getSignedUrl({
            version: 'v4',
            action: 'write',
            expires: Date.now() + 15 * 60 * 1000, // 15 minutes
            contentType,
            // Remove resumable upload for better compatibility
        });

        return {
            uploadUrl: url,
            publicUrl: `https://storage.googleapis.com/${process.env.GOOGLE_CLOUD_STORAGE_BUCKET}/${uniqueFilename}`,
            filename: uniqueFilename
        };
    } catch (error) {
        console.error('Error generating signed URL:', error);
        
        // Fallback to direct upload through your API
        return null;
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

// Direct upload function for when signed URLs fail
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
            publicUrl: `https://storage.googleapis.com/${process.env.GOOGLE_CLOUD_STORAGE_BUCKET}/${uniqueFilename}`,
            filename: uniqueFilename
        };
    } catch (error) {
        console.error('Direct upload error:', error);
        throw error;
    }
}

// New function to handle file uploads directly through the API
export async function uploadFileBuffer(fileBuffer, originalFilename, contentType) {
    try {
        const uniqueFilename = `listings/${uuidv4()}-${originalFilename}`;
        const file = bucket.file(uniqueFilename);
        
        // Upload with proper metadata and make it publicly accessible
        await file.save(fileBuffer, {
            metadata: {
                contentType,
                cacheControl: 'public, max-age=3600',
            },
            public: true,
            validation: 'md5'
        });

        // Get the public URL
        const publicUrl = `https://storage.googleapis.com/${process.env.GOOGLE_CLOUD_STORAGE_BUCKET}/${uniqueFilename}`;
        
        return {
            publicUrl,
            filename: uniqueFilename
        };
    } catch (error) {
        console.error('File upload error:', error);
        throw new Error(`Upload failed: ${error.message}`);
    }
}