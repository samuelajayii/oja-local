import { NextResponse } from 'next/server';
import { generateSignedUploadUrl } from '@/app/lib/storage';
import { verifyAuthToken } from '@/app/lib/auth-helpers';

export async function POST(request) {
    try {
        const user = await verifyAuthToken(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { filename, contentType } = await request.json();

        if (!filename || !contentType) {
            return NextResponse.json({ error: 'Filename and content type required' }, { status: 400 });
        }

        const { uploadUrl, publicUrl } = await generateSignedUploadUrl(filename, contentType);

        return NextResponse.json({ uploadUrl, publicUrl });
    } catch (error) {
        console.error('Upload URL generation error:', error);
        return NextResponse.json({ error: 'Failed to generate upload URL' }, { status: 500 });
    }
}