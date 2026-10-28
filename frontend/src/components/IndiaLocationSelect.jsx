import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, MapPin, Search, X } from 'lucide-react';
import { isUnionTerritory } from '../utils/indiaLocations';

export function IndiaStateSelect({
  value = '',
  onChange,
  locations = {},
  error = '',
  id = 'state',
  label = 'State',
  optional = false,
  placeholder = 'Search or select a state / union territory',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'STATES' | 'UT'
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Compute all states sorted alphabetically
  const allStates = useMemo(() => {
    return Object.keys(locations).sort((a, b) => a.localeCompare(b));
  }, [locations]);

  // Total counts
  const stateCount = useMemo(() => allStates.filter((name) => !isUnionTerritory(name)).length, [allStates]);
  const utCount = useMemo(() => allStates.filter((name) => isUnionTerritory(name)).length, [allStates]);

  // Filter based on activeTab and searchQuery
  const filteredStates = useMemo(() => {
    let list = allStates;
    if (activeTab === 'STATES') {
      list = list.filter((name) => !isUnionTerritory(name));
    } else if (activeTab === 'UT') {
      list = list.filter((name) => isUnionTerritory(name));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((name) => name.toLowerCase().includes(q));
    }

    return list;
  }, [allStates, activeTab, searchQuery]);

  // Auto-focus search input when opening
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      const timer = setTimeout(() => searchInputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen]);

  const handleSelect = (stateName) => {
    onChange?.(stateName);
    setIsOpen(false);
  };

  const handleClear = (event) => {
    event.stopPropagation();
    onChange?.('');
    setSearchQuery('');
  };

  const selectedIsUT = isUnionTerritory(value);
  const districtCount = value && locations[value] ? locations[value].length : 0;

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor={id} className="block text-sm font-semibold text-slate-700">
        {label}
        {optional
          ? <span className="font-normal text-slate-500"> (optional)</span>
          : <span className="text-[#c94b32]"> *</span>}
      </label>

      {/* Main Trigger Box */}
      <div
        id={id}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        tabIndex={0}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen((prev) => !prev);
          }
        }}
        className={`mt-2 flex min-h-[48px] w-full cursor-pointer items-center justify-between rounded-xl border bg-white px-3.5 py-2.5 transition focus:outline-none focus:ring-4 focus:ring-teal-50 ${
          error ? 'border-red-400 focus:border-red-500' : isOpen ? 'border-teal-600 ring-4 ring-teal-50' : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <MapPin size={17} className={value ? 'text-[#0b4f4b]' : 'text-slate-400'} />
          {value ? (
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate font-semibold text-slate-800">{value}</span>
              <span
                className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  selectedIsUT
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : 'bg-teal-50 text-teal-800 border border-teal-200'
                }`}
              >
                {selectedIsUT ? 'UT' : 'State'}
              </span>
              {districtCount > 0 && (
                <span className="hidden text-xs text-slate-400 sm:inline">
                  ({districtCount} districts)
                </span>
              )}
            </div>
          ) : (
            <span className="truncate text-slate-400 font-normal">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 pl-2 text-slate-400">
          {value && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Clear state selection"
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X size={15} />
            </button>
          )}
          <ChevronDown
            size={18}
            className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-teal-700' : 'text-slate-400'}`}
          />
        </div>
      </div>

      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs font-medium text-red-600" role="alert">
          {error}
        </p>
      )}

      {/* Floating Dropdown */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition"
        >
          {/* Search bar inside dropdown */}
          <div className="border-b border-slate-100 bg-slate-50/70 p-2.5">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type to search from all 36 Indian states & UTs..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-8 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search text"
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Quick Filter Chips */}
            <div className="mt-2 flex items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('ALL')}
                className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                  activeTab === 'ALL'
                    ? 'bg-[#0b4f4b] text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                All ({allStates.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('STATES')}
                className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                  activeTab === 'STATES'
                    ? 'bg-[#0b4f4b] text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                States ({stateCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('UT')}
                className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                  activeTab === 'UT'
                    ? 'bg-[#0b4f4b] text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                Union Territories ({utCount})
              </button>
            </div>
          </div>

          {/* List of States */}
          <div className="max-h-64 overflow-y-auto p-1">
            {filteredStates.length > 0 ? (
              filteredStates.map((stateName) => {
                const isSelected = value === stateName;
                const isUT = isUnionTerritory(stateName);
                const count = locations[stateName]?.length || 0;

                return (
                  <div
                    key={stateName}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(stateName)}
                    className={`flex cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-sm transition ${
                      isSelected
                        ? 'bg-teal-50 font-bold text-teal-900'
                        : 'text-slate-700 hover:bg-slate-50 hover:text-teal-950'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{stateName}</span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                          isUT
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-teal-100/70 text-teal-800'
                        }`}
                      >
                        {isUT ? 'UT' : 'State'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">{count} districts</span>
                      {isSelected && <Check size={16} className="text-[#0b4f4b]" />}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center text-sm text-slate-500">
                <p>No state or union territory found matching "{searchQuery}".</p>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="mt-2 text-xs font-bold text-teal-700 underline"
                >
                  Clear search filter
                </button>
              </div>
            )}
          </div>

          {/* Footer note */}
          <div className="border-t border-slate-100 bg-slate-50/50 px-3 py-2 text-right text-[11px] font-medium text-slate-400">
            {filteredStates.length} of {allStates.length} states & union territories available
          </div>
        </div>
      )}
    </div>
  );
}

