import { NextRequest, NextResponse } from 'next/server';
import { 
  getPaginatedBlogPostsMetadata, 
  getBlogPostsCount,
  getBlogPostsByHashtags,
  getBlogPostsCountByHashtags,
  getAllBlogPostsMetadata,
  getBlogPostsWithNoHashtags,
  getBlogPostsCountWithNoHashtags
} from '@/lib/firebase/blog';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageLimit = parseInt(searchParams.get('limit') || '9', 10);
    
    // Check if filtering for blogs with no hashtags
    const noHashtagsParam = searchParams.get('noHashtags');
    const filterNoHashtags = noHashtagsParam === 'true';
    
    // Check if hashtag filtering is requested
    const hashtagsParam = searchParams.get('hashtags');
    const hashtagIds = hashtagsParam 
      ? hashtagsParam.split(',').map(id => id.trim()).filter(id => id.length > 0)
      : [];
    
    let allPosts;
    let total;
    
    // If filtering for blogs with no hashtags
    if (filterNoHashtags) {
      allPosts = await getBlogPostsWithNoHashtags();
      total = await getBlogPostsCountWithNoHashtags();
    } else if (hashtagIds.length > 0) {
      // If hashtag filtering is requested, use filtered query
      allPosts = await getBlogPostsByHashtags(hashtagIds);
      total = await getBlogPostsCountByHashtags(hashtagIds);
    } else {
      // Otherwise, get all posts
      allPosts = await getAllBlogPostsMetadata();
      total = await getBlogPostsCount();
    }
    
    // Calculate pagination
    const totalPages = Math.ceil(total / pageLimit);
    const offset = (page - 1) * pageLimit;
    const paginatedPosts = allPosts.slice(offset, offset + pageLimit);
    
    // Convert to format expected by BlogList component
    const formattedPosts = paginatedPosts.map((post) => ({
      slug: post.slug,
      title: post.title,
      excerpt: post.description,
      // Use publishDate if available, otherwise fall back to createdAt
      date: (post.publishDate || post.createdAt).toISOString().split('T')[0],
      image: post.thumbnail,
      blogId: post.blogId, // Include UUID for unique key
      category: post.category, // Default to 'Uncategorized' if no category
      hashtagIds: post.hashtagIds || [], // Include hashtag IDs for fetching hashtag names
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = error instanceof Error ? error.stack : String(error);
    console.error('Error details:', errorDetails);
    
    // Check if it's a Firestore index error
    if (errorMessage.includes('index') || errorMessage.includes('failed-precondition')) {
      return NextResponse.json(
        { 
          error: 'Database index required. Please check server logs for index creation link.',
          details: errorMessage 
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch blog posts',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}

