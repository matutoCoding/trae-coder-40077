import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Eye, X } from "lucide-react";
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
  operator?: string;
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

export default function VulcanizationRecords() {
  const [records, setRecords] = useState<VulcanRecord[]>(defaultRecords);

  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [operatorSearch, setOperatorSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [appliedFilters, setAppliedFilters] = useState<{ keyword: string; status: string; operator: string; dateFrom: string; dateTo: string }>({
    keyword: "",
    status: "",
    operator: "",
    dateFrom: "",
    dateTo: "",
  });

  const [selectedRecord, setSelectedRecord] = useState<VulcanRecord | null>(null);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = () => {
    const params = new URLSearchParams();
    if (appliedFilters.keyword) params.append("keyword", appliedFilters.keyword);
    if (appliedFilters.status) params.append("status", appliedFilters.status);
    if (appliedFilters.operator) params.append("operator", appliedFilters.operator);
    if (appliedFilters.dateFrom) params.append("date_from", appliedFilters.dateFrom);
    if (appliedFilters.dateTo) params.append("date_to", appliedFilters.dateTo);
    const url = params.toString() ? `/api/vulcanization?${params.toString()}` : "/api/vulcanization";
    apiFetch<VulcanRecord[]>(url).then((d) => d && setRecords(d));
  };

  const handleFilter = () => {
    setAppliedFilters({
      keyword,
      status: statusFilter,
      operator: operatorSearch,
      dateFrom,
      dateTo,
    });
  };

  useEffect(() => {
    fetchRecords();
  }, [appliedFilters]);

  const handleReset = () => {
    setKeyword("");
    setStatusFilter("");
    setOperatorSearch("");
    setDateFrom("");
    setDateTo("");
    setAppliedFilters({
      keyword: "",
      status: "",
      operator: "",
      dateFrom: "",
      dateTo: "",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/vulcanization" className="p-1.5 rounded-md hover:bg-surface-lighter text-gray-400 hover:text-base transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <h2 className="text-lg font-display font-bold">硫化记录</h2>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs text-gray-500 mb-1.5">批次号关键字</label>
              <input
                type="text"
                className="input-field w-full"
                placeholder="搜索批次号..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>
            <div className="min-w-[140px]">
              <label className="block text-xs text-gray-500 mb-1.5">状态</label>
              <select className="input-field w-full" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">全部状态</option>
                <option value="completed">正常</option>
                <option value="abnormal">异常</option>
                <option value="timeout">超时</option>
              </select>
            </div>
            <div className="min-w-[140px]">
              <label className="block text-xs text-gray-500 mb-1.5">操作员</label>
              <input
                type="text"
                className="input-field w-full"
                placeholder="操作员姓名"
                value={operatorSearch}
                onChange={(e) => setOperatorSearch(e.target.value)}
              />
            </div>
            <div className="min-w-[150px]">
              <label className="block text-xs text-gray-500 mb-1.5">开始日期</label>
              <input
                type="date"
                className="input-field w-full"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="min-w-[150px]">
              <label className="block text-xs text-gray-500 mb-1.5">结束日期</label>
              <input
                type="date"
                className="input-field w-full"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <button onClick={handleFilter} className="btn-primary">筛选</button>
              <button onClick={handleReset} className="btn-secondary">重置</button>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body space-y-4">
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
                  <th className="table-header">操作</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-surface-border last:border-0 hover:bg-surface-lighter/50 cursor-pointer"
                    onClick={() => setSelectedRecord(r)}
                  >
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
                    <td className="table-cell">
                      <button
                        className="p-1.5 rounded-md hover:bg-surface-lighter text-gray-400 hover:text-steel transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRecord(r);
                        }}
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {records.length === 0 && (
            <div className="text-center py-8 text-gray-500">暂无匹配的硫化记录</div>
          )}
        </div>
      </div>

      {selectedRecord && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="card-header flex items-center justify-between">
              <h3 className="font-display font-semibold text-sm">硫化记录详情</h3>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1 rounded hover:bg-surface-lighter text-gray-400 hover:text-base transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="card-body space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">批次号</p>
                  <p className="text-sm font-mono text-amber">{selectedRecord.batchNo}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">状态</p>
                  <span className={statusBadgeMap[selectedRecord.status] || "badge-info"}>
                    {statusLabelMap[selectedRecord.status] || selectedRecord.status}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500">模具</p>
                  <p className="text-sm">{selectedRecord.moldNo}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">操作员</p>
                  <p className="text-sm">{selectedRecord.operator || "--"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">模温</p>
                  <p className={`text-sm ${selectedRecord.moldTemp < 160 ? "text-fail" : "text-pass"}`}>
                    {selectedRecord.moldTemp}°C <span className="text-gray-600 text-xs">/ 目标 {selectedRecord.moldTempTarget}°C</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">硫化时间</p>
                  <p className="text-sm">{selectedRecord.vulcanizationTime}秒 <span className="text-gray-600 text-xs">/ 目标 {selectedRecord.vulcanizationTimeTarget}秒</span></p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">压力</p>
                  <p className="text-sm">{selectedRecord.pressure} MPa</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">完成时间</p>
                  <p className="text-sm">{selectedRecord.endTime}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
