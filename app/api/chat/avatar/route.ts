import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export async function POST(request: NextRequest) {
  try {
    console.log('[v0] Avatar API: received POST request');
    
    const formData = await request.formData();
    const file = formData.get('file') as File;

    console.log('[v0] Avatar API: file =', file?.name, file?.size, file?.type);

    if (!file) {
      console.log('[v0] Avatar API: no file');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      console.log('[v0] Avatar API: not an image', file.type);
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      console.log('[v0] Avatar API: file too large', file.size);
      return NextResponse.json({ error: 'File must be less than 5MB' }, { status: 400 });
    }

    console.log('[v0] Avatar API: converting to buffer');
    const buffer = await file.arrayBuffer();
    const timestamp = Date.now();
    const ext = file.type.split('/')[1] || 'jpg';
    const filename = `chat-avatar-${timestamp}-${Math.random().toString(36).slice(2)}.${ext}`;

    console.log('[v0] Avatar API: uploading to blob:', filename, 'size:', buffer.byteLength);
    
    const blob = await put(filename, buffer, {
      contentType: file.type,
    });

    console.log('[v0] Avatar API: upload success, url:', blob.url);
    return NextResponse.json({ url: blob.url });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[v0] Avatar API: error:', errorMessage, error);
    return NextResponse.json({ 
      error: 'Upload failed: ' + errorMessage,
      details: String(error)
    }, { status: 500 });
  }
}
