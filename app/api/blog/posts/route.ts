import { NextRequest, NextResponse } from 'next/server';
import { getPaginatedBlogPostsMetadata, getBlogPostsCount } from '@/lib/firebase/blog';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageLimit = parseInt(searchParams.get('limit') || '9', 10);
    
    // Get total count for pagination info
    const total = await getBlogPostsCount();
    const totalPages = Math.ceil(total / pageLimit);
    
    // For now, we'll fetch all posts and paginate
    // In a production app with many posts, you'd want to implement proper cursor-based pagination
    // This approach works well for blogs with reasonable post counts
    const { posts, hasMore } = await getPaginatedBlogPostsMetadata(pageLimit);
    
    // Calculate offset for current page
    const offset = (page - 1) * pageLimit;
    
    // For simplicity, fetch all and slice (works for reasonable blog sizes)
    // In production with 1000+ posts, implement cursor-based pagination
    const { getAllBlogPostsMetadata } = await import('@/lib/firebase/blog');
    const allPosts = await getAllBlogPostsMetadata();
    const paginatedPosts = allPosts.slice(offset, offset + pageLimit);
    
    // Convert to format expected by BlogList component
    const formattedPosts = paginatedPosts.map((post) => ({
      slug: post.slug,
      title: post.title,
      excerpt: post.description,
      date: post.createdAt.toISOString().split('T')[0],
      image: post.thumbnail,
      blogId: post.blogId, // Include UUID for unique key
      category: post.category || 'Uncategorized', // Default to 'Uncategorized' if no category
    }));
    
    return NextResponse.json({
      posts: formattedPosts,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        hasMore: page < totalPages,
        limit: pageLimit,
      },
    });
  } catch (error) {
    console.error('Failed to fetch blog posts from Firestore:', error);
    return NextResponse.json(
      { error: 'Failed to fetch blog posts' },
      { status: 500 }
    );
  }
}

