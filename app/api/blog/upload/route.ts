import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { extractBlogZip, updateImagePathsWithFirebaseUrls } from '@/lib/blog/zip-extractor';
import { 
  saveBlogPostMetadata, 
  uploadImageToStorage, 
  getBlogThumbnailPath,
  uploadBlogImagesToStorage,
  uploadMarkdownToStorage
} from '@/lib/firebase/blog';
import { clearCache } from '@/lib/blog/cache';

const blogDirectory = path.join(process.cwd(), 'content/blog');
const tempExtractDirectory = path.join(process.cwd(), 'temp', 'blog-extracts');
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

    if (!fs.existsSync(blogDirectory)) {
      fs.mkdirSync(blogDirectory, { recursive: true });
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

        // Upload images to Firebase Storage and get URL mappings
        const blogId = slug;
        let imageUrlMap = new Map<string, string>();
        
        if (extractedImages.length > 0) {
          try {
            imageUrlMap = await uploadBlogImagesToStorage(blogId, extractedImages);
          } catch (error) {
            console.error('Failed to upload images to Firebase Storage:', error);
            // Continue even if image upload fails
          }
        }

        // Update image paths in markdown content with Firebase Storage URLs
        content = updateImagePathsWithFirebaseUrls(content, imageUrlMap);

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

    const filePath = path.join(blogDirectory, `${slug}.md`);
    const isUpdate = fs.existsSync(filePath);
    
    // Generate blog ID (same as slug for consistency)
    const blogId = slug;
    
    // Handle thumbnail: upload to Firebase Storage if file provided, otherwise use URL
    let thumbnailURL: string = image || '/default_blog_img.png';
    
    if (thumbnailFile) {
      // Upload thumbnail file to Firebase Storage
      try {
        const thumbnailPath = getBlogThumbnailPath(blogId, thumbnailFile.name || 'thumbnail');
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
      await uploadMarkdownToStorage(blogId, content);
      // Clear cache when content is updated
      clearCache(blogId);
    } catch (error) {
      console.error('Failed to upload markdown to Firebase Storage:', error);
      // Continue even if upload fails
    }
    
    // Save metadata to Firestore
    try {
      await saveBlogPostMetadata(blogId, {
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
    try {
      if (!fs.existsSync(blogDirectory)) {
        fs.mkdirSync(blogDirectory, { recursive: true });
      }
      fs.writeFileSync(filePath, content, 'utf-8');
    } catch (error) {
      console.error('Failed to save markdown to local filesystem:', error);
      // Non-critical, continue
    }

    return NextResponse.json({
      success: true,
      message: isUpdate ? 'Blog post updated successfully' : 'Blog post uploaded successfully',
      extractedImages: extractedImages.length,
      blogId,
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

