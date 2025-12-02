import { 
  getFirebaseDb, 
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
  runTransaction,
  arrayUnion,
  arrayRemove,
  increment,
} from 'firebase/firestore';
import { generateUUID } from './blog';

// Firestore collection name
const HASHTAGS_COLLECTION = 'hashtags';

// Hashtag interface for Firestore
export interface HashtagFirestoreData {
  hashtagId: string; // Unique ID (can be auto-generated or custom)
  name: string; // Display name (e.g., "Web Development")
  createdAt: Timestamp;
  updatedAt: Timestamp;
  // Optional: Store linked blog post IDs for efficient querying
  linkedBlogIds?: string[]; // Array of blog post UUIDs
}

// Convert Firestore data to a more usable format
export interface Hashtag {
  hashtagId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  linkedBlogIds?: string[];
}

/**
 * Convert Firestore Timestamp to Date
 */
function convertTimestampToDate(data: HashtagFirestoreData): Hashtag {
  return {
    ...data,
    createdAt: data.createdAt.toDate(),
    updatedAt: data.updatedAt.toDate(),
    linkedBlogIds: data.linkedBlogIds || [],
  };
}

/**
 * Create a new hashtag in Firestore
 * @param name - Display name of the hashtag
 * @returns The hashtag ID (UUIDv4) used
 */
export async function createHashtag(name: string): Promise<string> {
  const db = getFirebaseDb();
  
  // Generate UUIDv4 for the hashtag ID
  const id = generateUUID();
  
  // Check if hashtag with this name already exists (case-insensitive)
  const existingByName = await getHashtagByName(name);
  if (existingByName) {
    throw new Error(`Hashtag with name "${name}" already exists`);
  }
  
  const hashtagRef = doc(db, HASHTAGS_COLLECTION, id);
  const now = Timestamp.now();
  
  await setDoc(hashtagRef, {
    hashtagId: id,
    name: name.trim(),
    createdAt: now,
    updatedAt: now,
    linkedBlogIds: [],
  });
  
  return id;
}

/**
 * Get a hashtag by ID
 */
export async function getHashtagById(hashtagId: string): Promise<Hashtag | null> {
  try {
    if (!hashtagId || typeof hashtagId !== 'string' || hashtagId.trim() === '') {
      return null;
    }
    
    const db = getFirebaseDb();
    const hashtagRef = doc(db, HASHTAGS_COLLECTION, hashtagId);
    const docSnap = await getDoc(hashtagRef);
    
    if (!docSnap.exists()) {
      return null;
    }
    
    const data = docSnap.data();
    if (!data) {
      return null;
    }
    
    return convertTimestampToDate(data as HashtagFirestoreData);
  } catch (error) {
    console.error(`Error fetching hashtag ${hashtagId}:`, error);
    return null;
  }
}

/**
 * Get a hashtag by name (case-insensitive search)
 */
export async function getHashtagByName(name: string): Promise<Hashtag | null> {
  try {
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return null;
    }
    
    const db = getFirebaseDb();
    const hashtagsRef = collection(db, HASHTAGS_COLLECTION);
    
    // Firestore doesn't support case-insensitive queries directly
    // We'll need to fetch and filter, or store a lowercase version
    // For now, let's do a simple exact match (case-sensitive)
    // In production, you might want to store a lowercaseName field
    const q = query(hashtagsRef, where('name', '==', name.trim()), limit(1));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const docSnap = querySnapshot.docs[0];
    const data = docSnap.data();
    if (!data) {
      return null;
    }
    
    return convertTimestampToDate(data as HashtagFirestoreData);
  } catch (error) {
    console.error(`Error fetching hashtag by name ${name}:`, error);
    return null;
  }
}

/**
 * Update a hashtag
 * @param hashtagId - ID of the hashtag to update
 * @param updates - Fields to update (only name can be updated, ID is immutable)
 */
