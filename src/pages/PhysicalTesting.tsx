import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { apiFetch, apiFetchFull } from "@/lib/utils";
import { useToast } from "@/components/Toast";
import { Eye, X, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
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
  inspectionId: string;
  tester: string;
  hardnessShoreA?: number;
  hardnessTarget?: number;
  hardnessResult?: string;
  tensileStrength?: number;
  tensileStrengthTarget?: number;
  tensileStrengthResult?: string;
  elongationAtBreak?: number;
  elongationTarget?: number;
  elongationResult?: string;
  compressionSet?: number;
  compressionSetTarget?: number;
  compressionSetResult?: string;
  overallResult: string;
  testedAt: string;
}

interface InspectionDetail {
  id: string;
  innerDiameter: number;
  innerDiameterTarget: number;
  outerDiameter: number;
  outerDiameterTarget: number;
  crossSection: number;
  crossSectionTarget: number;
  innerDiameterResult: string;
  outerDiameterResult: string;
  crossSectionResult: string;
  overallResult: string;
  inspector: string;
  deburringBatchId: string;
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

const tabs: { key: TestTab; label: string }[] = [
  { key: "hardness", label: "硬度测试" },
  { key: "tensile", label: "拉伸试验" },
  { key: "compression", label: "压缩变形" },
];

function resultClass(r: string | undefined) {
  if (r === "pass") return "text-pass";
  if (r === "fail") return "text-fail";
  return "text-gray-500";
}

function calcElongationResult(r: TestRecord): string | null {
  if (r.elongationResult) return r.elongationResult;
  if (r.elongationAtBreak != null && r.elongationTarget != null && r.elongationTarget > 0) {
    return r.elongationAtBreak >= r.elongationTarget * 0.85 ? 'pass' : 'fail';
  }
  return null;
}

export default function PhysicalTesting() {
  const [records, setRecords] = useState<TestRecord[]>([]);
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

  const [keyword, setKeyword] = useState("");
  const [testerSearch, setTesterSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [overallResultFilter, setOverallResultFilter] = useState("");
  const [appliedFilters, setAppliedFilters] = useState({
    keyword: "",
    tester: "",
    dateFrom: "",
    dateTo: "",
    overallResult: "",
  });

  const [selectedRecord, setSelectedRecord] = useState<TestRecord | null>(null);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const highlightId = searchParams.get('highlight');
    if (highlightId && records.length > 0) {
      const target = records.find(r => r.id === highlightId);
      if (target) setSelectedRecord(target);
    }
  }, [searchParams, records]);

  const [inspectionDetail, setInspectionDetail] = useState<InspectionDetail | null>(null);

  const [overviewInspectionId, setOverviewInspectionId] = useState("");

  useEffect(() => {
    fetchRecords();
    apiFetch<InspectionBatchOption[]>("/api/inspection").then((d) => d && setInspectionBatches(d));
  }, []);

  const fetchRecords = () => {
    const params = new URLSearchParams();
    if (appliedFilters.keyword) params.append("keyword", appliedFilters.keyword);
    if (appliedFilters.tester) params.append("tester", appliedFilters.tester);
    if (appliedFilters.dateFrom) params.append("date_from", appliedFilters.dateFrom);
    if (appliedFilters.dateTo) params.append("date_to", appliedFilters.dateTo);
    if (appliedFilters.overallResult) params.append("overall_result", appliedFilters.overallResult);
    const url = params.toString() ? `/api/testing?${params.toString()}` : "/api/testing";
    apiFetch<TestRecord[]>(url).then((d) => d && setRecords(d));
  };

