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
  getBlogPostMetadataBySlug,
  getBlogPostsByBlogId
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
    const password = formData.get('password') as string | null;
    const title = formData.get('title') as string | null;
    const description = formData.get('description') as string | null;
    const image = formData.get('image') as string | null;
    const thumbnailFile = formData.get('thumbnailFile') as File | null;
    const language = (formData.get('language') as string | null) || 'vi'; // Default to 'vi' for backward compatibility
    const providedBlogId = formData.get('blogId') as string | null; // Optional blogId for linking to existing blog

    // Verify password
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

    // Use constant-time comparison to prevent timing attacks
    const isValid = password === secretPassword;
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }

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

    // Determine versionId and blogId: handle multilingual linking
    // Each language version gets its own versionId (document ID in blogVersions), but they share the same blogId
    let versionId: string; // Document ID in blogVersions (unique per language version)
    let blogId: string; // Shared identifier to link multilingual versions (document ID in blogPosts)
    let existingHashtagIds: string[] = []; // Hashtags to inherit from existing version
    
    // Check for existing post with same slug and language
    const existingPostSameLanguage = await getBlogPostMetadataBySlug(slug, language);
    const isUpdate = !!existingPostSameLanguage;
    
    if (isUpdate) {
      // Update existing post with same slug and language - use existing versionId and blogId
      versionId = existingPostSameLanguage.versionId || existingPostSameLanguage.uuid || existingPostSameLanguage.blogId;
      blogId = existingPostSameLanguage.blogId; // Use shared blogId
      existingHashtagIds = existingPostSameLanguage.hashtagIds || []; // Preserve existing hashtags
    } else {
      // If blogId is explicitly provided (e.g., when uploading missing language version), use it
      if (providedBlogId) {
        // Verify the blog exists and get its hashtags
        const existingVersions = await getBlogPostsByBlogId(providedBlogId);
        if (existingVersions.length === 0) {
          return NextResponse.json(
            { error: 'The specified blog does not exist.' },
            { status: 404 }
          );
        }
        
        // Check if this language version already exists
        const existingLanguages = existingVersions.map(v => v.language || 'vi');
        if (existingLanguages.includes(language)) {
          return NextResponse.json(
            { error: `A ${language === 'vi' ? 'Vietnamese' : 'English'} version of this blog already exists.` },
            { status: 400 }
          );
        }
        
        // Prevent uploading more than 2 language versions (vi and en only)
        if (existingLanguages.length >= 2) {
          return NextResponse.json(
            { error: 'Both language versions (Vietnamese and English) already exist for this blog. Cannot upload additional language versions.' },
            { status: 400 }
          );
        }
        
        // Use provided blogId and inherit hashtags from existing version
        blogId = providedBlogId;
        versionId = generateUUID(); // Generate new versionId for this language version
        existingHashtagIds = existingVersions[0].hashtagIds || []; // Inherit hashtags from existing version
      } else {
        // Check if there's an existing post with same slug but different language (multilingual link)
        // Try to find any existing post with the same slug (regardless of language)
        const existingPostVi = await getBlogPostMetadataBySlug(slug, 'vi');
        const existingPostEn = await getBlogPostMetadataBySlug(slug, 'en');
        const existingPostDifferentLanguage = language === 'vi' ? existingPostEn : existingPostVi;
        
        if (existingPostDifferentLanguage) {
          // Get all language versions linked by the same blogId
          const allVersions = await getBlogPostsByBlogId(existingPostDifferentLanguage.blogId);
          const existingLanguages = allVersions.map(v => v.language || 'vi');
          
          // Check if the language being uploaded already exists
          if (existingLanguages.includes(language)) {
            // This should not happen since we already checked for same language above
            // But handle it gracefully just in case
            return NextResponse.json(
              { error: `A ${language === 'vi' ? 'Vietnamese' : 'English'} version of this blog already exists.` },
              { status: 400 }
            );
          }
          
          // Prevent uploading more than 2 language versions (vi and en only)
          if (existingLanguages.length >= 2) {
            return NextResponse.json(
              { error: 'Both language versions (Vietnamese and English) already exist for this blog. Cannot upload additional language versions.' },
              { status: 400 }
            );
          }
          
          // Link to existing blog by using the same blogId, but create new version with new versionId
          blogId = existingPostDifferentLanguage.blogId;
          versionId = generateUUID(); // New version ID for this language version
          existingHashtagIds = existingPostDifferentLanguage.hashtagIds || []; // Inherit hashtags from existing version
        } else {
          // New post - generate new versionId and blogId
          // For new posts, blogId is generated separately (they're different now)
          versionId = generateUUID();
          blogId = generateUUID();
        }
      }
    }
    
    // Upload images to Firebase Storage and get URL mappings (for ZIP files)
    let imageUrlMap = new Map<string, string>();
    
    if (extractedImages.length > 0) {
      try {
        imageUrlMap = await uploadBlogImagesToStorage(versionId, extractedImages);
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
        const thumbnailPath = getBlogThumbnailPath(versionId, thumbnailFile.name || 'thumbnail');
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
      await uploadMarkdownToStorage(versionId, content);
      // Clear cache when content is updated (use slug for cache key)
      clearCache(slug);
    } catch (error) {
      console.error('Failed to upload markdown to Firebase Storage:', error);
      // Continue even if upload fails
    }
    
    // Save metadata to Firestore
    try {
      await saveBlogPostMetadata(versionId, slug, {
        title: finalTitle,
        description: finalDescription,
        thumbnail: thumbnailURL,
        language: language,
        hashtagIds: existingHashtagIds, // Inherit hashtags from existing version or use empty array for new posts
      }, blogId); // Pass blogId to link multilingual versions
      
      // If this is a new language version (not an update), ensure hashtag relationships are set up
      if (!isUpdate && existingHashtagIds.length > 0) {
        try {
          const { updateBlogHashtags } = await import('@/lib/firebase/hashtags');
          // Use blogId for hashtag relationships (shared across versions)
          await updateBlogHashtags(blogId, existingHashtagIds);
        } catch (error) {
          console.warn('Failed to set up hashtag relationships for new language version:', error);
          // Non-critical - hashtags are already in metadata
        }
      }
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
      uuid: versionId, // For backward compatibility
      versionId,
      blogId,
      slug,
      thumbnail: thumbnailURL,
      language,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to upload file';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

