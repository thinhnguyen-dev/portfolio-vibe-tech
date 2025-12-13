import { NextRequest, NextResponse } from 'next/server';
import { getBlogPostsByBlogId } from '@/lib/firebase/blog';

/**
 * GET endpoint to check available language versions for a blog
 * Query params: blogId - The blogId to check
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const blogId = searchParams.get('blogId');
    
    if (!blogId || typeof blogId !== 'string') {
      return NextResponse.json(
        { error: 'blogId parameter is required' },
        { status: 400 }
      );
    }
    
    // Get all language versions of this blog
    const allVersions = await getBlogPostsByBlogId(blogId);
    
    const hasVi = allVersions.some(v => v.language === 'vi');
    const hasEn = allVersions.some(v => v.language === 'en');
    
    return NextResponse.json({
      success: true,
      blogId,
      hasVi,
      hasEn,
      versions: allVersions.map(v => ({
        language: v.language || 'vi',
        slug: v.slug,
        title: v.title,
      })),
    });
  } catch (error) {
    console.error('Failed to check language versions:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to check language versions';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

