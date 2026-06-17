import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Eye, X } from "lucide-react";
import { apiFetch } from "@/lib/utils";
import { useToast } from "@/components/Toast";

interface MillBatch {
  id: string;
  batchNo: string;
  mixingBatchId: string;
  machineNo: string;
  operator: string;
  thickness: number;
  thicknessTarget: number;
  passCount: number;
  sheetCount: number;
  status: string;
  createdAt?: string;
}

const statusBadgeMap: Record<string, string> = {
  pending: "badge-info",
  milling: "badge-info",
  completed: "badge-pass",
  abnormal: "badge-fail",
};

const statusLabelMap: Record<string, string> = {
  pending: "处理中",
  milling: "处理中",
  completed: "已完成",
  abnormal: "异常",
};

interface MixingBatchOption {
  id: string;
  batchNo: string;
}

const defaultBatches: MillBatch[] = [
  { id: "1", batchNo: "KL-20240618-001", mixingBatchId: "ML-20240618-001", machineNo: "开炼机#1", operator: "张师傅", thickness: 2.3, thicknessTarget: 2.5, passCount: 8, sheetCount: 12, status: "completed" },
  { id: "2", batchNo: "KL-20240618-002", mixingBatchId: "ML-20240618-002", machineNo: "开炼机#2", operator: "李师傅", thickness: 2.1, thicknessTarget: 2.5, passCount: 5, sheetCount: 8, status: "milling" },
  { id: "3", batchNo: "KL-20240618-003", mixingBatchId: "ML-20240618-003", machineNo: "开炼机#1", operator: "王师傅", thickness: 0, thicknessTarget: 2.0, passCount: 0, sheetCount: 0, status: "pending" },
  { id: "4", batchNo: "KL-20240618-004", mixingBatchId: "ML-20240618-004", machineNo: "开炼机#3", operator: "赵师傅", thickness: 1.8, thicknessTarget: 2.5, passCount: 6, sheetCount: 10, status: "abnormal" },
];

export default function MillingBatch() {
  const [batches, setBatches] = useState<MillBatch[]>(defaultBatches);
  const [mixingBatches, setMixingBatches] = useState<MixingBatchOption[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [mixingBatchId, setMixingBatchId] = useState("");
  const [machineNo, setMachineNo] = useState("");
  const [operator, setOperator] = useState("");
  const [thicknessTarget, setThicknessTarget] = useState("");
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

  const [selectedBatch, setSelectedBatch] = useState<MillBatch | null>(null);
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
    apiFetch<MixingBatchOption[]>("/api/mixing").then((d) => d && setMixingBatches(d));
  }, []);

  const fetchBatches = () => {
    const params = new URLSearchParams();
    if (appliedFilters.keyword) params.append("keyword", appliedFilters.keyword);
    if (appliedFilters.status) params.append("status", appliedFilters.status);
    if (appliedFilters.operator) params.append("operator", appliedFilters.operator);
    if (appliedFilters.dateFrom) params.append("date_from", appliedFilters.dateFrom);
    if (appliedFilters.dateTo) params.append("date_to", appliedFilters.dateTo);
    const url = params.toString() ? `/api/milling?${params.toString()}` : "/api/milling";
    apiFetch<MillBatch[]>(url).then((d) => d && setBatches(d));
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
    if (!mixingBatchId || !machineNo || !operator || !thicknessTarget) {
      showToast("请填写所有必填项", "error");
      return;
    }
    apiFetch("/api/milling", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mixing_batch_id: mixingBatchId,
        machine_no: machineNo,
        operator,
        thickness_target: Number(thicknessTarget),
      }),
    }).then((ok) => {
      if (ok !== null) {
        showToast("开炼批次创建成功", "success");
        fetchBatches();
        setShowForm(false);
        setMixingBatchId("");
        setMachineNo("");
        setOperator("");
        setThicknessTarget("");
      } else {
        showToast("开炼批次创建失败", "error");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-display font-bold">开炼出片</h2>
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
            <h3 className="font-display font-semibold text-sm">新建开炼批次</h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">关联密炼批次</label>
                <select className="input-field w-full" value={mixingBatchId} onChange={(e) => setMixingBatchId(e.target.value)}>
                  <option value="">选择密炼批次</option>
                  {mixingBatches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.batchNo}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">机台</label>
                <input
                  type="text"
                  className="input-field w-full"
                  value={machineNo}
                  onChange={(e) => setMachineNo(e.target.value)}
                  placeholder="如 开炼机#1"
                />
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
                <label className="block text-xs text-gray-500 mb-1.5">目标厚度 (mm)</label>
                <input
                  type="number"
                  className="input-field w-full"
                  value={thicknessTarget}
                  onChange={(e) => setThicknessTarget(e.target.value)}
                  placeholder="如 2.5"
                  step="0.1"
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

      <div className="card">
        <div className="card-header">
          <h3 className="font-display font-semibold text-sm">批次列表</h3>
        </div>
        <div className="card-body">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-surface-border">
                  <th className="table-header">批次号</th>
                  <th className="table-header">关联密炼批次</th>
                  <th className="table-header">当前厚度</th>
                  <th className="table-header">目标厚度</th>
                  <th className="table-header">薄通次数</th>
                  <th className="table-header">状态</th>
                  <th className="table-header">操作</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => {
                  const thicknessOk = b.thickness > 0 && Math.abs(b.thickness - b.thicknessTarget) <= 0.2;
                  return (
                    <tr
                      key={b.id}
                      className="border-b border-surface-border last:border-0 hover:bg-surface-lighter/50 cursor-pointer"
                      onClick={() => setSelectedBatch(b)}
                    >
                      <td className="table-cell font-mono text-amber">{b.batchNo}</td>
                      <td className="table-cell text-steel">{b.mixingBatchId}</td>
                      <td className="table-cell">
                        {b.thickness > 0 ? (
                          <span className={thicknessOk ? "text-pass" : "text-fail"}>
                            {b.thickness} mm
                          </span>
                        ) : (
                          <span className="text-gray-600">--</span>
                        )}
                      </td>
                      <td className="table-cell text-gray-400">{b.thicknessTarget} mm</td>
                      <td className="table-cell">{b.passCount}</td>
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
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedBatch && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="card-header flex items-center justify-between">
              <h3 className="font-display font-semibold text-sm">开炼批次详情</h3>
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
                  <p className="text-xs text-gray-500">关联密炼批次</p>
                  <p className="text-sm">{selectedBatch.mixingBatchId}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">机台</p>
                  <p className="text-sm">{selectedBatch.machineNo}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">操作员</p>
                  <p className="text-sm">{selectedBatch.operator}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">当前厚度</p>
                  <p className={`text-sm ${selectedBatch.thickness > 0 && Math.abs(selectedBatch.thickness - selectedBatch.thicknessTarget) <= 0.2 ? "text-pass" : selectedBatch.thickness > 0 ? "text-fail" : "text-gray-600"}`}>
                    {selectedBatch.thickness > 0 ? `${selectedBatch.thickness} mm` : "--"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">目标厚度</p>
                  <p className="text-sm">{selectedBatch.thicknessTarget} mm</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">薄通次数</p>
                  <p className="text-sm">{selectedBatch.passCount}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">出片数</p>
                  <p className="text-sm">{selectedBatch.sheetCount}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
