import { NextRequest, NextResponse } from 'next/server';
import { downloadMarkdownFromStorage } from '@/lib/firebase/blog';
import { getCachedContent, saveToCache, isCacheValid } from '@/lib/blog/cache';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    
    // Check cache first
    if (isCacheValid(slug)) {
      const cachedContent = getCachedContent(slug);
      if (cachedContent) {
        return NextResponse.json({
          content: cachedContent,
          cached: true,
        });
      }
    }
    
    // Fetch from Firebase Storage
    const content = await downloadMarkdownFromStorage(slug);
    
    // Save to cache
    saveToCache(slug, content);
    
    return NextResponse.json({
      content,
      cached: false,
    });
  } catch (error) {
    console.error('Failed to fetch blog content:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch blog content';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

