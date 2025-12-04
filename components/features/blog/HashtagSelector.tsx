'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Hashtag } from '@/lib/firebase/hashtags';
import { IoClose, IoPricetagsOutline } from 'react-icons/io5';

interface HashtagSelectorProps {
  selectedHashtagIds: string[]; // Can contain both hashtag IDs and names (for new hashtags)
  onChange: (hashtagIds: string[]) => void; // Returns array that may contain IDs or names
  disabled?: boolean;
}

export function HashtagSelector({
  selectedHashtagIds,
  onChange,
  disabled = false,
}: HashtagSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [hashtags, setHashtags] = useState<Hashtag[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSelected, setLoadingSelected] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedHashtags, setSelectedHashtags] = useState<Hashtag[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Helper to check if a string is a UUID (hashtag ID format)
  const isUUID = (str: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  // Fetch selected hashtag details from Firestore
  // Handle both IDs (fetch from API) and names (display directly)
  useEffect(() => {
    if (selectedHashtagIds.length === 0) {
      setSelectedHashtags([]);
      setLoadingSelected(false);
      return;
    }

    const fetchSelectedHashtags = async () => {
      setLoadingSelected(true);
      try {
        // Separate IDs from names
        const idIdentifiers = selectedHashtagIds.filter(id => isUUID(id));
        const nameIdentifiers = selectedHashtagIds.filter(id => !isUUID(id));
        
        // Fetch existing hashtags by ID
        const fetchedHashtags: Hashtag[] = [];
        if (idIdentifiers.length > 0) {
          const response = await fetch(`/api/hashtags?ids=${idIdentifiers.join(',')}`);
          if (response.ok) {
            const data = await response.json();
            const fetched = data.hashtags || [];
            // Ensure we only show hashtags that are still in the selectedHashtagIds array
            fetchedHashtags.push(
              ...fetched.filter((h: Hashtag) => 
                selectedHashtagIds.includes(h.hashtagId)
              )
            );
          } else {
            console.error('Failed to fetch selected hashtags');
          }
        }
        
        // Create temporary Hashtag objects for new hashtag names
        const now = new Date();
        nameIdentifiers.forEach(name => {
          // Create a temporary hashtag object for display
          fetchedHashtags.push({
            hashtagId: name, // Use name as temporary ID
            name: name,
            createdAt: now,
            updatedAt: now,
            linkedBlogIds: [],
          });
        });
        
        setSelectedHashtags(fetchedHashtags);
      } catch (error) {
        console.error('Error fetching selected hashtags:', error);
        setSelectedHashtags([]);
      } finally {
        setLoadingSelected(false);
      }
    };

    fetchSelectedHashtags();
  }, [selectedHashtagIds]);

  // Search hashtags with debounce
  const searchHashtags = useCallback(
    async (term: string) => {
      if (!term.trim()) {
        setHashtags([]);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`/api/hashtags?q=${encodeURIComponent(term)}&limit=20`);
        if (response.ok) {
          const data = await response.json();
          // Filter out already selected hashtags
          const filtered = (data.hashtags || []).filter(
            (hashtag: Hashtag) => !selectedHashtagIds.includes(hashtag.hashtagId)
          );
          setHashtags(filtered);
        }
      } catch (error) {
        console.error('Error searching hashtags:', error);
        setHashtags([]);
      } finally {
        setLoading(false);
      }
    },
    [selectedHashtagIds]
  );

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (showDropdown && searchTerm.trim()) {
        searchHashtags(searchTerm);
      } else {
        setHashtags([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, showDropdown, searchHashtags]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

  const handleSelectHashtag = (hashtag: Hashtag) => {
    const identifier = hashtag.hashtagId; // This could be an ID or a name
    if (!selectedHashtagIds.includes(identifier)) {
      onChange([...selectedHashtagIds, identifier]);
    }
    setSearchTerm('');
    setShowDropdown(false);
    searchInputRef.current?.focus();
  };

  const handleCreateNewHashtag = () => {
    const trimmedName = searchTerm.trim();
    if (trimmedName && !selectedHashtagIds.includes(trimmedName)) {
      // Add the name directly (not an ID) - backend will create it
      onChange([...selectedHashtagIds, trimmedName]);
    }
    setSearchTerm('');
    setShowDropdown(false);
    searchInputRef.current?.focus();
  };

  // Remove hashtag from UI state only - Firestore update happens on form submit
  const handleRemoveHashtag = (identifier: string) => {
    // This only updates the local state via onChange callback
    // The actual Firestore update will occur when the form is submitted
    onChange(selectedHashtagIds.filter(id => id !== identifier));
  };

  const handleInputFocus = () => {
    if (searchTerm.trim()) {
      setShowDropdown(true);
      searchHashtags(searchTerm);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium mb-2 text-foreground">
        Hashtags
      </label>

      {/* Selected hashtags display */}
      {(loadingSelected || selectedHashtags.length > 0) && (
        <div className="flex flex-wrap gap-2 mb-2">
          {loadingSelected ? (
            <div className="text-xs text-text-secondary">Loading hashtags...</div>
          ) : (
            selectedHashtags.map((hashtag) => {
              const isNewHashtag = !isUUID(hashtag.hashtagId); // If not a UUID, it's a new hashtag name
              return (
                <span
                  key={hashtag.hashtagId}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium ${
                    isNewHashtag 
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                      : 'bg-accent/20 text-accent border border-accent/30'
                  }`}
                >
                  <IoPricetagsOutline size={14} />
                  {hashtag.name}
                  {isNewHashtag && (
                    <span className="text-xs opacity-75">(new)</span>
                  )}
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => handleRemoveHashtag(hashtag.hashtagId)}
                      className="ml-1 hover:bg-accent/30 rounded-full p-0.5 transition-colors"
                      aria-label={`Remove ${hashtag.name}`}
                      title="Remove hashtag (changes will be saved when you click 'Update')"
                    >
                      <IoClose size={14} />
                    </button>
                  )}
                </span>
              );
            })
          )}
        </div>
      )}

      {/* Search input */}
      <div className="relative" ref={containerRef}>
        <input
          ref={searchInputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={handleInputFocus}
          placeholder="Search or add hashtags..."
          disabled={disabled}
          className="w-full px-4 py-2 border border-text-secondary/20 rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        />

        {/* Dropdown with search results */}
        {showDropdown && !disabled && (
          <div
            ref={dropdownRef}
            className="absolute z-50 w-full mt-1 bg-background border border-text-secondary/20 rounded-md shadow-xl max-h-60 overflow-y-auto"
          >
            {loading ? (
              <div className="p-4 text-center text-text-secondary text-sm">
                Searching...
              </div>
            ) : hashtags.length > 0 ? (
              <div className="py-1">
                {hashtags.map((hashtag) => (
                  <button
                    key={hashtag.hashtagId}
                    type="button"
                    onClick={() => handleSelectHashtag(hashtag)}
                    className="w-full text-left px-4 py-2 hover:bg-text-secondary/10 text-foreground transition-colors flex items-center gap-2"
                  >
                    <IoPricetagsOutline size={16} className="text-accent" />
                    <span className="flex-1">{hashtag.name}</span>
                  </button>
                ))}
                {/* Show "Create new hashtag" option if search term doesn't match any result */}
                {searchTerm.trim() && !hashtags.some(h => h.name.toLowerCase() === searchTerm.trim().toLowerCase()) && (
                  <button
                    type="button"
                    onClick={handleCreateNewHashtag}
                    className="w-full text-left px-4 py-2 hover:bg-accent/20 text-accent transition-colors flex items-center gap-2 border-t border-text-secondary/20 mt-1 pt-2"
                  >
                    <IoPricetagsOutline size={16} />
                    <span className="flex-1">
                      Create new hashtag: <strong>&quot;{searchTerm.trim()}&quot;</strong>
                    </span>
                  </button>
                )}
              </div>
            ) : searchTerm.trim() ? (
              <div className="py-1">
                <button
                  type="button"
                  onClick={handleCreateNewHashtag}
                  className="w-full text-left px-4 py-2 hover:bg-accent/20 text-accent transition-colors flex items-center gap-2"
                >
                  <IoPricetagsOutline size={16} />
                  <span className="flex-1">
                    Create new hashtag: <strong>&quot;{searchTerm.trim()}&quot;</strong>
                  </span>
                </button>
              </div>
            ) : (
              <div className="p-4 text-center text-text-secondary text-sm">
                Start typing to search for hashtags...
              </div>
            )}
          </div>
        )}
      </div>

      <p className="text-xs text-text-secondary">
        Search existing hashtags or create new ones by typing a name and selecting &quot;Create new hashtag&quot;
      </p>
    </div>
  );
}

