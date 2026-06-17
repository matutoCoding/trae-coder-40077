import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Plus, Thermometer, Eye, X } from "lucide-react";
import { apiFetch } from "@/lib/utils";
import { useToast } from "@/components/Toast";

interface MixBatch {
  id: string;
  batchNo: string;
  formulaId: string;
  formula: { id: string; name: string; code: string };
  machineNo: string;
  operator: string;
  dischargeTemp: number;
  maxTemp: number;
  status: string;
  createdAt?: string;
}

const statusBadgeMap: Record<string, string> = {
  pending: "badge-info",
  mixing: "badge-info",
  completed: "badge-pass",
  abnormal: "badge-fail",
};

const statusLabelMap: Record<string, string> = {
  pending: "处理中",
  mixing: "处理中",
  completed: "已完成",
  abnormal: "异常",
};

const defaultBatches: MixBatch[] = [
  { id: "1", batchNo: "ML-20240618-001", formulaId: "1", formula: { id: "1", name: "NBR标准配方", code: "FP-0001" }, machineNo: "密炼机#1", operator: "李师傅", dischargeTemp: 155, maxTemp: 158, status: "completed" },
  { id: "2", batchNo: "ML-20240618-002", formulaId: "2", formula: { id: "2", name: "EPDM耐热配方", code: "FP-0002" }, machineNo: "密炼机#2", operator: "王师傅", dischargeTemp: 162, maxTemp: 168, status: "abnormal" },
  { id: "3", batchNo: "ML-20240618-003", formulaId: "3", formula: { id: "3", name: "FKM耐油配方", code: "FP-0003" }, machineNo: "密炼机#1", operator: "张师傅", dischargeTemp: 0, maxTemp: 0, status: "mixing" },
  { id: "4", batchNo: "ML-20240618-004", formulaId: "4", formula: { id: "4", name: "硅橡胶密封配方", code: "FP-0004" }, machineNo: "密炼机#3", operator: "赵师傅", dischargeTemp: 0, maxTemp: 0, status: "pending" },
];

interface FormulaOption {
  id: string;
  name: string;
  code: string;
}

interface FeedingRecord {
  time: string;
  material: string;
  weight: number;
  unit: string;
}

const feedingRecords: FeedingRecord[] = [
  { time: "09:00", material: "NBR生胶", weight: 25.0, unit: "kg" },
  { time: "09:03", material: "炭黑N550", weight: 12.5, unit: "kg" },
  { time: "09:06", material: "氧化锌", weight: 1.25, unit: "kg" },
  { time: "09:08", material: "硬脂酸", weight: 0.38, unit: "kg" },
];

export default function MixingBatch() {
  const [batches, setBatches] = useState<MixBatch[]>(defaultBatches);
  const [formulas, setFormulas] = useState<FormulaOption[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formulaId, setFormulaId] = useState("");
  const [machineNo, setMachineNo] = useState("");
  const [operator, setOperator] = useState("");
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

  const [selectedBatch, setSelectedBatch] = useState<MixBatch | null>(null);
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
    apiFetch<FormulaOption[]>("/api/formulas").then((d) => d && setFormulas(d));
  }, []);

  const fetchBatches = () => {
    const params = new URLSearchParams();
    if (appliedFilters.keyword) params.append("keyword", appliedFilters.keyword);
    if (appliedFilters.status) params.append("status", appliedFilters.status);
    if (appliedFilters.operator) params.append("operator", appliedFilters.operator);
    if (appliedFilters.dateFrom) params.append("date_from", appliedFilters.dateFrom);
    if (appliedFilters.dateTo) params.append("date_to", appliedFilters.dateTo);
    const url = params.toString() ? `/api/mixing?${params.toString()}` : "/api/mixing";
    apiFetch<MixBatch[]>(url).then((d) => d && setBatches(d));
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
    if (!formulaId || !machineNo || !operator) {
      showToast("请填写所有必填项", "error");
      return;
    }
    apiFetch("/api/mixing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        formula_id: formulaId,
        machine_no: machineNo,
        operator,
      }),
    }).then((ok) => {
      if (ok !== null) {
        showToast("密炼批次创建成功", "success");
        fetchBatches();
        setShowForm(false);
        setFormulaId("");
        setMachineNo("");
        setOperator("");
      } else {
        showToast("密炼批次创建失败", "error");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-display font-bold">密炼混炼</h2>
        <div className="flex gap-2">
          <Link to="/mixing/temperature" className="btn-secondary flex items-center gap-2">
            <Thermometer size={16} />
            温度监控
          </Link>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
            <Plus size={16} />
            新建批次
          </button>
        </div>
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
            <h3 className="font-display font-semibold text-sm">新建密炼批次</h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">配方</label>
                <select className="input-field w-full" value={formulaId} onChange={(e) => setFormulaId(e.target.value)}>
                  <option value="">选择配方</option>
                  {formulas.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.code})
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
                  placeholder="如 密炼机#1"
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
                  <th className="table-header">配方</th>
                  <th className="table-header">机台</th>
                  <th className="table-header">操作员</th>
                  <th className="table-header">排胶温度</th>
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
                    <td className="table-cell">{b.formula?.name || b.formulaId}</td>
                    <td className="table-cell text-gray-400">{b.machineNo}</td>
                    <td className="table-cell text-gray-400">{b.operator}</td>
                    <td className="table-cell">
                      {b.dischargeTemp > 0 ? (
                        <span className={b.dischargeTemp > 160 ? "text-fail" : "text-pass"}>
                          {b.dischargeTemp}°C
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

      <div className="card">
        <div className="card-header">
          <h3 className="font-display font-semibold text-sm">加料记录 (ML-20240618-001)</h3>
        </div>
        <div className="card-body">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[400px]">
              <thead>
                <tr className="border-b border-surface-border">
                  <th className="table-header">时间</th>
                  <th className="table-header">材料</th>
                  <th className="table-header">重量</th>
                  <th className="table-header">单位</th>
                </tr>
              </thead>
              <tbody>
                {feedingRecords.map((r, i) => (
                  <tr key={i} className="border-b border-surface-border last:border-0">
                    <td className="table-cell text-gray-400">{r.time}</td>
                    <td className="table-cell">{r.material}</td>
                    <td className="table-cell text-amber">{r.weight}</td>
                    <td className="table-cell text-gray-400">{r.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedBatch && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="card-header flex items-center justify-between">
              <h3 className="font-display font-semibold text-sm">密炼批次详情</h3>
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
                  <p className="text-xs text-gray-500">配方</p>
                  <p className="text-sm">{selectedBatch.formula?.name || selectedBatch.formulaId}</p>
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
                  <p className="text-xs text-gray-500">排胶温度</p>
                  <p className={`text-sm ${selectedBatch.dischargeTemp > 160 ? "text-fail" : selectedBatch.dischargeTemp > 0 ? "text-pass" : "text-gray-600"}`}>
                    {selectedBatch.dischargeTemp > 0 ? `${selectedBatch.dischargeTemp}°C` : "--"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">最高温度</p>
                  <p className="text-sm">{selectedBatch.maxTemp > 0 ? `${selectedBatch.maxTemp}°C` : "--"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
