import { NextResponse } from 'next/server';
import { generateSignedUploadUrl, uploadFileBuffer } from '@/app/lib/storage';
import { verifyAuthToken } from '@/app/lib/auth-helpers';

export async function POST(request) {
    try {
        const user = await verifyAuthToken(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const contentType = request.headers.get('content-type');
        
        // Handle form data (direct file upload)
        if (contentType?.includes('multipart/form-data')) {
            const formData = await request.formData();
            const file = formData.get('file');
            
            if (!file) {
                return NextResponse.json({ error: 'No file provided' }, { status: 400 });
            }

            // Convert file to buffer
            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);
            
            try {
                const result = await uploadFileBuffer(buffer, file.name, file.type);
                return NextResponse.json({ 
                    success: true,
                    publicUrl: result.publicUrl,
                    filename: result.filename
                });
            } catch (uploadError) {
                console.error('Direct upload failed:', uploadError);
                return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
            }
        }
        
        // Handle JSON request (signed URL generation)
        const { filename, contentType: requestedContentType } = await request.json();

        if (!filename || !requestedContentType) {
            return NextResponse.json({ error: 'Filename and content type required' }, { status: 400 });
        }

        try {
            const result = await generateSignedUploadUrl(filename, requestedContentType);
            
            if (result) {
                return NextResponse.json({ 
                    uploadUrl: result.uploadUrl, 
                    publicUrl: result.publicUrl,
                    filename: result.filename
                });
            } else {
                // Fallback: suggest direct upload
                return NextResponse.json({ 
                    error: 'Signed URL generation failed', 
                    fallback: 'direct_upload',
                    message: 'Please use direct upload method'
                }, { status: 503 });
            }
        } catch (error) {
            console.error('Signed URL generation error:', error);
            return NextResponse.json({ 
                error: 'Signed URL generation failed', 
                fallback: 'direct_upload',
                message: 'Please use direct upload method'
            }, { status: 503 });
        }
    } catch (error) {
        console.error('Upload URL generation error:', error);
        return NextResponse.json({ error: 'Failed to process upload request' }, { status: 500 });
    }
}

// Add OPTIONS handler for CORS
export async function OPTIONS(request) {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}