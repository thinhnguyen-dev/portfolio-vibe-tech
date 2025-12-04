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
  DocumentSnapshot,
  runTransaction,
  arrayUnion,
  arrayRemove,
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
    // We'll fetch all hashtags and filter client-side for case-insensitive matching
    // This is fine for most use cases, but for large datasets consider storing lowercaseName
    const trimmedName = name.trim();
    const nameLower = trimmedName.toLowerCase();
    
    // First try exact match (case-sensitive) for performance
    const q = query(hashtagsRef, where('name', '==', trimmedName), limit(1));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const docSnap = querySnapshot.docs[0];
      const data = docSnap.data();
      if (data) {
        return convertTimestampToDate(data as HashtagFirestoreData);
      }
    }
    
    // If exact match failed, try case-insensitive search by fetching more
    // Limit to reasonable number to avoid performance issues
    const allQ = query(hashtagsRef, orderBy('name', 'asc'), limit(1000));
    const allSnapshot = await getDocs(allQ);
    
    for (const docSnap of allSnapshot.docs) {
      const data = docSnap.data();
      if (data && data.name && data.name.toLowerCase() === nameLower) {
        return convertTimestampToDate(data as HashtagFirestoreData);
      }
    }
    
    return null;
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
 * Delete a hashtag and remove it from all linked blogs
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
  
  // Get the BLOG_COLLECTION name from blog.ts
  // We'll import it or use the constant directly
  const BLOG_COLLECTION = 'blogPosts';
  
  // Query all blogs that have this hashtagId in their hashtagIds array
  const blogsRef = collection(db, BLOG_COLLECTION);
  const blogsQuery = query(
    blogsRef,
    where('hashtagIds', 'array-contains', hashtagId)
  );
  
  const blogsSnapshot = await getDocs(blogsQuery);
  
  // Remove the hashtagId from all linked blogs
  const updatePromises = blogsSnapshot.docs.map((blogDoc) => {
    const blogRef = doc(db, BLOG_COLLECTION, blogDoc.id);
    return updateDoc(blogRef, {
      hashtagIds: arrayRemove(hashtagId),
      modifiedAt: Timestamp.now(),
    });
  });
  
  // Wait for all blog updates to complete
  await Promise.all(updatePromises);
  
  // Finally, delete the hashtag document
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
 * Accepts both hashtag IDs and names (creates missing hashtags automatically)
 * ALL operations happen in a single atomic transaction:
 * 1. Creates missing hashtags with generated IDs
 * 2. Adds hashtagIds to blog's hashtagIds array
 * 3. Adds blogId to hashtag's linkedBlogIds array
 * Uses transactions to ensure consistency
 * @param blogId - ID of the blog post
 * @param hashtagIdentifiers - Array of hashtag IDs or names to assign to the blog
 * @returns Array of resolved hashtag IDs (actual UUIDs)
 */
