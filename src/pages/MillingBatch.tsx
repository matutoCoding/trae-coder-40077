import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
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
}

const statusBadgeMap: Record<string, string> = {
  pending: "badge-warn",
  milling: "badge-info",
  completed: "badge-pass",
  abnormal: "badge-fail",
};

const statusLabelMap: Record<string, string> = {
  pending: "待开炼",
  milling: "开炼中",
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

  useEffect(() => {
    apiFetch<MillBatch[]>("/api/milling").then((d) => d && setBatches(d));
    apiFetch<MixingBatchOption[]>("/api/mixing").then((d) => d && setMixingBatches(d));
  }, []);

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
        apiFetch<MillBatch[]>("/api/milling").then((d) => {
          if (d) {
            setBatches(d);
            setShowForm(false);
            setMixingBatchId("");
            setMachineNo("");
            setOperator("");
            setThicknessTarget("");
          }
        });
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
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => {
                  const thicknessOk = b.thickness > 0 && Math.abs(b.thickness - b.thicknessTarget) <= 0.2;
                  return (
                    <tr key={b.id} className="border-b border-surface-border last:border-0 hover:bg-surface-lighter/50">
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
