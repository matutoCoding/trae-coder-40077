import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Trash2, Save, X } from "lucide-react";
import { apiFetch } from "@/lib/utils";

interface MaterialRow {
  name: string;
  code: string;
  ratio: number;
  unit: string;
}

interface FormulaData {
  name: string;
  code: string;
  description: string;
  materials: MaterialRow[];
}

const emptyMaterial: MaterialRow = { name: "", code: "", ratio: 0, unit: "phr" };

export default function FormulaEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<FormulaData>({
    name: "",
    code: "",
    description: "",
    materials: [{ ...emptyMaterial }],
  });

  useEffect(() => {
    if (isEdit) {
      apiFetch<FormulaData>(`/api/formulas/${id}`).then((d) => {
        if (d) {
          setForm({
            name: d.name || "",
            code: d.code || "",
            description: d.description || "",
            materials: d.materials?.length ? d.materials : [{ ...emptyMaterial }],
          });
        }
      });
    }
  }, [id, isEdit]);

  const totalRatio = form.materials.reduce((s, m) => s + Number(m.ratio), 0);

  const updateField = (field: keyof FormulaData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateMaterial = (index: number, field: keyof MaterialRow, value: string | number) => {
    setForm((prev) => {
      const materials = [...prev.materials];
      materials[index] = { ...materials[index], [field]: value };
      return { ...prev, materials };
    });
  };

  const addMaterial = () => {
    setForm((prev) => ({ ...prev, materials: [...prev.materials, { ...emptyMaterial }] }));
  };

  const removeMaterial = (index: number) => {
    setForm((prev) => ({
      ...prev,
      materials: prev.materials.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = () => {
    const url = isEdit ? `/api/formulas/${id}` : "/api/formulas";
    const method = isEdit ? "PUT" : "POST";
    apiFetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    }).then((d) => {
      if (d !== null) navigate(`/formulas${isEdit ? `/${id}` : ""}`);
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-display font-bold">{isEdit ? "编辑配方" : "新建配方"}</h2>

      <div className="card">
        <div className="card-header">
          <h3 className="font-display font-semibold text-sm">基本信息</h3>
        </div>
        <div className="card-body space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">配方名称</label>
              <input
                type="text"
                className="input-field w-full"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="请输入配方名称"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">配方编号</label>
              <input
                type="text"
                className="input-field w-full"
                value={form.code}
                onChange={(e) => updateField("code", e.target.value)}
                placeholder="如 FP-0001"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">配方描述</label>
            <textarea
              className="input-field w-full h-20 resize-none"
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="请输入配方描述"
            />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h3 className="font-display font-semibold text-sm">原材料配比</h3>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">
              合计: <span className="text-amber font-medium">{totalRatio}</span> phr
            </span>
            <button onClick={addMaterial} className="btn-secondary flex items-center gap-1 text-xs">
              <Plus size={14} />
              添加材料
            </button>
          </div>
        </div>
        <div className="card-body">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-surface-border">
                  <th className="table-header">材料名称</th>
                  <th className="table-header">材料编号</th>
                  <th className="table-header">配比</th>
                  <th className="table-header">单位</th>
                  <th className="table-header w-16">操作</th>
                </tr>
              </thead>
              <tbody>
                {form.materials.map((m, i) => (
                  <tr key={i} className="border-b border-surface-border last:border-0">
                    <td className="table-cell">
                      <input
                        type="text"
                        className="input-field w-full"
                        value={m.name}
                        onChange={(e) => updateMaterial(i, "name", e.target.value)}
                        placeholder="材料名称"
                      />
                    </td>
                    <td className="table-cell">
                      <input
                        type="text"
                        className="input-field w-full"
                        value={m.code}
                        onChange={(e) => updateMaterial(i, "code", e.target.value)}
                        placeholder="编号"
                      />
                    </td>
                    <td className="table-cell">
                      <input
                        type="number"
                        className="input-field w-24"
                        value={m.ratio}
                        onChange={(e) => updateMaterial(i, "ratio", Number(e.target.value))}
                        min={0}
                      />
                    </td>
                    <td className="table-cell">
                      <select
                        className="input-field w-24"
                        value={m.unit}
                        onChange={(e) => updateMaterial(i, "unit", e.target.value)}
                      >
                        <option value="phr">phr</option>
                        <option value="kg">kg</option>
                        <option value="g">g</option>
                      </select>
                    </td>
                    <td className="table-cell">
                      <button
                        onClick={() => removeMaterial(i)}
                        disabled={form.materials.length <= 1}
                        className="p-1.5 rounded-md hover:bg-fail-muted text-gray-500 hover:text-fail transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={handleSubmit} className="btn-primary flex items-center gap-2">
          <Save size={16} />
          {isEdit ? "保存修改" : "创建配方"}
        </button>
        <button onClick={() => navigate(-1)} className="btn-secondary flex items-center gap-2">
          <X size={16} />
          取消
        </button>
      </div>
    </div>
  );
}
