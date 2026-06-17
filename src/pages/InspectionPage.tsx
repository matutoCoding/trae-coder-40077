import { useState, useEffect } from "react";
import { Plus, CheckCircle2, XCircle, Eye, X } from "lucide-react";
import { apiFetch } from "@/lib/utils";
import { useToast } from "@/components/Toast";

interface InspectionRecord {
  id: string;
  batchNo: string;
  deburringBatchId: string;
  inspector: string;
  innerDiameter: number;
  innerDiameterTarget: number;
  innerDiameterTolerance: number;
  outerDiameter: number;
  outerDiameterTarget: number;
  outerDiameterTolerance: number;
  crossSection: number;
  crossSectionTarget: number;
  crossSectionTolerance: number;
  innerDiameterResult: string;
  outerDiameterResult: string;
  crossSectionResult: string;
  overallResult: string;
  inspectedAt: string;
}

const defaultRecords: InspectionRecord[] = [
  { id: "1", batchNo: "IC-20240618-001", deburringBatchId: "DB-20240618-001", inspector: "张工", innerDiameter: 25.02, innerDiameterTarget: 25.0, innerDiameterTolerance: 0.15, outerDiameter: 30.05, outerDiameterTarget: 30.0, outerDiameterTolerance: 0.15, crossSection: 2.51, crossSectionTarget: 2.5, crossSectionTolerance: 0.1, innerDiameterResult: "pass", outerDiameterResult: "pass", crossSectionResult: "pass", overallResult: "pass", inspectedAt: "2024-06-18 11:00" },
  { id: "2", batchNo: "IC-20240618-002", deburringBatchId: "DB-20240618-002", inspector: "李工", innerDiameter: 25.20, innerDiameterTarget: 25.0, innerDiameterTolerance: 0.15, outerDiameter: 30.08, outerDiameterTarget: 30.0, outerDiameterTolerance: 0.15, crossSection: 2.48, crossSectionTarget: 2.5, crossSectionTolerance: 0.1, innerDiameterResult: "fail", outerDiameterResult: "pass", crossSectionResult: "pass", overallResult: "fail", inspectedAt: "2024-06-18 10:45" },
  { id: "3", batchNo: "IC-20240618-003", deburringBatchId: "DB-20240618-003", inspector: "王工", innerDiameter: 24.95, innerDiameterTarget: 25.0, innerDiameterTolerance: 0.15, outerDiameter: 29.98, outerDiameterTarget: 30.0, outerDiameterTolerance: 0.15, crossSection: 2.52, crossSectionTarget: 2.5, crossSectionTolerance: 0.1, innerDiameterResult: "pass", outerDiameterResult: "pass", crossSectionResult: "pass", overallResult: "pass", inspectedAt: "2024-06-18 10:30" },
  { id: "4", batchNo: "IC-20240618-004", deburringBatchId: "DB-20240618-004", inspector: "赵工", innerDiameter: 25.05, innerDiameterTarget: 25.0, innerDiameterTolerance: 0.15, outerDiameter: 30.03, outerDiameterTarget: 30.0, outerDiameterTolerance: 0.15, crossSection: 2.49, crossSectionTarget: 2.5, crossSectionTolerance: 0.1, innerDiameterResult: "pass", outerDiameterResult: "pass", crossSectionResult: "pass", overallResult: "pass", inspectedAt: "2024-06-18 10:15" },
];

interface DeburringBatchOption {
  id: string;
  batchNo: string;
}

interface NewInspection {
  deburringBatchId: string;
  inspector: string;
  innerDiameter: string;
  outerDiameter: string;
  crossSection: string;
  innerDiameterTarget: string;
  innerDiameterTolerance: string;
  outerDiameterTarget: string;
  outerDiameterTolerance: string;
  crossSectionTarget: string;
  crossSectionTolerance: string;
}

const emptyInspection: NewInspection = {
  deburringBatchId: "",
  inspector: "",
  innerDiameter: "",
  outerDiameter: "",
  crossSection: "",
  innerDiameterTarget: "25.0",
  innerDiameterTolerance: "0.15",
  outerDiameterTarget: "30.0",
  outerDiameterTolerance: "0.15",
  crossSectionTarget: "2.5",
  crossSectionTolerance: "0.1",
};

function inTolerance(value: number, target: number, tolerance: number) {
  return Math.abs(value - target) <= tolerance;
}

