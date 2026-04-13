import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { MagnifyingGlass } from '@phosphor-icons/react';
import { useStockSearch } from '@/hooks/useStockSearch';
import SearchDropdown from './SearchDropdown';

export default function SearchBar() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const { results, isLoading } = useStockSearch(query, isOpen);

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
    setIsOpen(true);
    setActiveIndex(-1);
  }

  function handleFocus() {
    if (query.trim().length > 0) {
      setIsOpen(true);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setIsOpen(false);
      return;
    }

    const visibleCount = Math.min(results.length, 5);

    if (e.key === 'ArrowDown' && isOpen && visibleCount > 0) {
      e.preventDefault();
      setActiveIndex((prev) => (prev < visibleCount - 1 ? prev + 1 : 0));
      return;
    }

    if (e.key === 'ArrowUp' && isOpen && visibleCount > 0) {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : visibleCount - 1));
      return;
    }

    if (e.key === 'Enter') {
      if (activeIndex >= 0 && activeIndex < visibleCount) {
        setIsOpen(false);
        setQuery('');
        navigate(`/stocks/${results[activeIndex].ticker}`);
      } else if (query.trim()) {
        setIsOpen(false);
        navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      }
    }
  }

  function handleSelect(ticker: string) {
    setIsOpen(false);
    setQuery('');
    navigate(`/stocks/${ticker}`);
  }

  function handleViewAll() {
    setIsOpen(false);
    navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <div ref={wrapperRef} className="relative flex-1 max-w-md mx-auto">
      <MagnifyingGlass
        size={14}
        weight="light"
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500"
      />
      <input
        placeholder="Search stocks…"
        className="glass-input w-full rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder:text-gray-600 outline-none"
        value={query}
        onChange={handleChange}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        role="combobox"
        aria-expanded={isOpen && query.trim().length > 0}
        aria-haspopup="listbox"
        aria-autocomplete="list"
      />
      {isOpen && query.trim().length > 0 && (
        <SearchDropdown
          results={results}
          isLoading={isLoading}
          onSelect={handleSelect}
          onViewAll={handleViewAll}
          activeIndex={activeIndex}
        />
      )}
    </div>
  );
}
