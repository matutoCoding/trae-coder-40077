import { useState, useEffect } from "react";
import { Search, ChevronRight, GitBranch } from "lucide-react";
import { apiFetch } from "@/lib/utils";

interface TraceRecord {
  id: string;
  batchNo: string;
  stage: string;
  status: string;
  createdAt: string;
  operator: string;
  parentBatchId: string | null;
}

interface TraceStageData {
  stage: string;
  data: Record<string, unknown> | null;
}

interface TraceChain {
  chain: TraceStageData[];
  currentStageIndex: number;
  currentStageName: string;
}

const stageTabs = [
  { key: "all", label: "全部" },
  { key: "formula", label: "配方" },
  { key: "mixing", label: "密炼" },
  { key: "milling", label: "开炼" },
  { key: "vulcanization", label: "硫化" },
  { key: "deburring", label: "去毛边" },
  { key: "inspection", label: "检测" },
  { key: "testing", label: "试验" },
];

const stageLabelMap: Record<string, string> = {
  formula: "配方",
  mixing: "密炼",
  milling: "开炼",
  vulcanization: "硫化",
  deburring: "去毛边",
  inspection: "尺寸检测",
  testing: "物性试验",
};

const statusBadgeMap: Record<string, string> = {
  pass: "badge-pass",
  completed: "badge-pass",
  fail: "badge-fail",
  abnormal: "badge-fail",
  pending: "badge-warn",
  in_progress: "badge-info",
  processing: "badge-info",
  mixing: "badge-info",
  milling: "badge-info",
  timeout: "badge-warn",
};

const statusLabelMap: Record<string, string> = {
  pass: "合格",
  completed: "已完成",
  fail: "不合格",
  abnormal: "异常",
  pending: "待处理",
  in_progress: "处理中",
  processing: "处理中",
  mixing: "混炼中",
  milling: "开炼中",
  timeout: "超时",
};

function getBadgeClass(status: string) {
  return statusBadgeMap[status] || "badge-info";
}

function getStatusLabel(status: string) {
  return statusLabelMap[status] || status;
}

function getBatchNo(data: Record<string, unknown> | null, stage: string): string {
  if (!data) return "--";
  if (stage === "formula") return (data.code as string) || (data.batchNo as string) || "--";
  return (data.batchNo as string) || "--";
}

function renderStageParams(stage: string, data: Record<string, unknown> | null) {
  if (!data) return <p className="text-gray-500 text-sm">暂无数据</p>;

  const params: { label: string; value: string | number | undefined }[] = [];

  switch (stage) {
    case "formula":
      params.push({ label: "配方名称", value: data.name as string });
      params.push({ label: "配方编码", value: data.code as string });
      params.push({ label: "创建人", value: data.createdBy as string });
      break;
    case "mixing":
      params.push({ label: "机台", value: data.machineNo as string });
      params.push({ label: "操作员", value: data.operator as string });
      params.push({ label: "排胶温度", value: data.dischargeTemp ? `${data.dischargeTemp}°C` : "--" });
      params.push({ label: "最高温度", value: data.maxTemp ? `${data.maxTemp}°C` : "--" });
      break;
    case "milling":
      params.push({ label: "机台", value: data.machineNo as string });
      params.push({ label: "操作员", value: data.operator as string });
      params.push({ label: "当前厚度", value: data.thickness ? `${data.thickness} mm` : "--" });
      params.push({ label: "薄通次数", value: data.passCount as number });
      break;
    case "vulcanization":
      params.push({ label: "模具", value: data.moldNo as string });
      params.push({ label: "操作员", value: data.operator as string });
      params.push({ label: "模温", value: data.moldTemp ? `${data.moldTemp}°C` : "--" });
      params.push({ label: "硫化时间", value: data.vulcanizationTime ? `${data.vulcanizationTime}秒` : "--" });
      break;
    case "deburring":
      params.push({ label: "去边方式", value: (data.method as string) === "manual" ? "手工" : (data.method as string) === "freezing" ? "冷冻" : "机械" });
      params.push({ label: "操作员", value: data.operator as string });
      params.push({ label: "总数", value: data.totalCount as number });
      params.push({ label: "合格率", value: data.qualifiedRate ? `${(data.qualifiedRate as number).toFixed(1)}%` : "--" });
      break;
    case "inspection":
      params.push({ label: "检测员", value: data.inspector as string });
      params.push({ label: "内径", value: data.innerDiameter as number });
      params.push({ label: "外径", value: data.outerDiameter as number });
      params.push({ label: "截面", value: data.crossSection as number });
      break;
    case "testing":
      params.push({ label: "试验员", value: data.tester as string });
      if (data.hardnessShoreA != null) {
        params.push({ label: "硬度", value: `${data.hardnessShoreA} Shore A` });
      }
      if (data.tensileStrength != null) {
        params.push({ label: "拉伸强度", value: `${data.tensileStrength} MPa` });
      }
      if (data.elongationAtBreak != null) {
        params.push({ label: "延伸率", value: `${data.elongationAtBreak}%` });
      }
      if (data.compressionSet != null) {
        params.push({ label: "压缩变形", value: `${data.compressionSet}%` });
      }
      break;
  }

  return (
    <div className="grid grid-cols-2 gap-2 mt-2">
      {params.map((p, i) => (
        <div key={i} className="text-sm">
          <span className="text-gray-500">{p.label}:</span>
          <span className="ml-1 text-base">{p.value ?? "--"}</span>
        </div>
      ))}
    </div>
  );
}