  const handleFilter = () => {
    setAppliedFilters({
      keyword,
      tester: testerSearch,
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
    setTesterSearch("");
    setDateFrom("");
    setDateTo("");
    setOverallResultFilter("");
    setAppliedFilters({ keyword: "", tester: "", dateFrom: "", dateTo: "", overallResult: "" });
  };

  const loadInspectionDetail = (id: string) => {
    if (!id) {
      setInspectionDetail(null);
      return;
    }
    apiFetch<InspectionDetail>(`/api/inspection/${id}`).then((d) => setInspectionDetail(d || null));
  };

  useEffect(() => {
    if (overviewInspectionId) loadInspectionDetail(overviewInspectionId);
  }, [overviewInspectionId]);

  const filtered = records.filter((r) => getTestType(r) === activeTab);

  const testsForOverview = overviewInspectionId
    ? records.filter((r) => r.inspectionId === overviewInspectionId)
    : [];

  const hardnessTest = testsForOverview.find((r) => r.hardnessShoreA != null);
  const tensileTest = testsForOverview.find((r) => r.tensileStrength != null);
  const compressionTest = testsForOverview.find((r) => r.compressionSet != null);

  const allItems = testsForOverview.length > 0 || inspectionDetail != null;

  const handleSubmit = () => {
    if (!inspectionId || !tester) {
      showToast("请填写所有必填项", "error");
      return;
    }
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
      if (h < 0 || h > 120) {
        showToast("异常数值:硬度应在0~120 Shore A之间", "error");
        return;
      }
      body = {
        ...body,
        hardness_shore_a: h,
        hardness_target: t,
      };
    } else if (activeTab === "tensile") {
      const ts = Number(tensile);
      const el = Number(elongation);
      const tsTarget = Number(tensileTarget);
      const elTarget = Number(elongationTarget);
      if (!tensile || !elongation) {
        showToast("请填写拉伸强度和延伸率", "error");
        return;
      }
      if (ts < 0 || ts > 200) {
        showToast("异常数值:拉伸强度应在0~200 MPa之间", "error");
        return;
      }
      if (el < 0 || el > 2000) {
        showToast("异常数值:延伸率应在0~2000%之间", "error");
        return;
      }
      body = {
        ...body,
        tensile_strength: ts,
        tensile_strength_target: tsTarget,
        elongation_at_break: el,
        elongation_target: elTarget,
      };
    } else {
      const cs = Number(compression);
      if (!compression) {
        showToast("请填写压缩变形率", "error");
        return;
      }
      if (cs < 0 || cs > 100) {
        showToast("异常数值:压缩变形率应在0~100%之间", "error");
        return;
      }
      body = {
        ...body,
        compression_set: cs,
        compression_set_target: Number(compressionTarget),
      };
    }

    apiFetchFull("/api/testing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => {
      if (r.success) {
        showToast("试验记录提交成功", "success");
        fetchRecords();
        setShowForm(false);
        setInspectionId("");
        setTester("");
        setHardness("");
        setTensile("");
        setElongation("");
        setCompression("");
        if (overviewInspectionId) {
          loadInspectionDetail(overviewInspectionId);
        }
      } else {
        showToast(r.error || "试验记录提交失败", "error");
      }
    });
  };

  const chartData = filtered.map((r) => {
    if (activeTab === "hardness") {
      return { name: r.batchNo.slice(-3), 实测: r.hardnessShoreA, 目标: r.hardnessTarget };
    } else if (activeTab === "tensile") {
      return { name: r.batchNo.slice(-3), 拉伸强度: r.tensileStrength, 目标强度: r.tensileStrengthTarget, 延伸率: r.elongationAtBreak, 延伸目标: r.elongationTarget };
    } else {
      return { name: r.batchNo.slice(-3), 实测: r.compressionSet, 目标: r.compressionSetTarget };
    }
  });

  const getOverallStatus = () => {
    const hasInspection = !!inspectionDetail;
    const hasHardness = !!hardnessTest;
    const hasTensile = !!tensileTest;
    const hasCompression = !!compressionTest;
    const allDone = hasInspection && hasHardness && hasTensile && hasCompression;
    if (!allDone) return "incomplete";
    const allPass = inspectionDetail?.overallResult === "pass"
      && hardnessTest?.hardnessResult === "pass"
      && tensileTest?.tensileStrengthResult === "pass"
      && calcElongationResult(tensileTest!) === "pass"
      && compressionTest?.compressionSetResult === "pass";
    return allPass ? "pass" : "fail";
  };

