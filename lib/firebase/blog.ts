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
  getDocs, 
  query, 
  orderBy,
  limit,
  startAfter,
  where,
  Timestamp,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject,
  listAll,
} from 'firebase/storage';

// Firestore collection name
const BLOG_COLLECTION = 'blogPosts';

// Blog metadata interface for Firestore
export interface BlogPostFirestoreData {
  blogId: string; // UUID (primary identifier)
  uuid: string; // UUIDv4 (same as blogId, kept for backward compatibility)
  title: string;
  description: string;
  thumbnail: string; // URL to thumbnail image
  createdAt: Timestamp;
  modifiedAt: Timestamp;
  slug: string; // URL-friendly slug for routing
  category?: string; // Optional category for grouping blog posts
}

// Convert Firestore data to a more usable format
export interface BlogPostMetadata {
  blogId: string; // UUID (primary identifier)
  uuid: string; // UUIDv4 (same as blogId)
  title: string;
  description: string;
  thumbnail: string;
  createdAt: Date;
  modifiedAt: Date;
  slug: string; // URL-friendly slug for routing
  category?: string; // Optional category for grouping blog posts
}

/**
 * Convert Firestore Timestamp to Date
 */
function convertTimestampToDate(data: BlogPostFirestoreData): BlogPostMetadata {
  return {
    ...data,
    createdAt: data.createdAt.toDate(),
    modifiedAt: data.modifiedAt.toDate(),
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
 * @param uuid - UUID to use as document ID (if updating, pass existing UUID)
 * @param slug - URL-friendly slug
 * @param data - Blog post data
 * @returns The UUID used for the blog post
 */
export async function saveBlogPostMetadata(
  uuid: string,
  slug: string,
  data: {
    title: string;
    description: string;
    thumbnail: string;
    category?: string;
  }
): Promise<string> {
  const db = getFirebaseDb();
  const blogRef = doc(db, BLOG_COLLECTION, uuid);
  
  // Check if document exists
  const existingDoc = await getDoc(blogRef);
  const now = Timestamp.now();
  
  if (existingDoc.exists()) {
    // Update existing document
    const updateData: any = {
      title: data.title,
      description: data.description,
      thumbnail: data.thumbnail,
      slug: slug, // Update slug in case it changed
      modifiedAt: now,
    };
    // Include category if provided
    if (data.category !== undefined) {
      updateData.category = data.category || null;
    }
    await updateDoc(blogRef, updateData);
  } else {
    // Create new document with UUID as document ID
    await setDoc(blogRef, {
      blogId: uuid,
      uuid: uuid,
      slug: slug,
      title: data.title,
      description: data.description,
      thumbnail: data.thumbnail,
      category: data.category || null,
      createdAt: now,
      modifiedAt: now,
    });
  }
  
  return uuid;
}

/**
 * Get a blog post metadata from Firestore by UUID
 */
export async function getBlogPostMetadataByUUID(uuid: string): Promise<BlogPostMetadata | null> {
  try {
    if (!uuid || typeof uuid !== 'string' || uuid.trim() === '') {
      return null;
    }
    
    const db = getFirebaseDb();
    const blogRef = doc(db, BLOG_COLLECTION, uuid);
    const docSnap = await getDoc(blogRef);
    
    if (!docSnap.exists()) {
      return null;
    }
    
    const data = docSnap.data();
    if (!data) {
      return null;
    }
    
    return convertTimestampToDate(data as BlogPostFirestoreData);
  } catch (error) {
    console.error(`Error fetching blog metadata for UUID ${uuid}:`, error);
    return null;
  }
}

/**
 * Get a blog post metadata from Firestore by slug
 */
export async function getBlogPostMetadataBySlug(slug: string): Promise<BlogPostMetadata | null> {
  try {
    if (!slug || typeof slug !== 'string' || slug.trim() === '') {
      return null;
    }
    
    const db = getFirebaseDb();
    const blogsRef = collection(db, BLOG_COLLECTION);
    const q = query(blogsRef, where('slug', '==', slug), limit(1));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const docSnap = querySnapshot.docs[0];
    const data = docSnap.data();
    if (!data) {
      return null;
    }
    
    return convertTimestampToDate(data as BlogPostFirestoreData);
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
 * Get all blog posts from Firestore, ordered by creation date (newest first)
 */
export async function getAllBlogPostsMetadata(): Promise<BlogPostMetadata[]> {
  const db = getFirebaseDb();
  const blogsRef = collection(db, BLOG_COLLECTION);
  const q = query(blogsRef, orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map((doc) => 
    convertTimestampToDate(doc.data() as BlogPostFirestoreData)
  );
}

/**
 * Get paginated blog posts from Firestore
 * @param pageLimit - Maximum number of posts to return per page (default: 9)
 * @param lastDoc - Last document snapshot for cursor-based pagination (optional)
 * @returns Object containing posts, hasMore flag, and lastDoc for next page
 */
export async function getPaginatedBlogPostsMetadata(
  pageLimit: number = 9,
  lastDoc?: QueryDocumentSnapshot
): Promise<{ 
  posts: BlogPostMetadata[]; 
  hasMore: boolean;
  lastDoc?: QueryDocumentSnapshot;
}> {
  const db = getFirebaseDb();
  const blogsRef = collection(db, BLOG_COLLECTION);
  
  // Build query with limit
  let q = query(
    blogsRef,
    orderBy('createdAt', 'desc'),
    limit(pageLimit + 1) // Fetch one extra to check if there's more
  );
  
  // If we have a lastDoc, start after it
  if (lastDoc) {
    q = query(
      blogsRef,
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
  const posts = postsToReturn.map((doc) => 
    convertTimestampToDate(doc.data() as BlogPostFirestoreData)
  );
  
  // Get the last document for next page cursor
  const newLastDoc = postsToReturn.length > 0 
    ? postsToReturn[postsToReturn.length - 1] 
    : undefined;
  
  return { posts, hasMore, lastDoc: newLastDoc };
}

/**
 * Get total count of blog posts (for pagination UI)
 */
export async function getBlogPostsCount(): Promise<number> {
  const db = getFirebaseDb();
  const blogsRef = collection(db, BLOG_COLLECTION);
  const q = query(blogsRef);
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.length;
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
 * @param uuid - UUID of the blog post
 * @param filename - Filename for the thumbnail
 */
export function getBlogThumbnailPath(uuid: string, filename: string): string {
  // Remove any path separators from filename for security
  const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `blog-thumbnails/${uuid}/${safeFilename}`;
}

/**
 * Generate a storage path for a blog image asset
 * @param uuid - UUID of the blog post
 * @param filename - Filename for the image
 */
export function getBlogImagePath(uuid: string, filename: string): string {
  // Remove any path separators from filename for security
  const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `blog-images/${uuid}/${safeFilename}`;
}

/**
 * Generate a storage path for a blog Markdown file
 * @param uuid - UUID of the blog post
 */
export function getBlogMarkdownPath(uuid: string): string {
  return `blog-markdown/${uuid}/${uuid}.md`;
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
 * Delete a blog post from Firestore and Firebase Storage
 * @param uuid - UUID of the blog post to delete
 */
export async function deleteBlogPost(uuid: string): Promise<void> {
  const db = getFirebaseDb();
  const storage = getFirebaseStorage();
  
  try {
    // Get metadata first to access info before deleting from Firestore
    let metadata: BlogPostMetadata | null = null;
    try {
      metadata = await getBlogPostMetadataByUUID(uuid);
    } catch (error) {
      console.warn(`Could not fetch metadata for ${uuid}, proceeding with deletion:`, error);
    }
    
    // Delete markdown file from Storage
    try {
      const markdownPath = getBlogMarkdownPath(uuid);
      const markdownRef = ref(storage, markdownPath);
      await deleteObject(markdownRef);
    } catch (storageError) {
      // Log but don't fail if markdown doesn't exist
      console.warn(`Markdown file not found for ${uuid}:`, storageError);
    }
    
    // Delete thumbnail directory and all its contents
    try {
      const thumbnailDirectoryPath = `blog-thumbnails/${uuid}`;
      await deleteDirectoryContents(storage, thumbnailDirectoryPath);
    } catch (thumbnailError) {
      console.warn(`Error deleting thumbnails for ${uuid}:`, thumbnailError);
    }
    
    // Delete all blog images from Storage
    try {
      const imagesDirectoryPath = `blog-images/${uuid}`;
      await deleteDirectoryContents(storage, imagesDirectoryPath);
    } catch (imagesError) {
      console.warn(`Error deleting images for ${uuid}:`, imagesError);
    }
    
    // Delete from Firestore (do this last in case we need metadata above)
    const blogRef = doc(db, BLOG_COLLECTION, uuid);
    await deleteDoc(blogRef);
  } catch (error) {
    console.error(`Error deleting blog post ${uuid}:`, error);
    throw error;
  }
}

/**
 * Upload Markdown content to Firebase Storage
 * @param uuid - UUID of the blog post
 * @param markdownContent - Markdown content to upload
 */
export async function uploadMarkdownToStorage(
  uuid: string,
  markdownContent: string
): Promise<string> {
  const storage = getFirebaseStorage();
  const storagePath = getBlogMarkdownPath(uuid);
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
 * @param uuid - UUID of the blog post
 */
export async function downloadMarkdownFromStorage(uuid: string): Promise<string> {
  try {
    if (!uuid || typeof uuid !== 'string' || uuid.trim() === '') {
      throw new Error('Invalid blog UUID');
    }
    
    const storage = getFirebaseStorage();
    const storagePath = getBlogMarkdownPath(uuid);
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
 * @param uuid - UUID of the blog post
 * @param images - Array of image data to upload
 */
export async function uploadBlogImagesToStorage(
  uuid: string,
  images: Array<{ originalPath: string; savedPath: string; relativePath: string; buffer: Buffer; contentType: string }>
): Promise<Map<string, string>> {
  const urlMap = new Map<string, string>();
  
  for (const image of images) {
    try {
      const filename = image.originalPath.split('/').pop() || image.relativePath.split('/').pop() || 'image';
      const storagePath = getBlogImagePath(uuid, filename);
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

