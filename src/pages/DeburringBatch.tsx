import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Eye, X } from "lucide-react";
import { apiFetch, apiFetchFull } from "@/lib/utils";
import { useToast } from "@/components/Toast";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";

interface DeburrBatch {
  id: string;
  batchNo: string;
  vulcanizationBatchId: string;
  method: string;
  operator: string;
  totalCount: number;
  qualifiedCount: number;
  qualifiedRate: number;
  status: string;
}

const statusBadgeMap: Record<string, string> = {
  pending: "badge-info",
  processing: "badge-info",
  in_progress: "badge-info",
  completed: "badge-pass",
  abnormal: "badge-fail",
};

const statusLabelMap: Record<string, string> = {
  pending: "处理中",
  processing: "处理中",
  in_progress: "处理中",
  completed: "已完成",
  abnormal: "异常",
};

const methodLabelMap: Record<string, string> = {
  manual: "手工",
  freezing: "冷冻",
  mechanical: "机械",
};

interface VulcanizationBatchOption {
  id: string;
  batchNo: string;
}

const defaultBatches: DeburrBatch[] = [
  { id: "1", batchNo: "DB-20240618-001", vulcanizationBatchId: "VL-20240618-003", method: "freezing", operator: "赵师傅", totalCount: 500, qualifiedCount: 485, qualifiedRate: 97.0, status: "completed" },
  { id: "2", batchNo: "DB-20240618-002", vulcanizationBatchId: "VL-20240617-008", method: "mechanical", operator: "钱师傅", totalCount: 300, qualifiedCount: 288, qualifiedRate: 96.0, status: "completed" },
  { id: "3", batchNo: "DB-20240618-003", vulcanizationBatchId: "VL-20240617-006", method: "manual", operator: "孙师傅", totalCount: 200, qualifiedCount: 0, qualifiedRate: 0, status: "processing" },
  { id: "4", batchNo: "DB-20240618-004", vulcanizationBatchId: "VL-20240617-007", method: "freezing", operator: "李师傅", totalCount: 400, qualifiedCount: 0, qualifiedRate: 0, status: "pending" },
];

