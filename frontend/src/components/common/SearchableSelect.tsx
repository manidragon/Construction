import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, Plus, X } from 'lucide-react';

export interface SearchableOption {
  value: string;
  label: string;
  code?: string;
  sublabel?: string;
  badge?: string;
  disabled?: boolean;
}

export interface SearchableSelectProps {
  options: (SearchableOption | string)[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  dropdownClassName?: string;
  onAddNew?: () => void;
  addNewLabel?: string;
  emptyMessage?: string;
  id?: string;
  name?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select option...',
  searchPlaceholder = 'Type to search...',
  label,
  required = false,
  disabled = false,
  className = '',
  buttonClassName = '',
  dropdownClassName = '',
  onAddNew,
  addNewLabel = '+ Add New Option',
  emptyMessage = 'No matching options found',
  id,
  name,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Normalize options into standard format
  const normalizedOptions: SearchableOption[] = useMemo(() => {
    return options.map((opt) => {
      if (typeof opt === 'string') {
        return { value: opt, label: opt };
      }
      return opt;
    });
  }, [options]);

  // Selected item
  const selectedOption = useMemo(() => {
    return normalizedOptions.find((opt) => opt.value === value);
  }, [normalizedOptions, value]);

  // Filtered options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return normalizedOptions;
    const query = searchQuery.toLowerCase().trim();
    return normalizedOptions.filter((opt) => {
      const matchLabel = opt.label?.toLowerCase().includes(query);
      const matchCode = opt.code ? opt.code.toLowerCase().includes(query) : false;
      const matchSub = opt.sublabel ? opt.sublabel.toLowerCase().includes(query) : false;
      const matchVal = opt.value?.toLowerCase().includes(query);
      return matchLabel || matchCode || matchSub || matchVal;
    });
  }, [normalizedOptions, searchQuery]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setHighlightedIndex(0);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredOptions[highlightedIndex] && !filteredOptions[highlightedIndex].disabled) {
          onChange(filteredOptions[highlightedIndex].value);
          setIsOpen(false);
        } else if (filteredOptions.length === 0 && onAddNew) {
          onAddNew();
          setIsOpen(false);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
    }
  };

  const handleSelect = (val: string, isDisabled?: boolean) => {
    if (isDisabled) return;
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div className={`relative w-full ${className}`} ref={containerRef} onKeyDown={handleKeyDown}>
      {label && (
        <label className="block text-xs font-bold text-slate-700 mb-1">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* Hidden input for HTML form validation if required */}
      {required && (
        <input
          type="text"
          value={value}
          required={required}
          onChange={() => {}}
          className="sr-only"
          tabIndex={-1}
          id={id ? `${id}-required-validator` : undefined}
          name={name}
        />
      )}

      {/* Trigger Button */}
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between text-left text-xs p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-lg transition-colors focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-60 disabled:cursor-not-allowed ${
          isOpen ? 'ring-1 ring-amber-500 border-amber-500 bg-white' : ''
        } ${buttonClassName}`}
      >
        <span className="truncate flex items-center gap-1.5 flex-1 pr-2">
          {selectedOption ? (
            <>
              {selectedOption.code && (
                <span className="font-mono font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1 py-0.2 rounded text-[10px] shrink-0">
                  {selectedOption.code}
                </span>
              )}
              <span className="font-medium text-slate-800 truncate">{selectedOption.label}</span>
              {selectedOption.badge && (
                <span className="text-[10px] text-slate-500 bg-slate-200/70 px-1.5 py-0.2 rounded shrink-0">
                  {selectedOption.badge}
                </span>
              )}
            </>
          ) : (
            <span className="text-slate-400 font-normal">{placeholder}</span>
          )}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform shrink-0 ${isOpen ? 'rotate-180 text-amber-600' : ''}`} />
      </button>

      {/* Floating Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute left-0 top-full mt-1 w-full min-w-[220px] bg-white border border-slate-200 rounded-xl shadow-xl z-[70] overflow-hidden animate-in fade-in zoom-in-95 duration-100 ${dropdownClassName}`}
        >
          {/* Search Box Header */}
          <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setHighlightedIndex(0);
              }}
              placeholder={searchPlaceholder}
              className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Quick Add Button if provided */}
          {onAddNew && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onAddNew();
              }}
              className="w-full text-left px-3 py-2 text-xs font-bold text-amber-700 hover:text-amber-800 bg-amber-50/70 hover:bg-amber-100/80 border-b border-amber-200/50 flex items-center gap-1.5 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{addNewLabel}</span>
            </button>
          )}

          {/* Options List */}
          <div ref={listRef} className="max-h-56 overflow-y-auto p-1 divide-y divide-slate-50">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-400">
                <p>{emptyMessage}</p>
                {onAddNew && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onAddNew();
                    }}
                    className="mt-2 text-xs font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-lg transition inline-flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Create "{searchQuery.slice(0, 16)}"</span>
                  </button>
                )}
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = opt.value === value;
                const isHighlighted = idx === highlightedIndex;

                return (
                  <div
                    key={`${opt.value}-${idx}`}
                    onClick={() => handleSelect(opt.value, opt.disabled)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs cursor-pointer flex items-center justify-between gap-2 transition ${
                      opt.disabled
                        ? 'opacity-40 cursor-not-allowed'
                        : isSelected
                        ? 'bg-amber-50 text-amber-900 font-bold'
                        : isHighlighted
                        ? 'bg-slate-100 text-slate-900'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="truncate flex items-center gap-1.5 flex-1 min-w-0">
                      {opt.code && (
                        <span className="font-mono font-bold text-slate-600 bg-slate-200/60 px-1.5 py-0.2 rounded text-[10px] shrink-0">
                          {opt.code}
                        </span>
                      )}
                      <div className="truncate">
                        <div className="truncate font-medium">{opt.label}</div>
                        {opt.sublabel && (
                          <div className="text-[10px] text-slate-400 truncate">{opt.sublabel}</div>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-amber-600 shrink-0 ml-1" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
