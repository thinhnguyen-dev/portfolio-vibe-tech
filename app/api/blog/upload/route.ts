import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { extractBlogZip, updateImagePathsWithFirebaseUrls } from '@/lib/blog/zip-extractor';
import { 
  saveBlogPostMetadata, 
  uploadImageToStorage, 
  getBlogThumbnailPath,
  uploadBlogImagesToStorage,
  uploadMarkdownToStorage,
  generateUUID,
  getBlogPostMetadataBySlug
} from '@/lib/firebase/blog';
import { clearCache } from '@/lib/blog/cache';

// Detect serverless environment (Vercel, AWS Lambda, etc.)
// In serverless, use /tmp for writable temp files, otherwise use project temp directory
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT;
const tempBaseDir = isServerless 
  ? path.join('/tmp', 'blog-extracts')
  : path.join(process.cwd(), 'temp', 'blog-extracts');

const blogDirectory = path.join(process.cwd(), 'content/blog');
const tempExtractDirectory = tempBaseDir;
const MAX_ZIP_SIZE = 100 * 1024 * 1024; // 100MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string | null;
    const description = formData.get('description') as string | null;
    const image = formData.get('image') as string | null;
    const thumbnailFile = formData.get('thumbnailFile') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Check if it's a ZIP file
    const isZipFile = file.name.toLowerCase().endsWith('.zip');
    const isMarkdownFile = file.name.toLowerCase().endsWith('.md');

    if (!isZipFile && !isMarkdownFile) {
      return NextResponse.json(
        { error: 'Only .md or .zip files are allowed' },
        { status: 400 }
      );
    }

    // Try to create blog directory if it doesn't exist (may fail in serverless, that's OK)
    try {
      if (!fs.existsSync(blogDirectory)) {
        fs.mkdirSync(blogDirectory, { recursive: true });
      }
    } catch (error) {
      // In serverless environments, local file system may be read-only
      // This is OK since we're uploading to Firebase Storage anyway
      console.warn('Could not create blog directory (non-critical in serverless):', error);
    }

    let content: string;
    let slug: string;
    let extractedImages: Array<{ originalPath: string; savedPath: string; relativePath: string; buffer: Buffer; contentType: string }> = [];

    if (isZipFile) {
      // Handle ZIP file upload
      const fileBuffer = Buffer.from(await file.arrayBuffer());
      
      // Check file size
      if (fileBuffer.length > MAX_ZIP_SIZE) {
        return NextResponse.json(
          { error: `ZIP file exceeds maximum size of ${MAX_ZIP_SIZE / 1024 / 1024}MB` },
          { status: 400 }
        );
      }

      // Create temporary extraction directory
      // Ensure parent directory exists
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
        // Use title if provided, otherwise use markdown filename
        slug = title 
          ? title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
          : extractedData.markdownFileName.replace(/\.md$/i, '');
        extractedImages = extractedData.images;

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
    } else {
      // Handle regular markdown file upload
      content = await file.text();
      // Use title if provided, otherwise use filename
      slug = title 
        ? title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        : file.name.replace(/\.md$/i, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }

    // Check if this is an update (existing post with same slug)
    let uuid: string;
    const existingPost = await getBlogPostMetadataBySlug(slug);
    const isUpdate = !!existingPost;
    
    if (existingPost) {
      // Update existing post - use existing UUID
      uuid = existingPost.blogId;
    } else {
      // New post - generate UUID
      uuid = generateUUID();
    }
    
    // Upload images to Firebase Storage and get URL mappings (for ZIP files)
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
    
    // Handle thumbnail: upload to Firebase Storage if file provided, otherwise use URL
    let thumbnailURL: string = image || '/default_blog_img.png';
    
    if (thumbnailFile) {
      // Upload thumbnail file to Firebase Storage
      try {
        const thumbnailPath = getBlogThumbnailPath(uuid, thumbnailFile.name || 'thumbnail');
        thumbnailURL = await uploadImageToStorage(
          thumbnailFile,
          thumbnailPath,
          thumbnailFile.type
        );
      } catch (error) {
        console.error('Failed to upload thumbnail to Firebase Storage:', error);
        // Fall back to provided image URL or default
        if (!image) {
          thumbnailURL = '/default_blog_img.png';
        }
      }
    }
    
    // Prepare metadata for Firestore
    const finalTitle = title || slug;
    const finalDescription = description || 'No description available.';
    
    // Upload Markdown file to Firebase Storage
    try {
      await uploadMarkdownToStorage(uuid, content);
      // Clear cache when content is updated (use slug for cache key)
      clearCache(slug);
    } catch (error) {
      console.error('Failed to upload markdown to Firebase Storage:', error);
      // Continue even if upload fails
    }
    
    // Save metadata to Firestore
    try {
      await saveBlogPostMetadata(uuid, slug, {
        title: finalTitle,
        description: finalDescription,
        thumbnail: thumbnailURL,
      });
    } catch (error) {
      console.error('Failed to save metadata to Firestore:', error);
      // Continue even if Firestore fails
    }
    
    // Also save markdown file to local filesystem as backup (optional)
    // This can be removed if you want to rely entirely on Firebase Storage
    // In serverless environments, this may fail (read-only filesystem), which is OK
    try {
      if (!fs.existsSync(blogDirectory)) {
        fs.mkdirSync(blogDirectory, { recursive: true });
      }
      const filePath = path.join(blogDirectory, `${slug}.md`);
      fs.writeFileSync(filePath, content, 'utf-8');
    } catch (error) {
      // Non-critical - in serverless environments, local filesystem is read-only
      // We're already saving to Firebase Storage, so this is just a backup
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to save markdown to local filesystem (non-critical):', error);
      }
    }

    return NextResponse.json({
      success: true,
      message: isUpdate ? 'Blog post updated successfully' : 'Blog post uploaded successfully',
      extractedImages: extractedImages.length,
      uuid,
      slug,
      thumbnail: thumbnailURL,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to upload file';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

