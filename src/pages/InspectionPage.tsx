import { useState, useEffect } from "react";
import { Plus, CheckCircle2, XCircle } from "lucide-react";
import { apiFetch } from "@/lib/utils";

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

interface NewInspection {
  batchNo: string;
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
  batchNo: "",
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
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewInspection>(emptyInspection);

  useEffect(() => {
    apiFetch<InspectionRecord[]>("/api/inspection").then((d) => d && setRecords(d));
  }, []);

  const updateField = (field: keyof NewInspection, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
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
      body: JSON.stringify({ ...vals, batchNo: form.batchNo, overallResult }),
    }).then((ok) => ok !== null && apiFetch<InspectionRecord[]>("/api/inspection").then((d) => {
      if (d) { setRecords(d); setShowForm(false); setForm(emptyInspection); }
    }));
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

      {showForm && (
        <div className="card">
          <div className="card-header">
            <h3 className="font-display font-semibold text-sm">新增检测记录</h3>
          </div>
          <div className="card-body space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">批次号</label>
              <input
                type="text"
                className="input-field w-full max-w-xs"
                value={form.batchNo}
                onChange={(e) => updateField("batchNo", e.target.value)}
                placeholder="如 IC-20240618-005"
              />
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
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-surface-border">
                  <th className="table-header">批次号</th>
                  <th className="table-header">内径</th>
                  <th className="table-header">外径</th>
                  <th className="table-header">截面</th>
                  <th className="table-header">结果</th>
                  <th className="table-header">检测时间</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className="border-b border-surface-border last:border-0 hover:bg-surface-lighter/50">
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
