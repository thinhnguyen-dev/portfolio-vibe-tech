import { NextRequest, NextResponse } from 'next/server';
import { deleteBlogPost } from '@/lib/firebase/blog';
import { clearCache } from '@/lib/blog/cache';

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const blogId = searchParams.get('blogId') || searchParams.get('slug');

    if (!blogId || typeof blogId !== 'string') {
      return NextResponse.json(
        { error: 'Blog ID is required' },
        { status: 400 }
      );
    }

    // Delete blog post from Firestore and Storage
    await deleteBlogPost(blogId);

    // Clear cache for this blog post
    clearCache(blogId);

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

