import AdmZip from 'adm-zip';
import path from 'path';
import fs from 'fs';

export interface ExtractedBlogData {
  markdownContent: string;
  markdownFileName: string;
  images: Array<{
    originalPath: string;
    savedPath: string;
    relativePath: string;
    buffer: Buffer;
    contentType: string;
  }>;
}

/**
 * Securely extracts a ZIP file and returns blog data
 * @param zipBuffer - The ZIP file as a Buffer
 * @param outputDir - Directory to extract files to
 * @param maxFileSize - Maximum size for individual files in bytes (default: 10MB)
 * @param maxTotalSize - Maximum total extraction size in bytes (default: 100MB)
 * @returns Extracted blog data with markdown content and image paths
 */
export function extractBlogZip(
  zipBuffer: Buffer,
  outputDir: string,
  maxFileSize: number = 10 * 1024 * 1024, // 10MB
  maxTotalSize: number = 100 * 1024 * 1024 // 100MB
): ExtractedBlogData {
  const zip = new AdmZip(zipBuffer);
  const entries = zip.getEntries();
  
  // Find markdown files
  const markdownFiles = entries.filter(entry => 
    !entry.isDirectory && 
    entry.entryName.toLowerCase().endsWith('.md')
  );

  if (markdownFiles.length === 0) {
    throw new Error('No markdown file found in ZIP');
  }

  if (markdownFiles.length > 1) {
    throw new Error('Multiple markdown files found. Only one markdown file is allowed per ZIP.');
  }

  const markdownEntry = markdownFiles[0];
  const markdownFileName = path.basename(markdownEntry.entryName);
  
  // Validate file sizes before extraction
  let totalSize = 0;
  for (const entry of entries) {
    if (!entry.isDirectory) {
      if (entry.header.size > maxFileSize) {
        throw new Error(`File ${entry.entryName} exceeds maximum file size of ${maxFileSize / 1024 / 1024}MB`);
      }
      totalSize += entry.header.size;
      if (totalSize > maxTotalSize) {
        throw new Error(`Total extraction size exceeds maximum of ${maxTotalSize / 1024 / 1024}MB`);
      }
    }
  }

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Extract all files securely
  const images: ExtractedBlogData['images'] = [];
  const baseDir = path.resolve(outputDir);
  
  for (const entry of entries) {
    if (entry.isDirectory) {
      continue;
    }

    // Prevent ZIP slip attacks by normalizing and checking paths
    const entryName = entry.entryName.replace(/\\/g, '/'); // Normalize path separators
    const normalizedPath = path.normalize(entryName);
    
    // Check for directory traversal attempts
    if (normalizedPath.includes('..') || path.isAbsolute(normalizedPath)) {
      throw new Error(`Invalid path detected: ${entryName}. Directory traversal is not allowed.`);
    }

    // Resolve the full path
    const fullPath = path.resolve(baseDir, normalizedPath);
    
    // Ensure the resolved path is within the base directory
    if (!fullPath.startsWith(baseDir)) {
      throw new Error(`Path traversal detected: ${entryName}`);
    }

    // Create directory structure if needed
    const entryDir = path.dirname(fullPath);
    if (!fs.existsSync(entryDir)) {
      fs.mkdirSync(entryDir, { recursive: true });
    }

    // Extract file
    const entryData = entry.getData();
    fs.writeFileSync(fullPath, entryData);

    // Track images (non-markdown files)
    if (!entryName.toLowerCase().endsWith('.md')) {
      const isImage = /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(entryName);
      if (isImage) {
        // Determine content type from file extension
        const ext = path.extname(entryName).toLowerCase();
        const contentTypeMap: Record<string, string> = {
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.gif': 'image/gif',
          '.webp': 'image/webp',
          '.svg': 'image/svg+xml',
          '.bmp': 'image/bmp',
        };
        const contentType = contentTypeMap[ext] || 'image/jpeg';
        
        images.push({
          originalPath: entryName,
          savedPath: fullPath,
          relativePath: normalizedPath,
          buffer: entryData,
          contentType,
        });
      }
    }
  }

  // Read markdown content
  const markdownContent = markdownEntry.getData().toString('utf-8');

  return {
    markdownContent,
    markdownFileName,
    images,
  };
}

/**
 * Updates image paths in markdown content to use Firebase Storage URLs
 * @param markdownContent - The markdown content
 * @param imageUrlMap - Map of original/relative paths to Firebase Storage URLs
 * @returns Updated markdown content with Firebase Storage URLs
 */
