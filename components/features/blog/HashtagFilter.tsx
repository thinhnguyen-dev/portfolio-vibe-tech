'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Hashtag } from '@/lib/firebase/hashtags';
import { IoClose, IoPricetagsOutline, IoSearchOutline } from 'react-icons/io5';

interface HashtagFilterProps {
  selectedHashtagIds: string[];
  onChange: (hashtagIds: string[]) => void;
  disabled?: boolean;
}

export function HashtagFilter({
  selectedHashtagIds,
  onChange,
  disabled = false,
}: HashtagFilterProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [hashtags, setHashtags] = useState<Hashtag[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSelected, setLoadingSelected] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedHashtags, setSelectedHashtags] = useState<Hashtag[]>([]);
  const [allHashtags, setAllHashtags] = useState<Hashtag[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch all hashtags on mount
  useEffect(() => {
    const fetchAllHashtags = async () => {
      try {
        const response = await fetch('/api/hashtags');
        if (response.ok) {
          const data = await response.json();
          setAllHashtags(data.hashtags || []);
        }
      } catch (error) {
        console.error('Error fetching all hashtags:', error);
      }
    };

    fetchAllHashtags();
  }, []);

  // Fetch selected hashtag details from Firestore
  useEffect(() => {
    if (selectedHashtagIds.length === 0) {
      setSelectedHashtags([]);
      setLoadingSelected(false);
      return;
    }

    const fetchSelectedHashtags = async () => {
      setLoadingSelected(true);
      try {
        const response = await fetch(`/api/hashtags?ids=${selectedHashtagIds.join(',')}`);
        if (response.ok) {
          const data = await response.json();
          const fetchedHashtags = data.hashtags || [];
          setSelectedHashtags(
            fetchedHashtags.filter((h: Hashtag) => 
              selectedHashtagIds.includes(h.hashtagId)
            )
          );
        } else {
          console.error('Failed to fetch selected hashtags');
          setSelectedHashtags([]);
        }
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
        // If no search term, show all hashtags (excluding already selected ones)
        const filtered = allHashtags.filter(
          (hashtag) => !selectedHashtagIds.includes(hashtag.hashtagId)
        );
        setHashtags(filtered);
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
    [selectedHashtagIds, allHashtags]
  );

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (showDropdown) {
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
    if (!selectedHashtagIds.includes(hashtag.hashtagId)) {
      onChange([...selectedHashtagIds, hashtag.hashtagId]);
    }
    setSearchTerm('');
    setShowDropdown(false);
    searchInputRef.current?.focus();
  };

  const handleRemoveHashtag = (hashtagId: string) => {
    onChange(selectedHashtagIds.filter(id => id !== hashtagId));
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const handleInputFocus = () => {
    setShowDropdown(true);
    if (searchTerm.trim()) {
      searchHashtags(searchTerm);
    } else {
      // Show all unselected hashtags when opening dropdown
      const filtered = allHashtags.filter(
        (hashtag) => !selectedHashtagIds.includes(hashtag.hashtagId)
      );
      setHashtags(filtered);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-foreground">
          Filter by Hashtags
        </label>
        {selectedHashtagIds.length > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            disabled={disabled}
            className="text-xs text-accent hover:text-accent/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Selected hashtags display */}
      {(loadingSelected || selectedHashtags.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {loadingSelected ? (
            <div className="text-xs text-text-secondary">Loading hashtags...</div>
          ) : (
            selectedHashtags.map((hashtag) => (
              <span
                key={hashtag.hashtagId}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-accent/20 text-accent border border-accent/30 text-sm font-medium"
              >
                <IoPricetagsOutline size={14} />
                {hashtag.name}
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => handleRemoveHashtag(hashtag.hashtagId)}
                    className="ml-1 hover:bg-accent/30 rounded-full p-0.5 transition-colors"
                    aria-label={`Remove ${hashtag.name}`}
                  >
                    <IoClose size={14} />
                  </button>
                )}
              </span>
            ))
          )}
        </div>
      )}

      {/* Search input */}
      <div className="relative" ref={containerRef}>
        <div className="relative">
          <IoSearchOutline 
            size={18} 
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" 
          />
          <input
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={handleInputFocus}
            placeholder="Search hashtags to filter..."
            disabled={disabled}
            className="w-full pl-10 pr-4 py-2 border border-text-secondary/20 rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

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
              </div>
            ) : searchTerm.trim() ? (
              <div className="p-4 text-center text-text-secondary text-sm">
                <p>No hashtags found for &quot;{searchTerm}&quot;</p>
              </div>
            ) : (
              <div className="p-4 text-center text-text-secondary text-sm">
                {selectedHashtagIds.length === 0 
                  ? 'Start typing to search for hashtags...'
                  : 'All available hashtags are already selected'
                }
              </div>
            )}
          </div>
        )}
      </div>

      {selectedHashtagIds.length > 0 && (
        <p className="text-xs text-text-secondary">
          Showing blogs with {selectedHashtagIds.length} selected hashtag{selectedHashtagIds.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}

