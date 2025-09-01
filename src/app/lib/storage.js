import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';

// Initialize storage with proper credentials
let storage;

if (process.env.NODE_ENV === 'production') {
    // In production (Cloud Run), use the service account attached to the instance
    storage = new Storage({
        projectId: process.env.NEXT_PUBLIC_PROJECT_ID || 'oja-local'
    });
} else {
    // In development, use explicit credentials
    try {
        // Option 1: Use service account key file
        if (process.env.GOOGLE_APPLICATION_CREDENTIALS_STORAGE) {
            storage = new Storage({
                projectId: process.env.NEXT_PUBLIC_PROJECT_ID || 'oja-local',
                keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS_STORAGE,
            });
        } 
        // Option 2: Use Firebase Admin SDK credentials from environment
        else if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
            // Clean up the private key (remove quotes and fix newlines)
            const privateKey = process.env.FIREBASE_PRIVATE_KEY
                .replace(/\\n/g, '\n')
                .replace(/^"/, '')
                .replace(/"$/, '');

            storage = new Storage({
                projectId: process.env.NEXT_PUBLIC_PROJECT_ID || 'oja-local',
                credentials: {
                    client_email: process.env.FIREBASE_CLIENT_EMAIL,
                    private_key: privateKey,
                }
            });
        }
        // Option 3: Fallback to default credentials (Application Default Credentials)
        else {
            storage = new Storage({
                projectId: process.env.NEXT_PUBLIC_PROJECT_ID || 'oja-local'
            });
        }
    } catch (error) {
        console.error('Storage initialization error:', error);
        // Fallback to default credentials
        storage = new Storage({
            projectId: process.env.NEXT_PUBLIC_PROJECT_ID || 'oja-local'
        });
    }
}

const bucket = storage.bucket(process.env.GOOGLE_CLOUD_STORAGE_BUCKET);

export async function generateSignedUploadUrl(filename, contentType) {
    try {
        const uniqueFilename = `listings/${uuidv4()}-${filename}`;
        const file = bucket.file(uniqueFilename);

        // Test bucket access first
        const [exists] = await bucket.exists();
        if (!exists) {
            console.error('Storage bucket does not exist or is not accessible');
            return null;
        }

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
        // Test bucket access first
        const [exists] = await bucket.exists();
        if (!exists) {
            throw new Error('Storage bucket does not exist or is not accessible');
        }

        const uniqueFilename = `listings/${uuidv4()}-${originalFilename}`;
        const file = bucket.file(uniqueFilename);
        
        // Upload with proper metadata and make it publicly accessible
        await file.save(fileBuffer, {
            metadata: {
                contentType,
                cacheControl: 'public, max-age=3600',
            },
            public: true,
            validation: false // Disable MD5 validation for better compatibility
        });

        // Make the file publicly accessible
        await file.makePublic();

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

// Test function to verify storage configuration
export async function testStorageConnection() {
    try {
        const [buckets] = await storage.getBuckets();
        console.log('Storage connection successful. Buckets:', buckets.map(b => b.name));
        
        // Test specific bucket
        const [exists] = await bucket.exists();
        console.log(`Bucket ${process.env.GOOGLE_CLOUD_STORAGE_BUCKET} exists:`, exists);
        
        return { success: true, bucketExists: exists };
    } catch (error) {
        console.error('Storage connection test failed:', error);
        return { success: false, error: error.message };
    }
}