export default function DeburringBatch() {
  const [batches, setBatches] = useState<DeburrBatch[]>(defaultBatches);
  const [vulcanizationBatches, setVulcanizationBatches] = useState<VulcanizationBatchOption[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [vulcanizationBatchId, setVulcanizationBatchId] = useState("");
  const [method, setMethod] = useState("freezing");
  const [operator, setOperator] = useState("");
  const [totalCount, setTotalCount] = useState("");
  const { showToast } = useToast();

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

  const [selectedBatch, setSelectedBatch] = useState<DeburrBatch | null>(null);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const highlightId = searchParams.get('highlight');
    if (highlightId && batches.length > 0) {
      const target = batches.find(b => b.id === highlightId);
      if (target) setSelectedBatch(target);
    }
  }, [searchParams, batches]);

  useEffect(() => {
    fetchBatches();
    apiFetch<VulcanizationBatchOption[]>("/api/vulcanization").then((d) => d && setVulcanizationBatches(d));
  }, []);

  const fetchBatches = () => {
    const params = new URLSearchParams();
    if (appliedFilters.keyword) params.append("keyword", appliedFilters.keyword);
    if (appliedFilters.status) params.append("status", appliedFilters.status);
    if (appliedFilters.operator) params.append("operator", appliedFilters.operator);
    if (appliedFilters.dateFrom) params.append("date_from", appliedFilters.dateFrom);
    if (appliedFilters.dateTo) params.append("date_to", appliedFilters.dateTo);
    const url = params.toString() ? `/api/deburring?${params.toString()}` : "/api/deburring";
    apiFetch<DeburrBatch[]>(url).then((d) => d && setBatches(d));
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
    fetchBatches();
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

  const handleCreate = () => {
    if (!vulcanizationBatchId || !operator || !totalCount) {
      showToast("请填写所有必填项", "error");
      return;
    }
    if (Number(totalCount) <= 0) {
      showToast("总数必须为大于0的正整数", "error");
      return;
    }
    apiFetchFull("/api/deburring", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vulcanization_batch_id: vulcanizationBatchId,
        method,
        operator,
        total_count: Number(totalCount),
      }),
    }).then((r) => {
      if (r.success) {
        showToast("去毛边批次创建成功", "success");
        fetchBatches();
        setShowForm(false);
        setVulcanizationBatchId("");
        setMethod("freezing");
        setOperator("");
        setTotalCount("");
      } else {
        showToast(r.error || "去毛边批次创建失败", "error");
      }
    });
  };

  const completedBatches = batches.filter((b) => b.status === "completed");
  const overallQualifiedRate = completedBatches.length > 0
    ? completedBatches.reduce((s, b) => s + b.qualifiedRate, 0) / completedBatches.length
    : 0;

  const pieData = [
    { name: "合格", value: overallQualifiedRate, color: "#34D399" },
    { name: "不合格", value: 100 - overallQualifiedRate, color: "#EF4444" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-display font-bold">去毛边</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          新建批次
        </button>
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
                <option value="processing">处理中</option>
                <option value="completed">已完成</option>
                <option value="abnormal">异常</option>
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

      {showForm && (
        <div className="card">
          <div className="card-header">
            <h3 className="font-display font-semibold text-sm">新建去毛边批次</h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">关联硫化批次</label>
                <select className="input-field w-full" value={vulcanizationBatchId} onChange={(e) => setVulcanizationBatchId(e.target.value)}>
                  <option value="">选择硫化批次</option>
                  {vulcanizationBatches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.batchNo}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">去边方式</label>
                <select className="input-field w-full" value={method} onChange={(e) => setMethod(e.target.value)}>
                  <option value="manual">手工</option>
                  <option value="freezing">冷冻</option>
                  <option value="mechanical">机械</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">操作员</label>
                <input
                  type="text"
                  className="input-field w-full"
                  value={operator}
                  onChange={(e) => setOperator(e.target.value)}
                  placeholder="操作员姓名"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">总数</label>
                <input
                  type="number"
                  className="input-field w-full"
                  value={totalCount}
                  onChange={(e) => setTotalCount(e.target.value)}
                  placeholder="输入总数"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleCreate} className="btn-primary">确认创建</button>
              <button onClick={() => setShowForm(false)} className="btn-secondary">取消</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card">
          <div className="card-header">
            <h3 className="font-display font-semibold text-sm">合格率统计</h3>
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
                <span className="text-2xl font-display font-bold text-pass">{overallQualifiedRate.toFixed(1)}%</span>
                <span className="text-2xs text-gray-500">综合合格率</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card lg:col-span-2">
          <div className="card-header">
            <h3 className="font-display font-semibold text-sm">批次列表</h3>
          </div>
          <div className="card-body">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-surface-border">
                    <th className="table-header">批次号</th>
                    <th className="table-header">关联硫化批次</th>
                    <th className="table-header">去边方式</th>
                    <th className="table-header">总数</th>
                    <th className="table-header">合格数</th>
                    <th className="table-header">合格率</th>
                    <th className="table-header">状态</th>
                    <th className="table-header">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((b) => (
                    <tr
                      key={b.id}
                      className="border-b border-surface-border last:border-0 hover:bg-surface-lighter/50 cursor-pointer"
                      onClick={() => setSelectedBatch(b)}
                    >
                      <td className="table-cell font-mono text-amber">{b.batchNo}</td>
                      <td className="table-cell text-steel">{b.vulcanizationBatchId}</td>
                      <td className="table-cell">{methodLabelMap[b.method] || b.method}</td>
                      <td className="table-cell">{b.totalCount}</td>
                      <td className="table-cell">{b.qualifiedCount > 0 ? b.qualifiedCount : "--"}</td>
                      <td className="table-cell">
                        {b.qualifiedRate > 0 ? (
                          <span className={b.qualifiedRate >= 95 ? "text-pass" : "text-fail"}>
                            {b.qualifiedRate.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-gray-600">--</span>
                        )}
                      </td>
                      <td className="table-cell">
                        <span className={statusBadgeMap[b.status] || "badge-info"}>
                          {statusLabelMap[b.status] || b.status}
                        </span>
                      </td>
                      <td className="table-cell">
                        <button
                          className="p-1.5 rounded-md hover:bg-surface-lighter text-gray-400 hover:text-steel transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBatch(b);
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
          </div>
        </div>
      </div>

      {selectedBatch && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="card-header flex items-center justify-between">
              <h3 className="font-display font-semibold text-sm">去毛边批次详情</h3>
              <button
                onClick={() => setSelectedBatch(null)}
                className="p-1 rounded hover:bg-surface-lighter text-gray-400 hover:text-base transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="card-body space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">批次号</p>
                  <p className="text-sm font-mono text-amber">{selectedBatch.batchNo}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">状态</p>
                  <span className={statusBadgeMap[selectedBatch.status] || "badge-info"}>
                    {statusLabelMap[selectedBatch.status] || selectedBatch.status}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500">关联硫化批次</p>
                  <p className="text-sm">{selectedBatch.vulcanizationBatchId}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">去边方式</p>
                  <p className="text-sm">{methodLabelMap[selectedBatch.method] || selectedBatch.method}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">操作员</p>
                  <p className="text-sm">{selectedBatch.operator}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">总数</p>
                  <p className="text-sm">{selectedBatch.totalCount}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">合格数</p>
                  <p className="text-sm">{selectedBatch.qualifiedCount > 0 ? selectedBatch.qualifiedCount : "--"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">合格率</p>
                  <p className={`text-sm ${selectedBatch.qualifiedRate >= 95 ? "text-pass" : selectedBatch.qualifiedRate > 0 ? "text-fail" : "text-gray-600"}`}>
                    {selectedBatch.qualifiedRate > 0 ? `${selectedBatch.qualifiedRate.toFixed(1)}%` : "--"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