export function IndiaDistrictSelect({
  value = '',
  onChange,
  districts = [],
  state = '',
  error = '',
  id = 'district',
  label = 'District',
  optional = false,
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Sorted districts
  const sortedDistricts = useMemo(() => {
    return [...districts].sort((a, b) => a.localeCompare(b));
  }, [districts]);

  // Filtered districts
  const filteredDistricts = useMemo(() => {
    if (!searchQuery.trim()) return sortedDistricts;
    const q = searchQuery.toLowerCase().trim();
    return sortedDistricts.filter((name) => name.toLowerCase().includes(q));
  }, [sortedDistricts, searchQuery]);

  // Auto-focus search input when opening
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      const timer = setTimeout(() => searchInputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleSelect = (districtName) => {
    onChange?.(districtName);
    setIsOpen(false);
  };

  const handleClear = (event) => {
    event.stopPropagation();
    onChange?.('');
    setSearchQuery('');
  };

  const isStateSelected = Boolean(state);

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor={id} className="block text-sm font-semibold text-slate-700">
        {label}
        {optional
          ? <span className="font-normal text-slate-500"> (optional)</span>
          : <span className="text-[#c94b32]"> *</span>}
      </label>

      {/* Main Trigger Box */}
      <div
        id={id}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        tabIndex={disabled || !isStateSelected ? -1 : 0}
        onClick={() => {
          if (!disabled && isStateSelected) setIsOpen((prev) => !prev);
        }}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !disabled && isStateSelected) {
            e.preventDefault();
            setIsOpen((prev) => !prev);
          }
        }}
        className={`mt-2 flex min-h-[48px] w-full items-center justify-between rounded-xl border px-3.5 py-2.5 transition ${
          disabled || !isStateSelected
            ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400 opacity-70'
            : error
            ? 'cursor-pointer border-red-400 bg-white focus:border-red-500 focus:ring-4 focus:ring-teal-50'
            : isOpen
            ? 'cursor-pointer border-teal-600 bg-white ring-4 ring-teal-50'
            : 'cursor-pointer border-slate-200 bg-white hover:border-slate-300 focus:ring-4 focus:ring-teal-50'
        }`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {value ? (
            <span className="truncate font-semibold text-slate-800">{value}</span>
          ) : (
            <span className="truncate text-slate-400 font-normal">
              {!isStateSelected
                ? 'Select a state first'
                : `Choose district (${districts.length} available in ${state})`}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 pl-2 text-slate-400">
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Clear district selection"
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X size={15} />
            </button>
          )}
          <ChevronDown
            size={18}
            className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-teal-700' : 'text-slate-400'}`}
          />
        </div>
      </div>

      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs font-medium text-red-600" role="alert">
          {error}
        </p>
      )}

      {/* Floating Dropdown */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition"
        >
          {/* Search bar inside dropdown */}
          <div className="border-b border-slate-100 bg-slate-50/70 p-2.5">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${districts.length} districts in ${state}...`}
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-8 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* List of Districts */}
          <div className="max-h-64 overflow-y-auto p-1">
            {filteredDistricts.length > 0 ? (
              filteredDistricts.map((districtName) => {
                const isSelected = value === districtName;

                return (
                  <div
                    key={districtName}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(districtName)}
                    className={`flex cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-sm transition ${
                      isSelected
                        ? 'bg-teal-50 font-bold text-teal-900'
                        : 'text-slate-700 hover:bg-slate-50 hover:text-teal-950'
                    }`}
                  >
                    <span>{districtName}</span>
                    {isSelected && <Check size={16} className="text-[#0b4f4b]" />}
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center text-sm text-slate-500">
                <p>No district found matching "{searchQuery}".</p>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="mt-2 text-xs font-bold text-teal-700 underline"
                >
                  Clear search
                </button>
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 bg-slate-50/50 px-3 py-2 text-right text-[11px] font-medium text-slate-400">
            {filteredDistricts.length} of {districts.length} districts in {state}
          </div>
        </div>
      )}
    </div>
  );
}
