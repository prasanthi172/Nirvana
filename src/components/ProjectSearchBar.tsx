import React, { useRef, useEffect } from 'react';
import { Search, MapPin, Hash, FileText, X, RotateCcw, SlidersHorizontal } from 'lucide-react';

export type SearchScope = 'ALL' | 'NAME' | 'ID' | 'LOCATION';

export interface ProjectSearchBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  searchScope: SearchScope;
  onScopeChange: (scope: SearchScope) => void;
  locations: Array<{ state: string; count: number }>;
  selectedLocation: string;
  onLocationChange: (location: string) => void;
  sectors: string[];
  selectedSector: string;
  onSectorChange: (sector: string) => void;
  selectedHealthTier: string;
  onHealthTierChange: (tier: any) => void;
  selectedRiskLevel: string;
  onRiskLevelChange: (risk: string) => void;
  matchedCount: number;
  totalCount: number;
  onResetAll: () => void;
}

const SCOPE_OPTIONS: Array<{ id: SearchScope; label: string; icon: React.ReactNode }> = [
  { id: 'ALL', label: 'All Fields (Name, ID, Location)', icon: <Search size={12} /> },
  { id: 'NAME', label: 'Project Name', icon: <FileText size={12} /> },
  { id: 'ID', label: 'Project ID', icon: <Hash size={12} /> },
  { id: 'LOCATION', label: 'Location / State', icon: <MapPin size={12} /> },
];

export default function ProjectSearchBar({
  searchQuery,
  onSearchChange,
  searchScope,
  onScopeChange,
  locations,
  selectedLocation,
  onLocationChange,
  sectors,
  selectedSector,
  onSectorChange,
  selectedHealthTier,
  onHealthTierChange,
  selectedRiskLevel,
  onRiskLevelChange,
  matchedCount,
  totalCount,
  onResetAll,
}: ProjectSearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA' &&
        document.activeElement?.tagName !== 'SELECT'
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    searchScope !== 'ALL' ||
    selectedLocation !== 'All Locations' ||
    selectedSector !== 'All Sectors' ||
    selectedHealthTier !== 'ALL' ||
    selectedRiskLevel !== 'ALL';

  const placeholderText =
    searchScope === 'NAME'
      ? 'Search projects by name (e.g. Expressway, Metro Rail, Hydro)...'
      : searchScope === 'ID'
      ? 'Search projects by code / ID (e.g. PRJ-1001, NHAI, MoSPI)...'
      : searchScope === 'LOCATION'
      ? 'Search projects by state or corridor location (e.g. Maharashtra, Gujarat, Assam)...'
      : 'Real-time search by Project Name, Project ID / Code, or Location (State)... (Press / to focus)';

  return (
    <div className="p-4 border-b border-slate-700 bg-[#162033] space-y-3">
      {/* Primary Search Input Row */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-400" size={16} />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            placeholder={placeholderText}
            aria-label="Search projects by name, ID, or location"
            className="w-full bg-[#0f172a] border border-slate-700 focus:border-blue-500 rounded-lg pl-10 pr-24 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-400 focus:outline-none transition-colors"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {searchQuery.trim().length > 0 && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                title="Clear search query"
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X size={14} />
              </button>
            )}
            <span className="text-[11px] font-mono text-slate-400 bg-[#1e293b] border border-slate-700/80 px-2 py-0.5 rounded tabular-nums">
              {matchedCount}/{totalCount}
            </span>
          </div>
        </div>

        {/* Search Field Scope Selector Buttons */}
        <div className="flex flex-wrap items-center bg-[#0f172a] p-1 rounded-lg border border-slate-700/80 shrink-0">
          {SCOPE_OPTIONS.map(opt => {
            const active = searchScope === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onScopeChange(opt.id)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  active ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {opt.icon}
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Secondary Facet Filters Row: Location (State), Sector, Health Index Tier, Risk Level */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mr-1">
            <SlidersHorizontal size={13} className="text-blue-400" />
            <span>Filters:</span>
          </div>

          {/* Location / State Dropdown */}
          <div className="flex items-center gap-1.5 bg-[#0f172a] border border-slate-700 rounded-lg px-2.5 py-1.5">
            <MapPin size={13} className="text-emerald-400 shrink-0" />
            <select
              value={selectedLocation}
              onChange={e => onLocationChange(e.target.value)}
              aria-label="Filter by Location State"
              className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="All Locations" className="bg-[#0f172a] text-white">
                All Locations / States ({locations.length})
              </option>
              {locations.map(loc => (
                <option key={loc.state} value={loc.state} className="bg-[#0f172a] text-white">
                  {loc.state} ({loc.count})
                </option>
              ))}
            </select>
          </div>

          {/* Sector Dropdown */}
          <select
            value={selectedSector}
            onChange={e => onSectorChange(e.target.value)}
            aria-label="Filter by Sector"
            className="bg-[#0f172a] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          >
            {sectors.map(s => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Health Index Tier Dropdown */}
          <select
            value={selectedHealthTier}
            onChange={e => onHealthTierChange(e.target.value)}
            aria-label="Filter by Project Health Index Tier"
            className="bg-[#0f172a] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Health Index Tiers</option>
            <option value="Optimal">Optimal Health (80–100)</option>
            <option value="Stable">Stable Health (60–79)</option>
            <option value="Strained">Strained Health (40–59)</option>
            <option value="Distressed">Distressed Health (0–39)</option>
          </select>

          {/* Risk Level Dropdown */}
          <select
            value={selectedRiskLevel}
            onChange={e => onRiskLevelChange(e.target.value)}
            aria-label="Filter by Risk Level"
            className="bg-[#0f172a] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Risk Levels</option>
            <option value="CRITICAL">Critical (75–100)</option>
            <option value="HIGH">High (50–74)</option>
            <option value="MODERATE">Moderate (25–49)</option>
            <option value="LOW">Low (0–24)</option>
          </select>
        </div>

        {/* Active Search Status & Reset Button */}
        <div className="flex items-center gap-3 text-xs">
          <span className="text-slate-400 tabular-nums">
            Showing <strong className="text-white">{matchedCount}</strong> of {totalCount} projects
          </span>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetAll}
              className="px-2.5 py-1.5 bg-[#0f172a] hover:bg-slate-800 border border-slate-700 rounded-lg text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
            >
              <RotateCcw size={12} />
              <span>Reset Search & Filters</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