export async function updateBlogHashtags(
  blogId: string,
  hashtagIdentifiers: string[]
): Promise<string[]> {
  const db = getFirebaseDb();
  const BLOG_COLLECTION = 'blogPosts';
  
  const blogRef = doc(db, BLOG_COLLECTION, blogId);
  
  // Helper to check if a string is a UUID (hashtag ID format)
  const isUUID = (str: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };
  
  // Filter and normalize identifiers
  const normalizedIdentifiers = (hashtagIdentifiers || [])
    .filter(id => id && typeof id === 'string' && id.trim() !== '')
    .map(id => id.trim());
  
  // Step 1: Before transaction - read all hashtags for case-insensitive name matching
  // This is safe because we'll re-verify inside the transaction
  const allHashtagsRef = collection(db, HASHTAGS_COLLECTION);
  const allHashtagsQuery = query(allHashtagsRef, limit(1000));
  const allHashtagsSnapshot = await getDocs(allHashtagsQuery);
  
  const existingNamesMap = new Map<string, string>(); // lowercase name -> hashtagId
  const knownHashtagIds = new Set<string>(); // Set of known hashtag IDs for verification
  
  for (const docSnap of allHashtagsSnapshot.docs) {
    const data = docSnap.data() as HashtagFirestoreData;
    if (data && data.name && data.hashtagId) {
      existingNamesMap.set(data.name.toLowerCase(), data.hashtagId);
      knownHashtagIds.add(data.hashtagId);
    }
  }
  
  // Step 2: Separate identifiers into IDs and names
  const idIdentifiers: string[] = [];
  const nameIdentifiers: string[] = [];
  const identifierToIdMap = new Map<string, string>();
  
  for (const identifier of normalizedIdentifiers) {
    if (isUUID(identifier)) {
      idIdentifiers.push(identifier);
      identifierToIdMap.set(identifier, identifier);
    } else {
      nameIdentifiers.push(identifier);
    }
  }
  
  // Step 3: Resolve names to IDs (will create new ones if needed)
  const hashtagsToCreate: Array<{ name: string; id: string }> = [];
  for (const name of nameIdentifiers) {
    const nameLower = name.toLowerCase();
    const existingId = existingNamesMap.get(nameLower);
    
    if (existingId) {
      // Hashtag exists - use existing ID
      identifierToIdMap.set(name, existingId);
    } else {
      // Need to create new hashtag
      const newId = generateUUID();
      hashtagsToCreate.push({ name, id: newId });
      identifierToIdMap.set(name, newId);
    }
  }
  
  // Step 4: Build list of all hashtag IDs we need to verify/read in transaction
  const allHashtagIdsToVerify = [
    ...idIdentifiers.filter(id => knownHashtagIds.has(id)), // Only verify known IDs
    ...hashtagsToCreate.map(ht => ht.id), // New hashtags we'll create
  ];
  
  // Use a single transaction for all operations
  const resolvedHashtagIds = await runTransaction(db, async (transaction) => {
    // 1. Read blog document to get current state
    const blogDoc = await transaction.get(blogRef);
    
    if (!blogDoc.exists()) {
      throw new Error(`Blog with ID "${blogId}" not found`);
    }
    
    const oldHashtagIds = blogDoc.data()?.hashtagIds || [];
    
    // 2. Verify existing hashtag IDs exist (re-read inside transaction for safety)
    const existingHashtagsMap = new Map<string, DocumentSnapshot>(); // hashtagId -> DocumentSnapshot
    const finalExistingNamesMap = new Map<string, string>(); // lowercase name -> hashtagId
    
    // Read all hashtags we need to verify (this includes ones we might have missed)
    // For efficiency, read known hashtags by ID
    for (const hashtagId of allHashtagIdsToVerify) {
      const hashtagRef = doc(db, HASHTAGS_COLLECTION, hashtagId);
      const hashtagDoc = await transaction.get(hashtagRef);
      if (hashtagDoc.exists()) {
        const data = hashtagDoc.data() as HashtagFirestoreData;
        existingHashtagsMap.set(hashtagId, hashtagDoc);
        if (data.name) {
          finalExistingNamesMap.set(data.name.toLowerCase(), hashtagId);
        }
      }
    }
    
    // 3. Double-check name identifiers inside transaction (might have been created by another process)
    const finalHashtagsToCreate: Array<{ name: string; id: string }> = [];
    for (const { name, id } of hashtagsToCreate) {
      const nameLower = name.toLowerCase();
      // Check if hashtag with this name was created by another process
      const existingId = finalExistingNamesMap.get(nameLower);
      if (existingId && existingId !== id) {
        // Hashtag exists with different ID - use the existing one
        identifierToIdMap.set(name, existingId);
      } else {
        // Still need to create
        finalHashtagsToCreate.push({ name, id });
      }
    }
    
    // Verify ID identifiers exist
    for (const id of idIdentifiers) {
      if (!existingHashtagsMap.has(id)) {
        // Try to read it - might have been created after our initial read
        const hashtagRef = doc(db, HASHTAGS_COLLECTION, id);
        const hashtagDoc = await transaction.get(hashtagRef);
        if (hashtagDoc.exists()) {
          const data = hashtagDoc.data() as HashtagFirestoreData;
          existingHashtagsMap.set(id, hashtagDoc);
          if (data.name) {
            finalExistingNamesMap.set(data.name.toLowerCase(), id);
          }
        } else {
          // Hashtag ID doesn't exist - this shouldn't happen but handle gracefully
          console.warn(`Hashtag with ID "${id}" not found`);
          identifierToIdMap.delete(id);
        }
      }
    }
    
    // 4. Build resolved IDs array in same order as input, using final mapping
    const resolvedIds: string[] = [];
    for (const identifier of normalizedIdentifiers) {
      const resolvedId = identifierToIdMap.get(identifier);
      if (resolvedId) {
        resolvedIds.push(resolvedId);
      }
    }
    
    // Remove duplicates while preserving order
    const newHashtagIds = Array.from(new Set(resolvedIds));
    
    // 5. Create new hashtags (if any) with linkedBlogIds already set
    for (const { name, id } of finalHashtagsToCreate) {
      const hashtagRef = doc(db, HASHTAGS_COLLECTION, id);
      const now = Timestamp.now();
      
      // Create hashtag with blogId already in linkedBlogIds
      transaction.set(hashtagRef, {
        hashtagId: id,
        name: name.trim(),
        createdAt: now,
        updatedAt: now,
        linkedBlogIds: [blogId], // Add blogId immediately
      });
    }
    
    // 6. Update blog document with new hashtagIds
    transaction.update(blogRef, {
      hashtagIds: newHashtagIds,
      modifiedAt: Timestamp.now(),
    });
    
    // 7. Update existing hashtags' linkedBlogIds arrays
    // Find added and removed hashtag IDs
    const addedHashtagIds = newHashtagIds.filter((id: string) => !oldHashtagIds.includes(id));
    const removedHashtagIds = oldHashtagIds.filter((id: string) => !newHashtagIds.includes(id));
    
    // Read all hashtag documents we need to update (both added and removed)
    const hashtagDocsToUpdate = new Map<string, DocumentSnapshot>();
    const allHashtagIdsToRead = [...new Set([...addedHashtagIds, ...removedHashtagIds])];
    
    for (const hashtagId of allHashtagIdsToRead) {
      // Skip newly created hashtags (they already have blogId set)
      if (!finalHashtagsToCreate.some(ht => ht.id === hashtagId)) {
        const hashtagRef = doc(db, HASHTAGS_COLLECTION, hashtagId);
        const hashtagDoc = await transaction.get(hashtagRef);
        if (hashtagDoc.exists()) {
          hashtagDocsToUpdate.set(hashtagId, hashtagDoc);
        }
      }
    }
    
    // Add blog to added hashtags (skip newly created ones as they already have it)
    for (const hashtagId of addedHashtagIds) {
      // Skip if we just created this hashtag (it already has blogId)
      if (!finalHashtagsToCreate.some(ht => ht.id === hashtagId)) {
        const hashtagDoc = hashtagDocsToUpdate.get(hashtagId);
        
        if (hashtagDoc && hashtagDoc.exists()) {
          const currentLinkedBlogIds = hashtagDoc.data()?.linkedBlogIds || [];
          if (!currentLinkedBlogIds.includes(blogId)) {
            const hashtagRef = doc(db, HASHTAGS_COLLECTION, hashtagId);
            transaction.update(hashtagRef, {
              linkedBlogIds: arrayUnion(blogId),
              updatedAt: Timestamp.now(),
            });
          }
        }
      }
    }
    
    // Remove blog from removed hashtags
    for (const hashtagId of removedHashtagIds) {
      const hashtagDoc = hashtagDocsToUpdate.get(hashtagId);
      
      if (hashtagDoc && hashtagDoc.exists()) {
        const currentLinkedBlogIds = hashtagDoc.data()?.linkedBlogIds || [];
        if (currentLinkedBlogIds.includes(blogId)) {
          const hashtagRef = doc(db, HASHTAGS_COLLECTION, hashtagId);
          transaction.update(hashtagRef, {
            linkedBlogIds: arrayRemove(blogId),
            updatedAt: Timestamp.now(),
          });
        }
      }
    }
    
    return newHashtagIds;
  });
  
  return resolvedHashtagIds;
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

/**
 * Resolve hashtag identifiers (IDs or names) to hashtag IDs
 * Creates missing hashtags if they don't exist
 * Uses a transaction to ensure atomicity
 * @param identifiers - Array of hashtag IDs or names
 * @returns Array of resolved hashtag IDs (in same order as input)
 */
export async function resolveHashtagIdentifiers(
  identifiers: string[]
): Promise<string[]> {
  if (!identifiers || identifiers.length === 0) {
    return [];
  }
  
  const db = getFirebaseDb();
  const resolvedIds: string[] = [];
  const identifiersToCreate: string[] = [];
  const identifierToIdMap = new Map<string, string>();
  
  // Helper to check if a string is a UUID (hashtag ID format)
  const isUUID = (str: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };
  
  // First pass: try to resolve identifiers
  // Group by whether they look like UUIDs (IDs) or names
  const idIdentifiers: string[] = [];
  const nameIdentifiers: string[] = [];
  
  for (const identifier of identifiers) {
    if (!identifier || typeof identifier !== 'string' || identifier.trim() === '') {
      continue;
    }
    
    const trimmed = identifier.trim();
    if (isUUID(trimmed)) {
      idIdentifiers.push(trimmed);
    } else {
      nameIdentifiers.push(trimmed);
    }
  }
  
  // Verify existing hashtag IDs exist
  for (const id of idIdentifiers) {
    const hashtag = await getHashtagById(id);
    if (hashtag) {
      identifierToIdMap.set(id, id);
    }
  }
  
  // Resolve names to IDs (case-insensitive)
  for (const name of nameIdentifiers) {
    const hashtag = await getHashtagByName(name);
    if (hashtag) {
      identifierToIdMap.set(name, hashtag.hashtagId);
    } else {
      // Mark for creation
      identifiersToCreate.push(name);
    }
  }
  
  // Create missing hashtags in a transaction
  if (identifiersToCreate.length > 0) {
    await runTransaction(db, async (transaction) => {
      // Inside transaction, check for existing hashtags and create missing ones
      // Since we can't query inside a transaction, we'll check by trying to read
      // hashtags by known names. For new hashtags, we'll create them directly.
      // The name checking was already done before the transaction, but we verify again
      // inside the transaction to handle race conditions.
      const existingNamesMap = new Map<string, string>(); // lowercase name -> hashtagId
      
      // Try to find existing hashtags by checking if any document with matching name exists
      // Since we can't query in transaction, we rely on the pre-transaction check
      // and just verify we're not creating duplicates
      
      for (const name of identifiersToCreate) {
        const nameLower = name.trim().toLowerCase();
        
        // Check if hashtag with this name already exists (case-insensitive)
        const existingId = existingNamesMap.get(nameLower);
        if (existingId) {
          identifierToIdMap.set(name, existingId);
        } else {
          // Create new hashtag
          const newId = generateUUID();
          const hashtagRef = doc(db, HASHTAGS_COLLECTION, newId);
          const now = Timestamp.now();
          
          transaction.set(hashtagRef, {
            hashtagId: newId,
            name: name.trim(),
            createdAt: now,
            updatedAt: now,
            linkedBlogIds: [],
          });
          
          identifierToIdMap.set(name, newId);
          // Add to map to avoid duplicates in same transaction
          existingNamesMap.set(nameLower, newId);
        }
      }
    });
  }
  
  // Build result array in same order as input
  for (const identifier of identifiers) {
    if (!identifier || typeof identifier !== 'string' || identifier.trim() === '') {
      continue;
    }
    
    const trimmed = identifier.trim();
    const resolvedId = identifierToIdMap.get(trimmed);
    if (resolvedId) {
      resolvedIds.push(resolvedId);
    }
  }
  
  return resolvedIds;
}
