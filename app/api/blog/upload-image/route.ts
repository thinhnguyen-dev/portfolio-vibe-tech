import { NextRequest, NextResponse } from 'next/server';
import { uploadImageToStorage, getBlogThumbnailPath } from '@/lib/firebase/blog';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    const blogId = formData.get('blogId') as string | null;

    if (!imageFile) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(imageFile.type)) {
      return NextResponse.json(
        { error: 'Invalid image type. Allowed types: JPEG, PNG, GIF, WebP' },
        { status: 400 }
      );
    }

    // Generate storage path
    let storagePath: string;
    if (blogId) {
      // If blogId is provided, use blog thumbnail path
      const filename = imageFile.name || `thumbnail-${Date.now()}.${imageFile.type.split('/')[1]}`;
      storagePath = getBlogThumbnailPath(blogId, filename);
    } else {
      // Standalone image upload - use generic path
      const timestamp = Date.now();
      const originalName = imageFile.name.replace(/[^a-zA-Z0-9.-]/g, '_') || 'image';
      const extension = path.extname(originalName) || '.png';
      const filename = `${timestamp}-${originalName}`;
      storagePath = `blog-images/${filename}`;
    }

    // Upload to Firebase Storage
    const downloadURL = await uploadImageToStorage(
      imageFile,
      storagePath,
      imageFile.type
    );

    return NextResponse.json({
      success: true,
      path: downloadURL,
      url: downloadURL, // Alias for backward compatibility
    });
  } catch (error) {
    console.error('Image upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to upload image';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

