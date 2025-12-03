'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Hashtag } from '@/lib/firebase/hashtags';
import { IoSearchOutline, IoClose, IoPricetagsOutline } from 'react-icons/io5';

interface HashtagSearchProps {
  onSelect?: (hashtag: Hashtag) => void;
  onSearchChange?: (searchTerm: string) => void;
  onSearchSubmit?: (searchTerm: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function HashtagSearch({
  onSelect,
  onSearchChange,
  onSearchSubmit,
  placeholder = 'Search hashtags by name...',
  className = '',
  disabled = false,
}: HashtagSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<Hashtag[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Search function for suggestions (autocomplete) - called while typing with debounce
  const searchHashtagsForSuggestions = useCallback(async (term: string) => {
    if (!term.trim()) {
      setSuggestions([]);
      setLoading(false);
      setShowSuggestions(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/hashtags?q=${encodeURIComponent(term)}&limit=10`);
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.hashtags || []);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Error searching hashtags:', error);
      setSuggestions([]);
      setShowSuggestions(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search for suggestions while typing (autocomplete behavior)
  useEffect(() => {
    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      if (searchTerm.trim()) {
        searchHashtagsForSuggestions(searchTerm);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
        setLoading(false);
      }
    }, 300); // 300ms debounce delay

    // Cleanup
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchTerm, searchHashtagsForSuggestions]);

  // Notify parent of search term changes (for display purposes only, not for triggering search)
  useEffect(() => {
    if (onSearchChange) {
      onSearchChange(searchTerm);
    }
  }, [searchTerm, onSearchChange]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    };

    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSuggestions]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (showSuggestions && selectedIndex >= 0 && selectedIndex < suggestions.length) {
        // If a suggestion is selected, select it (this will trigger the main search)
        handleSelectHashtag(suggestions[selectedIndex]);
      } else if (searchTerm.trim()) {
        // Otherwise, notify parent component to perform the main table search
        if (onSearchSubmit) {
          onSearchSubmit(searchTerm);
        }
        // Hide suggestions after submitting
        setShowSuggestions(false);
      }
      return;
    }

    if (!showSuggestions || suggestions.length === 0) {
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        searchInputRef.current?.blur();
        break;
    }
  };

  const handleSelectHashtag = (hashtag: Hashtag) => {
    setSearchTerm(hashtag.name);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    // Trigger main table search when a suggestion is selected
    if (onSearchSubmit) {
      onSearchSubmit(hashtag.name);
    }
    if (onSelect) {
      onSelect(hashtag);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    // Reset selected index when typing
    setSelectedIndex(-1);
    // Suggestions will be shown automatically via the debounced search effect
  };

  const handleInputFocus = () => {
    // Show suggestions if we have results
    if (searchTerm.trim() && suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleClear = () => {
    setSearchTerm('');
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    searchInputRef.current?.focus();
    if (onSearchChange) {
      onSearchChange('');
    }
    // Clear the active search in parent component
    if (onSearchSubmit) {
      onSearchSubmit('');
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Search Input */}
      <div className="relative">
        <IoSearchOutline 
          size={18} 
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" 
        />
        <input
          ref={searchInputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full pl-10 pr-10 py-2 border border-text-secondary/20 rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-foreground transition-colors disabled:opacity-50"
            aria-label="Clear search"
          >
            <IoClose size={18} />
          </button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-background border border-text-secondary/20 rounded-md shadow-xl max-h-60 overflow-y-auto"
        >
          {loading ? (
            <div className="p-4 text-center text-text-secondary text-sm">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-accent mx-auto mb-2"></div>
              Searching...
            </div>
          ) : suggestions.length > 0 ? (
            <div className="py-1">
              {suggestions.map((hashtag, index) => (
                <button
                  key={hashtag.hashtagId}
                  type="button"
                  onClick={() => handleSelectHashtag(hashtag)}
                  className={`w-full text-left px-4 py-2 hover:bg-text-secondary/10 text-foreground transition-colors flex items-center gap-2 ${
                    index === selectedIndex ? 'bg-accent/20' : ''
                  }`}
                >
                  <IoPricetagsOutline size={16} className="text-accent shrink-0" />
                  <span className="flex-1 font-medium">{hashtag.name}</span>
                  <span className="text-xs text-text-secondary font-mono">
                    {hashtag.hashtagId.substring(0, 8)}
                  </span>
                </button>
              ))}
            </div>
          ) : searchTerm.trim() ? (
            <div className="p-4 text-center text-text-secondary text-sm">
              <p>No hashtags found for &quot;{searchTerm}&quot;</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

