import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File must be less than 5MB' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const timestamp = Date.now();
    const ext = file.type.split('/')[1] || 'jpg';
    const filename = `chat-avatar-${timestamp}-${Math.random().toString(36).slice(2)}.${ext}`;

    const blob = await put(filename, buffer, {
      access: 'private',
      contentType: file.type,
    });

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[v0] Avatar upload error:', errorMessage);
    return NextResponse.json({ error: 'Upload failed: ' + errorMessage }, { status: 500 });
  }
}