export async function updateHashtag(
  hashtagId: string,
  updates: {
    name?: string;
  }
): Promise<void> {
  const db = getFirebaseDb();
  const hashtagRef = doc(db, HASHTAGS_COLLECTION, hashtagId);
  
  // Check if hashtag exists
  const existing = await getDoc(hashtagRef);
  if (!existing.exists()) {
    throw new Error(`Hashtag with ID "${hashtagId}" not found`);
  }
  
  const updateData: { name?: string; updatedAt: Timestamp } = {
    updatedAt: Timestamp.now(),
  };
  
  // If name is being updated, check for duplicates
  if (updates.name !== undefined) {
    const trimmedName = updates.name.trim();
    const existingByName = await getHashtagByName(trimmedName);
    if (existingByName && existingByName.hashtagId !== hashtagId) {
      throw new Error(`Hashtag with name "${trimmedName}" already exists`);
    }
    updateData.name = trimmedName;
  }
  
  // Regular update (ID is immutable, cannot be changed)
  await updateDoc(hashtagRef, updateData);
}

/**
 * Delete a hashtag
 * @param hashtagId - ID of the hashtag to delete
 */
export async function deleteHashtag(hashtagId: string): Promise<void> {
  const db = getFirebaseDb();
  const hashtagRef = doc(db, HASHTAGS_COLLECTION, hashtagId);
  
  // Check if hashtag exists
  const existing = await getDoc(hashtagRef);
  if (!existing.exists()) {
    throw new Error(`Hashtag with ID "${hashtagId}" not found`);
  }
  
  await deleteDoc(hashtagRef);
}

/**
 * Get all hashtags from Firestore, ordered by name
 */
export async function getAllHashtags(): Promise<Hashtag[]> {
  const db = getFirebaseDb();
  const hashtagsRef = collection(db, HASHTAGS_COLLECTION);
  const q = query(hashtagsRef, orderBy('name', 'asc'));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map((doc) => 
    convertTimestampToDate(doc.data() as HashtagFirestoreData)
  );
}

/**
 * Get paginated hashtags from Firestore
 * @param pageLimit - Maximum number of hashtags to return per page (default: 20)
 * @param lastDoc - Last document snapshot for cursor-based pagination (optional)
 * @returns Object containing hashtags, hasMore flag, and lastDoc for next page
 */
export async function getPaginatedHashtags(
  pageLimit: number = 20,
  lastDoc?: QueryDocumentSnapshot
): Promise<{ 
  hashtags: Hashtag[]; 
  hasMore: boolean;
  lastDoc?: QueryDocumentSnapshot;
}> {
  const db = getFirebaseDb();
  const hashtagsRef = collection(db, HASHTAGS_COLLECTION);
  
  // Build query with limit
  let q = query(
    hashtagsRef,
    orderBy('name', 'asc'),
    limit(pageLimit + 1) // Fetch one extra to check if there's more
  );
  
  // If we have a lastDoc, start after it
  if (lastDoc) {
    q = query(
      hashtagsRef,
      orderBy('name', 'asc'),
      startAfter(lastDoc),
      limit(pageLimit + 1)
    );
  }
  
  const querySnapshot = await getDocs(q);
  const docs = querySnapshot.docs;
  
  // Check if there are more pages
  const hasMore = docs.length > pageLimit;
  
  // Get the actual hashtags (remove the extra one if exists)
  const hashtagsToReturn = hasMore ? docs.slice(0, pageLimit) : docs;
  const hashtags = hashtagsToReturn.map((doc) => 
    convertTimestampToDate(doc.data() as HashtagFirestoreData)
  );
  
  // Get the last document for next page cursor
  const newLastDoc = hashtagsToReturn.length > 0 
    ? hashtagsToReturn[hashtagsToReturn.length - 1] 
    : undefined;
  
  return { hashtags, hasMore, lastDoc: newLastDoc };
}

/**
 * Get total count of hashtags (for pagination UI)
 */
export async function getHashtagsCount(): Promise<number> {
  const db = getFirebaseDb();
  const hashtagsRef = collection(db, HASHTAGS_COLLECTION);
  const q = query(hashtagsRef);
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.length;
}

/**
 * Search hashtags by name (case-insensitive prefix search)
 * @param searchTerm - Search term to match against hashtag names
 * @param limitCount - Maximum number of results (default: 50)
 */
export async function searchHashtags(
  searchTerm: string,
  limitCount: number = 50
): Promise<Hashtag[]> {
  if (!searchTerm || searchTerm.trim() === '') {
    return getAllHashtags();
  }
  
  const db = getFirebaseDb();
  const hashtagsRef = collection(db, HASHTAGS_COLLECTION);
  
  // Firestore doesn't support case-insensitive or prefix queries directly
  // We'll fetch all and filter client-side for now
  // In production, consider using Algolia or storing lowercase versions
  const q = query(hashtagsRef, orderBy('name', 'asc'), limit(limitCount * 2));
  const querySnapshot = await getDocs(q);
  
  const searchLower = searchTerm.toLowerCase().trim();
  
  return querySnapshot.docs
    .map((doc) => convertTimestampToDate(doc.data() as HashtagFirestoreData))
    .filter((hashtag) => 
      hashtag.name.toLowerCase().includes(searchLower)
    )
    .slice(0, limitCount);
}