export default function BatchTraceability() {
  const [records, setRecords] = useState<TraceRecord[]>([]);
  const [keyword, setKeyword] = useState("");
  const [activeStage, setActiveStage] = useState("all");
  const [selectedRecord, setSelectedRecord] = useState<TraceRecord | null>(null);
  const [traceChain, setTraceChain] = useState<TraceChain | null>(null);
  const [highlightedStage, setHighlightedStage] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<TraceRecord[]>("/api/traceability").then((d) => d && setRecords(d));
  }, []);

  const filtered = records.filter((r) => {
    const matchStage = activeStage === "all" || r.stage === activeStage;
    const matchKeyword = !keyword || r.batchNo.toLowerCase().includes(keyword.toLowerCase());
    return matchStage && matchKeyword;
  });

  const handleSelectRecord = (record: TraceRecord) => {
    setSelectedRecord(record);
    setHighlightedStage(record.stage);
    apiFetch<TraceChain>(`/api/traceability/${record.stage}/${record.id}`).then((d) => {
      if (d) {
        setTraceChain(d);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <GitBranch size={24} className="text-amber" />
        <h2 className="text-lg font-display font-bold">批次追溯</h2>
      </div>

      <div className="card">
        <div className="card-body space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                className="input-field w-full pl-9"
                placeholder="搜索批次号..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-1">
            {stageTabs.map((tab) => (
              <button
                key={tab.key}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                  activeStage === tab.key
                    ? "bg-amber-muted text-amber"
                    : "text-gray-400 hover:text-base hover:bg-surface-lighter"
                }`}
                onClick={() => setActiveStage(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2">
          <div className="card h-full">
            <div className="card-header">
              <h3 className="font-display font-semibold text-sm">批次时间线</h3>
            </div>
            <div className="card-body">
              {filtered.length === 0 ? (
                <div className="text-center py-8 text-gray-500">暂无匹配的批次记录</div>
              ) : (
                <div className="relative">
                  <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-surface-border" />
                  <div className="space-y-1">
                    {filtered.map((r) => {
                      const isSelected = selectedRecord?.id === r.id;
                      return (
                        <button
                          key={r.id}
                          onClick={() => handleSelectRecord(r)}
                          className={`w-full text-left relative flex items-start gap-3 p-3 rounded-md transition-colors ${
                            isSelected
                              ? "bg-amber-muted/50 border border-amber/50"
                              : "hover:bg-surface-lighter/50"
                          }`}
                        >
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 ${
                            isSelected ? "bg-amber text-surface" : "bg-surface-lighter text-gray-400"
                          }`}>
                            <ChevronRight size={14} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono text-sm text-amber truncate">{r.batchNo}</span>
                              <span className={getBadgeClass(r.status)}>
                                {getStatusLabel(r.status)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-xs text-gray-500">{stageLabelMap[r.stage]}</span>
                              <span className="text-xs text-gray-600">{r.createdAt}</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="card h-full">
            <div className="card-header">
              <h3 className="font-display font-semibold text-sm">
                {selectedRecord ? `${stageLabelMap[selectedRecord.stage]} - ${selectedRecord.batchNo}` : "追溯链条"}
              </h3>
            </div>
            <div className="card-body">
              {!traceChain ? (
                <div className="text-center py-12 text-gray-500">
                  <GitBranch size={48} className="mx-auto mb-3 text-gray-600" />
                  <p>请从左侧选择一个批次查看完整追溯链</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {traceChain.chain.map((stageItem, idx) => {
                    const isHighlighted = highlightedStage === stageItem.stage;
                    const stageData = stageItem.data as Record<string, unknown> | null;
                    const batchNo = getBatchNo(stageData, stageItem.stage);
                    let status = "";
                    if (stageData) {
                      if (stageItem.stage === "formula") status = (stageData.status as string) || "completed";
                      else if (stageItem.stage === "inspection" || stageItem.stage === "testing") status = (stageData.overallResult as string) || "";
                      else status = (stageData.status as string) || "";
                    }

                    return (
                      <div
                        key={stageItem.stage}
                        className={`relative p-4 rounded-lg border transition-all ${
                          isHighlighted
                            ? "border-2 border-amber bg-amber-muted/20"
                            : "border-surface-border bg-surface-lighter/30"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                              isHighlighted ? "bg-amber text-surface" : "bg-surface-border text-gray-300"
                            }`}>
                              {idx + 1}
                            </span>
                            <div>
                              <h4 className="font-semibold text-sm">{stageLabelMap[stageItem.stage]}</h4>
                              <p className="font-mono text-xs text-amber">{batchNo}</p>
                            </div>
                          </div>
                          {status && (
                            <span className={getBadgeClass(status)}>
                              {getStatusLabel(status)}
                            </span>
                          )}
                        </div>
                        {renderStageParams(stageItem.stage, stageData)}
                        {idx < traceChain.chain.length - 1 && (
                          <div className="absolute left-7 -bottom-4 w-0.5 h-4 bg-surface-border" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
