import { useState } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import {
  FlaskConical,
  Thermometer,
  Layers,
  Flame,
  Scissors,
  Ruler,
  TestTubes,
  BarChart3,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  Menu,
  GitBranch,
} from "lucide-react";

const navItems = [
  { path: "/", label: "工作台", icon: LayoutDashboard },
  { path: "/formulas", label: "配方管理", icon: FlaskConical },
  { path: "/mixing", label: "密炼混炼", icon: Thermometer },
  { path: "/milling", label: "开炼出片", icon: Layers },
  { path: "/vulcanization", label: "模压硫化", icon: Flame },
  { path: "/deburring", label: "去毛边", icon: Scissors },
  { path: "/inspection", label: "尺寸检测", icon: Ruler },
  { path: "/testing", label: "物性试验", icon: TestTubes },
  { path: "/reports", label: "质量报告", icon: BarChart3 },
  { path: "/traceability", label: "批次追溯", icon: GitBranch },
];

const breadcrumbMap: Record<string, string> = {
  "/": "工作台",
  "/formulas": "配方管理",
  "/formulas/new": "新建配方",
  "/mixing": "密炼混炼",
  "/mixing/temperature": "温度监控",
  "/milling": "开炼出片",
  "/vulcanization": "模压硫化",
  "/vulcanization/records": "硫化记录",
  "/deburring": "去毛边",
  "/inspection": "尺寸检测",
  "/testing": "物性试验",
  "/reports": "质量报告",
  "/traceability": "批次追溯",
};

function getBreadcrumbs(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; path: string }[] = [{ label: "首页", path: "/" }];
  let current = "";
  for (const part of parts) {
    current += "/" + part;
    const label = breadcrumbMap[current] || part;
    crumbs.push({ label, path: current });
  }
  return crumbs;
}

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const breadcrumbs = getBreadcrumbs(location.pathname);

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-screen bg-surface text-base font-body overflow-hidden">
      <aside
        className={`flex flex-col bg-surface-light border-r border-surface-border transition-all duration-300 ${
          collapsed ? "w-16" : "w-56"
        }`}
      >
        <div className="flex items-center h-14 px-4 border-b border-surface-border">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-8 h-8 rounded-md bg-amber flex items-center justify-center text-surface font-display font-bold text-sm shrink-0">
              OR
            </div>
            {!collapsed && (
              <span className="font-display font-bold text-base text-amber whitespace-nowrap">
                ORing MES
              </span>
            )}
          </div>
        </div>

        <nav className="flex-1 py-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-md transition-colors duration-150 group relative ${
                  active
                    ? "bg-amber-muted text-amber"
                    : "text-gray-400 hover:text-base hover:bg-surface-lighter"
                } ${active ? "before:content-[''] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-5 before:bg-amber before:rounded-r" : ""}`}
              >
                <Icon size={18} className="shrink-0" />
                {!collapsed && (
                  <span className="text-sm whitespace-nowrap">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center h-10 border-t border-surface-border text-gray-500 hover:text-base hover:bg-surface-lighter transition-colors"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center h-14 px-6 border-b border-surface-border bg-surface-light shrink-0">
          <button
            className="lg:hidden mr-3 text-gray-400 hover:text-base"
            onClick={() => setCollapsed(!collapsed)}
          >
            <Menu size={20} />
          </button>
          <nav className="flex items-center gap-1 text-sm">
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb.path} className="flex items-center gap-1">
                {i > 0 && <span className="text-gray-600 mx-1">/</span>}
                {i === breadcrumbs.length - 1 ? (
                  <span className="text-base">{crumb.label}</span>
                ) : (
                  <Link to={crumb.path} className="text-gray-500 hover:text-amber transition-colors">
                    {crumb.label}
                  </Link>
                )}
              </span>
            ))}
          </nav>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