function ToleranceBar({ value, target, tolerance, label }: { value: number; target: number; tolerance: number; label: string }) {
  const passed = inTolerance(value, target, tolerance);
  const range = tolerance * 4;
  const min = target - range;
  const max = target + range;
  const position = ((value - min) / (max - min)) * 100;
  const greenStart = ((target - tolerance - min) / (max - min)) * 100;
  const greenEnd = ((target + tolerance - min) / (max - min)) * 100;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">{label}</span>
        <span className={passed ? "text-pass" : "text-fail"}>
          {value} {passed ? "✓" : "✗"}
        </span>
      </div>
      <div className="relative h-2 bg-surface-lighter rounded-full">
        <div
          className="absolute h-full bg-pass/30 rounded-full"
          style={{ left: `${greenStart}%`, width: `${greenEnd - greenStart}%` }}
        />
        <div
          className={`absolute w-2 h-2 rounded-full -top-0 ${passed ? "bg-pass" : "bg-fail"}`}
          style={{ left: `${position}%`, transform: "translateX(-50%)" }}
        />
      </div>
      <div className="flex justify-between text-2xs text-gray-600">
        <span>{(target - tolerance).toFixed(2)}</span>
        <span className="text-pass">{target.toFixed(2)}</span>
        <span>{(target + tolerance).toFixed(2)}</span>
      </div>
    </div>
  );
}

