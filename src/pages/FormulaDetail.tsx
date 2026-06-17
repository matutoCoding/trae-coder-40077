import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Pencil, CheckCircle2, ArrowLeft } from "lucide-react";
import { apiFetch } from "@/lib/utils";

interface FormulaDetail {
  id: string;
  code: string;
  name: string;
  version: number;
  status: string;
  description: string;
  createdBy: string;
  createdAt: string;
  materials: { name: string; code: string; ratio: number; unit: string }[];
}

const statusBadgeMap: Record<string, string> = {
  draft: "badge-warn",
  pending: "badge-info",
  approved: "badge-pass",
  published: "badge-pass",
  rejected: "badge-fail",
};

const statusLabelMap: Record<string, string> = {
  draft: "草稿",
  pending: "审批中",
  approved: "已审批",
  published: "已发布",
  rejected: "已驳回",
};

const defaultDetail: FormulaDetail = {
  id: "1",
  code: "FP-0001",
  name: "NBR标准配方",
  version: 3.2,
  status: "pending",
  description: "适用于一般工业密封的丁腈橡胶标准配方，具有良好的耐油性和耐热性。",
  createdBy: "张工",
  createdAt: "2024-06-15",
  materials: [
    { name: "NBR生胶", code: "MAT-001", ratio: 100, unit: "phr" },
    { name: "炭黑N550", code: "MAT-002", ratio: 50, unit: "phr" },
    { name: "氧化锌", code: "MAT-003", ratio: 5, unit: "phr" },
    { name: "硬脂酸", code: "MAT-004", ratio: 1.5, unit: "phr" },
    { name: "硫磺", code: "MAT-005", ratio: 1.5, unit: "phr" },
    { name: "促进剂CZ", code: "MAT-006", ratio: 1.0, unit: "phr" },
  ],
};

export default function FormulaDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<FormulaDetail>(defaultDetail);

  useEffect(() => {
    apiFetch<FormulaDetail>(`/api/formulas/${id}`).then((d) => d && setDetail(d));
  }, [id]);

  const handleApprove = () => {
    apiFetch(`/api/formulas/${id}/approve`, { method: "POST" }).then(() =>
      apiFetch<FormulaDetail>(`/api/formulas/${id}`).then((d) => d && setDetail(d))
    );
  };

  const totalRatio = detail.materials.reduce((s, m) => s + m.ratio, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-md hover:bg-surface-lighter text-gray-400 hover:text-base transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-lg font-display font-bold">配方详情</h2>
      </div>

      <div className="card">
        <div className="card-header flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="font-display font-semibold">{detail.name}</h3>
            <span className="text-gray-500 font-mono text-sm">{detail.code}</span>
            <span className="text-gray-500 text-sm">v{detail.version}</span>
            <span className={statusBadgeMap[detail.status] || "badge-info"}>
              {statusLabelMap[detail.status] || detail.status}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {detail.status === "pending" && (
              <button onClick={handleApprove} className="btn-primary flex items-center gap-2">
                <CheckCircle2 size={16} />
                审批通过
              </button>
            )}
            <Link to={`/formulas/${id}/edit`} className="btn-secondary flex items-center gap-2">
              <Pencil size={16} />
              编辑
            </Link>
          </div>
        </div>
        <div className="card-body space-y-4">
          <p className="text-sm text-gray-400">{detail.description}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-gray-500 mb-1">创建人</div>
              <div className="text-sm">{detail.createdBy}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">创建时间</div>
              <div className="text-sm">{detail.createdAt}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">原材料种类</div>
              <div className="text-sm">{detail.materials.length} 种</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">总配比</div>
              <div className="text-sm">{totalRatio} phr</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="font-display font-semibold text-sm">原材料配比</h3>
        </div>
        <div className="card-body">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="border-b border-surface-border">
                  <th className="table-header">材料编号</th>
                  <th className="table-header">材料名称</th>
                  <th className="table-header">配比</th>
                  <th className="table-header">单位</th>
                  <th className="table-header">占比</th>
                </tr>
              </thead>
              <tbody>
                {detail.materials.map((m, i) => (
                  <tr key={i} className="border-b border-surface-border last:border-0 hover:bg-surface-lighter/50">
                    <td className="table-cell font-mono text-steel">{m.code}</td>
                    <td className="table-cell">{m.name}</td>
                    <td className="table-cell">{m.ratio}</td>
                    <td className="table-cell text-gray-400">{m.unit}</td>
                    <td className="table-cell text-gray-400">
                      {totalRatio > 0 ? ((m.ratio / totalRatio) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-surface-border">
                  <td className="table-cell font-medium">合计</td>
                  <td className="table-cell" />
                  <td className="table-cell font-medium text-amber">{totalRatio}</td>
                  <td className="table-cell text-gray-400">phr</td>
                  <td className="table-cell font-medium text-amber">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
