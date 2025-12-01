import { NextRequest, NextResponse } from 'next/server';
import { 
  getHashtagById,
  updateHashtag,
  deleteHashtag,
} from '@/lib/firebase/hashtags';

// Verify password helper
async function verifyPassword(password: string): Promise<boolean> {
  const secretPassword = process.env.SECRET_UPLOAD_PASSWORD;
  if (!secretPassword) {
    return false;
  }
  return password === secretPassword;
}

/**
 * GET /api/hashtags/[hashtagId]
 * Get a specific hashtag by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ hashtagId: string }> }
) {
  try {
    const { hashtagId } = await params;
    
    if (!hashtagId) {
      return NextResponse.json(
        { error: 'Hashtag ID is required' },
        { status: 400 }
      );
    }
    
    const hashtag = await getHashtagById(hashtagId);
    
    if (!hashtag) {
      return NextResponse.json(
        { error: 'Hashtag not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(hashtag);
  } catch (error) {
    console.error('Error fetching hashtag:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hashtag' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/hashtags/[hashtagId]
 * Update a hashtag
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ hashtagId: string }> }
) {
  try {
    const { hashtagId } = await params;
    const body = await request.json();
    const { name, password } = body;
    
    // Verify password
    if (!password || !(await verifyPassword(password))) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }
    
    if (!hashtagId) {
      return NextResponse.json(
        { error: 'Hashtag ID is required' },
        { status: 400 }
      );
    }
    
    const updates: { name?: string } = {};
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim() === '') {
        return NextResponse.json(
          { error: 'Hashtag name cannot be empty' },
          { status: 400 }
        );
      }
      updates.name = name.trim();
    }
    
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }
    
    try {
      await updateHashtag(hashtagId, updates);
      return NextResponse.json({
        success: true,
        message: 'Hashtag updated successfully',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update hashtag';
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error updating hashtag:', error);
    return NextResponse.json(
      { error: 'Failed to update hashtag' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/hashtags/[hashtagId]
 * Delete a hashtag
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ hashtagId: string }> }
) {
  try {
    const { hashtagId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const password = searchParams.get('password');
    
    // Verify password
    if (!password || !(await verifyPassword(password))) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }
    
    if (!hashtagId) {
      return NextResponse.json(
        { error: 'Hashtag ID is required' },
        { status: 400 }
      );
    }
    
    try {
      await deleteHashtag(hashtagId);
      return NextResponse.json({
        success: true,
        message: 'Hashtag deleted successfully',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete hashtag';
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error deleting hashtag:', error);
    return NextResponse.json(
      { error: 'Failed to delete hashtag' },
      { status: 500 }
    );
  }
}

