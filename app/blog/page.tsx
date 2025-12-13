'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { BlogLayout, BlogList, BlogFilterPanel, HashtagProvider } from '@/components/features/blog';
import type { BlogPostMetadata } from '@/lib/blog/utils';

const POSTS_PER_PAGE = 9;

function BlogPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [posts, setPosts] = useState<BlogPostMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedHashtagIds, setSelectedHashtagIds] = useState<string[]>([]);
  const [filterNoHashtags, setFilterNoHashtags] = useState(false);
  const prevHashtagIdsRef = useRef<string[]>([]);

  const getInitialLanguage = () => {
    const languageParam = searchParams?.get('language');
    return languageParam === 'en' ? 'en' : 'vi'; // Default to 'vi'
  };
  
  const [selectedLanguage, setSelectedLanguage] = useState<'vi' | 'en'>(getInitialLanguage);

  // Initialize and sync hashtag and language filters from URL parameters
  useEffect(() => {
    const hashtagsParam = searchParams?.get('hashtags');
    const noHashtagsParam = searchParams?.get('noHashtags') === 'true';
    const languageParam = searchParams?.get('language');
    const urlLanguage = languageParam === 'en' ? 'en' : 'vi'; // Default to 'vi'
    
    const urlHashtagIds = hashtagsParam
      ? hashtagsParam.split(',').map(id => id.trim()).filter(id => id.length > 0 && id !== '__no_hashtags__')
      : [];
    
    // Only update if URL params differ from current state (avoid infinite loops)
    const currentIdsString = JSON.stringify([...selectedHashtagIds].sort());
    const urlIdsString = JSON.stringify([...urlHashtagIds].sort());
    
    if (currentIdsString !== urlIdsString || filterNoHashtags !== noHashtagsParam || selectedLanguage !== urlLanguage) {
      setSelectedHashtagIds(urlHashtagIds);
      setFilterNoHashtags(noHashtagsParam);
      setSelectedLanguage(urlLanguage);
      prevHashtagIdsRef.current = urlHashtagIds;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]); // Only sync when URL changes, not when state changes

  // Reset to page 1 when hashtag filter or no-hashtags filter changes
  useEffect(() => {
    // Check if hashtag selection actually changed by comparing stringified arrays
    const prevIdsString = JSON.stringify(prevHashtagIdsRef.current);
    const currentIdsString = JSON.stringify(selectedHashtagIds);
    
    if (prevIdsString !== currentIdsString) {
      prevHashtagIdsRef.current = [...selectedHashtagIds];
      if (currentPage !== 1) {
        setCurrentPage(1);
      }
    }
  }, [selectedHashtagIds, currentPage]);
  
  // Reset to page 1 when no-hashtags filter changes
  useEffect(() => {
    if (filterNoHashtags && currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [filterNoHashtags, currentPage]);

  // Fetch posts when page, hashtag filter, or no-hashtags filter changes
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Build query parameters
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: POSTS_PER_PAGE.toString(),
        });
        
        // Add language filter (always required)
        params.append('language', selectedLanguage);
        
        // Add no-hashtags filter if enabled
        if (filterNoHashtags) {
          params.append('noHashtags', 'true');
        } else if (selectedHashtagIds.length > 0) {
          // Add hashtag filter if any hashtags are selected (only if not filtering no hashtags)
          params.append('hashtags', selectedHashtagIds.join(','));
        }
        
        const response = await fetch(`/api/blog/posts?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          // Ensure posts is always an array
          setPosts(Array.isArray(data.posts) ? data.posts : []);
          setTotalPages(data.pagination?.totalPages || 1);
          setTotalItems(data.pagination?.totalItems || 0);
        } else {
          setError('Failed to load blog posts');
        }
      } catch (err) {
        setError('An error occurred while loading blog posts');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [currentPage, selectedHashtagIds, filterNoHashtags, selectedLanguage]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
      setCurrentPage(newPage);
    }
  };

  const handleLanguageChange = (language: 'vi' | 'en') => {
    setSelectedLanguage(language);
    
    // Update URL to reflect the filter state
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('language', language); // Language is always required
    
    // Update URL without page reload
    const newUrl = params.toString() ? `?${params.toString()}` : '/blog';
    router.replace(newUrl, { scroll: false });
  };

  const handleHashtagFilterChange = (hashtagIds: string[]) => {
    setSelectedHashtagIds(hashtagIds);
    setFilterNoHashtags(false); // Clear no-hashtags filter when selecting hashtags
    
    // Update URL to reflect the filter state (for shareable links)
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.delete('noHashtags'); // Remove no-hashtags param when selecting hashtags
    if (hashtagIds.length > 0) {
      params.set('hashtags', hashtagIds.join(','));
    } else {
      params.delete('hashtags');
    }
    
    // Update URL without page reload
    const newUrl = params.toString() ? `?${params.toString()}` : '/blog';
    router.replace(newUrl, { scroll: false });
  };

  const handleNoHashtagsFilterToggle = () => {
    const newFilterNoHashtags = !filterNoHashtags;
    setFilterNoHashtags(newFilterNoHashtags);
    setSelectedHashtagIds([]); // Clear hashtag selection when filtering no hashtags
    
    // Update URL to reflect the filter state
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.delete('hashtags'); // Remove hashtags param when filtering no hashtags
    if (newFilterNoHashtags) {
      params.set('noHashtags', 'true');
    } else {
      params.delete('noHashtags');
    }
    
    // Update URL without page reload
    const newUrl = params.toString() ? `?${params.toString()}` : '/blog';
    router.replace(newUrl, { scroll: false });
  };

  return (
    <BlogLayout title="Blog">
      {error && (
        <div className="p-4 rounded-md bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 mb-4">
          {error}
        </div>
      )}
      
      {/* Hashtag Filter */}
      <BlogFilterPanel
        selectedHashtagIds={selectedHashtagIds}
        filterNoHashtags={filterNoHashtags}
        onHashtagFilterChange={handleHashtagFilterChange}
        onNoHashtagsFilterToggle={handleNoHashtagsFilterToggle}
        selectedLanguage={selectedLanguage}
        onLanguageChange={handleLanguageChange}
      />

      <HashtagProvider>
        <BlogList 
          posts={posts} 
          loading={loading}
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          onPageChange={handlePageChange}
        />
      </HashtagProvider>
    </BlogLayout>
  );
}

export default function BlogPage() {
  return (
    <Suspense fallback={
      <BlogLayout title="Blog">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-foreground/60">Loading...</div>
        </div>
      </BlogLayout>
    }>
      <BlogPageContent />
    </Suspense>
  );
}

