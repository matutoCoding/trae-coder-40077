import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/utils";
import { useToast } from "@/components/Toast";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type TestTab = "hardness" | "tensile" | "compression";

interface TestRecord {
  id: string;
  batchNo: string;
  tester: string;
  hardnessShoreA?: number;
  hardnessTarget?: number;
  hardnessResult?: string;
  tensileStrength?: number;
  tensileStrengthTarget?: number;
  tensileStrengthResult?: string;
  elongationAtBreak?: number;
  elongationTarget?: number;
  compressionSet?: number;
  compressionSetTarget?: number;
  compressionSetResult?: string;
  overallResult: string;
  testedAt: string;
}

function getTestType(r: TestRecord): TestTab | null {
  if (r.hardnessShoreA != null) return "hardness";
  if (r.tensileStrength != null) return "tensile";
  if (r.compressionSet != null) return "compression";
  return null;
}

interface InspectionBatchOption {
  id: string;
  batchNo: string;
}

const defaultRecords: TestRecord[] = [
  { id: "1", batchNo: "PT-20240618-001", tester: "张工", hardnessShoreA: 72, hardnessTarget: 70, hardnessResult: "pass", overallResult: "pass", testedAt: "2024-06-18 14:00" },
  { id: "2", batchNo: "PT-20240618-002", tester: "李工", hardnessShoreA: 78, hardnessTarget: 70, hardnessResult: "fail", overallResult: "fail", testedAt: "2024-06-18 13:30" },
  { id: "3", batchNo: "PT-20240618-003", tester: "王工", tensileStrength: 18.5, tensileStrengthTarget: 17, tensileStrengthResult: "pass", elongationAtBreak: 420, elongationTarget: 400, overallResult: "pass", testedAt: "2024-06-18 12:00" },
  { id: "4", batchNo: "PT-20240618-004", tester: "赵工", compressionSet: 22, compressionSetTarget: 25, compressionSetResult: "pass", overallResult: "pass", testedAt: "2024-06-18 11:30" },
  { id: "5", batchNo: "PT-20240618-005", tester: "钱工", tensileStrength: 15.2, tensileStrengthTarget: 17, tensileStrengthResult: "fail", elongationAtBreak: 380, elongationTarget: 400, overallResult: "fail", testedAt: "2024-06-18 10:00" },
];

const tabs: { key: TestTab; label: string }[] = [
  { key: "hardness", label: "硬度测试" },
  { key: "tensile", label: "拉伸试验" },
  { key: "compression", label: "压缩变形" },
];

