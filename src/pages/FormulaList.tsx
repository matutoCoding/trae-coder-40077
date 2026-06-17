import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, Plus, Eye, Pencil } from "lucide-react";
import { apiFetch } from "@/lib/utils";

interface Formula {
  id: string;
  code: string;
  name: string;
  version: string;
  status: string;
  createdBy: string;
  createdAt: string;
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

const defaultFormulas: Formula[] = [
  { id: "1", code: "FP-0001", name: "NBR标准配方", version: "v3.2", status: "published", createdBy: "张工", createdAt: "2024-06-15" },
  { id: "2", code: "FP-0002", name: "EPDM耐热配方", version: "v2.1", status: "approved", createdBy: "李工", createdAt: "2024-06-14" },
  { id: "3", code: "FP-0003", name: "FKM耐油配方", version: "v1.0", status: "pending", createdBy: "王工", createdAt: "2024-06-13" },
  { id: "4", code: "FP-0004", name: "硅橡胶密封配方", version: "v1.2", status: "draft", createdBy: "赵工", createdAt: "2024-06-12" },
  { id: "5", code: "FP-0005", name: "氟橡胶耐腐配方", version: "v2.0", status: "rejected", createdBy: "孙工", createdAt: "2024-06-11" },
  { id: "6", code: "FP-0006", name: "HNBR高强度配方", version: "v1.5", status: "published", createdBy: "张工", createdAt: "2024-06-10" },
];

const tabs = [
  { key: "all", label: "全部" },
  { key: "draft", label: "草稿" },
  { key: "pending", label: "审批中" },
  { key: "published", label: "已发布" },
];

export default function FormulaList() {
  const [formulas, setFormulas] = useState<Formula[]>(defaultFormulas);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    apiFetch<Formula[]>("/api/formulas").then((d) => d && setFormulas(d));
  }, []);

  const filtered = formulas.filter((f) => {
    const matchSearch =
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.code.toLowerCase().includes(search.toLowerCase());
    const matchTab = activeTab === "all" || f.status === activeTab;
    return matchSearch && matchTab;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-display font-bold">配方管理</h2>
        <Link to="/formulas/new" className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          新建配方
        </Link>
      </div>

      <div className="card">
        <div className="card-body space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="搜索配方编号或名称..."
                className="input-field pl-9 w-full"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                    activeTab === tab.key
                      ? "bg-amber-muted text-amber"
                      : "text-gray-400 hover:text-base hover:bg-surface-lighter"
                  }`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-surface-border">
                  <th className="table-header">编号</th>
                  <th className="table-header">名称</th>
                  <th className="table-header">版本</th>
                  <th className="table-header">状态</th>
                  <th className="table-header">创建人</th>
                  <th className="table-header">创建时间</th>
                  <th className="table-header">操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((f) => (
                  <tr key={f.id} className="border-b border-surface-border last:border-0 hover:bg-surface-lighter/50">
                    <td className="table-cell font-mono text-amber">{f.code}</td>
                    <td className="table-cell">{f.name}</td>
                    <td className="table-cell text-gray-400">{f.version}</td>
                    <td className="table-cell">
                      <span className={statusBadgeMap[f.status] || "badge-info"}>
                        {statusLabelMap[f.status] || f.status}
                      </span>
                    </td>
                    <td className="table-cell text-gray-400">{f.createdBy}</td>
                    <td className="table-cell text-gray-400">{f.createdAt}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/formulas/${f.id}`}
                          className="p-1.5 rounded-md hover:bg-surface-lighter text-gray-400 hover:text-steel transition-colors"
                        >
                          <Eye size={16} />
                        </Link>
                        <Link
                          to={`/formulas/${f.id}/edit`}
                          className="p-1.5 rounded-md hover:bg-surface-lighter text-gray-400 hover:text-amber transition-colors"
                        >
                          <Pencil size={16} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-8 text-gray-500">暂无匹配的配方数据</div>
          )}
        </div>
      </div>
    </div>
  );
}
