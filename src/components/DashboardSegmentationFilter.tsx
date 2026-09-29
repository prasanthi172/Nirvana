import React from 'react';
import { Filter, Layers, ShieldAlert, RotateCcw } from 'lucide-react';

export type RiskLevelSegment = 'ALL' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface DashboardSegmentationFilterProps {
  sectors: Array<{ name: string; count: number }>;
  selectedSector: string;
  onSelectSector: (sector: string) => void;
  riskCounts: Record<RiskLevelSegment, number>;
  selectedRiskLevel: RiskLevelSegment;
  onSelectRiskLevel: (level: RiskLevelSegment) => void;
  filteredCount: number;
  totalCount: number;
  filteredOriginalCost: number;
  filteredRevisedCost: number;
  onReset: () => void;
}

const RISK_LEVEL_OPTIONS: Array<{
  id: RiskLevelSegment;
  label: string;
  dotColor: string;
  activeClass: string;
}> = [
  {
    id: 'ALL',
    label: 'All Risk Levels',
    dotColor: 'bg-blue-400',
    activeClass: 'bg-blue-600 text-white border-blue-500',
  },
  {
    id: 'CRITICAL',
    label: 'Critical',
    dotColor: 'bg-red-400',
    activeClass: 'bg-red-500/25 text-red-200 border-red-500/50',
  },
  {
    id: 'HIGH',
    label: 'High',
    dotColor: 'bg-orange-400',
    activeClass: 'bg-orange-500/25 text-orange-200 border-orange-500/50',
  },
  {
    id: 'MODERATE',
    label: 'Moderate',
    dotColor: 'bg-amber-400',
    activeClass: 'bg-amber-500/25 text-amber-200 border-amber-500/50',
  },
  {
    id: 'LOW',
    label: 'Low',
    dotColor: 'bg-emerald-400',
    activeClass: 'bg-emerald-500/25 text-emerald-200 border-emerald-500/50',
  },
];

export default function DashboardSegmentationFilter({
  sectors,
  selectedSector,
  onSelectSector,
  riskCounts,
  selectedRiskLevel,
  onSelectRiskLevel,
  filteredCount,
  totalCount,
  filteredOriginalCost,
  filteredRevisedCost,
  onReset,
}: DashboardSegmentationFilterProps) {
  const isFiltered = selectedSector !== 'All Sectors' || selectedRiskLevel !== 'ALL';

  return (
    <section className="bg-[#1e293b] border border-slate-700 rounded-xl p-5 space-y-4">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        {/* Left: Filter Title & Active Cohort Readout */}
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Filter size={16} className="text-blue-400" />
            <h3 className="text-sm font-semibold text-white">
              Portfolio Segmentation Filter
            </h3>
            <span className="text-slate-600">·</span>
            <span className="text-xs text-slate-300 tabular-nums">
              Showing <strong className="text-white">{filteredCount}</strong> of {totalCount} projects
            </span>
            <span className="text-slate-600 hidden sm:inline">·</span>
            <span className="text-xs text-slate-400 tabular-nums hidden sm:inline">
              Outlay: ₹{(filteredOriginalCost / 1000).toFixed(1)}k Cr sanctioned / ₹{(filteredRevisedCost / 1000).toFixed(1)}k Cr revised
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Segment dashboard KPIs, health metrics, anomaly heatmaps, and project tables by Infrastructure Sector or Risk Level.
          </p>
        </div>

        {/* Right: Sector Selector + Reset Button */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 bg-[#0f172a] border border-slate-700 rounded-lg px-3 py-1.5">
            <Layers size={14} className="text-blue-400 shrink-0" />
            <label htmlFor="dashboard-sector-select" className="text-xs text-slate-400 whitespace-nowrap">
              Sector:
            </label>
            <select
              id="dashboard-sector-select"
              value={selectedSector}
              onChange={e => onSelectSector(e.target.value)}
              className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
            >
              <option value="All Sectors" className="bg-[#0f172a] text-white">
                All Sectors ({totalCount})
              </option>
              {sectors.map(sec => (
                <option key={sec.name} value={sec.name} className="bg-[#0f172a] text-white">
                  {sec.name} ({sec.count})
                </option>
              ))}
            </select>
          </div>

          {isFiltered && (
            <button
              type="button"
              onClick={onReset}
              className="px-3 py-1.5 bg-[#0f172a] hover:bg-slate-800 border border-slate-700 rounded-lg text-xs font-medium text-slate-300 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <RotateCcw size={13} className="text-blue-400" />
              <span>Reset Segmentation</span>
            </button>
          )}
        </div>
      </div>

      {/* Bottom Row: Interactive Sector Quick-Buttons & Risk Level Segmented Control */}
      <div className="pt-3 border-t border-slate-700/70 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Sector Quick Pills/Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          <button
            type="button"
            onClick={() => onSelectSector('All Sectors')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap border ${
              selectedSector === 'All Sectors'
                ? 'bg-blue-600 text-white border-blue-500'
                : 'bg-[#0f172a] text-slate-400 hover:text-white border-slate-800'
            }`}
          >
            All Sectors ({totalCount})
          </button>
          {sectors.slice(0, 7).map(sec => (
            <button
              key={sec.name}
              type="button"
              onClick={() =>
                onSelectSector(selectedSector === sec.name ? 'All Sectors' : sec.name)
              }
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap border tabular-nums ${
                selectedSector === sec.name
                  ? 'bg-blue-600 text-white border-blue-500'
                  : 'bg-[#0f172a] text-slate-300 hover:text-white border-slate-800'
              }`}
            >
              {sec.name} ({sec.count})
            </button>
          ))}
        </div>

        {/* Risk Level Segmented Control */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-400 flex items-center gap-1 mr-1">
            <ShieldAlert size={13} className="text-slate-400" />
            Risk Level:
          </span>
          {RISK_LEVEL_OPTIONS.map(opt => {
            const active = selectedRiskLevel === opt.id;
            const count = riskCounts[opt.id] ?? 0;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() =>
                  onSelectRiskLevel(active && opt.id !== 'ALL' ? 'ALL' : opt.id)
                }
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap border flex items-center gap-1.5 tabular-nums ${
                  active
                    ? opt.activeClass
                    : 'bg-[#0f172a] text-slate-300 hover:text-white border-slate-800'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${opt.dotColor}`} />
                <span>{opt.label}</span>
                <span className="opacity-80">({count})</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
