/**
 * SearchInput Component - Theme-aware (light/dark mode)
 *
 * Autocomplete search input for products/SKUs
 * Features: debounced input, keyboard navigation, dropdown results
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { apiClient } from '@/lib/api-client';

// ============================================================================
// TYPES
// ============================================================================

interface SearchResult {
  sku: string;
  name: string;
  category: string;
  binLocations: string[];
}

interface SearchInputProps {
  onSelect: (sku: string) => void;
  placeholder?: string;
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SearchInput({ onSelect, placeholder = 'Search products...', className = '' }: SearchInputProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Debounced search function
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiClient.get<SearchResult[]>('/skus', {
        params: { q: searchQuery },
      });
      setResults(response.data);
      setIsOpen(true);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle input change with debouncing
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, performSearch]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleSelect(results[selectedIndex].sku);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Handle result selection
  const handleSelect = (sku: string) => {
    onSelect(sku);
    setQuery('');
    setResults([]);
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.blur();
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 dark:text-gray-500 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          className="w-full pl-10 pr-4 py-2 dark:bg-white/5 dark:border-white/10 dark:text-white dark:placeholder-gray-500 bg-white border border-gray-300 text-gray-900 placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder={placeholder}
          autoComplete="off"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-500"></div>
          </div>
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen && results.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 dark:bg-gray-800 dark:border-gray-700 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto"
        >
          {results.map((result, index) => (
            <button
              key={result.sku}
              onClick={() => handleSelect(result.sku)}
              className={`w-full px-4 py-3 text-left dark:hover:bg-white/5 hover:bg-gray-50 transition-colors dark:border-b border-b last:border-b-0 dark:border-gray-700 border-gray-200 ${
                index === selectedIndex ? 'dark:bg-primary-500/20 bg-primary-50' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium dark:text-white text-gray-900 truncate">{result.name}</div>
                  <div className="text-sm dark:text-gray-400 text-gray-600 mt-0.5">SKU: {result.sku}</div>
                </div>
                <div className="flex-shrink-0">
                  <span className="px-2 py-1 text-xs font-medium dark:bg-primary-500/20 dark:text-primary-400 bg-primary-100 text-primary-700 rounded">
                    {result.category}
                  </span>
                </div>
              </div>
              {result.binLocations.length > 0 && (
                <div className="mt-2 text-xs dark:text-gray-500 text-gray-500">
                  Locations: {result.binLocations.slice(0, 3).join(', ')}
                  {result.binLocations.length > 3 && ` +${result.binLocations.length - 3} more`}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* No Results Message */}
      {isOpen && query.trim() && !isLoading && results.length === 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 dark:bg-gray-800 dark:border-gray-700 bg-white border border-gray-200 rounded-lg shadow-lg"
        >
          <div className="px-4 py-3 dark:text-gray-400 text-gray-600 text-center">
            No products found for "{query}"
          </div>
        </div>
      )}
    </div>
  );
}
