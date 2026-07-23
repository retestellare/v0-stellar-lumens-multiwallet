import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export async function POST(request: NextRequest) {
  try {
    console.log('[v0] Avatar upload API called');
    const formData = await request.formData();
    const file = formData.get('file') as File;

    console.log('[v0] File received:', file?.name, file?.size, file?.type);

    if (!file) {
      console.log('[v0] No file in form data');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      console.log('[v0] File is not an image:', file.type);
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      console.log('[v0] File too large:', file.size);
      return NextResponse.json({ error: 'File must be less than 5MB' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const timestamp = Date.now();
    const filename = `chat-avatar-${timestamp}-${Math.random().toString(36).slice(2)}.${file.type.split('/')[1]}`;

    console.log('[v0] Uploading to Blob:', filename);
    const blob = await put(filename, buffer, {
      access: 'public',
      contentType: file.type,
    });

    console.log('[v0] Upload success, URL:', blob.url);
    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error('[v0] Avatar upload error:', error);
    return NextResponse.json({ error: 'Upload failed: ' + String(error) }, { status: 500 });
  }
}