export default function InspectionPage() {
  const [records, setRecords] = useState<InspectionRecord[]>(defaultRecords);
  const [deburringBatches, setDeburringBatches] = useState<DeburringBatchOption[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewInspection>(emptyInspection);
  const { showToast } = useToast();

  const [keyword, setKeyword] = useState("");
  const [inspectorSearch, setInspectorSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [overallResultFilter, setOverallResultFilter] = useState("");
  const [appliedFilters, setAppliedFilters] = useState<{ keyword: string; inspector: string; dateFrom: string; dateTo: string; overallResult: string }>({
    keyword: "",
    inspector: "",
    dateFrom: "",
    dateTo: "",
    overallResult: "",
  });

  const [selectedRecord, setSelectedRecord] = useState<InspectionRecord | null>(null);

  useEffect(() => {
    fetchRecords();
    apiFetch<DeburringBatchOption[]>("/api/deburring").then((d) => d && setDeburringBatches(d));
  }, []);

  const fetchRecords = () => {
    const params = new URLSearchParams();
    if (appliedFilters.keyword) params.append("keyword", appliedFilters.keyword);
    if (appliedFilters.inspector) params.append("inspector", appliedFilters.inspector);
    if (appliedFilters.dateFrom) params.append("date_from", appliedFilters.dateFrom);
    if (appliedFilters.dateTo) params.append("date_to", appliedFilters.dateTo);
    if (appliedFilters.overallResult) params.append("overall_result", appliedFilters.overallResult);
    const url = params.toString() ? `/api/inspection?${params.toString()}` : "/api/inspection";
    apiFetch<InspectionRecord[]>(url).then((d) => d && setRecords(d));
  };

  const handleFilter = () => {
    setAppliedFilters({
      keyword,
      inspector: inspectorSearch,
      dateFrom,
      dateTo,
      overallResult: overallResultFilter,
    });
  };

  useEffect(() => {
    fetchRecords();
  }, [appliedFilters]);

  const handleReset = () => {
    setKeyword("");
    setInspectorSearch("");
    setDateFrom("");
    setDateTo("");
    setOverallResultFilter("");
    setAppliedFilters({
      keyword: "",
      inspector: "",
      dateFrom: "",
      dateTo: "",
      overallResult: "",
    });
  };

  const updateField = (field: keyof NewInspection, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!form.deburringBatchId || !form.inspector || !form.innerDiameter || !form.outerDiameter || !form.crossSection) {
      showToast("请填写所有必填项", "error");
      return;
    }
    const vals = {
      innerDiameter: Number(form.innerDiameter),
      outerDiameter: Number(form.outerDiameter),
      crossSection: Number(form.crossSection),
      innerDiameterTarget: Number(form.innerDiameterTarget),
      innerDiameterTolerance: Number(form.innerDiameterTolerance),
      outerDiameterTarget: Number(form.outerDiameterTarget),
      outerDiameterTolerance: Number(form.outerDiameterTolerance),
      crossSectionTarget: Number(form.crossSectionTarget),
      crossSectionTolerance: Number(form.crossSectionTolerance),
    };
    const overallResult =
      inTolerance(vals.innerDiameter, vals.innerDiameterTarget, vals.innerDiameterTolerance) &&
      inTolerance(vals.outerDiameter, vals.outerDiameterTarget, vals.outerDiameterTolerance) &&
      inTolerance(vals.crossSection, vals.crossSectionTarget, vals.crossSectionTolerance)
        ? "pass" : "fail";

    apiFetch("/api/inspection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deburring_batch_id: form.deburringBatchId,
        inspector: form.inspector,
        inner_diameter: vals.innerDiameter,
        outer_diameter: vals.outerDiameter,
        cross_section: vals.crossSection,
        inner_diameter_target: vals.innerDiameterTarget,
        inner_diameter_tolerance: vals.innerDiameterTolerance,
        outer_diameter_target: vals.outerDiameterTarget,
        outer_diameter_tolerance: vals.outerDiameterTolerance,
        cross_section_target: vals.crossSectionTarget,
        cross_section_tolerance: vals.crossSectionTolerance,
        overall_result: overallResult,
      }),
    }).then((ok) => {
      if (ok !== null) {
        showToast("检测记录提交成功", "success");
        fetchRecords();
        setShowForm(false);
        setForm(emptyInspection);
      } else {
        showToast("检测记录提交失败", "error");
      }
    });
  };

  const currentPassed = form.innerDiameter && form.outerDiameter && form.crossSection
    ? inTolerance(Number(form.innerDiameter), Number(form.innerDiameterTarget), Number(form.innerDiameterTolerance)) &&
      inTolerance(Number(form.outerDiameter), Number(form.outerDiameterTarget), Number(form.outerDiameterTolerance)) &&
      inTolerance(Number(form.crossSection), Number(form.crossSectionTarget), Number(form.crossSectionTolerance))
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-display font-bold">尺寸检测</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          新增检测
        </button>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs text-gray-500 mb-1.5">批次号</label>
              <input
                type="text"
                className="input-field w-full"
                placeholder="搜索批次号..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>
            <div className="min-w-[140px]">
              <label className="block text-xs text-gray-500 mb-1.5">检测员</label>
              <input
                type="text"
                className="input-field w-full"
                placeholder="检测员姓名"
                value={inspectorSearch}
                onChange={(e) => setInspectorSearch(e.target.value)}
              />
            </div>
            <div className="min-w-[140px]">
              <label className="block text-xs text-gray-500 mb-1.5">检测结果</label>
              <select className="input-field w-full" value={overallResultFilter} onChange={(e) => setOverallResultFilter(e.target.value)}>
                <option value="">全部结果</option>
                <option value="pass">合格</option>
                <option value="fail">不合格</option>
              </select>
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
            <h3 className="font-display font-semibold text-sm">新增检测记录</h3>
          </div>
          <div className="card-body space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">关联去毛边批次</label>
                <select
                  className="input-field w-full"
                  value={form.deburringBatchId}
                  onChange={(e) => updateField("deburringBatchId", e.target.value)}
                >
                  <option value="">选择去毛边批次</option>
                  {deburringBatches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.batchNo}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">检测员</label>
                <input
                  type="text"
                  className="input-field w-full"
                  value={form.inspector}
                  onChange={(e) => updateField("inspector", e.target.value)}
                  placeholder="检测员姓名"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-300">内径</h4>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-2xs text-gray-500 mb-1">实测值</label>
                    <input type="number" step="0.01" className="input-field w-full" value={form.innerDiameter} onChange={(e) => updateField("innerDiameter", e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-2xs text-gray-500 mb-1">目标值</label>
                    <input type="number" step="0.01" className="input-field w-full" value={form.innerDiameterTarget} onChange={(e) => updateField("innerDiameterTarget", e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-2xs text-gray-500 mb-1">公差</label>
                    <input type="number" step="0.01" className="input-field w-full" value={form.innerDiameterTolerance} onChange={(e) => updateField("innerDiameterTolerance", e.target.value)} />
                  </div>
                </div>
                {form.innerDiameter && (
                  <ToleranceBar value={Number(form.innerDiameter)} target={Number(form.innerDiameterTarget)} tolerance={Number(form.innerDiameterTolerance)} label="内径" />
                )}
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-300">外径</h4>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-2xs text-gray-500 mb-1">实测值</label>
                    <input type="number" step="0.01" className="input-field w-full" value={form.outerDiameter} onChange={(e) => updateField("outerDiameter", e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-2xs text-gray-500 mb-1">目标值</label>
                    <input type="number" step="0.01" className="input-field w-full" value={form.outerDiameterTarget} onChange={(e) => updateField("outerDiameterTarget", e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-2xs text-gray-500 mb-1">公差</label>
                    <input type="number" step="0.01" className="input-field w-full" value={form.outerDiameterTolerance} onChange={(e) => updateField("outerDiameterTolerance", e.target.value)} />
                  </div>
                </div>
                {form.outerDiameter && (
                  <ToleranceBar value={Number(form.outerDiameter)} target={Number(form.outerDiameterTarget)} tolerance={Number(form.outerDiameterTolerance)} label="外径" />
                )}
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-300">截面</h4>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-2xs text-gray-500 mb-1">实测值</label>
                    <input type="number" step="0.01" className="input-field w-full" value={form.crossSection} onChange={(e) => updateField("crossSection", e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-2xs text-gray-500 mb-1">目标值</label>
                    <input type="number" step="0.01" className="input-field w-full" value={form.crossSectionTarget} onChange={(e) => updateField("crossSectionTarget", e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-2xs text-gray-500 mb-1">公差</label>
                    <input type="number" step="0.01" className="input-field w-full" value={form.crossSectionTolerance} onChange={(e) => updateField("crossSectionTolerance", e.target.value)} />
                  </div>
                </div>
                {form.crossSection && (
                  <ToleranceBar value={Number(form.crossSection)} target={Number(form.crossSectionTarget)} tolerance={Number(form.crossSectionTolerance)} label="截面" />
                )}
              </div>
            </div>

            {currentPassed !== null && (
              <div className={`flex items-center gap-2 p-3 rounded-md ${currentPassed ? "bg-pass-muted text-pass" : "bg-fail-muted text-fail"}`}>
                {currentPassed ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                <span className="text-sm font-medium">
                  {currentPassed ? "检测结果: 合格" : "检测结果: 不合格"}
                </span>
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={handleSubmit} className="btn-primary">提交检测</button>
              <button onClick={() => setShowForm(false)} className="btn-secondary">取消</button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3 className="font-display font-semibold text-sm">检测记录</h3>
        </div>
        <div className="card-body">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-surface-border">
                  <th className="table-header">批次号</th>
                  <th className="table-header">内径</th>
                  <th className="table-header">外径</th>
                  <th className="table-header">截面</th>
                  <th className="table-header">结果</th>
                  <th className="table-header">检测时间</th>
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
                    <td className="table-cell">
                      <span className={inTolerance(r.innerDiameter, r.innerDiameterTarget, r.innerDiameterTolerance) ? "text-pass" : "text-fail"}>
                        {r.innerDiameter}
                      </span>
                      <span className="text-gray-600 text-xs ml-1">±{r.innerDiameterTolerance}</span>
                    </td>
                    <td className="table-cell">
                      <span className={inTolerance(r.outerDiameter, r.outerDiameterTarget, r.outerDiameterTolerance) ? "text-pass" : "text-fail"}>
                        {r.outerDiameter}
                      </span>
                      <span className="text-gray-600 text-xs ml-1">±{r.outerDiameterTolerance}</span>
                    </td>
                    <td className="table-cell">
                      <span className={inTolerance(r.crossSection, r.crossSectionTarget, r.crossSectionTolerance) ? "text-pass" : "text-fail"}>
                        {r.crossSection}
                      </span>
                      <span className="text-gray-600 text-xs ml-1">±{r.crossSectionTolerance}</span>
                    </td>
                    <td className="table-cell">
                      <span className={r.overallResult === "pass" ? "badge-pass" : "badge-fail"}>
                        {r.overallResult === "pass" ? "合格" : "不合格"}
                      </span>
                    </td>
                    <td className="table-cell text-gray-400">{r.inspectedAt}</td>
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
        </div>
      </div>

      {selectedRecord && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="card-header flex items-center justify-between">
              <h3 className="font-display font-semibold text-sm">检测记录详情</h3>
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
                  <p className="text-xs text-gray-500">检测结果</p>
                  <span className={selectedRecord.overallResult === "pass" ? "badge-pass" : "badge-fail"}>
                    {selectedRecord.overallResult === "pass" ? "合格" : "不合格"}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500">关联去毛边批次</p>
                  <p className="text-sm">{selectedRecord.deburringBatchId}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">检测员</p>
                  <p className="text-sm">{selectedRecord.inspector}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">检测时间</p>
                  <p className="text-sm">{selectedRecord.inspectedAt}</p>
                </div>
              </div>
              <div className="space-y-3 pt-2 border-t border-surface-border">
                <h4 className="text-sm font-medium text-gray-300">尺寸参数</h4>
                <ToleranceBar value={selectedRecord.innerDiameter} target={selectedRecord.innerDiameterTarget} tolerance={selectedRecord.innerDiameterTolerance} label="内径" />
                <ToleranceBar value={selectedRecord.outerDiameter} target={selectedRecord.outerDiameterTarget} tolerance={selectedRecord.outerDiameterTolerance} label="外径" />
                <ToleranceBar value={selectedRecord.crossSection} target={selectedRecord.crossSectionTarget} tolerance={selectedRecord.crossSectionTolerance} label="截面" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
