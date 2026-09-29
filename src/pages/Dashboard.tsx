import { useState, useEffect, useMemo } from 'react';
import {
  ShieldAlert,
  TrendingUp,
  Activity,
  AlertTriangle,
  Users,
  Database,
  Cpu,
  BellRing,
  Scale,
  Eye,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import ProjectHealthCard, {
  ProjectHealthStatusBadge,
  getProjectHealthStatus,
  ProjectHealthStatusType,
  ProjectHealthSummaryData,
} from '../components/ProjectHealthCard';
import SubSectorAnomalyHeatmap from '../components/SubSectorAnomalyHeatmap';
import DashboardSegmentationFilter, { RiskLevelSegment } from '../components/DashboardSegmentationFilter';
import { generateAndDownloadDashboardPdf } from '../utils/pdfReportGenerator';
import { useAuth, ROLE_LABELS } from '../context/AuthContext';

export default function Dashboard() {
  const { user, token, logAuditAction } = useAuth();
  const [data, setData] = useState<any>(null);
  const [adminSummary, setAdminSummary] = useState<any>(null);

  // Global Dashboard Segmentation State (Sector & Risk Level)
  const [selectedSector, setSelectedSector] = useState<string>('All Sectors');
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<RiskLevelSegment>('ALL');

  // Directory table status & search state
  const [statusFilter, setStatusFilter] = useState<'ALL' | ProjectHealthStatusType>('ALL');
  const [projectSearch, setProjectSearch] = useState<string>('');

  useEffect(() => {
    fetch('/api/dashboard')
      .then(res => res.json())
      .then(data => setData(data))
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    if (user?.role === 'ADMINISTRATOR' && token) {
      Promise.all([
        fetch('/api/admin/system-status', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
        fetch('/api/admin/audit-logs', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      ])
        .then(([sys, logs]) => {
          setAdminSummary({
            system: sys,
            recentLogs: (logs?.logs || []).slice(0, 4),
          });
        })
        .catch(() => {});
    }
  }, [user, token]);

  const rawProjects: any[] = useMemo(() => {
    if (!data) return [];
    return data.projects || data.projectHealth?.watchlist || [];
  }, [data]);

  // Available sectors with counts (respecting risk level filter so counts stay informative)
  const sectorOptions = useMemo(() => {
    const map = new Map<string, number>();
    rawProjects.forEach(p => {
      if (selectedRiskLevel === 'ALL' || p.risk_level === selectedRiskLevel) {
        map.set(p.sector, (map.get(p.sector) || 0) + 1);
      } else if (!map.has(p.sector)) {
        map.set(p.sector, 0);
      }
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [rawProjects, selectedRiskLevel]);

  // Risk level counts (respecting sector filter)
  const riskCounts = useMemo<Record<RiskLevelSegment, number>>(() => {
    const sectorMatched =
      selectedSector === 'All Sectors'
        ? rawProjects
        : rawProjects.filter(p => p.sector === selectedSector);
    return {
      ALL: sectorMatched.length,
      LOW: sectorMatched.filter(p => p.risk_level === 'LOW').length,
      MODERATE: sectorMatched.filter(p => p.risk_level === 'MODERATE').length,
      HIGH: sectorMatched.filter(p => p.risk_level === 'HIGH').length,
      CRITICAL: sectorMatched.filter(p => p.risk_level === 'CRITICAL').length,
    };
  }, [rawProjects, selectedSector]);

  // Segmented projects list based on selected Sector and Risk Level
  const segmentedProjects = useMemo(() => {
    return rawProjects.filter(p => {
      const matchesSector = selectedSector === 'All Sectors' || p.sector === selectedSector;
      const matchesRisk = selectedRiskLevel === 'ALL' || p.risk_level === selectedRiskLevel;
      return matchesSector && matchesRisk;
    });
  }, [rawProjects, selectedSector, selectedRiskLevel]);

  // Dynamically recompute Dashboard KPIs, ProjectHealthSummaryData, Risk Distribution, and Sector Breakdown from segmentedProjects
  const segmentedAnalytics = useMemo(() => {
    const list = segmentedProjects;
    const count = Math.max(1, list.length);

    const totalOriginalCost = list.reduce((s, p) => s + (p.original_cost || 0), 0);
    const totalRevisedCost = list.reduce((s, p) => s + (p.revised_cost || 0), 0);
    const totalExpenditure = list.reduce((s, p) => s + (p.expenditure || 0), 0);

    const highRiskProjects = list.filter(p => (p.overall_risk_score || 0) >= 50).length;
    const criticalEarlyWarnings = list.filter(p => (p.overall_risk_score || 0) >= 75).length;
    const projectsWithCostOverrun = list.filter(p => (p.revised_cost || 0) > (p.original_cost || 0)).length;
    const projectsWithTimeOverrun = list.filter(
      p => (p.time_overrun_days ?? 0) > 0 || (p.schedule_risk_score ?? 0) >= 50
    ).length;

    const avgOverallRisk = Number(
      (list.reduce((s, p) => s + (p.overall_risk_score || 0), 0) / count).toFixed(1)
    );
    const avgCostRisk = Number(
      (list.reduce((s, p) => s + (p.cost_risk_score || 0), 0) / count).toFixed(1)
    );
    const avgScheduleRisk = Number(
      (list.reduce((s, p) => s + (p.schedule_risk_score || 0), 0) / count).toFixed(1)
    );
    const avgProgress = Number(
      (list.reduce((s, p) => s + (p.physical_progress || 0), 0) / count).toFixed(1)
    );

    const portfolioCostVariancePct =
      totalOriginalCost > 0
        ? Number((((totalRevisedCost - totalOriginalCost) / totalOriginalCost) * 100).toFixed(1))
        : 0;
    const portfolioExpenditurePct =
      totalRevisedCost > 0
        ? Number(((totalExpenditure / totalRevisedCost) * 100).toFixed(1))
        : 0;

    const withinBudgetCount = list.filter(p => (p.cost_overrun_pct || 0) <= 5).length;
    const moderateOverrunCount = list.filter(
      p => (p.cost_overrun_pct || 0) > 5 && (p.cost_overrun_pct || 0) <= 25
    ).length;
    const severeOverrunCount = list.filter(p => (p.cost_overrun_pct || 0) > 25).length;

    const onScheduleCount = list.filter(p => (p.time_overrun_days ?? 0) === 0).length;
    const delayedList = list.filter(p => (p.time_overrun_days ?? 0) > 0);
    const avgDelayDays =
      delayedList.length > 0
        ? Math.round(
            delayedList.reduce((s, p) => s + (p.time_overrun_days ?? 0), 0) / delayedList.length
          )
        : 0;

    const riskDistribution = [
      { name: 'Low', value: list.filter(p => p.risk_level === 'LOW').length, color: '#22c55e' },
      { name: 'Moderate', value: list.filter(p => p.risk_level === 'MODERATE').length, color: '#eab308' },
      { name: 'High', value: list.filter(p => p.risk_level === 'HIGH').length, color: '#f97316' },
      { name: 'Critical', value: list.filter(p => p.risk_level === 'CRITICAL').length, color: '#ef4444' },
    ];

    const secSet = Array.from(new Set(list.map(p => p.sector)));
    const sectorBreakdown = secSet
      .map(sec => {
        const secItems = list.filter(p => p.sector === sec);
        return {
          name: sec.length > 18 ? sec.slice(0, 16) + '…' : sec,
          fullName: sec,
          cost: Math.round(secItems.reduce((s, p) => s + (p.original_cost || 0), 0)),
          revised: Math.round(secItems.reduce((s, p) => s + (p.revised_cost || 0), 0)),
          count: secItems.length,
        };
      })
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 8);

    const projectHealth: ProjectHealthSummaryData = {
      avgOverallRisk,
      avgCostRisk,
      avgScheduleRisk,
      avgProgress,
      portfolioCostVariancePct,
      portfolioExpenditurePct,
      withinBudgetCount,
      moderateOverrunCount,
      severeOverrunCount,
      onScheduleCount,
      delayedCount: delayedList.length,
      avgDelayDays,
      medianProjectedCompletion: data?.projectHealth?.medianProjectedCompletion || '31/03/2027 (Q4 FY27)',
      watchlist: list.slice(0, 30).map(p => ({
        id: p.id,
        name: p.name,
        sector: p.sector,
        ministry: p.ministry,
        state: p.state,
        original_cost: p.original_cost,
        revised_cost: p.revised_cost,
        expenditure: p.expenditure,
        expenditure_pct: p.expenditure_pct,
        physical_progress: p.physical_progress,
        cost_overrun_pct: p.cost_overrun_pct,
        time_overrun_days: p.time_overrun_days ?? 0,
        projected_completion: p.revised_commissioning || p.original_commissioning || '31/03/2027',
        original_completion: p.original_commissioning || 'N/A',
        overall_risk_score: p.overall_risk_score,
        risk_level: p.risk_level,
      })),
    };

    return {
      totalProjects: list.length,
      totalOriginalCost,
      totalRevisedCost,
      totalExpenditure,
      highRiskProjects,
      criticalEarlyWarnings,
      projectsWithCostOverrun,
      projectsWithTimeOverrun,
      riskDistribution,
      sectorBreakdown,
      projectHealth,
    };
  }, [segmentedProjects, data]);

  if (!data) return <div className="p-8 text-center text-slate-400">Loading infrastructure intelligence...</div>;

  const attentionProjects = [...segmentedProjects]
    .filter(p => p.overall_risk_score >= 50 || p.cost_overrun_pct > 25)
    .sort((a, b) => b.overall_risk_score - a.overall_risk_score)
    .slice(0, 5);

  const statusCounts = {
    'On Track': segmentedProjects.filter(p => getProjectHealthStatus(p) === 'On Track').length,
    Delayed: segmentedProjects.filter(p => getProjectHealthStatus(p) === 'Delayed').length,
    'At Risk': segmentedProjects.filter(p => getProjectHealthStatus(p) === 'At Risk').length,
    Critical: segmentedProjects.filter(p => getProjectHealthStatus(p) === 'Critical').length,
  };

  const filteredDashboardProjects = segmentedProjects
    .filter(p => {
      const matchesStatus = statusFilter === 'ALL' || getProjectHealthStatus(p) === statusFilter;
      const q = projectSearch.trim().toLowerCase();
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.sector.toLowerCase().includes(q) ||
        (p.state && p.state.toLowerCase().includes(q));
      return matchesStatus && matchesQuery;
    })
    .slice(0, 12);

  const ministryCount = new Set(segmentedProjects.map(p => p.ministry)).size;
  const isViewer = user?.role === 'VIEWER';

  const handleExportBrief = async () => {
    await generateAndDownloadDashboardPdf();
    await logAuditAction('EXPORT_REPORT', 'Generated Executive Brief PDF from Dashboard');
  };

  return (
    <div key={`dashboard-role-${user?.role || 'guest'}`} className="space-y-6 nirvana-role-context-transition">
      {/* Header & Role Greeting */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <div className="text-xs font-semibold text-blue-400 mb-1">
            {user?.role === 'ADMINISTRATOR'
              ? 'System Administration'
              : user?.role === 'MONITORING_OFFICER'
              ? 'Welcome back, Monitoring Officer'
              : user?.role === 'POLICY_ANALYST'
              ? 'Welcome back, Policy Analyst'
              : 'Welcome to NIRVANA'}
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">
            {user ? `${user.name} · ${ROLE_LABELS[user.role]} Dashboard` : 'Executive Overview'}
          </h2>
          <p className="text-slate-400 text-sm">
            {user?.organization
              ? `${user.organization} — National Infrastructure Risk & Vision Analytics Network`
              : 'From project data to predictive risk intelligence.'}
          </p>
        </div>

        {!isViewer && (
          <button
            type="button"
            onClick={handleExportBrief}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 self-start sm:self-auto"
          >
            <FileTextIcon />
            Generate Executive Brief
          </button>
        )}
      </div>

      {/* =====================================================================
          PORTFOLIO SEGMENTATION FILTER COMPONENT (Sector & Risk Level)
         ===================================================================== */}
      <DashboardSegmentationFilter
        sectors={sectorOptions}
        selectedSector={selectedSector}
        onSelectSector={setSelectedSector}
        riskCounts={riskCounts}
        selectedRiskLevel={selectedRiskLevel}
        onSelectRiskLevel={setSelectedRiskLevel}
        filteredCount={segmentedProjects.length}
        totalCount={rawProjects.length}
        filteredOriginalCost={segmentedAnalytics.totalOriginalCost}
        filteredRevisedCost={segmentedAnalytics.totalRevisedCost}
        onReset={() => {
          setSelectedSector('All Sectors');
          setSelectedRiskLevel('ALL');
        }}
      />

      {/* =====================================================================
          ROLE-PERSONALIZED BRIEFING PANEL (Section 13)
         ===================================================================== */}
      {user?.role === 'MONITORING_OFFICER' && (
        <div className="bg-[#1e293b] border border-blue-800/60 rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/70 pb-3">
            <div>
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <BellRing size={17} className="text-amber-400" />
                Welcome back, Monitoring Officer — Operational Action Briefing
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Projects requiring immediate attention, high-risk corridors, early warnings, and recent milestone updates.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/warnings"
                className="px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
              >
                <span>Early Warnings ({segmentedAnalytics.criticalEarlyWarnings})</span>
                <ArrowRight size={13} />
              </Link>
              <Link
                to="/projects"
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors"
              >
                Inspect All Projects
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 tabular-nums text-xs">
            <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-3.5">
              <div className="text-slate-400">Projects Requiring Attention</div>
              <div className="text-xl font-bold text-amber-400 mt-1">{segmentedAnalytics.highRiskProjects}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Risk Score ≥ 50 / 100</div>
            </div>
            <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-3.5">
              <div className="text-slate-400">Critical Early Warnings</div>
              <div className="text-xl font-bold text-red-400 mt-1">{segmentedAnalytics.criticalEarlyWarnings}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Multi-factor escalation alerts</div>
            </div>
            <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-3.5">
              <div className="text-slate-400">Cost-Escalated Projects</div>
              <div className="text-xl font-bold text-white mt-1">{segmentedAnalytics.projectsWithCostOverrun}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Revised cost &gt; original sanction</div>
            </div>
            <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-3.5">
              <div className="text-slate-400">Schedule-Slipped Corridors</div>
              <div className="text-xl font-bold text-white mt-1">{segmentedAnalytics.projectsWithTimeOverrun}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Mean delay: {segmentedAnalytics.projectHealth.avgDelayDays || 0} days
              </div>
            </div>
          </div>

          {attentionProjects.length > 0 && (
            <div className="overflow-x-auto pt-1">
              <div className="text-xs font-semibold text-slate-300 mb-2">
                Priority Projects Requiring Immediate Officer Review
              </div>
              <table className="w-full text-left text-xs text-slate-300 tabular-nums">
                <thead className="text-slate-400 border-b border-slate-700">
                  <tr>
                    <th className="py-1.5 pr-3">Code</th>
                    <th className="py-1.5 px-3">Project Name</th>
                    <th className="py-1.5 px-3">Sector</th>
                    <th className="py-1.5 px-3">Status Badge</th>
                    <th className="py-1.5 px-3 text-right">Cost Overrun</th>
                    <th className="py-1.5 px-3 text-right">Physical Progress</th>
                    <th className="py-1.5 pl-3 text-right">Risk Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {attentionProjects.map(p => (
                    <tr key={p.id}>
                      <td className="py-2 pr-3 font-mono text-blue-400">{p.id}</td>
                      <td className="py-2 px-3 text-white font-medium">{p.name}</td>
                      <td className="py-2 px-3 text-slate-400">{p.sector}</td>
                      <td className="py-2 px-3">
                        <ProjectHealthStatusBadge project={p} />
                      </td>
                      <td className="py-2 px-3 text-right text-amber-400">+{p.cost_overrun_pct}%</td>
                      <td className="py-2 px-3 text-right">{p.physical_progress}%</td>
                      <td className="py-2 pl-3 text-right font-bold text-red-400">{p.overall_risk_score} / 100</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {user?.role === 'POLICY_ANALYST' && (
        <div className="bg-[#1e293b] border border-indigo-800/60 rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/70 pb-3">
            <div>
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Scale size={17} className="text-indigo-400" />
                Welcome back, Policy Analyst — Macro Sector, Ministry & Benchmarking Brief
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Sector risk distribution, ministry comparisons, cost escalation analysis, schedule trends, and benchmarking.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/benchmarking"
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
              >
                <span>Open Benchmarking Matrix</span>
                <ArrowRight size={13} />
              </Link>
              <Link
                to="/ml"
                className="px-3 py-1.5 bg-[#0f172a] hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
              >
                Model Insights
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 tabular-nums text-xs">
            <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-3.5">
              <div className="text-slate-400">Sector Risk Index</div>
              <div className="text-xl font-bold text-white mt-1">
                {segmentedAnalytics.projectHealth.avgOverallRisk} / 100
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Across {segmentedAnalytics.sectorBreakdown.length} active sectors
              </div>
            </div>
            <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-3.5">
              <div className="text-slate-400">Central Ministries</div>
              <div className="text-xl font-bold text-indigo-400 mt-1">{ministryCount}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Active line ministries</div>
            </div>
            <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-3.5">
              <div className="text-slate-400">Net Cost Escalation</div>
              <div className="text-xl font-bold text-amber-400 mt-1">
                +{segmentedAnalytics.projectHealth.portfolioCostVariancePct}%
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Sanctioned vs. Revised</div>
            </div>
            <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-3.5">
              <div className="text-slate-400">Mean Schedule Delay</div>
              <div className="text-xl font-bold text-white mt-1">
                {segmentedAnalytics.projectHealth.avgDelayDays} days
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {segmentedAnalytics.projectHealth.delayedCount} delayed projects
              </div>
            </div>
            <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-3.5">
              <div className="text-slate-400">Expenditure Utilization</div>
              <div className="text-xl font-bold text-emerald-400 mt-1">
                {segmentedAnalytics.projectHealth.portfolioExpenditurePct}%
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Mean Progress: {segmentedAnalytics.projectHealth.avgProgress}%
              </div>
            </div>
          </div>
        </div>
      )}

      {user?.role === 'VIEWER' && (
        <div className="bg-[#1e293b] border border-slate-700 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Eye size={17} className="text-blue-400" />
              Welcome to NIRVANA — Read-Only Public Oversight View
            </h3>
            <p className="text-xs text-slate-400">
              You have read-only access to the Project Overview, Project Details, Basic Risk Intelligence, and Basic Analytics. Data upload, user management, and administrative settings are restricted.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/projects"
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors"
            >
              Explore Projects
            </Link>
            <Link
              to="/analytics"
              className="px-3.5 py-2 bg-[#0f172a] hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
            >
              Basic Analytics
            </Link>
          </div>
        </div>
      )}

      {user?.role === 'ADMINISTRATOR' && (
        <div className="bg-[#1e293b] border border-blue-800/70 rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/70 pb-3">
            <div>
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Cpu size={17} className="text-blue-400" />
                System Administration — Platform, Data Quality, Models & User Governance
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time administrative telemetry across dataset quality, ML pipeline readiness, registered users, and audit activity.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to="/users"
                className="px-3 py-1.5 bg-[#0f172a] hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                <Users size={13} className="text-blue-400" />
                <span>Manage Users</span>
              </Link>
              <Link
                to="/data"
                className="px-3 py-1.5 bg-[#0f172a] hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                <Database size={13} className="text-emerald-400" />
                <span>Dataset Governance</span>
              </Link>
              <Link
                to="/admin"
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors"
              >
                Audit Logs & Settings
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 tabular-nums text-xs">
            <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-3.5">
              <div className="text-slate-400">System Status</div>
              <div className="text-lg font-bold text-emerald-400 mt-1">
                {adminSummary?.system?.status || 'OPERATIONAL'}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">{rawProjects.length} active project records</div>
            </div>
            <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-3.5">
              <div className="text-slate-400">Data Quality Score</div>
              <div className="text-lg font-bold text-white mt-1">
                {adminSummary?.system?.dataQuality?.overallQualityScore ?? 98.4}%
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">MoSPI schema validated</div>
            </div>
            <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-3.5">
              <div className="text-slate-400">ML Models Status</div>
              <div className="text-lg font-bold text-blue-400 mt-1">3 / 3 READY</div>
              <div className="text-[11px] text-slate-500 mt-0.5">RF · Gradient Boosting · IsoForest</div>
            </div>
            <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-3.5">
              <div className="text-slate-400">Registered Users</div>
              <div className="text-lg font-bold text-white mt-1">
                {adminSummary?.system?.activeUsersCount ?? 4} Active
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {adminSummary?.system?.auditEventsCount ?? 3} Audit Log events
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards (Segmented in real time) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Monitored Projects" value={segmentedAnalytics.totalProjects} icon={<Activity />} />
        <KpiCard
          title="Total Original Cost"
          value={`₹${(segmentedAnalytics.totalOriginalCost / 1000).toFixed(1)}k Cr`}
          icon={<TrendingUp />}
        />
        <KpiCard title="High-Risk Projects" value={segmentedAnalytics.highRiskProjects} alert icon={<AlertTriangle />} />
        <KpiCard
          title="Critical Warnings"
          value={segmentedAnalytics.criticalEarlyWarnings}
          alert
          icon={<ShieldAlert />}
        />
      </div>

      {/* Project Health Summary Card (Segmented in real time) */}
      <ProjectHealthCard
        health={segmentedAnalytics.projectHealth}
        totalProjects={segmentedAnalytics.totalProjects}
        totalOriginalCost={segmentedAnalytics.totalOriginalCost}
        totalRevisedCost={segmentedAnalytics.totalRevisedCost || segmentedAnalytics.totalOriginalCost}
      />

      {/* Real-Time Sub-Sector Anomaly Density Heatmap (D3.js) */}
      <SubSectorAnomalyHeatmap projects={segmentedProjects} />

      {/* Dashboard Project List with Color-Coded Status Badges */}
      <div className="bg-[#1e293b] rounded-xl border border-slate-700 p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-700/70">
          <div>
            <h3 className="text-base font-semibold text-white">
              Monitored Infrastructure Projects — Live Health Status Directory
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Color-coded status badges indicating real-time project health across cost escalation, commissioning delay, and ML risk score.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={projectSearch}
              onChange={e => setProjectSearch(e.target.value)}
              placeholder="Search project, code, or sector..."
              className="bg-[#0f172a] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
            />
            <div className="flex flex-wrap items-center bg-[#0f172a] p-1 rounded-lg border border-slate-700/80 text-xs">
              {(
                [
                  { id: 'ALL', label: `All (${segmentedProjects.length})` },
                  { id: 'On Track', label: `On Track (${statusCounts['On Track']})` },
                  { id: 'Delayed', label: `Delayed (${statusCounts.Delayed})` },
                  { id: 'At Risk', label: `At Risk (${statusCounts['At Risk']})` },
                  { id: 'Critical', label: `Critical (${statusCounts.Critical})` },
                ] as const
              ).map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap ${
                    statusFilter === tab.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300 tabular-nums">
            <thead className="text-slate-400 border-b border-slate-700">
              <tr>
                <th className="py-2.5 pr-3 font-medium">Code</th>
                <th className="py-2.5 px-3 font-medium">Project Name</th>
                <th className="py-2.5 px-3 font-medium">Sector & State</th>
                <th className="py-2.5 px-3 font-medium">Health Status Badge</th>
                <th className="py-2.5 px-3 font-medium text-right">Sanctioned vs Revised</th>
                <th className="py-2.5 px-3 font-medium text-right">Delay</th>
                <th className="py-2.5 px-3 font-medium text-right">Progress</th>
                <th className="py-2.5 pl-3 font-medium text-right">Composite Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {filteredDashboardProjects.map(p => (
                <tr key={p.id} className="hover:bg-[#0f172a]/50 transition-colors">
                  <td className="py-2.5 pr-3 font-mono text-blue-400 whitespace-nowrap">{p.id}</td>
                  <td className="py-2.5 px-3 font-medium text-white max-w-xs truncate" title={p.name}>
                    {p.name}
                  </td>
                  <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                    {p.sector} · {p.state}
                  </td>
                  <td className="py-2.5 px-3">
                    <ProjectHealthStatusBadge project={p} />
                  </td>
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    ₹{Number(p.original_cost).toLocaleString()} Cr → ₹{Number(p.revised_cost).toLocaleString()} Cr
                    {p.cost_overrun_pct > 0 && (
                      <span className="text-amber-400 ml-1">(+{p.cost_overrun_pct}%)</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    {(p.time_overrun_days ?? 0) > 0 ? `${p.time_overrun_days}d` : '0d'}
                  </td>
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">{p.physical_progress}%</td>
                  <td className="py-2.5 pl-3 text-right font-semibold text-white whitespace-nowrap">
                    {p.overall_risk_score} / 100
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Distribution */}
        <div className="bg-[#1e293b] rounded-xl border border-slate-700 p-5 col-span-1">
          <h3 className="text-sm font-medium text-slate-300 mb-4">Project Risk Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={segmentedAnalytics.riskDistribution}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {segmentedAnalytics.riskDistribution.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }}
                  itemStyle={{ color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 text-xs mt-2">
            {segmentedAnalytics.riskDistribution.map((d: any) => (
              <div key={d.name} className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }}></div>
                <span className="text-slate-300">
                  {d.name} ({d.value})
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Sector Cost Overview */}
        <div className="bg-[#1e293b] rounded-xl border border-slate-700 p-5 col-span-2">
          <h3 className="text-sm font-medium text-slate-300 mb-4">Original vs Revised Cost by Sector (Cr)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={segmentedAnalytics.sectorBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                <Bar dataKey="cost" name="Original Cost" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="revised" name="Revised Cost" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ title, value, icon, alert = false }: any) {
  return (
    <div className={`bg-[#1e293b] rounded-xl border ${alert ? 'border-red-900/50' : 'border-slate-700'} p-5 flex items-center justify-between`}>
      <div>
        <div className="text-slate-400 text-sm mb-1">{title}</div>
        <div className={`text-2xl font-bold ${alert ? 'text-red-400' : 'text-white'}`}>{value}</div>
      </div>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${alert ? 'bg-red-500/10 text-red-400' : 'bg-slate-800 text-blue-400'}`}>
        {icon}
      </div>
    </div>
  );
}

function FileTextIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>;
}
