import fs from 'fs';
import path from 'path';

// Detect serverless environment (Vercel, AWS Lambda, etc.)
// In serverless, use /tmp for writable cache, otherwise use .cache
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT;
const CACHE_BASE_DIR = isServerless 
  ? path.join('/tmp', '.cache', 'blog')
  : path.join(process.cwd(), '.cache', 'blog');
const CACHE_DIR = CACHE_BASE_DIR;
const CACHE_DURATION_MS = 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds

interface CacheEntry {
  content: string;
  timestamp: number;
}

/**
 * Ensure cache directory exists
 * Returns true if successful, false if failed (non-critical)
 */
function ensureCacheDir(): boolean {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    return true;
  } catch (error) {
    // In serverless or restricted environments, caching may not be available
    // This is non-critical, so we just log and continue
    console.warn(`Cache directory creation failed (non-critical): ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
}

/**
 * Get cache file path for a blog post
 */
function getCacheFilePath(blogId: string): string {
  return path.join(CACHE_DIR, `${blogId}.json`);
}

/**
 * Check if cached content is still valid (not expired)
 */
export function isCacheValid(blogId: string): boolean {
  try {
    const cachePath = getCacheFilePath(blogId);
    
    if (!fs.existsSync(cachePath)) {
      return false;
    }
    
    const cacheData = JSON.parse(fs.readFileSync(cachePath, 'utf-8')) as CacheEntry;
    const age = Date.now() - cacheData.timestamp;
    return age < CACHE_DURATION_MS;
  } catch {
    // If cache check fails, treat as invalid (non-critical)
    return false;
  }
}

/**
 * Get cached content if valid
 */
export function getCachedContent(blogId: string): string | null {
  try {
    if (!isCacheValid(blogId)) {
      return null;
    }
    
    const cachePath = getCacheFilePath(blogId);
    const cacheData = JSON.parse(fs.readFileSync(cachePath, 'utf-8')) as CacheEntry;
    return cacheData.content;
  } catch {
    // If cache read fails, return null (non-critical)
    return null;
  }
}

/**
 * Save content to cache
 */
export function saveToCache(blogId: string, content: string): void {
  try {
    // Try to ensure directory exists first
    if (!ensureCacheDir()) {
      // If directory creation failed, skip caching (non-critical)
      return;
    }
    
    const cachePath = getCacheFilePath(blogId);
    const cacheEntry: CacheEntry = {
      content,
      timestamp: Date.now(),
    };
    fs.writeFileSync(cachePath, JSON.stringify(cacheEntry, null, 2), 'utf-8');
  } catch (error) {
    // Don't throw - caching is not critical
    // Only log in development to avoid noise in production
    if (process.env.NODE_ENV === 'development') {
      console.warn(`Failed to save cache for ${blogId} (non-critical):`, error);
    }
  }
}

/**
 * Clear cache for a specific blog post
 */
export function clearCache(blogId: string): void {
  try {
    const cachePath = getCacheFilePath(blogId);
    if (fs.existsSync(cachePath)) {
      fs.unlinkSync(cachePath);
    }
  } catch (error) {
    // Non-critical - just log in development
    if (process.env.NODE_ENV === 'development') {
      console.warn(`Failed to clear cache for ${blogId} (non-critical):`, error);
    }
  }
}

/**
 * Clear all cached blog posts
 */
export function clearAllCache(): void {
  try {
    if (fs.existsSync(CACHE_DIR)) {
      const files = fs.readdirSync(CACHE_DIR);
      files.forEach((file) => {
        if (file.endsWith('.json')) {
          try {
            fs.unlinkSync(path.join(CACHE_DIR, file));
          } catch (error) {
            // Continue with other files even if one fails
            if (process.env.NODE_ENV === 'development') {
              console.warn(`Failed to delete cache file ${file} (non-critical):`, error);
            }
          }
        }
      });
    }
  } catch (error) {
    // Non-critical - just log in development
    if (process.env.NODE_ENV === 'development') {
      console.warn('Failed to clear all cache (non-critical):', error);
    }
  }
}

