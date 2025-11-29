import { NextRequest, NextResponse } from 'next/server';
import { getBlogPostMetadataBySlug } from '@/lib/firebase/blog';

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
    
    const blogMetadata = await getBlogPostMetadataBySlug(slug);
    
    if (!blogMetadata) {
      return NextResponse.json(
        { error: 'Blog post not found' },
        { status: 404 }
      );
    }
    
    // Convert Date objects to ISO strings for JSON serialization
    return NextResponse.json({
      blogId: blogMetadata.blogId,
      uuid: blogMetadata.uuid,
      title: blogMetadata.title,
      description: blogMetadata.description,
      thumbnail: blogMetadata.thumbnail,
      slug: blogMetadata.slug,
      createdAt: blogMetadata.createdAt.toISOString(),
      modifiedAt: blogMetadata.modifiedAt.toISOString(),
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

