import fs from 'fs';
import path from 'path';

const CACHE_DIR = path.join(process.cwd(), '.cache', 'blog');
const CACHE_DURATION_MS = 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds

interface CacheEntry {
  content: string;
  timestamp: number;
}

/**
 * Ensure cache directory exists
 */
function ensureCacheDir(): void {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

/**
 * Get cache file path for a blog post
 */
function getCacheFilePath(blogId: string): string {
  ensureCacheDir();
  return path.join(CACHE_DIR, `${blogId}.json`);
}

/**
 * Check if cached content is still valid (not expired)
 */
export function isCacheValid(blogId: string): boolean {
  const cachePath = getCacheFilePath(blogId);
  
  if (!fs.existsSync(cachePath)) {
    return false;
  }
  
  try {
    const cacheData = JSON.parse(fs.readFileSync(cachePath, 'utf-8')) as CacheEntry;
    const age = Date.now() - cacheData.timestamp;
    return age < CACHE_DURATION_MS;
  } catch {
    return false;
  }
}

/**
 * Get cached content if valid
 */
export function getCachedContent(blogId: string): string | null {
  if (!isCacheValid(blogId)) {
    return null;
  }
  
  try {
    const cachePath = getCacheFilePath(blogId);
    const cacheData = JSON.parse(fs.readFileSync(cachePath, 'utf-8')) as CacheEntry;
    return cacheData.content;
  } catch {
    return null;
  }
}

/**
 * Save content to cache
 */
export function saveToCache(blogId: string, content: string): void {
  try {
    ensureCacheDir();
    const cachePath = getCacheFilePath(blogId);
    const cacheEntry: CacheEntry = {
      content,
      timestamp: Date.now(),
    };
    fs.writeFileSync(cachePath, JSON.stringify(cacheEntry, null, 2), 'utf-8');
  } catch (error) {
    console.error(`Failed to save cache for ${blogId}:`, error);
    // Don't throw - caching is not critical
  }
}

/**
 * Clear cache for a specific blog post
 */
export function clearCache(blogId: string): void {
  const cachePath = getCacheFilePath(blogId);
  if (fs.existsSync(cachePath)) {
    try {
      fs.unlinkSync(cachePath);
    } catch (error) {
      console.error(`Failed to clear cache for ${blogId}:`, error);
    }
  }
}

/**
 * Clear all cached blog posts
 */
export function clearAllCache(): void {
  if (fs.existsSync(CACHE_DIR)) {
    try {
      const files = fs.readdirSync(CACHE_DIR);
      files.forEach((file) => {
        if (file.endsWith('.json')) {
          fs.unlinkSync(path.join(CACHE_DIR, file));
        }
      });
    } catch (error) {
      console.error('Failed to clear all cache:', error);
    }
  }
}

