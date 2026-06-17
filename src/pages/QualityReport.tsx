import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

interface QualityData {
  overallPassRate: number;
  trend: { date: string; passRate: number }[];
  moduleBreakdown: { module: string; passRate: number; total: number; passed: number }[];
  batchDetails: { id: string; batchNo: string; module: string; passRate: number; status: string; completedAt: string }[];
}

const defaultData: QualityData = {
  overallPassRate: 94.6,
  trend: [
    { date: "06-12", passRate: 93.2 },
    { date: "06-13", passRate: 94.1 },
    { date: "06-14", passRate: 92.8 },
    { date: "06-15", passRate: 95.5 },
    { date: "06-16", passRate: 94.8 },
    { date: "06-17", passRate: 95.2 },
    { date: "06-18", passRate: 94.6 },
  ],
  moduleBreakdown: [
    { module: "密炼混炼", passRate: 92.3, total: 156, passed: 144 },
    { module: "开炼出片", passRate: 96.1, total: 128, passed: 123 },
    { module: "模压硫化", passRate: 93.5, total: 210, passed: 196 },
    { module: "去毛边", passRate: 97.0, total: 300, passed: 291 },
    { module: "尺寸检测", passRate: 91.8, total: 245, passed: 225 },
    { module: "物性试验", passRate: 95.4, total: 180, passed: 172 },
  ],
  batchDetails: [
    { id: "1", batchNo: "ML-20240618-001", module: "密炼混炼", passRate: 100, status: "pass", completedAt: "2024-06-18 09:30" },
    { id: "2", batchNo: "ML-20240618-002", module: "密炼混炼", passRate: 0, status: "fail", completedAt: "2024-06-18 10:15" },
    { id: "3", batchNo: "KL-20240618-001", module: "开炼出片", passRate: 100, status: "pass", completedAt: "2024-06-18 11:00" },
    { id: "4", batchNo: "VL-20240618-003", module: "模压硫化", passRate: 100, status: "pass", completedAt: "2024-06-18 10:30" },
    { id: "5", batchNo: "DB-20240618-001", module: "去毛边", passRate: 97.0, status: "pass", completedAt: "2024-06-18 12:00" },
    { id: "6", batchNo: "IC-20240618-002", module: "尺寸检测", passRate: 0, status: "fail", completedAt: "2024-06-18 10:45" },
    { id: "7", batchNo: "PT-20240618-001", module: "物性试验", passRate: 100, status: "pass", completedAt: "2024-06-18 14:00" },
    { id: "8", batchNo: "PT-20240618-002", module: "物性试验", passRate: 0, status: "fail", completedAt: "2024-06-18 13:30" },
  ],
};

export default function QualityReport() {
  const [data, setData] = useState<QualityData>(defaultData);

  useEffect(() => {
    apiFetch<QualityData>("/api/reports/quality").then((d) => d && setData(d));
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-display font-bold">质量报告</h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card sm:col-span-1">
          <div className="card-body text-center">
            <div className="text-xs text-gray-500 mb-2">综合合格率</div>
            <div className="text-4xl font-display font-bold text-pass">{data.overallPassRate}%</div>
            <div className="text-xs text-gray-500 mt-2">
              {data.overallPassRate >= 95 ? "达标" : "需关注"}
            </div>
          </div>
        </div>
        <div className="card sm:col-span-2">
          <div className="card-header">
            <h3 className="font-display font-semibold text-sm">合格率趋势</h3>
          </div>
          <div className="card-body">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333842" />
                  <XAxis dataKey="date" stroke="#666" tick={{ fontSize: 12 }} />
                  <YAxis domain={[85, 100]} stroke="#666" tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ backgroundColor: "#22262E", border: "1px solid #333842", borderRadius: 6, color: "#E8E6E1" }} />
                  <Line type="monotone" dataKey="passRate" stroke="#34D399" strokeWidth={2} dot={{ r: 4, fill: "#34D399" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="font-display font-semibold text-sm">各工序质量概况</h3>
        </div>
        <div className="card-body">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.moduleBreakdown} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#333842" />
                <XAxis type="number" domain={[0, 100]} stroke="#666" tick={{ fontSize: 12 }} />
                <YAxis dataKey="module" type="category" stroke="#666" tick={{ fontSize: 12 }} width={80} />
                <Tooltip contentStyle={{ backgroundColor: "#22262E", border: "1px solid #333842", borderRadius: 6, color: "#E8E6E1" }} />
                <Bar dataKey="passRate" fill="#E8A317" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4">
            {data.moduleBreakdown.map((m) => (
              <div key={m.module} className="p-3 rounded-lg bg-surface-lighter text-center">
                <div className="text-xs text-gray-500 mb-1">{m.module}</div>
                <div className={`text-lg font-display font-bold ${m.passRate >= 95 ? "text-pass" : m.passRate >= 90 ? "text-amber" : "text-fail"}`}>
                  {m.passRate}%
                </div>
                <div className="text-2xs text-gray-600">{m.passed}/{m.total}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="font-display font-semibold text-sm">批次质量明细</h3>
        </div>
        <div className="card-body">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-surface-border">
                  <th className="table-header">批次号</th>
                  <th className="table-header">工序</th>
                  <th className="table-header">合格率</th>
                  <th className="table-header">结果</th>
                  <th className="table-header">完成时间</th>
                </tr>
              </thead>
              <tbody>
                {data.batchDetails.map((b) => (
                  <tr key={b.id} className="border-b border-surface-border last:border-0 hover:bg-surface-lighter/50">
                    <td className="table-cell font-mono text-amber">{b.batchNo}</td>
                    <td className="table-cell">{b.module}</td>
                    <td className="table-cell">
                      <span className={b.passRate >= 95 ? "text-pass" : b.passRate > 0 ? "text-amber" : "text-fail"}>
                        {b.passRate}%
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className={b.status === "pass" ? "badge-pass" : "badge-fail"}>
                        {b.status === "pass" ? "合格" : "不合格"}
                      </span>
                    </td>
                    <td className="table-cell text-gray-400">{b.completedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
