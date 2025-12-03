'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

interface Hashtag {
  hashtagId: string;
  name: string;
}

interface HashtagContextType {
  hashtags: Map<string, Hashtag>;
  getHashtags: (ids: string[]) => Hashtag[];
  fetchHashtags: (ids: string[]) => Promise<void>;
  isLoading: (ids: string[]) => boolean;
}

const HashtagContext = createContext<HashtagContextType | undefined>(undefined);

export function HashtagProvider({ children }: { children: React.ReactNode }) {
  const [hashtags, setHashtags] = useState<Map<string, Hashtag>>(new Map());
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const fetchPromisesRef = useRef<Map<string, Promise<void>>>(new Map());
  const hashtagsRef = useRef<Map<string, Hashtag>>(new Map());
  const loadingIdsRef = useRef<Set<string>>(new Set());

  // Keep refs in sync with state
  useEffect(() => {
    hashtagsRef.current = hashtags;
  }, [hashtags]);

  useEffect(() => {
    loadingIdsRef.current = loadingIds;
  }, [loadingIds]);

  const fetchHashtags = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;

    // Filter out IDs that are already loaded or currently loading using refs
    const idsToFetch = ids.filter(
      (id) => !hashtagsRef.current.has(id) && !loadingIdsRef.current.has(id) && id && id.trim().length > 0
    );

    if (idsToFetch.length === 0) return;

    // Check if there's already a pending fetch for these IDs
    const fetchKey = [...idsToFetch].sort().join(',');
    if (fetchPromisesRef.current.has(fetchKey)) {
      // Wait for the existing fetch to complete
      await fetchPromisesRef.current.get(fetchKey);
      return;
    }

    // Mark IDs as loading
    setLoadingIds((prev) => {
      const next = new Set(prev);
      idsToFetch.forEach((id) => next.add(id));
      return next;
    });

    // Create fetch promise
    const fetchPromise = (async () => {
      try {
        const response = await fetch(`/api/hashtags?ids=${idsToFetch.join(',')}`);
        if (response.ok) {
          const data = await response.json();
          const fetchedHashtags = (data.hashtags || []) as Hashtag[];
          
          setHashtags((prev) => {
            const next = new Map(prev);
            fetchedHashtags.forEach((hashtag) => {
              next.set(hashtag.hashtagId, hashtag);
            });
            return next;
          });
        }
      } catch (error) {
        console.error('Error fetching hashtags:', error);
      } finally {
        // Remove from loading set
        setLoadingIds((prev) => {
          const next = new Set(prev);
          idsToFetch.forEach((id) => next.delete(id));
          return next;
        });
        // Remove from promises map
        fetchPromisesRef.current.delete(fetchKey);
      }
    })();

    // Store the promise
    fetchPromisesRef.current.set(fetchKey, fetchPromise);
    await fetchPromise;
  }, []); // No dependencies - uses functional updates

  const getHashtags = useCallback(
    (ids: string[]): Hashtag[] => {
      if (!ids || ids.length === 0) return [];
      return ids
        .map((id) => hashtags.get(id))
        .filter((hashtag): hashtag is Hashtag => hashtag !== undefined);
    },
    [hashtags]
  );

  const isLoading = useCallback(
    (ids: string[]): boolean => {
      if (!ids || ids.length === 0) return false;
      return ids.some((id) => loadingIds.has(id) && !hashtags.has(id));
    },
    [loadingIds, hashtags]
  );

  return (
    <HashtagContext.Provider
      value={{
        hashtags,
        getHashtags,
        fetchHashtags,
        isLoading,
      }}
    >
      {children}
    </HashtagContext.Provider>
  );
}

export function useHashtags() {
  const context = useContext(HashtagContext);
  if (context === undefined) {
    throw new Error('useHashtags must be used within a HashtagProvider');
  }
  return context;
}

