import { NextRequest, NextResponse } from 'next/server';
import { downloadMarkdownFromStorage, getBlogPostMetadataBySlug } from '@/lib/firebase/blog';
import { getCachedContent, saveToCache, isCacheValid } from '@/lib/blog/cache';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    
    if (!slug || typeof slug !== 'string') {
      return NextResponse.json(
        { error: 'Invalid blog slug' },
        { status: 400 }
      );
    }
    
    // First, check if blog exists in Firestore by slug
    const blogMetadata = await getBlogPostMetadataBySlug(slug);
    if (!blogMetadata) {
      // Blog doesn't exist in Firestore - return 404
      return NextResponse.json(
        { error: 'Blog post not found' },
        { status: 404 }
      );
    }
    
    // Get UUID from metadata
    const uuid = blogMetadata.blogId;
    
    // Check cache first (using slug as cache key for backward compatibility)
    if (isCacheValid(slug)) {
      const cachedContent = getCachedContent(slug);
      if (cachedContent) {
        return NextResponse.json({
          content: cachedContent,
          cached: true,
        });
      }
    }
    
    // Fetch from Firebase Storage using UUID
    try {
      const content = await downloadMarkdownFromStorage(uuid);
      
      // Save to cache (using slug as cache key)
      saveToCache(slug, content);
      
      return NextResponse.json({
        content,
        cached: false,
      });
    } catch (storageError) {
      // If storage fetch fails, it might be a 404 from Firebase
      // Check if it's a "not found" type error
      const errorMessage = storageError instanceof Error ? storageError.message : 'Failed to fetch blog content';
      
      // Firebase Storage throws errors for missing files
      // If the metadata exists but content doesn't, still return 404
      if (errorMessage.includes('not found') || errorMessage.includes('does not exist') || errorMessage.includes('404')) {
        return NextResponse.json(
          { error: 'Blog post not found' },
          { status: 404 }
        );
      }
      
      // For other errors, return 500
      console.error('Failed to fetch blog content from storage:', storageError);
      return NextResponse.json(
        { error: 'Failed to fetch blog content' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Failed to fetch blog content:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch blog content';
    
    // Check if it's a "not found" type error
    if (errorMessage.includes('not found') || errorMessage.includes('does not exist') || errorMessage.includes('404')) {
      return NextResponse.json(
        { error: 'Blog post not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

