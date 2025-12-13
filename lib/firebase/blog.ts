import { 
  getFirebaseDb, 
  getFirebaseStorage 
} from './config';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  deleteDoc,
  deleteField,
  getDocs, 
  query, 
  orderBy,
  limit,
  startAfter,
  where,
  Timestamp,
  QueryDocumentSnapshot,
  arrayRemove,
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject,
  listAll,
} from 'firebase/storage';

// Firestore collection names
const BLOG_COLLECTION = 'blogPosts';
const BLOG_VERSIONS_COLLECTION = 'blogVersions';

// Blog main entity interface (blogPosts collection)
export interface BlogPostMainData {
  blogId: string; // UUID (primary identifier, document ID)
  hashtagIds?: string[]; // Array of hashtag IDs (shared across all language versions)
  viVersionId?: string; // Reference to Vietnamese version in blogVersions
  enVersionId?: string; // Reference to English version in blogVersions
}

// Blog version interface (blogVersions collection)
export interface BlogVersionFirestoreData {
  versionId: string; // UUID (document ID)
  blogId: string; // Reference back to blogPosts
  language: string; // Language code: 'vi' (Vietnamese) or 'en' (English)
  title: string;
  description: string;
  thumbnail: string; // URL to thumbnail image
  slug: string; // URL-friendly slug for routing
  createdAt: Timestamp;
  modifiedAt: Timestamp;
  publishDate?: Timestamp; // Optional publish date
  category?: string; // Optional category (backward compatibility)
}

// Combined metadata interface (for API responses)
export interface BlogPostMetadata {
  blogId: string; // UUID (primary identifier)
  versionId: string; // UUID of the version (document ID in blogVersions)
  uuid: string; // Alias for versionId (for backward compatibility)
  title: string;
  description: string;
  thumbnail: string;
  createdAt: Date;
  modifiedAt: Date;
  publishDate?: Date; // Optional publish date
  slug: string; // URL-friendly slug for routing
  category?: string; // Optional category (backward compatibility)
  hashtagIds?: string[]; // Array of hashtag IDs (shared from blogPosts)
  language: string; // Language code: 'vi' (Vietnamese) or 'en' (English)
}

/**
 * Convert Firestore Timestamp to Date for blog version
 */
function convertVersionToMetadata(
  versionData: BlogVersionFirestoreData,
  hashtagIds: string[] = []
): BlogPostMetadata {
  return {
    blogId: versionData.blogId,
    versionId: versionData.versionId,
    uuid: versionData.versionId, // Alias for backward compatibility
    title: versionData.title,
    description: versionData.description,
    thumbnail: versionData.thumbnail,
    slug: versionData.slug,
    createdAt: versionData.createdAt.toDate(),
    modifiedAt: versionData.modifiedAt.toDate(),
    publishDate: versionData.publishDate?.toDate(),
    category: versionData.category,
    hashtagIds: hashtagIds,
    language: versionData.language,
  };
}

/**
 * Generate UUIDv4
 */
