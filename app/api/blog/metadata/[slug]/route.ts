import { NextRequest, NextResponse } from 'next/server';
import { getBlogPostMetadataBySlug } from '@/lib/firebase/blog';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const searchParams = request.nextUrl.searchParams;
    const language = searchParams.get('language'); // Optional language filter
    
    if (!slug || typeof slug !== 'string') {
      return NextResponse.json(
        { error: 'Invalid blog slug' },
        { status: 400 }
      );
    }
    
    // Validate language if provided
    const validLanguage = language === 'vi' || language === 'en' ? language : undefined;
    
    const blogMetadata = await getBlogPostMetadataBySlug(slug, validLanguage);
    
    if (!blogMetadata) {
      return NextResponse.json(
        { error: 'Blog post not found' },
        { status: 404 }
      );
    }
    
    // Convert Date objects to ISO strings for JSON serialization
    return NextResponse.json({
      blogId: blogMetadata.blogId,
      versionId: blogMetadata.versionId || blogMetadata.uuid, // Version ID (document ID in blogVersions)
      uuid: blogMetadata.versionId || blogMetadata.uuid || blogMetadata.blogId, // For backward compatibility
      title: blogMetadata.title,
      description: blogMetadata.description,
      thumbnail: blogMetadata.thumbnail,
      slug: blogMetadata.slug,
      createdAt: blogMetadata.createdAt.toISOString(),
      modifiedAt: blogMetadata.modifiedAt.toISOString(),
      publishDate: blogMetadata.publishDate?.toISOString(),
      category: blogMetadata.category,
      hashtagIds: blogMetadata.hashtagIds || [],
      language: blogMetadata.language || 'vi',
    });
  } catch (error) {
    console.error('Failed to fetch blog metadata:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch blog metadata';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

