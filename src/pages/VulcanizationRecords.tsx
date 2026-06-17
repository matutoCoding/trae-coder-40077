import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Filter } from "lucide-react";
import { apiFetch } from "@/lib/utils";

interface VulcanRecord {
  id: string;
  batchNo: string;
  moldNo: string;
  moldTemp: number;
  moldTempTarget: number;
  vulcanizationTime: number;
  vulcanizationTimeTarget: number;
  pressure: number;
  status: string;
  endTime: string;
}

const statusBadgeMap: Record<string, string> = {
  completed: "badge-pass",
  abnormal: "badge-fail",
  timeout: "badge-warn",
};

const statusLabelMap: Record<string, string> = {
  completed: "正常",
  abnormal: "异常",
  timeout: "超时",
};

const defaultRecords: VulcanRecord[] = [
  { id: "1", batchNo: "VL-20240618-003", moldNo: "M-001", moldTemp: 170, moldTempTarget: 170, vulcanizationTime: 300, vulcanizationTimeTarget: 300, pressure: 12.8, status: "completed", endTime: "2024-06-18 10:30" },
  { id: "2", batchNo: "VL-20240618-002", moldNo: "M-003", moldTemp: 172, moldTempTarget: 170, vulcanizationTime: 340, vulcanizationTimeTarget: 300, pressure: 12.5, status: "timeout", endTime: "2024-06-18 10:15" },
  { id: "3", batchNo: "VL-20240617-008", moldNo: "M-002", moldTemp: 168, moldTempTarget: 170, vulcanizationTime: 300, vulcanizationTimeTarget: 300, pressure: 12.3, status: "completed", endTime: "2024-06-17 16:45" },
  { id: "4", batchNo: "VL-20240617-007", moldNo: "M-001", moldTemp: 145, moldTempTarget: 170, vulcanizationTime: 300, vulcanizationTimeTarget: 300, pressure: 11.2, status: "abnormal", endTime: "2024-06-17 15:20" },
  { id: "5", batchNo: "VL-20240617-006", moldNo: "M-002", moldTemp: 170, moldTempTarget: 170, vulcanizationTime: 300, vulcanizationTimeTarget: 300, pressure: 12.6, status: "completed", endTime: "2024-06-17 14:10" },
];

const statusFilters = [
  { key: "all", label: "全部" },
  { key: "completed", label: "正常" },
  { key: "abnormal", label: "异常" },
  { key: "timeout", label: "超时" },
];

export default function VulcanizationRecords() {
  const [records, setRecords] = useState<VulcanRecord[]>(defaultRecords);
  const [activeFilter, setActiveFilter] = useState("all");

  useEffect(() => {
    apiFetch<VulcanRecord[]>("/api/vulcanization").then((d) => d && setRecords(d));
  }, []);

  const filtered = records.filter((r) => activeFilter === "all" || r.status === activeFilter);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/vulcanization" className="p-1.5 rounded-md hover:bg-surface-lighter text-gray-400 hover:text-base transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <h2 className="text-lg font-display font-bold">硫化记录</h2>
      </div>

      <div className="card">
        <div className="card-body space-y-4">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-500" />
            <span className="text-sm text-gray-400 mr-2">状态筛选:</span>
            {statusFilters.map((f) => (
              <button
                key={f.key}
                className={`px-3 py-1 rounded-md text-sm transition-colors ${
                  activeFilter === f.key
                    ? "bg-amber-muted text-amber"
                    : "text-gray-400 hover:text-base hover:bg-surface-lighter"
                }`}
                onClick={() => setActiveFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-surface-border">
                  <th className="table-header">批次号</th>
                  <th className="table-header">模具</th>
                  <th className="table-header">模温</th>
                  <th className="table-header">硫化时间(秒)</th>
                  <th className="table-header">压力(MPa)</th>
                  <th className="table-header">状态</th>
                  <th className="table-header">完成时间</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-surface-border last:border-0 hover:bg-surface-lighter/50">
                    <td className="table-cell font-mono text-amber">{r.batchNo}</td>
                    <td className="table-cell">{r.moldNo}</td>
                    <td className="table-cell">
                      <span className={r.moldTemp < 160 ? "text-fail" : "text-pass"}>
                        {r.moldTemp}°C
                      </span>
                    </td>
                    <td className="table-cell">{r.vulcanizationTime}</td>
                    <td className="table-cell">{r.pressure}</td>
                    <td className="table-cell">
                      <span className={statusBadgeMap[r.status] || "badge-info"}>
                        {statusLabelMap[r.status] || r.status}
                      </span>
                    </td>
                    <td className="table-cell text-gray-400">{r.endTime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-8 text-gray-500">暂无匹配的硫化记录</div>
          )}
        </div>
      </div>
    </div>
  );
}