/**
 * Get blogs by hashtag ID
 * @param hashtagId - ID of the hashtag
 * @returns Array of blog IDs
 */
export async function getBlogIdsByHashtag(hashtagId: string): Promise<string[]> {
  try {
    const hashtag = await getHashtagById(hashtagId);
    return hashtag?.linkedBlogIds || [];
  } catch (error) {
    console.error(`Error fetching blogs for hashtag ${hashtagId}:`, error);
    return [];
  }
}

/**
 * Update blog-hashtag relationships
 * This function updates both the blog's hashtagIds and the hashtags' linkedBlogIds
 * Uses a transaction to ensure consistency
 * @param blogId - ID of the blog post
 * @param hashtagIds - Array of hashtag IDs to assign to the blog
 */
export async function updateBlogHashtags(
  blogId: string,
  hashtagIds: string[]
): Promise<void> {
  const db = getFirebaseDb();
  const BLOG_COLLECTION = 'blogPosts';
  
  // Get current blog document to find old hashtag IDs
  const blogRef = doc(db, BLOG_COLLECTION, blogId);
  const blogDoc = await getDoc(blogRef);
  
  if (!blogDoc.exists()) {
    throw new Error(`Blog with ID "${blogId}" not found`);
  }
  
  const oldHashtagIds = blogDoc.data()?.hashtagIds || [];
  const newHashtagIds = hashtagIds || [];
  
  // Find added and removed hashtag IDs
  const addedHashtagIds = newHashtagIds.filter(id => !oldHashtagIds.includes(id));
  const removedHashtagIds = oldHashtagIds.filter(id => !newHashtagIds.includes(id));
  
  // Use transaction to update both blog and hashtag documents atomically
  await runTransaction(db, async (transaction) => {
    // Update blog document
    transaction.update(blogRef, {
      hashtagIds: newHashtagIds,
      modifiedAt: Timestamp.now(),
    });
    
    // Update hashtag documents - add blog to new hashtags
    for (const hashtagId of addedHashtagIds) {
      const hashtagRef = doc(db, HASHTAGS_COLLECTION, hashtagId);
      const hashtagDoc = await transaction.get(hashtagRef);
      
      if (hashtagDoc.exists()) {
        const currentLinkedBlogIds = hashtagDoc.data()?.linkedBlogIds || [];
        if (!currentLinkedBlogIds.includes(blogId)) {
          transaction.update(hashtagRef, {
            linkedBlogIds: arrayUnion(blogId),
            blogCount: increment(1),
            updatedAt: Timestamp.now(),
          });
        }
      }
    }
    
    // Update hashtag documents - remove blog from old hashtags
    for (const hashtagId of removedHashtagIds) {
      const hashtagRef = doc(db, HASHTAGS_COLLECTION, hashtagId);
      const hashtagDoc = await transaction.get(hashtagRef);
      
      if (hashtagDoc.exists()) {
        const currentLinkedBlogIds = hashtagDoc.data()?.linkedBlogIds || [];
        if (currentLinkedBlogIds.includes(blogId)) {
          transaction.update(hashtagRef, {
            linkedBlogIds: arrayRemove(blogId),
            blogCount: increment(-1),
            updatedAt: Timestamp.now(),
          });
        }
      }
    }
  });
}

/**
 * Get hashtag details for an array of hashtag IDs
 * @param hashtagIds - Array of hashtag IDs
 * @returns Array of Hashtag objects
 */
export async function getHashtagsByIds(hashtagIds: string[]): Promise<Hashtag[]> {
  if (!hashtagIds || hashtagIds.length === 0) {
    return [];
  }
  
  try {
    const hashtagPromises = hashtagIds.map(id => getHashtagById(id));
    const hashtags = await Promise.all(hashtagPromises);
    return hashtags.filter((hashtag): hashtag is Hashtag => hashtag !== null);
  } catch (error) {
    console.error('Error fetching hashtags by IDs:', error);
    return [];
  }
}
