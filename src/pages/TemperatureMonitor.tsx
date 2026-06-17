import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { apiFetch } from "@/lib/utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface MixBatch {
  id: string;
  batchNo: string;
  formulaId: string;
  formula: { id: string; name: string; code: string };
  dischargeTemp: number;
  maxTemp: number;
  status: string;
}

const defaultBatches: MixBatch[] = [
  { id: "1", batchNo: "ML-20240618-003", formulaId: "3", formula: { id: "3", name: "FKM耐油配方", code: "FP-0003" }, dischargeTemp: 142, maxTemp: 145, status: "mixing" },
  { id: "2", batchNo: "ML-20240618-002", formulaId: "2", formula: { id: "2", name: "EPDM耐热配方", code: "FP-0002" }, dischargeTemp: 168, maxTemp: 172, status: "abnormal" },
];

function generateTempData() {
  const data: { time: string; temp: number }[] = [];
  let temp = 80;
  for (let i = 0; i <= 30; i++) {
    temp += Math.random() * 4 - 0.5;
    if (i > 10) temp += Math.random() * 2;
    data.push({ time: `${i}分`, temp: Math.round(temp * 10) / 10 });
  }
  return data;
}

export default function TemperatureMonitor() {
  const [batches, setBatches] = useState<MixBatch[]>(defaultBatches);
  const [selectedBatch, setSelectedBatch] = useState<string>(defaultBatches[0]?.batchNo || "");
  const [tempData, setTempData] = useState(generateTempData);

  useEffect(() => {
    apiFetch<MixBatch[]>("/api/mixing").then((d) => {
      if (d) {
        setBatches(d);
        if (d.length > 0 && !selectedBatch) setSelectedBatch(d[0].batchNo);
      }
    });
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTempData((prev) => {
        const lastTemp = prev[prev.length - 1]?.temp || 140;
        const newTemp = Math.round((lastTemp + Math.random() * 3 - 1) * 10) / 10;
        const next = [...prev.slice(1), { time: `${prev.length}分`, temp: newTemp }];
        return next;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const currentBatch = batches.find((b) => b.batchNo === selectedBatch);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/mixing" className="p-1.5 rounded-md hover:bg-surface-lighter text-gray-400 hover:text-base transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <h2 className="text-lg font-display font-bold">温度监控</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {batches.map((b) => (
          <button
            key={b.id}
            onClick={() => setSelectedBatch(b.batchNo)}
            className={`card text-left transition-colors ${
              selectedBatch === b.batchNo ? "ring-1 ring-amber" : ""
            }`}
          >
            <div className="card-body">
              <div className="text-xs text-gray-500 mb-1">{b.batchNo}</div>
              <div className="text-sm mb-2">{b.formula?.name || b.formulaId}</div>
              <div className="flex items-center justify-between">
                <span className={`text-xl font-display font-bold ${b.dischargeTemp > 160 ? "text-fail" : "text-amber"}`}>
                  {b.dischargeTemp}°C
                </span>
                <span className={b.status === "abnormal" ? "badge-fail" : "badge-info"}>
                  {b.status === "abnormal" ? "异常" : "混炼中"}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h3 className="font-display font-semibold text-sm">
            温度曲线 - {selectedBatch}
          </h3>
          {currentBatch && (
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-400">排胶温度:</span>
              <span className={`font-display font-bold ${currentBatch.dischargeTemp > 160 ? "text-fail" : "text-amber"}`}>
                {currentBatch.dischargeTemp}°C
              </span>
              <span className="text-gray-400">阈值:</span>
              <span className="text-fail">160°C</span>
            </div>
          )}
        </div>
        <div className="card-body">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={tempData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333842" />
                <XAxis dataKey="time" stroke="#666" tick={{ fontSize: 12 }} />
                <YAxis domain={[60, 200]} stroke="#666" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#22262E",
                    border: "1px solid #333842",
                    borderRadius: 6,
                    color: "#E8E6E1",
                  }}
                />
                <ReferenceLine y={160} stroke="#EF4444" strokeDasharray="6 3" label={{ value: "160°C", fill: "#EF4444", fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="temp"
                  stroke="#E8A317"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: "#E8A317" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
