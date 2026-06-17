import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "@/lib/utils";
import {
  FlaskConical,
  Thermometer,
  Layers,
  Flame,
  Scissors,
  Ruler,
  TestTubes,
  AlertTriangle,
  TrendingUp,
  Package,
  CheckCircle2,
  XCircle,
  CalendarDays,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";

interface AlertItem {
  id: string;
  message: string;
  level: string;
  time: string;
}

interface DashboardData {
  totalBatches: number;
  completedBatches: number;
  abnormalBatches: number;
  todayBatches: number;
  passRate: number;
  recentAlerts: AlertItem[];
}

const defaultData: DashboardData = {
  totalBatches: 0,
  completedBatches: 0,
  abnormalBatches: 0,
  todayBatches: 0,
  passRate: 0,
  recentAlerts: [],
};

const moduleCards = [
  { path: "/formulas", label: "配方管理", icon: FlaskConical, color: "text-amber" },
  { path: "/mixing", label: "密炼混炼", icon: Thermometer, color: "text-red-400" },
  { path: "/milling", label: "开炼出片", icon: Layers, color: "text-steel" },
  { path: "/vulcanization", label: "模压硫化", icon: Flame, color: "text-orange-400" },
  { path: "/deburring", label: "去毛边", icon: Scissors, color: "text-pass" },
  { path: "/inspection", label: "尺寸检测", icon: Ruler, color: "text-purple-400" },
  { path: "/testing", label: "物性试验", icon: TestTubes, color: "text-cyan-400" },
];

const kpiCards = [
  { key: "totalBatches" as const, label: "总批次数", icon: Package, color: "text-amber", bg: "bg-amber-muted" },
  { key: "completedBatches" as const, label: "完成批次", icon: CheckCircle2, color: "text-pass", bg: "bg-pass-muted" },
  { key: "abnormalBatches" as const, label: "异常批次", icon: XCircle, color: "text-fail", bg: "bg-fail-muted" },
  { key: "todayBatches" as const, label: "今日批次", icon: CalendarDays, color: "text-steel", bg: "bg-steel-muted" },
];

const alertLevelMap: Record<string, string> = {
  error: "badge-fail",
  warn: "badge-warn",
  info: "badge-info",
  success: "badge-pass",
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData>(defaultData);

  useEffect(() => {
    apiFetch<DashboardData>("/api/reports/dashboard").then((d) => {
      if (!d) return;
      const alerts = (d.recentAlerts || []).map((a: AlertItem & Record<string, unknown>, i: number) => ({
        ...a,
        id: a.id || String(i),
        level: a.level || "warn",
        time: a.time || a.createdAt
          ? new Date(a.createdAt as string).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
          : "",
      }));
      setData({ ...d, recentAlerts: alerts });
    });
  }, []);

  const pieData = [
    { name: "合格", value: data.passRate, color: "#34D399" },
    { name: "不合格", value: 100 - data.passRate, color: "#EF4444" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.key} className="card">
              <div className="card-body flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg ${kpi.bg} flex items-center justify-center`}>
                  <Icon size={20} className={kpi.color} />
                </div>
                <div>
                  <div className="text-2xl font-display font-bold">
                    {data[kpi.key]}
                  </div>
                  <div className="text-xs text-gray-500">{kpi.label}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3 className="font-display font-semibold text-sm">合格率</h3>
            <TrendingUp size={16} className="text-amber" />
          </div>
          <div className="card-body flex items-center justify-center">
            <div className="relative w-40 h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={70}
                    dataKey="value"
                    startAngle={90}
                    endAngle={-270}
                    stroke="none"
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-display font-bold text-pass">{data.passRate}%</span>
                <span className="text-2xs text-gray-500">合格率</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card lg:col-span-2">
          <div className="card-header">
            <h3 className="font-display font-semibold text-sm">快捷入口</h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {moduleCards.map((mod) => {
                const Icon = mod.icon;
                return (
                  <Link
                    key={mod.path}
                    to={mod.path}
                    className="flex flex-col items-center gap-2 p-4 rounded-lg bg-surface-lighter hover:bg-surface-border transition-colors group"
                  >
                    <Icon size={28} className={`${mod.color} group-hover:scale-110 transition-transform`} />
                    <span className="text-xs text-gray-400 group-hover:text-base transition-colors">
                      {mod.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header flex items-center gap-2">
          <AlertTriangle size={16} className="text-amber" />
          <h3 className="font-display font-semibold text-sm">最近告警</h3>
        </div>
        <div className="card-body">
          {data.recentAlerts.length === 0 ? (
            <div className="text-center text-gray-500 py-8 text-sm">暂无告警</div>
          ) : (
            <div className="space-y-3">
              {data.recentAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between py-2 border-b border-surface-border last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className={alertLevelMap[alert.level] || "badge-info"}>{alert.level}</span>
                    <span className="text-sm">{alert.message}</span>
                  </div>
                  <span className="text-xs text-gray-500 shrink-0">{alert.time}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