export function generateUUID(): string {
  // Generate UUIDv4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Create or update a blog post in Firestore
 * @param versionId - UUID to use as version document ID (if updating, pass existing versionId)
 * @param slug - URL-friendly slug
 * @param data - Blog post data
 * @param blogId - Optional blogId to link multilingual versions (if not provided, will be created)
 * @returns The versionId used for the blog version
 */
export async function saveBlogPostMetadata(
  versionId: string,
  slug: string,
  data: {
    title: string;
    description: string;
    thumbnail: string;
    category?: string;
    publishDate?: Date;
    hashtagIds?: string[];
    language?: string;
  },
  blogId?: string // Optional blogId for linking multilingual versions
): Promise<string> {
  const db = getFirebaseDb();
  const now = Timestamp.now();
  
  // Default language to 'vi' for backward compatibility
  const language = data.language || 'vi';
  
  // Determine blogId: use provided, or check if version exists, or create new
  let finalBlogId: string;
  const versionRef = doc(db, BLOG_VERSIONS_COLLECTION, versionId);
  const existingVersionDoc = await getDoc(versionRef);
  
  if (existingVersionDoc.exists()) {
    // Version exists - use its blogId
    const versionData = existingVersionDoc.data() as BlogVersionFirestoreData;
    finalBlogId = blogId || versionData.blogId;
  } else {
    // New version - use provided blogId or create new blog
    finalBlogId = blogId || generateUUID();
  }
  
  // Create or update blogPosts main document
  const blogRef = doc(db, BLOG_COLLECTION, finalBlogId);
  const existingBlogDoc = await getDoc(blogRef);
  
  if (existingBlogDoc.exists()) {
    // Update existing blog main document
    // IMPORTANT: Preserve existing version references and only update the current language's reference
    const existingBlogData = existingBlogDoc.data() as BlogPostMainData;
    const updateData: any = {
      blogId: finalBlogId,
    };
    
    // Preserve existing version references
    if (existingBlogData.viVersionId) {
      updateData.viVersionId = existingBlogData.viVersionId;
    }
    if (existingBlogData.enVersionId) {
      updateData.enVersionId = existingBlogData.enVersionId;
    }
    
    // Update the version reference for the current language
    if (language === 'vi') {
      updateData.viVersionId = versionId;
    } else if (language === 'en') {
      updateData.enVersionId = versionId;
    }
    
    // Update hashtagIds only if explicitly provided
    // Otherwise, preserve existing hashtagIds
    if (data.hashtagIds !== undefined) {
      updateData.hashtagIds = data.hashtagIds || [];
    } else if (existingBlogData.hashtagIds) {
      // Preserve existing hashtagIds if not provided
      updateData.hashtagIds = existingBlogData.hashtagIds;
    }
    
    await updateDoc(blogRef, updateData);
  } else {
    // Create new blog main document
    const newBlogData: any = {
      blogId: finalBlogId,
      hashtagIds: data.hashtagIds || [],
    };
    
    // Set version reference for the current language
    if (language === 'vi') {
      newBlogData.viVersionId = versionId;
    } else if (language === 'en') {
      newBlogData.enVersionId = versionId;
    }
    
    await setDoc(blogRef, newBlogData);
  }
  
  // Create or update blogVersions document
  const versionData: any = {
    versionId: versionId,
    blogId: finalBlogId,
    language: language,
    title: data.title,
    description: data.description,
    thumbnail: data.thumbnail,
    slug: slug,
    modifiedAt: now,
  };
  
  // Only include category if provided (Firestore doesn't allow undefined)
  if (data.category !== undefined && data.category !== null) {
    versionData.category = data.category;
  }
  
  // Only include publishDate if provided (Firestore doesn't allow undefined)
  if (data.publishDate) {
    versionData.publishDate = Timestamp.fromDate(data.publishDate);
  }
  
  if (existingVersionDoc.exists()) {
    // Update existing version (preserve createdAt)
    const existingData = existingVersionDoc.data() as BlogVersionFirestoreData;
    await updateDoc(versionRef, {
      ...versionData,
      createdAt: existingData.createdAt, // Preserve original creation date
    });
  } else {
    // Create new version
    await setDoc(versionRef, {
      ...versionData,
      createdAt: now,
    });
  }
  
  return versionId;
}

/**
 * Get a blog post metadata from Firestore by versionId
 */
export async function getBlogPostMetadataByUUID(versionId: string): Promise<BlogPostMetadata | null> {
  try {
    if (!versionId || typeof versionId !== 'string' || versionId.trim() === '') {
      return null;
    }
    
    const db = getFirebaseDb();
    const versionRef = doc(db, BLOG_VERSIONS_COLLECTION, versionId);
    const versionDoc = await getDoc(versionRef);
    
    if (!versionDoc.exists()) {
      return null;
    }
    
    const versionData = versionDoc.data() as BlogVersionFirestoreData;
    if (!versionData) {
      return null;
    }
    
    // Get hashtagIds from main blog document
    const blogRef = doc(db, BLOG_COLLECTION, versionData.blogId);
    const blogDoc = await getDoc(blogRef);
    const hashtagIds = blogDoc.exists() ? (blogDoc.data() as BlogPostMainData).hashtagIds || [] : [];
    
    return convertVersionToMetadata(versionData, hashtagIds);
  } catch (error) {
    console.error(`Error fetching blog metadata for versionId ${versionId}:`, error);
    return null;
  }
}

/**
 * Get a blog post metadata from Firestore by slug
 * @param slug - URL-friendly slug
 * @param language - Optional language filter ('vi' or 'en')
 */
export async function getBlogPostMetadataBySlug(slug: string, language?: string): Promise<BlogPostMetadata | null> {
  try {
    if (!slug || typeof slug !== 'string' || slug.trim() === '') {
      return null;
    }
    
    const db = getFirebaseDb();
    const versionsRef = collection(db, BLOG_VERSIONS_COLLECTION);
    
    let q;
    if (language) {
      // Filter by both slug and language
      q = query(versionsRef, where('slug', '==', slug), where('language', '==', language), limit(1));
    } else {
      // Just filter by slug (for backward compatibility, return first match)
      q = query(versionsRef, where('slug', '==', slug), limit(1));
    }
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const versionDoc = querySnapshot.docs[0];
    const versionData = versionDoc.data() as BlogVersionFirestoreData;
    if (!versionData) {
      return null;
    }
    
    // Get hashtagIds from main blog document
    const blogRef = doc(db, BLOG_COLLECTION, versionData.blogId);
    const blogDoc = await getDoc(blogRef);
    const hashtagIds = blogDoc.exists() ? (blogDoc.data() as BlogPostMainData).hashtagIds || [] : [];
    
    return convertVersionToMetadata(versionData, hashtagIds);
  } catch (error) {
    console.error(`Error fetching blog metadata for slug ${slug}:`, error);
    return null;
  }
}

/**
 * Get a blog post metadata from Firestore by UUID or slug (for backward compatibility)
 * Tries UUID first, then slug
 */
export async function getBlogPostMetadata(identifier: string): Promise<BlogPostMetadata | null> {
  // Check if it looks like a UUID (contains hyphens and is 36 chars)
  const isUUID = identifier.includes('-') && identifier.length === 36;
  
  if (isUUID) {
    return getBlogPostMetadataByUUID(identifier);
  } else {
    return getBlogPostMetadataBySlug(identifier);
  }
}

/**
 * Find existing blog posts by blogId (to link multilingual versions)
 * @param blogId - The blogId to search for
 * @param language - Optional language filter
 * @returns Array of blog posts with the same blogId
 */
export async function getBlogPostsByBlogId(blogId: string, language?: string): Promise<BlogPostMetadata[]> {
  try {
    if (!blogId || typeof blogId !== 'string' || blogId.trim() === '') {
      return [];
    }
    
    const db = getFirebaseDb();
    const versionsRef = collection(db, BLOG_VERSIONS_COLLECTION);
    
    // Query versions by blogId
    let q = query(versionsRef, where('blogId', '==', blogId));
    
    // If language is specified, add language filter
    if (language) {
      q = query(versionsRef, where('blogId', '==', blogId), where('language', '==', language));
    }
    
    const querySnapshot = await getDocs(q);
    
    // Get hashtagIds from main blog document (shared across all versions)
    const blogRef = doc(db, BLOG_COLLECTION, blogId);
    const blogDoc = await getDoc(blogRef);
    const hashtagIds = blogDoc.exists() ? (blogDoc.data() as BlogPostMainData).hashtagIds || [] : [];
    
    return querySnapshot.docs.map((doc) => {
      const versionData = doc.data() as BlogVersionFirestoreData;
      return convertVersionToMetadata(versionData, hashtagIds);
    });
  } catch (error) {
    console.error(`Error fetching blog posts by blogId ${blogId}:`, error);
    return [];
  }
}

/**
 * Get all blog posts from Firestore, ordered by creation date (newest first)
 * @param language - Optional language filter ('vi' or 'en')
 */
export async function getAllBlogPostsMetadata(language?: string): Promise<BlogPostMetadata[]> {
  const db = getFirebaseDb();
  const versionsRef = collection(db, BLOG_VERSIONS_COLLECTION);
  
  let q;
  if (language) {
    // Filter by language - fetch without orderBy to avoid composite index requirement
    // We'll sort client-side instead
    q = query(versionsRef, where('language', '==', language));
  } else {
    // Get all posts (no language filter)
    q = query(versionsRef, orderBy('createdAt', 'desc'));
  }
  
  const querySnapshot = await getDocs(q);
  
  // Get all unique blogIds to fetch hashtagIds
  const blogIds = new Set<string>();
  const versionDocs = querySnapshot.docs.map((doc) => {
    const versionData = doc.data() as BlogVersionFirestoreData;
    blogIds.add(versionData.blogId);
    return { doc, versionData };
  });
  
  // Fetch all blog main documents to get hashtagIds
  const blogDocsMap = new Map<string, string[]>();
  for (const blogId of blogIds) {
    const blogRef = doc(db, BLOG_COLLECTION, blogId);
    const blogDoc = await getDoc(blogRef);
    const hashtagIds = blogDoc.exists() ? (blogDoc.data() as BlogPostMainData).hashtagIds || [] : [];
    blogDocsMap.set(blogId, hashtagIds);
  }
  
  const posts = versionDocs.map(({ versionData }) => {
    const hashtagIds = blogDocsMap.get(versionData.blogId) || [];
    return convertVersionToMetadata(versionData, hashtagIds);
  });
  
  // Sort client-side by createdAt (newest first) when language filter is applied
  if (language) {
    return posts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  return posts;
}

/**
 * Get paginated blog posts from Firestore
 * @param pageLimit - Maximum number of posts to return per page (default: 9)
 * @param lastDoc - Last document snapshot for cursor-based pagination (optional)
 * @returns Object containing posts, hasMore flag, and lastDoc for next page
 */
export async function getPaginatedBlogPostsMetadata(
  pageLimit: number = 9,
  lastDoc?: QueryDocumentSnapshot,
  language?: string
): Promise<{ 
  posts: BlogPostMetadata[]; 
  hasMore: boolean;
  lastDoc?: QueryDocumentSnapshot;
}> {
  const db = getFirebaseDb();
  const versionsRef = collection(db, BLOG_VERSIONS_COLLECTION);
  
  // Build query - query blogVersions collection
  let q = query(
    versionsRef,
    orderBy('createdAt', 'desc'),
    limit(pageLimit + 1) // Fetch one extra to check if there's more
  );
  
  // If we have a lastDoc, start after it
  if (lastDoc) {
    q = query(
      versionsRef,
      orderBy('createdAt', 'desc'),
      startAfter(lastDoc),
      limit(pageLimit + 1)
    );
  }
  
  const querySnapshot = await getDocs(q);
  const docs = querySnapshot.docs;
  
  // Check if there are more pages
  const hasMore = docs.length > pageLimit;
  
  // Get the actual posts (remove the extra one if exists)
  const postsToReturn = hasMore ? docs.slice(0, pageLimit) : docs;
  
  // Convert version documents to BlogPostMetadata by joining with blogPosts
  const posts: BlogPostMetadata[] = [];
  for (const versionDoc of postsToReturn) {
    const versionData = versionDoc.data() as BlogVersionFirestoreData;
    
    // Get the corresponding blogPosts document for hashtagIds
    const blogRef = doc(db, BLOG_COLLECTION, versionData.blogId);
    const blogDoc = await getDoc(blogRef);
    const blogData = blogDoc.exists() ? (blogDoc.data() as BlogPostMainData) : null;
    
    // Convert to BlogPostMetadata
    const metadata = convertVersionToMetadata(versionData, blogData?.hashtagIds || []);
    posts.push(metadata);
  }
  
  // Get the last document for next page cursor
  const newLastDoc = postsToReturn.length > 0 
    ? postsToReturn[postsToReturn.length - 1] 
    : undefined;
  
  return { posts, hasMore, lastDoc: newLastDoc };
}

/**
 * Get total count of blog posts (for pagination UI)
 * @param language - Optional language filter ('vi' or 'en')
 */
export async function getBlogPostsCount(language?: string): Promise<number> {
  const db = getFirebaseDb();
  const versionsRef = collection(db, BLOG_VERSIONS_COLLECTION);
  
  let q;
  if (language) {
    q = query(versionsRef, where('language', '==', language));
  } else {
    q = query(versionsRef);
  }
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.length;
}

/**
 * Get all blog posts filtered by hashtag IDs
 * Returns blogs that have ANY of the specified hashtag IDs (OR logic)
 * @param hashtagIds - Array of hashtag IDs to filter by
 * @param language - Optional language filter ('vi' or 'en')
 * @returns Array of blog posts that match at least one of the hashtag IDs, sorted by createdAt (newest first)
 */
export async function getBlogPostsByHashtags(hashtagIds: string[], language?: string): Promise<BlogPostMetadata[]> {
  if (!hashtagIds || hashtagIds.length === 0) {
    return getAllBlogPostsMetadata(language);
  }

  const db = getFirebaseDb();
  const blogsRef = collection(db, BLOG_COLLECTION);
  
  // Query blogPosts collection for blogs with matching hashtagIds
  const blogsQuery = query(blogsRef, where('hashtagIds', 'array-contains-any', hashtagIds));
  const blogsSnapshot = await getDocs(blogsQuery);
  
  // Get all blogIds that match
  const matchingBlogIds = blogsSnapshot.docs.map(doc => doc.id);
  
  if (matchingBlogIds.length === 0) {
    return [];
  }
  
  // Query blogVersions for versions of these blogs
  const versionsRef = collection(db, BLOG_VERSIONS_COLLECTION);
  let versionsQuery;
  if (language) {
    // Filter by blogId and language - need to query each blogId separately or use in operator
    // Firestore 'in' operator supports up to 10 items, so we may need to batch
    const batches: string[][] = [];
    for (let i = 0; i < matchingBlogIds.length; i += 10) {
      batches.push(matchingBlogIds.slice(i, i + 10));
    }
    
    const allVersions: BlogVersionFirestoreData[] = [];
    for (const batch of batches) {
      const batchQuery = query(
        versionsRef,
        where('blogId', 'in', batch),
        where('language', '==', language)
      );
      const batchSnapshot = await getDocs(batchQuery);
      allVersions.push(...batchSnapshot.docs.map(doc => doc.data() as BlogVersionFirestoreData));
    }
    
    // Get hashtagIds from blog main documents
    const blogDocsMap = new Map<string, string[]>();
    for (const blogId of matchingBlogIds) {
      const blogRef = doc(db, BLOG_COLLECTION, blogId);
      const blogDoc = await getDoc(blogRef);
      const tagIds = blogDoc.exists() ? (blogDoc.data() as BlogPostMainData).hashtagIds || [] : [];
      blogDocsMap.set(blogId, tagIds);
    }
    
    const posts = allVersions.map(versionData => {
      const tagIds = blogDocsMap.get(versionData.blogId) || [];
      return convertVersionToMetadata(versionData, tagIds);
    });
    
    return posts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } else {
    // No language filter - get all versions
    const batches: string[][] = [];
    for (let i = 0; i < matchingBlogIds.length; i += 10) {
      batches.push(matchingBlogIds.slice(i, i + 10));
    }
    
    const allVersions: BlogVersionFirestoreData[] = [];
    for (const batch of batches) {
      const batchQuery = query(versionsRef, where('blogId', 'in', batch));
      const batchSnapshot = await getDocs(batchQuery);
      allVersions.push(...batchSnapshot.docs.map(doc => doc.data() as BlogVersionFirestoreData));
    }
    
    // Get hashtagIds from blog main documents
    const blogDocsMap = new Map<string, string[]>();
    for (const blogId of matchingBlogIds) {
      const blogRef = doc(db, BLOG_COLLECTION, blogId);
      const blogDoc = await getDoc(blogRef);
      const tagIds = blogDoc.exists() ? (blogDoc.data() as BlogPostMainData).hashtagIds || [] : [];
      blogDocsMap.set(blogId, tagIds);
    }
    
    const posts = allVersions.map(versionData => {
      const tagIds = blogDocsMap.get(versionData.blogId) || [];
      return convertVersionToMetadata(versionData, tagIds);
    });
    
    return posts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}

/**
 * Get count of blog posts filtered by hashtag IDs
 * @param hashtagIds - Array of hashtag IDs to filter by
 * @param language - Optional language filter ('vi' or 'en')
 * @returns Count of blog posts that match at least one of the hashtag IDs
 */
export async function getBlogPostsCountByHashtags(hashtagIds: string[], language?: string): Promise<number> {
  if (!hashtagIds || hashtagIds.length === 0) {
    return getBlogPostsCount(language);
  }

  const db = getFirebaseDb();
  const blogsRef = collection(db, BLOG_COLLECTION);
  
  // Query blogPosts collection for blogs with matching hashtagIds
  const blogsQuery = query(blogsRef, where('hashtagIds', 'array-contains-any', hashtagIds));
  const blogsSnapshot = await getDocs(blogsQuery);
  
  const matchingBlogIds = blogsSnapshot.docs.map(doc => doc.id);
  
  if (matchingBlogIds.length === 0) {
    return 0;
  }
  
  // Count versions of these blogs
  const versionsRef = collection(db, BLOG_VERSIONS_COLLECTION);
  if (language) {
    // Count versions with matching language
    const batches: string[][] = [];
    for (let i = 0; i < matchingBlogIds.length; i += 10) {
      batches.push(matchingBlogIds.slice(i, i + 10));
    }
    
    let totalCount = 0;
    for (const batch of batches) {
      const batchQuery = query(
        versionsRef,
        where('blogId', 'in', batch),
        where('language', '==', language)
      );
      const batchSnapshot = await getDocs(batchQuery);
      totalCount += batchSnapshot.docs.length;
    }
    
    return totalCount;
  } else {
    // Count all versions
    const batches: string[][] = [];
    for (let i = 0; i < matchingBlogIds.length; i += 10) {
      batches.push(matchingBlogIds.slice(i, i + 10));
    }
    
    let totalCount = 0;
    for (const batch of batches) {
      const batchQuery = query(versionsRef, where('blogId', 'in', batch));
      const batchSnapshot = await getDocs(batchQuery);
      totalCount += batchSnapshot.docs.length;
    }
    
    return totalCount;
  }
}

/**
 * Get all blog posts that have no hashtags assigned
 * @param language - Optional language filter ('vi' or 'en')
 * @returns Array of blog posts with empty or no hashtagIds, sorted by createdAt (newest first)
 */
export async function getBlogPostsWithNoHashtags(language?: string): Promise<BlogPostMetadata[]> {
  // Query for blogs where hashtagIds is empty array or doesn't exist
  // Firestore doesn't support querying for empty arrays directly, so we fetch all and filter
  const allPosts = await getAllBlogPostsMetadata(language);
  
  // Filter posts with no hashtags (empty array or undefined)
  const postsWithNoHashtags = allPosts.filter(
    (post) => !post.hashtagIds || post.hashtagIds.length === 0
  );
  
  return postsWithNoHashtags;
}

/**
 * Get count of blog posts that have no hashtags assigned
 * @param language - Optional language filter ('vi' or 'en')
 * @returns Count of blog posts with empty or no hashtagIds
 */
export async function getBlogPostsCountWithNoHashtags(language?: string): Promise<number> {
  const posts = await getBlogPostsWithNoHashtags(language);
  return posts.length;
}

/**
 * Upload an image file to Firebase Storage and return the download URL
 */
export async function uploadImageToStorage(
  file: File | Buffer,
  path: string,
  contentType?: string
): Promise<string> {
  const storage = getFirebaseStorage();
  const storageRef = ref(storage, path);
  
  // Determine content type
  const fileContentType = contentType || 
    (file instanceof File ? file.type : 'image/jpeg');
  
  // Convert File to Buffer if needed
  const fileBuffer = file instanceof File 
    ? Buffer.from(await file.arrayBuffer())
    : file;
  
  // Upload file
  await uploadBytes(storageRef, fileBuffer, {
    contentType: fileContentType,
  });
  
  // Get download URL
  const downloadURL = await getDownloadURL(storageRef);
  return downloadURL;
}

/**
 * Delete an image from Firebase Storage
 */
export async function deleteImageFromStorage(path: string): Promise<void> {
  const storage = getFirebaseStorage();
  const storageRef = ref(storage, path);
  await deleteObject(storageRef);
}

/**
 * Generate a storage path for a blog thumbnail
 * @param versionId - Version ID of the blog post
 * @param filename - Filename for the thumbnail
 */
export function getBlogThumbnailPath(versionId: string, filename: string): string {
  // Remove any path separators from filename for security
  const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `blog-thumbnails/${versionId}/${safeFilename}`;
}

/**
 * Generate a storage path for a blog image asset
 * @param versionId - Version ID of the blog post
 * @param filename - Filename for the image
 */
export function getBlogImagePath(versionId: string, filename: string): string {
  // Remove any path separators from filename for security
  const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `blog-images/${versionId}/${safeFilename}`;
}

/**
 * Generate a storage path for a blog Markdown file
 * @param versionId - Version ID of the blog post
 */
export function getBlogMarkdownPath(versionId: string): string {
  return `blog-markdown/${versionId}/${versionId}.md`;
}

/**
 * Delete all files in a Firebase Storage directory recursively
 */
async function deleteDirectoryContents(storage: ReturnType<typeof getFirebaseStorage>, directoryPath: string): Promise<void> {
  try {
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
      await deleteDirectoryContents(storage, prefixRef.fullPath);
    }
  } catch (error) {
    // If directory doesn't exist, that's OK
    if ((error as { code?: string })?.code !== 'storage/object-not-found') {
      console.warn(`Error deleting directory ${directoryPath}:`, error);
    }
  }
}

/**
 * Delete a blog version from Firestore and Firebase Storage
 * If this is the last version, also delete the main blog document and clean up hashtag references
 * @param versionId - Version ID of the blog post to delete
 */
export async function deleteBlogPost(versionId: string): Promise<void> {
  const db = getFirebaseDb();
  const storage = getFirebaseStorage();
  
  try {
    // Get version metadata first
    const versionRef = doc(db, BLOG_VERSIONS_COLLECTION, versionId);
    const versionDoc = await getDoc(versionRef);
    
    if (!versionDoc.exists()) {
      throw new Error(`Blog version ${versionId} not found`);
    }
    
    const versionData = versionDoc.data() as BlogVersionFirestoreData;
    const blogId = versionData.blogId;
    const language = versionData.language;
    
    // Delete markdown file from Storage
    try {
      const markdownPath = getBlogMarkdownPath(versionId);
      const markdownRef = ref(storage, markdownPath);
      await deleteObject(markdownRef);
    } catch (storageError) {
      // Log but don't fail if markdown doesn't exist
      console.warn(`Markdown file not found for ${versionId}:`, storageError);
    }
    
    // Delete thumbnail directory and all its contents
    try {
      const thumbnailDirectoryPath = `blog-thumbnails/${versionId}`;
      await deleteDirectoryContents(storage, thumbnailDirectoryPath);
    } catch (thumbnailError) {
      console.warn(`Error deleting thumbnails for ${versionId}:`, thumbnailError);
    }
    
    // Delete all blog images from Storage
    try {
      const imagesDirectoryPath = `blog-images/${versionId}`;
      await deleteDirectoryContents(storage, imagesDirectoryPath);
    } catch (imagesError) {
      console.warn(`Error deleting images for ${versionId}:`, imagesError);
    }
    
    // Delete version document from Firestore
    await deleteDoc(versionRef);
    
    // Check if there are other versions of this blog
    const allVersions = await getBlogPostsByBlogId(blogId);
    const remainingVersions = allVersions.filter(v => v.versionId !== versionId);
    
    // If no versions remain, delete the main blog document and clean up hashtag references
    if (remainingVersions.length === 0) {
      const blogRef = doc(db, BLOG_COLLECTION, blogId);
      const blogDoc = await getDoc(blogRef);
      
      // Get hashtagIds before deleting the blog document
      let hashtagIds: string[] = [];
      if (blogDoc.exists()) {
        const blogData = blogDoc.data() as BlogPostMainData;
        hashtagIds = blogData.hashtagIds || [];
      }
      
      // Delete the blog document
      await deleteDoc(blogRef);
      
      // Clean up hashtag references: remove blogId from each hashtag's linkedBlogIds array
      if (hashtagIds.length > 0) {
        try {
          const HASHTAGS_COLLECTION = 'hashtags';
          
          // Remove blogId from all linked hashtags
          const cleanupPromises = hashtagIds.map(async (hashtagId) => {
            try {
              const hashtagRef = doc(db, HASHTAGS_COLLECTION, hashtagId);
              const hashtagDoc = await getDoc(hashtagRef);
              
              if (hashtagDoc.exists()) {
                const hashtagData = hashtagDoc.data();
                const linkedBlogIds = hashtagData?.linkedBlogIds || [];
                
                // Only update if blogId is actually in the linkedBlogIds array
                if (linkedBlogIds.includes(blogId)) {
                  await updateDoc(hashtagRef, {
                    linkedBlogIds: arrayRemove(blogId),
                    updatedAt: Timestamp.now(),
                  });
                }
              }
            } catch (error) {
              // Log but don't fail the entire deletion if one hashtag cleanup fails
              console.warn(`Failed to remove blogId ${blogId} from hashtag ${hashtagId}:`, error);
            }
          });
          
          await Promise.all(cleanupPromises);
        } catch (error) {
          // Log but don't fail the entire deletion if hashtag cleanup fails
          console.warn(`Failed to clean up hashtag references for blog ${blogId}:`, error);
        }
      }
    } else {
      // Update main blog document to remove reference to deleted version
      const blogRef = doc(db, BLOG_COLLECTION, blogId);
      const updateData: any = {};
      
      if (language === 'vi') {
        updateData.viVersionId = deleteField();
      } else if (language === 'en') {
        updateData.enVersionId = deleteField();
      }
      
      await updateDoc(blogRef, updateData);
    }
  } catch (error) {
    console.error(`Error deleting blog version ${versionId}:`, error);
    throw error;
  }
}

/**
 * Upload Markdown content to Firebase Storage
 * @param versionId - Version ID of the blog post
 * @param markdownContent - Markdown content to upload
 */
export async function uploadMarkdownToStorage(
  versionId: string,
  markdownContent: string
): Promise<string> {
  const storage = getFirebaseStorage();
  const storagePath = getBlogMarkdownPath(versionId);
  const storageRef = ref(storage, storagePath);
  
  // Convert string to Buffer
  const buffer = Buffer.from(markdownContent, 'utf-8');
  
  // Upload file
  await uploadBytes(storageRef, buffer, {
    contentType: 'text/markdown',
  });
  
  // Get download URL
  const downloadURL = await getDownloadURL(storageRef);
  return downloadURL;
}

/**
 * Download Markdown content from Firebase Storage
 * @param versionId - Version ID of the blog post
 */
export async function downloadMarkdownFromStorage(versionId: string): Promise<string> {
  try {
    if (!versionId || typeof versionId !== 'string' || versionId.trim() === '') {
      throw new Error('Invalid blog version ID');
    }
    
    const storage = getFirebaseStorage();
    const storagePath = getBlogMarkdownPath(versionId);
    const storageRef = ref(storage, storagePath);
    
    // Get download URL
    const downloadURL = await getDownloadURL(storageRef);
    
    if (!downloadURL || typeof downloadURL !== 'string') {
      throw new Error('Failed to get download URL');
    }
    
    // Fetch the content
    const response = await fetch(downloadURL);
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Blog post not found in storage');
      }
      throw new Error(`Failed to download markdown: ${response.status} ${response.statusText}`);
    }
    
    const content = await response.text();
    if (!content || typeof content !== 'string') {
      throw new Error('Invalid content received');
    }
    
    return content;
  } catch (error) {
    // Re-throw with more context
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to download markdown from storage');
  }
}

/**
 * Upload multiple images to Firebase Storage and return URL mappings
 * @param versionId - Version ID of the blog post
 * @param images - Array of image data to upload
 */
export async function uploadBlogImagesToStorage(
  versionId: string,
  images: Array<{ originalPath: string; savedPath: string; relativePath: string; buffer: Buffer; contentType: string }>
): Promise<Map<string, string>> {
  const urlMap = new Map<string, string>();
  
  for (const image of images) {
    try {
      const filename = image.originalPath.split('/').pop() || image.relativePath.split('/').pop() || 'image';
      const storagePath = getBlogImagePath(versionId, filename);
      const downloadURL = await uploadImageToStorage(
        image.buffer,
        storagePath,
        image.contentType
      );
      
      // Map both original path and relative path to the Firebase Storage URL
      urlMap.set(image.originalPath, downloadURL);
      urlMap.set(image.relativePath, downloadURL);
      
      // Also map the filename for flexibility
      const justFilename = filename;
      if (!urlMap.has(justFilename)) {
        urlMap.set(justFilename, downloadURL);
      }
    } catch (error) {
      console.error(`Failed to upload image ${image.originalPath} to Firebase Storage:`, error);
      // Continue with other images even if one fails
    }
  }
  
  return urlMap;
}