export function updateImagePathsWithFirebaseUrls(
  markdownContent: string,
  imageUrlMap: Map<string, string>
): string {
  let updatedContent = markdownContent;

  // Replace image paths with Firebase Storage URLs
  for (const [originalPath, firebaseUrl] of imageUrlMap.entries()) {
    // Normalize paths for matching (handle both forward and backward slashes)
    const normalizedPath = originalPath.replace(/\\/g, '/');
    const escapedPath = escapeRegex(normalizedPath);
    
    // Extract just the filename (for matching various path formats)
    const filename = normalizedPath.split('/').pop() || normalizedPath;
    const escapedFilename = escapeRegex(filename);
    
    // Pattern 1: Markdown image syntax ![alt](path) - match exact path
    updatedContent = updatedContent.replace(
      new RegExp(`!\\[([^\\]]*)\\]\\(${escapedPath}\\)`, 'gi'),
      `![$1](${firebaseUrl})`
    );
    
    // Pattern 2: Markdown image with absolute path /filename
    updatedContent = updatedContent.replace(
      new RegExp(`!\\[([^\\]]*)\\]\\(/${escapedFilename}\\)`, 'gi'),
      `![$1](${firebaseUrl})`
    );
    
    // Pattern 3: Markdown image with just filename (no path)
    updatedContent = updatedContent.replace(
      new RegExp(`!\\[([^\\]]*)\\]\\(${escapedFilename}\\)`, 'gi'),
      `![$1](${firebaseUrl})`
    );
    
    // Pattern 4: Markdown image with relative paths (./filename, ../filename)
    updatedContent = updatedContent.replace(
      new RegExp(`!\\[([^\\]]*)\\]\\(\\./${escapedFilename}\\)`, 'gi'),
      `![$1](${firebaseUrl})`
    );
    updatedContent = updatedContent.replace(
      new RegExp(`!\\[([^\\]]*)\\]\\(\\.\\./${escapedFilename}\\)`, 'gi'),
      `![$1](${firebaseUrl})`
    );
    
    // Pattern 5: HTML img tag with src attribute - exact path
    updatedContent = updatedContent.replace(
      new RegExp(`(<img[^>]+src=["'])${escapedPath}(["'][^>]*>)`, 'gi'),
      `$1${firebaseUrl}$2`
    );
    
    // Pattern 6: HTML img tag with absolute path /filename
    updatedContent = updatedContent.replace(
      new RegExp(`(<img[^>]+src=["'])/${escapedFilename}(["'][^>]*>)`, 'gi'),
      `$1${firebaseUrl}$2`
    );
    
    // Pattern 7: HTML img tag with just filename
    updatedContent = updatedContent.replace(
      new RegExp(`(<img[^>]+src=["'])${escapedFilename}(["'][^>]*>)`, 'gi'),
      `$1${firebaseUrl}$2`
    );
    
    // Pattern 8: Generic src/href attributes - exact path
    updatedContent = updatedContent.replace(
      new RegExp(`(src|href)=["']${escapedPath}["']`, 'gi'),
      `$1="${firebaseUrl}"`
    );
    
    // Pattern 9: Generic src/href with absolute path /filename
    updatedContent = updatedContent.replace(
      new RegExp(`(src|href)=["']/${escapedFilename}["']`, 'gi'),
      `$1="${firebaseUrl}"`
    );
    
    // Pattern 10: Generic src/href with just filename
    updatedContent = updatedContent.replace(
      new RegExp(`(src|href)=["']${escapedFilename}["']`, 'gi'),
      `$1="${firebaseUrl}"`
    );
    
    // Pattern 11: Handle relative paths with ./ and ../ for the full path
    const relativePatterns = [
      `\\./${escapedPath}`,
      `\\.\\./${escapedPath}`,
      `\\.\\./\\.\\./${escapedPath}`,
    ];
    
    for (const pattern of relativePatterns) {
      updatedContent = updatedContent.replace(
        new RegExp(`!\\[([^\\]]*)\\]\\(${pattern}\\)`, 'gi'),
        `![$1](${firebaseUrl})`
      );
      updatedContent = updatedContent.replace(
        new RegExp(`(<img[^>]+src=["'])${pattern}(["'][^>]*>)`, 'gi'),
        `$1${firebaseUrl}$2`
      );
      updatedContent = updatedContent.replace(
        new RegExp(`(src|href)=["']${pattern}["']`, 'gi'),
        `$1="${firebaseUrl}"`
      );
    }
  }

  return updatedContent;
}

/**
 * Escapes special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