export default function PhysicalTesting() {
  const [records, setRecords] = useState<TestRecord[]>(defaultRecords);
  const [inspectionBatches, setInspectionBatches] = useState<InspectionBatchOption[]>([]);
  const [activeTab, setActiveTab] = useState<TestTab>("hardness");
  const [showForm, setShowForm] = useState(false);

  const [inspectionId, setInspectionId] = useState("");
  const [tester, setTester] = useState("");
  const [hardness, setHardness] = useState("");
  const [hardnessTarget, setHardnessTarget] = useState("70");
  const [tensile, setTensile] = useState("");
  const [tensileTarget, setTensileTarget] = useState("17");
  const [elongation, setElongation] = useState("");
  const [elongationTarget, setElongationTarget] = useState("400");
  const [compression, setCompression] = useState("");
  const [compressionTarget, setCompressionTarget] = useState("25");
  const { showToast } = useToast();

  useEffect(() => {
    apiFetch<TestRecord[]>("/api/testing").then((d) => d && setRecords(d));
    apiFetch<InspectionBatchOption[]>("/api/inspection").then((d) => d && setInspectionBatches(d));
  }, []);

  const filtered = records.filter((r) => getTestType(r) === activeTab);

  const handleSubmit = () => {
    if (!inspectionId || !tester) {
      showToast("请填写所有必填项", "error");
      return;
    }
    let overallResult = "fail";
    let body: Record<string, unknown> = {
      inspection_id: inspectionId,
      tester,
    };

    if (activeTab === "hardness") {
      const h = Number(hardness);
      const t = Number(hardnessTarget);
      if (!hardness) {
        showToast("请填写硬度值", "error");
        return;
      }
      overallResult = Math.abs(h - t) <= 5 ? "pass" : "fail";
      body = {
        ...body,
        hardness_shore_a: h,
        hardness_target: t,
        hardness_result: overallResult,
        overall_result: overallResult,
      };
    } else if (activeTab === "tensile") {
      const ts = Number(tensile);
      const el = Number(elongation);
      if (!tensile || !elongation) {
        showToast("请填写拉伸强度和延伸率", "error");
        return;
      }
      overallResult = ts >= Number(tensileTarget) && el >= Number(elongationTarget) ? "pass" : "fail";
      body = {
        ...body,
        tensile_strength: ts,
        tensile_strength_target: Number(tensileTarget),
        elongation_at_break: el,
        elongation_target: Number(elongationTarget),
        tensile_strength_result: ts >= Number(tensileTarget) ? "pass" : "fail",
        overall_result: overallResult,
      };
    } else {
      const cs = Number(compression);
      if (!compression) {
        showToast("请填写压缩变形率", "error");
        return;
      }
      overallResult = cs <= Number(compressionTarget) ? "pass" : "fail";
      body = {
        ...body,
        compression_set: cs,
        compression_set_target: Number(compressionTarget),
        compression_set_result: overallResult,
        overall_result: overallResult,
      };
    }

    apiFetch("/api/testing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((ok) => {
      if (ok !== null) {
        showToast("试验记录提交成功", "success");
        apiFetch<TestRecord[]>("/api/testing").then((d) => {
          if (d) {
            setRecords(d);
            setShowForm(false);
            setInspectionId("");
            setTester("");
            setHardness("");
            setTensile("");
            setElongation("");
            setCompression("");
          }
        });
      } else {
        showToast("试验记录提交失败", "error");
      }
    });
  };

  const chartData = filtered.map((r) => {
    if (activeTab === "hardness") {
      return { name: r.batchNo.slice(-3), 实测: r.hardnessShoreA, 目标: r.hardnessTarget };
    } else if (activeTab === "tensile") {
      return { name: r.batchNo.slice(-3), 拉伸强度: r.tensileStrength, 目标: r.tensileStrengthTarget, 延伸率: r.elongationAtBreak, 延伸目标: r.elongationTarget };
    } else {
      return { name: r.batchNo.slice(-3), 实测: r.compressionSet, 目标: r.compressionSetTarget };
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-display font-bold">物性试验</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          新增试验
        </button>
      </div>

      <div className="flex gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`px-4 py-2 rounded-t-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-surface-light text-amber border-b-2 border-amber"
                : "text-gray-400 hover:text-base bg-surface-lighter"
            }`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="card">
          <div className="card-header">
            <h3 className="font-display font-semibold text-sm">
              {tabs.find((t) => t.key === activeTab)?.label} - 新增记录
            </h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">关联检测批次</label>
                <select className="input-field w-full" value={inspectionId} onChange={(e) => setInspectionId(e.target.value)}>
                  <option value="">选择检测批次</option>
                  {inspectionBatches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.batchNo}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">试验员</label>
                <input type="text" className="input-field w-full" value={tester} onChange={(e) => setTester(e.target.value)} placeholder="试验员姓名" />
              </div>
              {activeTab === "hardness" && (
                <>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">硬度值 (Shore A)</label>
                    <input type="number" className="input-field w-full" value={hardness} onChange={(e) => setHardness(e.target.value)} placeholder="实测值" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">目标值</label>
                    <input type="number" className="input-field w-full" value={hardnessTarget} onChange={(e) => setHardnessTarget(e.target.value)} />
                  </div>
                </>
              )}
              {activeTab === "tensile" && (
                <>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">拉伸强度 (MPa)</label>
                    <input type="number" step="0.1" className="input-field w-full" value={tensile} onChange={(e) => setTensile(e.target.value)} placeholder="实测值" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">目标强度</label>
                    <input type="number" step="0.1" className="input-field w-full" value={tensileTarget} onChange={(e) => setTensileTarget(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">延伸率 (%)</label>
                    <input type="number" className="input-field w-full" value={elongation} onChange={(e) => setElongation(e.target.value)} placeholder="实测值" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">目标延伸率</label>
                    <input type="number" className="input-field w-full" value={elongationTarget} onChange={(e) => setElongationTarget(e.target.value)} />
                  </div>
                </>
              )}
              {activeTab === "compression" && (
                <>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">压缩变形率 (%)</label>
                    <input type="number" step="0.1" className="input-field w-full" value={compression} onChange={(e) => setCompression(e.target.value)} placeholder="实测值" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">最大允许值</label>
                    <input type="number" step="0.1" className="input-field w-full" value={compressionTarget} onChange={(e) => setCompressionTarget(e.target.value)} />
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleSubmit} className="btn-primary">提交</button>
              <button onClick={() => setShowForm(false)} className="btn-secondary">取消</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">
            <h3 className="font-display font-semibold text-sm">实测 vs 目标</h3>
          </div>
          <div className="card-body">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333842" />
                  <XAxis dataKey="name" stroke="#666" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#666" tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ backgroundColor: "#22262E", border: "1px solid #333842", borderRadius: 6, color: "#E8E6E1" }} />
                  <Legend />
                  {activeTab === "hardness" && (
                    <>
                      <Bar dataKey="实测" fill="#E8A317" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="目标" fill="#5B8DEF" radius={[4, 4, 0, 0]} />
                    </>
                  )}
                  {activeTab === "tensile" && (
                    <>
                      <Bar dataKey="拉伸强度" fill="#E8A317" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="目标" fill="#5B8DEF" radius={[4, 4, 0, 0]} />
                    </>
                  )}
                  {activeTab === "compression" && (
                    <>
                      <Bar dataKey="实测" fill="#E8A317" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="目标" fill="#5B8DEF" radius={[4, 4, 0, 0]} />
                    </>
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="font-display font-semibold text-sm">试验记录</h3>
          </div>
          <div className="card-body">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[400px]">
                <thead>
                  <tr className="border-b border-surface-border">
                    <th className="table-header">批次号</th>
                    {activeTab === "hardness" && <th className="table-header">硬度</th>}
                    {activeTab === "tensile" && (
                      <>
                        <th className="table-header">拉伸强度</th>
                        <th className="table-header">延伸率</th>
                      </>
                    )}
                    {activeTab === "compression" && <th className="table-header">压缩变形</th>}
                    <th className="table-header">结果</th>
                    <th className="table-header">时间</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-b border-surface-border last:border-0 hover:bg-surface-lighter/50">
                      <td className="table-cell font-mono text-amber">{r.batchNo}</td>
                      {activeTab === "hardness" && (
                        <td className="table-cell">{r.hardnessShoreA} <span className="text-gray-600 text-xs">/ {r.hardnessTarget}</span></td>
                      )}
                      {activeTab === "tensile" && (
                        <>
                          <td className="table-cell">{r.tensileStrength} <span className="text-gray-600 text-xs">/ {r.tensileStrengthTarget}</span></td>
                          <td className="table-cell">{r.elongationAtBreak}% <span className="text-gray-600 text-xs">/ {r.elongationTarget}%</span></td>
                        </>
                      )}
                      {activeTab === "compression" && (
                        <td className="table-cell">{r.compressionSet}% <span className="text-gray-600 text-xs">≤{r.compressionSetTarget}%</span></td>
                      )}
                      <td className="table-cell">
                        <span className={r.overallResult === "pass" ? "badge-pass" : "badge-fail"}>
                          {r.overallResult === "pass" ? "合格" : "不合格"}
                        </span>
                      </td>
                      <td className="table-cell text-gray-400">{r.testedAt}</td>
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
