import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { extractBlogZip, updateImagePathsWithFirebaseUrls } from '@/lib/blog/zip-extractor';
import { 
  getBlogPostMetadataBySlug, 
  uploadMarkdownToStorage,
  saveBlogPostMetadata,
  uploadImageToStorage,
  getBlogThumbnailPath,
  uploadBlogImagesToStorage,
} from '@/lib/firebase/blog';
import { getFirebaseStorage } from '@/lib/firebase/config';
import { clearCache } from '@/lib/blog/cache';
import { ref, listAll, deleteObject } from 'firebase/storage';

const blogDirectory = path.join(process.cwd(), 'content/blog');

// Detect serverless environment
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT;
const tempBaseDir = isServerless 
  ? path.join('/tmp', 'blog-extracts')
  : path.join(process.cwd(), 'temp', 'blog-extracts');

const tempExtractDirectory = tempBaseDir;
const MAX_ZIP_SIZE = 100 * 1024 * 1024; // 100MB

/**
 * Delete all files in a Firebase Storage directory recursively
 */
async function deleteDirectoryContents(directoryPath: string): Promise<void> {
  try {
    const storage = getFirebaseStorage();
    const directoryRef = ref(storage, directoryPath);
    const listResult = await listAll(directoryRef);
    
    // Delete all files in the directory
    const deletePromises = listResult.items.map((itemRef) => 
      deleteObject(itemRef).catch((error) => {
        console.warn(`Failed to delete file ${itemRef.fullPath}:`, error);
        // Continue with other deletions even if one fails
      })
    );
    
    await Promise.all(deletePromises);
    
    // Recursively delete subdirectories
    for (const prefixRef of listResult.prefixes) {
      await deleteDirectoryContents(prefixRef.fullPath);
    }
  } catch (error) {
    // If directory doesn't exist, that's OK
    if ((error as { code?: string })?.code !== 'storage/object-not-found') {
      console.warn(`Error deleting directory ${directoryPath}:`, error);
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const slug = formData.get('slug') as string;
    const password = formData.get('password') as string;
    const title = formData.get('title') as string | null;
    const description = formData.get('description') as string | null;
    const image = formData.get('image') as string | null;
    const thumbnailFile = formData.get('thumbnailFile') as File | null;
    const zipFile = formData.get('zipFile') as File | null;

    if (!slug) {
      return NextResponse.json(
        { error: 'Slug is required' },
        { status: 400 }
      );
    }

    // Verify password on server
    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    const secretPassword = process.env.SECRET_UPLOAD_PASSWORD;
    if (!secretPassword) {
      console.error('SECRET_UPLOAD_PASSWORD environment variable is not set');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    if (password !== secretPassword) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }

    // Get existing blog post by slug to get UUID
    const existingPost = await getBlogPostMetadataBySlug(slug);
    if (!existingPost) {
      return NextResponse.json(
        { error: 'Blog post not found' },
        { status: 404 }
      );
    }

    const uuid = existingPost.blogId;
    let content: string | null = null;
    let extractedImages: Array<{ originalPath: string; savedPath: string; relativePath: string; buffer: Buffer; contentType: string }> = [];

    // Handle ZIP file upload - this replaces all content
    if (zipFile) {
      const fileBuffer = Buffer.from(await zipFile.arrayBuffer());
      
      // Check file size
      if (fileBuffer.length > MAX_ZIP_SIZE) {
        return NextResponse.json(
          { error: `ZIP file exceeds maximum size of ${MAX_ZIP_SIZE / 1024 / 1024}MB` },
          { status: 400 }
        );
      }

      // Create temporary extraction directory
      try {
        if (!fs.existsSync(tempExtractDirectory)) {
          fs.mkdirSync(tempExtractDirectory, { recursive: true });
        }
      } catch (error) {
        console.error('Failed to create temp extraction directory:', error);
        return NextResponse.json(
          { error: 'Failed to create temporary directory for extraction' },
          { status: 500 }
        );
      }
      
      const extractId = `extract-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const extractDir = path.join(tempExtractDirectory, extractId);
      
      try {
        // Extract ZIP file
        const extractedData = extractBlogZip(fileBuffer, extractDir);
        content = extractedData.markdownContent;
        extractedImages = extractedData.images;

        // Delete old images from Firebase Storage
        try {
          const imagesDirectoryPath = `blog-images/${uuid}`;
          await deleteDirectoryContents(imagesDirectoryPath);
        } catch (error) {
          console.warn('Error deleting old images:', error);
          // Continue even if deletion fails
        }

        // Upload new images to Firebase Storage and get URL mappings
        let imageUrlMap = new Map<string, string>();
        
        if (extractedImages.length > 0) {
          try {
            imageUrlMap = await uploadBlogImagesToStorage(uuid, extractedImages);
            // Update image paths in markdown content with Firebase Storage URLs
            content = updateImagePathsWithFirebaseUrls(content, imageUrlMap);
          } catch (error) {
            console.error('Failed to upload images to Firebase Storage:', error);
            // Continue even if image upload fails
          }
        }

        // Clean up temporary extraction directory
        if (fs.existsSync(extractDir)) {
          fs.rmSync(extractDir, { recursive: true, force: true });
        }
      } catch (error) {
        // Clean up on error
        if (fs.existsSync(extractDir)) {
          fs.rmSync(extractDir, { recursive: true, force: true });
        }
        throw error;
      }

      // Update markdown in Firebase Storage
      if (content) {
        try {
          await uploadMarkdownToStorage(uuid, content);
          // Clear cache when content is updated
          clearCache(slug);
        } catch (error) {
          console.error('Failed to update markdown in Firebase Storage:', error);
          return NextResponse.json(
            { error: 'Failed to update file in storage' },
            { status: 500 }
          );
        }
      }
    }

    // Handle thumbnail update
    let thumbnailURL: string = image || existingPost.thumbnail || '/default_blog_img.png';
    
    if (thumbnailFile) {
      try {
        const thumbnailPath = getBlogThumbnailPath(uuid, thumbnailFile.name || 'thumbnail');
        thumbnailURL = await uploadImageToStorage(
          thumbnailFile,
          thumbnailPath,
          thumbnailFile.type
        );
      } catch (error) {
        console.error('Failed to upload thumbnail to Firebase Storage:', error);
        // Fall back to existing thumbnail or provided image URL
        if (!image) {
          thumbnailURL = existingPost.thumbnail || '/default_blog_img.png';
        }
      }
    }

    // Prepare metadata for Firestore
    const finalTitle = title || existingPost.title;
    const finalDescription = description !== null ? description : existingPost.description;

    // Update metadata in Firestore
    try {
      await saveBlogPostMetadata(uuid, slug, {
        title: finalTitle,
        description: finalDescription,
        thumbnail: thumbnailURL,
      });
    } catch (error) {
      console.error('Failed to update metadata in Firestore:', error);
      // Continue even if metadata update fails
    }

    // Also update local filesystem as backup (optional)
    if (content) {
      try {
        if (!fs.existsSync(blogDirectory)) {
          fs.mkdirSync(blogDirectory, { recursive: true });
        }
        const filePath = path.join(blogDirectory, `${slug}.md`);
        fs.writeFileSync(filePath, content, 'utf-8');
      } catch (error) {
        // Non-critical - in serverless environments, local filesystem is read-only
        if (process.env.NODE_ENV === 'development') {
          console.warn('Failed to update markdown in local filesystem (non-critical):', error);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Blog post updated successfully',
    });
  } catch (error) {
    console.error('Failed to update blog post:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update file';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

