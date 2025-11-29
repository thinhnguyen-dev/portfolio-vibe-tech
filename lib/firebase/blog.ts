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
  getDocs, 
  query, 
  orderBy,
  limit,
  startAfter,
  Timestamp,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject,
} from 'firebase/storage';

// Firestore collection name
const BLOG_COLLECTION = 'blogPosts';

// Blog metadata interface for Firestore
export interface BlogPostFirestoreData {
  blogId: string; // Unique identifier (slug)
  title: string;
  description: string;
  thumbnail: string; // URL to thumbnail image
  createdAt: Timestamp;
  modifiedAt: Timestamp;
  slug: string; // Same as blogId for consistency
}

// Convert Firestore data to a more usable format
export interface BlogPostMetadata {
  blogId: string;
  title: string;
  description: string;
  thumbnail: string;
  createdAt: Date;
  modifiedAt: Date;
  slug: string;
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
 * Create or update a blog post in Firestore
 */
export async function saveBlogPostMetadata(
  blogId: string,
  data: {
    title: string;
    description: string;
    thumbnail: string;
  }
): Promise<void> {
  const db = getFirebaseDb();
  const blogRef = doc(db, BLOG_COLLECTION, blogId);
  
  // Check if document exists
  const existingDoc = await getDoc(blogRef);
  const now = Timestamp.now();
  
  if (existingDoc.exists()) {
    // Update existing document
    await updateDoc(blogRef, {
      title: data.title,
      description: data.description,
      thumbnail: data.thumbnail,
      modifiedAt: now,
    });
  } else {
    // Create new document
    await setDoc(blogRef, {
      blogId,
      slug: blogId,
      title: data.title,
      description: data.description,
      thumbnail: data.thumbnail,
      createdAt: now,
      modifiedAt: now,
    });
  }
}

/**
 * Get a blog post metadata from Firestore
 */
export async function getBlogPostMetadata(blogId: string): Promise<BlogPostMetadata | null> {
  const db = getFirebaseDb();
  const blogRef = doc(db, BLOG_COLLECTION, blogId);
  const docSnap = await getDoc(blogRef);
  
  if (!docSnap.exists()) {
    return null;
  }
  
  return convertTimestampToDate(docSnap.data() as BlogPostFirestoreData);
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
 */
export function getBlogThumbnailPath(blogId: string, filename: string): string {
  // Remove any path separators from filename for security
  const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `blog-thumbnails/${blogId}/${safeFilename}`;
}

/**
 * Generate a storage path for a blog image asset
 */
export function getBlogImagePath(blogId: string, filename: string): string {
  // Remove any path separators from filename for security
  const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `blog-images/${blogId}/${safeFilename}`;
}

/**
 * Generate a storage path for a blog Markdown file
 */
export function getBlogMarkdownPath(blogId: string): string {
  return `blog-content/${blogId}/${blogId}.md`;
}

/**
 * Upload Markdown content to Firebase Storage
 */
export async function uploadMarkdownToStorage(
  blogId: string,
  markdownContent: string
): Promise<string> {
  const storage = getFirebaseStorage();
  const storagePath = getBlogMarkdownPath(blogId);
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
 */
export async function downloadMarkdownFromStorage(blogId: string): Promise<string> {
  const storage = getFirebaseStorage();
  const storagePath = getBlogMarkdownPath(blogId);
  const storageRef = ref(storage, storagePath);
  
  // Get download URL
  const downloadURL = await getDownloadURL(storageRef);
  
  // Fetch the content
  const response = await fetch(downloadURL);
  if (!response.ok) {
    throw new Error(`Failed to download markdown: ${response.statusText}`);
  }
  
  return await response.text();
}

/**
 * Upload multiple images to Firebase Storage and return URL mappings
 */
export async function uploadBlogImagesToStorage(
  blogId: string,
  images: Array<{ originalPath: string; savedPath: string; relativePath: string; buffer: Buffer; contentType: string }>
): Promise<Map<string, string>> {
  const urlMap = new Map<string, string>();
  
  for (const image of images) {
    try {
      const filename = image.originalPath.split('/').pop() || image.relativePath.split('/').pop() || 'image';
      const storagePath = getBlogImagePath(blogId, filename);
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

