import {
  createHashtag,
  getAllHashtags,
  getHashtagsCount,
  searchHashtags
} from '@/lib/firebase/hashtags';
import { NextRequest, NextResponse } from 'next/server';

// Verify password helper
async function verifyPassword(password: string): Promise<boolean> {
  const secretPassword = process.env.SECRET_UPLOAD_PASSWORD;
  if (!secretPassword) {
    return false;
  }
  return password === secretPassword;
}

/**
 * GET /api/hashtags
 * Get all hashtags or paginated hashtags
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = searchParams.get('page');
    const limitParam = searchParams.get('limit');
    const search = searchParams.get('search');
    
    // If search parameter is provided, perform search
    if (search) {
      const limitCount = limitParam ? parseInt(limitParam, 10) : 50;
      const hashtags = await searchHashtags(search, limitCount);
      return NextResponse.json({ hashtags });
    }
    
    // If pagination parameters are provided, use pagination
    if (page) {
      const pageNum = parseInt(page, 10);
      const pageLimit = limitParam ? parseInt(limitParam, 10) : 20;
      
      // For cursor-based pagination, we'd need to pass the lastDoc
      // For simplicity, we'll use offset-based for now
      // In production, you'd want to use cursor-based pagination
      const allHashtags = await getAllHashtags();
      const total = allHashtags.length;
      const totalPages = Math.ceil(total / pageLimit);
      const startIndex = (pageNum - 1) * pageLimit;
      const endIndex = startIndex + pageLimit;
      const paginatedHashtags = allHashtags.slice(startIndex, endIndex);
      
      return NextResponse.json({
        hashtags: paginatedHashtags,
        pagination: {
          page: pageNum,
          limit: pageLimit,
          total,
          totalPages,
        },
      });
    }
    
    // Return all hashtags
    const hashtags = await getAllHashtags();
    const total = await getHashtagsCount();
    
    return NextResponse.json({
      hashtags,
      pagination: {
        total,
        totalPages: 1,
      },
    });
  } catch (error) {
    console.error('Error fetching hashtags:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hashtags' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/hashtags
 * Create a new hashtag
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, password } = body;
    
    // Verify password
    if (!password || !(await verifyPassword(password))) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }
    
    // Validate input
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'Hashtag name is required' },
        { status: 400 }
      );
    }
    
    try {
      const id = await createHashtag(name.trim());
      return NextResponse.json({
        success: true,
        message: 'Hashtag created successfully',
        hashtagId: id,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create hashtag';
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error creating hashtag:', error);
    return NextResponse.json(
      { error: 'Failed to create hashtag' },
      { status: 500 }
    );
  }
}

