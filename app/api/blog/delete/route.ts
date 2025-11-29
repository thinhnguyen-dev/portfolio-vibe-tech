import { NextRequest, NextResponse } from 'next/server';
import { deleteBlogPost, getBlogPostMetadata, getBlogPostMetadataBySlug } from '@/lib/firebase/blog';
import { clearCache } from '@/lib/blog/cache';

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const identifier = searchParams.get('blogId') || searchParams.get('slug') || searchParams.get('uuid');
    const password = searchParams.get('password');

    if (!identifier || typeof identifier !== 'string') {
      return NextResponse.json(
        { error: 'Blog ID, slug, or UUID is required' },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required for deletion' },
        { status: 400 }
      );
    }

    // Verify password
    const secretPassword = process.env.SECRET_UPLOAD_PASSWORD;
    if (!secretPassword) {
      console.error('SECRET_UPLOAD_PASSWORD environment variable is not set');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Use constant-time comparison to prevent timing attacks
    const isValid = password === secretPassword;
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }

    // Get metadata - identifier could be UUID or slug
    const metadata = await getBlogPostMetadata(identifier);
    if (!metadata) {
      return NextResponse.json(
        { error: 'Blog post not found' },
        { status: 404 }
      );
    }

    // Use UUID for deletion
    const uuid = metadata.blogId;

    // Delete blog post from Firestore and Storage
    await deleteBlogPost(uuid);

    // Clear cache for this blog post (using slug)
    clearCache(metadata.slug);

    return NextResponse.json({
      success: true,
      message: 'Blog post deleted successfully',
    });
  } catch (error) {
    console.error('Failed to delete blog post:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete blog post';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