  const releaseAdvice = () => {
    const status = getOverallStatus();
    if (status === "pass") return { label: "建议放行", color: "text-pass", icon: <CheckCircle2 size={20} /> };
    if (status === "fail") return { label: "建议报废或返工", color: "text-fail", icon: <XCircle size={20} /> };
    return { label: "待完整检测", color: "text-warn", icon: <AlertTriangle size={20} /> };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-display font-bold">物性试验</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          新增试验
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
              <label className="block text-xs text-gray-500 mb-1.5">试验员</label>
              <input
                type="text"
                className="input-field w-full"
                placeholder="试验员姓名"
                value={testerSearch}
                onChange={(e) => setTesterSearch(e.target.value)}
              />
            </div>
            <div className="min-w-[140px]">
              <label className="block text-xs text-gray-500 mb-1.5">试验结果</label>
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

      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h3 className="font-display font-semibold text-sm">批次质量总览</h3>
        </div>
        <div className="card-body space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs text-gray-500 mb-1.5">选择检测批次查看综合质量</label>
              <select
                className="input-field w-full"
                value={overviewInspectionId}
                onChange={(e) => setOverviewInspectionId(e.target.value)}
              >
                <option value="">-- 选择尺寸检测批次 --</option>
                {inspectionBatches.map((b) => (
                  <option key={b.id} value={b.id}>{b.batchNo}</option>
                ))}
              </select>
            </div>
          </div>

          {!overviewInspectionId ? (
            <div className="text-center py-6 text-gray-500 text-sm">
              请选择一个尺寸检测批次查看综合质量判定
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
                <div className="p-3 rounded-lg bg-surface-lighter/50 border border-surface-border">
                  <div className="text-xs text-gray-500 mb-1">尺寸检测 (内径/外径/截面)</div>
                  {inspectionDetail ? (
                    <div className="space-y-0.5 mt-2 text-sm">
                    <div>
                      <span className="text-gray-400">内径:</span>
                      <span className="ml-1">
                        {inspectionDetail.innerDiameter}
                      </span>
                      <span className={`ml-1 ${resultClass(inspectionDetail.innerDiameterResult)}`}>
                        {inspectionDetail.innerDiameterResult === "pass" ? "✓" : "✗"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">外径:</span>
                      <span className="ml-1">
                        {inspectionDetail.outerDiameter}
                      </span>
                      <span className={`ml-1 ${resultClass(inspectionDetail.outerDiameterResult)}`}>
                        {inspectionDetail.outerDiameterResult === "pass" ? "✓" : "✗"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">截面:</span>
                      <span className="ml-1">
                        {inspectionDetail.crossSection}
                      </span>
                      <span className={`ml-1 ${resultClass(inspectionDetail.crossSectionResult)}`}>
                        {inspectionDetail.crossSectionResult === "pass" ? "✓" : "✗"}
                      </span>
                    </div>
                    <div className="pt-1 border-t border-surface-border mt-2">
                      <span className={`${resultClass(inspectionDetail.overallResult)} font-medium`}>
                        总体: {inspectionDetail.overallResult === "pass" ? "合格" : "不合格"}
                      </span>
                    </div>
                  </div>
                ) : (
                    <div className="text-sm text-gray-500 mt-2">未做</div>
                  )}
                </div>

                <div className="p-3 rounded-lg bg-surface-lighter/50 border border-surface-border">
                  <div className="text-xs text-gray-500 mb-1">硬度 (Shore A)</div>
                  {hardnessTest ? (
                    <div className="space-y-0.5 mt-2 text-sm">
                      <div>
                        <span className="text-gray-400">实测:</span>
                        <span className="ml-1">{hardnessTest.hardnessShoreA}</span>
                        <span className="text-gray-500 text-xs ml-1">/ {hardnessTest.hardnessTarget}</span>
                      </div>
                      <div className={`${resultClass(hardnessTest.hardnessResult)}`}>
                        判定: {hardnessTest.hardnessResult === "pass" ? "合格" : "不合格"}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 mt-2">未做</div>
                  )}
                </div>

                <div className="p-3 rounded-lg bg-surface-lighter/50 border border-surface-border">
                  <div className="text-xs text-gray-500 mb-1">拉伸强度 (MPa)</div>
                  {tensileTest ? (
                    <div className="space-y-0.5 mt-2 text-sm">
                      <div>
                        <span className="text-gray-400">实测:</span>
                        <span className="ml-1">{tensileTest.tensileStrength}</span>
                        <span className="text-gray-500 text-xs ml-1">/ {tensileTest.tensileStrengthTarget}</span>
                      </div>
                      <div className={`${resultClass(tensileTest.tensileStrengthResult)}`}>
                        判定: {tensileTest.tensileStrengthResult === "pass" ? "合格" : "不合格"}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 mt-2">未做</div>
                  )}
                </div>

                <div className="p-3 rounded-lg bg-surface-lighter/50 border border-surface-border">
                  <div className="text-xs text-gray-500 mb-1">延伸率 (%)</div>
                  {tensileTest ? (
                    <div className="space-y-0.5 mt-2 text-sm">
                      <div>
                        <span className="text-gray-400">实测:</span>
                        <span className="ml-1">{tensileTest.elongationAtBreak}%</span>
                        <span className="text-gray-500 text-xs ml-1">/ {tensileTest.elongationTarget}%</span>
                      </div>
                      <div className={`${resultClass(calcElongationResult(tensileTest))}`}>
                        判定: {calcElongationResult(tensileTest) === "pass" ? "合格" : calcElongationResult(tensileTest) === "fail" ? "不合格" : "未判定"}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 mt-2">未做</div>
                  )}
                </div>

                <div className="p-3 rounded-lg bg-surface-lighter/50 border border-surface-border">
                  <div className="text-xs text-gray-500 mb-1">压缩变形 (%)</div>
                  {compressionTest ? (
                    <div className="space-y-0.5 mt-2 text-sm">
                      <div>
                        <span className="text-gray-400">实测:</span>
                        <span className="ml-1">{compressionTest.compressionSet}%</span>
                        <span className="text-gray-500 text-xs ml-1">≤ {compressionTest.compressionSetTarget}%</span>
                      </div>
                      <div className={`${resultClass(compressionTest.compressionSetResult)}`}>
                        判定: {compressionTest.compressionSetResult === "pass" ? "合格" : "不合格"}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 mt-2">未做</div>
                  )}
                </div>

                <div className="p-3 rounded-lg bg-surface-lighter/50 border border-amber/40">
                  <div className="text-xs text-gray-500 mb-1">放行建议</div>
                  <div className="flex items-center gap-2 mt-2">
                    {releaseAdvice().icon}
                    <span className={`font-semibold text-base ${releaseAdvice().color}`}>
                      {releaseAdvice().label}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-xs text-gray-500 pt-2 border-t border-surface-border">
                提示:综合判定需尺寸检测、硬度、拉伸强度、延伸率、压缩变形五项全部完成后才给出放行建议。五项全合格才建议放行,有不合格则建议报废或返工,缺项则显示待完整检测。
              </div>
            </div>
          )}
        </div>
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
                      <Bar dataKey="目标强度" fill="#5B8DEF" radius={[4, 4, 0, 0]} />
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
          <div className="card">
            <div className="card-header">
              <h3 className="font-display font-semibold text-sm">试验记录</h3>
            </div>
            <div className="card-body">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[500px]">
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
                      <th className="table-header">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => {
                      return (
                        <tr
                          key={r.id}
                          className="border-b border-surface-border last:border-0 hover:bg-surface-lighter/50 cursor-pointer"
                          onClick={() => setSelectedRecord(r)}
                        >
                          <td className="table-cell font-mono text-amber">{r.batchNo}</td>
                          {activeTab === "hardness" && (
                            <td className="table-cell">{r.hardnessShoreA} <span className="text-gray-600 text-xs">/ {r.hardnessTarget}</span></td>
                          )}
                          {activeTab === "tensile" && (
                            <>
                              <td className="table-cell">
                                <div className="flex items-center gap-2">
                                  <span>{r.tensileStrength} <span className="text-gray-600 text-xs">/ {r.tensileStrengthTarget}</span></span>
                                  <span className={r.tensileStrengthResult === "pass" ? "badge-pass" : "badge-fail"}>
                                    {r.tensileStrengthResult === "pass" ? "合格" : "不合格"}
                                  </span>
                                </div>
                              </td>
                              <td className="table-cell">
                                <div className="flex items-center gap-2">
                                  <span>{r.elongationAtBreak}% <span className="text-gray-600 text-xs">/ {r.elongationTarget}%</span></span>
                                  {(() => { const er = calcElongationResult(r); return er != null && (
                                    <span className={er === "pass" ? "badge-pass" : "badge-fail"}>
                                      {er === "pass" ? "合格" : "不合格"}
                                    </span>
                                  ); })()}
                                </div>
                              </td>
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
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedRecord && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="card-header flex items-center justify-between">
              <h3 className="font-display font-semibold text-sm">
                {tabs.find((t) => t.key === getTestType(selectedRecord))?.label || "物性试验"}详情
              </h3>
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
                  <p className="text-xs text-gray-500">综合结果</p>
                  <span className={selectedRecord.overallResult === "pass" ? "badge-pass" : "badge-fail"}>
                    {selectedRecord.overallResult === "pass" ? "合格" : "不合格"}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500">试验员</p>
                  <p className="text-sm">{selectedRecord.tester}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">试验时间</p>
                  <p className="text-sm">{selectedRecord.testedAt}</p>
                </div>
                {selectedRecord.hardnessShoreA != null && (
                  <div>
                    <p className="text-xs text-gray-500">硬度 (Shore A)</p>
                    <p className={`text-sm ${selectedRecord.hardnessResult === "pass" ? "text-pass" : "text-fail"}`}>
                      {selectedRecord.hardnessShoreA} <span className="text-gray-600 text-xs">/ 目标 {selectedRecord.hardnessTarget}</span>
                    </p>
                  </div>
                )}
                {selectedRecord.tensileStrength != null && (
                  <>
                    <div>
                      <p className="text-xs text-gray-500">拉伸强度 (MPa)</p>
                      <p className={`text-sm ${selectedRecord.tensileStrengthResult === "pass" ? "text-pass" : "text-fail"}`}>
                        {selectedRecord.tensileStrength} <span className="text-gray-600 text-xs">/ 目标 {selectedRecord.tensileStrengthTarget}</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">延伸率 (%)</p>
                      <p className={`text-sm ${(() => { const er = calcElongationResult(selectedRecord); return er === "pass" ? "text-pass" : er === "fail" ? "text-fail" : ""; })()}`}>
                        {selectedRecord.elongationAtBreak} <span className="text-gray-600 text-xs">/ 目标 {selectedRecord.elongationTarget}</span>
                      </p>
                    </div>
                  </>
                )}
                {selectedRecord.compressionSet != null && (
                  <div>
                    <p className="text-xs text-gray-500">压缩变形率 (%)</p>
                    <p className={`text-sm ${selectedRecord.compressionSetResult === "pass" ? "text-pass" : "text-fail"}`}>
                      {selectedRecord.compressionSet} <span className="text-gray-600 text-xs">/ 最大 {selectedRecord.compressionSetTarget}%</span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
