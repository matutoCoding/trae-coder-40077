import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, Clock, Flame } from "lucide-react";
import { apiFetch } from "@/lib/utils";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";

interface VulcanBatch {
  id: string;
  batchNo: string;
  moldTemp: number;
  moldTempTarget: number;
  pressure: number;
  vulcanizationTime: number;
  vulcanizationTimeTarget: number;
  status: string;
}

const statusLabelMap: Record<string, string> = {
  preheating: "预热中",
  vulcanizing: "硫化中",
  completed: "已完成",
  abnormal: "异常",
};

const statusBadgeMap: Record<string, string> = {
  preheating: "badge-warn",
  vulcanizing: "badge-amber",
  completed: "badge-pass",
  abnormal: "badge-fail",
};

const defaultBatches: VulcanBatch[] = [
  { id: "1", batchNo: "VL-20240618-001", moldTemp: 168, moldTempTarget: 170, pressure: 12.5, vulcanizationTime: 180, vulcanizationTimeTarget: 300, status: "vulcanizing" },
  { id: "2", batchNo: "VL-20240618-002", moldTemp: 155, moldTempTarget: 170, pressure: 0, vulcanizationTime: 0, vulcanizationTimeTarget: 300, status: "preheating" },
  { id: "3", batchNo: "VL-20240618-003", moldTemp: 172, moldTempTarget: 170, pressure: 12.8, vulcanizationTime: 300, vulcanizationTimeTarget: 300, status: "completed" },
  { id: "4", batchNo: "VL-20240618-004", moldTemp: 145, moldTempTarget: 170, pressure: 11.2, vulcanizationTime: 120, vulcanizationTimeTarget: 300, status: "abnormal" },
];

export default function VulcanizationMonitor() {
  const [batches, setBatches] = useState<VulcanBatch[]>(defaultBatches);
  const [showForm, setShowForm] = useState(false);
  const [formula, setFormula] = useState("");
  const [moldNo, setMoldNo] = useState("");

  useEffect(() => {
    apiFetch<VulcanBatch[]>("/api/vulcanization").then((d) => d && setBatches(d));
  }, []);

  const handleCreate = () => {
    apiFetch("/api/vulcanization", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ formula, moldNo }),
    }).then((ok) => ok !== null && apiFetch<VulcanBatch[]>("/api/vulcanization").then((d) => {
      if (d) { setBatches(d); setShowForm(false); setFormula(""); setMoldNo(""); }
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-display font-bold">模压硫化</h2>
        <div className="flex gap-2">
          <Link to="/vulcanization/records" className="btn-secondary">硫化记录</Link>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
            <Plus size={16} />
            新建硫化
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card">
          <div className="card-header">
            <h3 className="font-display font-semibold text-sm">新建硫化批次</h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">配方</label>
                <select className="input-field w-full" value={formula} onChange={(e) => setFormula(e.target.value)}>
                  <option value="">选择配方</option>
                  <option value="NBR标准配方">NBR标准配方</option>
                  <option value="EPDM耐热配方">EPDM耐热配方</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">模具编号</label>
                <select className="input-field w-full" value={moldNo} onChange={(e) => setMoldNo(e.target.value)}>
                  <option value="">选择模具</option>
                  <option value="M-001">M-001</option>
                  <option value="M-002">M-002</option>
                  <option value="M-003">M-003</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleCreate} className="btn-primary">确认创建</button>
              <button onClick={() => setShowForm(false)} className="btn-secondary">取消</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {batches.map((b) => {
          const progress = b.vulcanizationTimeTarget > 0 ? Math.min((b.vulcanizationTime / b.vulcanizationTimeTarget) * 100, 100) : 0;
          const pieData = [
            { name: "已完成", value: progress, color: b.status === "abnormal" ? "#EF4444" : "#E8A317" },
            { name: "剩余", value: 100 - progress, color: "#2A2F38" },
          ];
          const remainingMin = Math.max(0, Math.floor((b.vulcanizationTimeTarget - b.vulcanizationTime) / 60));
          const remainingSec = Math.max(0, (b.vulcanizationTimeTarget - b.vulcanizationTime) % 60);

          return (
            <div key={b.id} className="card">
              <div className="card-body space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm text-amber">{b.batchNo}</span>
                  <span className={statusBadgeMap[b.status] || "badge-info"}>
                    {statusLabelMap[b.status] || b.status}
                  </span>
                </div>

                <div className="flex items-center justify-center">
                  <div className="relative w-28 h-28">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={38}
                          outerRadius={50}
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
                      <span className="text-lg font-display font-bold">{Math.round(progress)}%</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 flex items-center gap-1">
                      <Flame size={12} /> 模温
                    </span>
                    <span className={b.moldTemp < b.moldTempTarget - 10 ? "text-fail" : "text-pass"}>
                      {b.moldTemp}°C / {b.moldTempTarget}°C
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 flex items-center gap-1">
                      <Clock size={12} /> 剩余时间
                    </span>
                    <span>{remainingMin}分{remainingSec}秒</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">压力</span>
                    <span>{b.pressure > 0 ? `${b.pressure} MPa` : "--"}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
