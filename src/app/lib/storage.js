import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';

const storage = new Storage({
    projectId: 'oja-local-46990',
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS_STORAGE,
});

const bucket = storage.bucket(process.env.GOOGLE_CLOUD_STORAGE_BUCKET);

export async function generateSignedUploadUrl(filename, contentType) {
    const file = bucket.file(`listings/${uuidv4()}-${filename}`);

    const [url] = await file.getSignedUrl({
        version: 'v4',
        action: 'write',
        expires: Date.now() + 15 * 60 * 1000, // 15 minutes
        contentType,
    });

    return {
        uploadUrl: url,
        publicUrl: `https://storage.googleapis.com/${process.env.GOOGLE_CLOUD_STORAGE_BUCKET}/${file.name}`
    };
}

export async function deleteImage(imageUrl) {
    try {
        const filename = imageUrl.split('/').pop();
        await bucket.file(`listings/${filename}`).delete();
        return true;
    } catch (error) {
        console.error('Error deleting image:', error);
        return false;
    }
}