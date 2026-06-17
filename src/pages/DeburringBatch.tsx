import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { apiFetch } from "@/lib/utils";
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
  pending: "badge-warn",
  processing: "badge-info",
  completed: "badge-pass",
};

const statusLabelMap: Record<string, string> = {
  pending: "待处理",
  processing: "处理中",
  completed: "已完成",
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

  useEffect(() => {
    apiFetch<DeburrBatch[]>("/api/deburring").then((d) => d && setBatches(d));
    apiFetch<VulcanizationBatchOption[]>("/api/vulcanization").then((d) => d && setVulcanizationBatches(d));
  }, []);

  const handleCreate = () => {
    if (!vulcanizationBatchId || !operator || !totalCount) {
      showToast("请填写所有必填项", "error");
      return;
    }
    apiFetch("/api/deburring", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vulcanization_batch_id: vulcanizationBatchId,
        method,
        operator,
        total_count: Number(totalCount),
      }),
    }).then((ok) => {
      if (ok !== null) {
        showToast("去毛边批次创建成功", "success");
        apiFetch<DeburrBatch[]>("/api/deburring").then((d) => {
          if (d) {
            setBatches(d);
            setShowForm(false);
            setVulcanizationBatchId("");
            setMethod("freezing");
            setOperator("");
            setTotalCount("");
          }
        });
      } else {
        showToast("去毛边批次创建失败", "error");
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
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-surface-border">
                    <th className="table-header">批次号</th>
                    <th className="table-header">关联硫化批次</th>
                    <th className="table-header">去边方式</th>
                    <th className="table-header">总数</th>
                    <th className="table-header">合格数</th>
                    <th className="table-header">合格率</th>
                    <th className="table-header">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((b) => (
                    <tr key={b.id} className="border-b border-surface-border last:border-0 hover:bg-surface-lighter/50">
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
