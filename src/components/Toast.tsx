import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).slice(2, 10);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((t) => (
          <Toast key={t.id} message={t.message} type={t.type} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function Toast({ message, type }: { message: string; type: ToastType }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const iconMap = {
    success: <CheckCircle2 size={18} className="text-pass" />,
    error: <XCircle size={18} className="text-fail" />,
    info: <AlertCircle size={18} className="text-steel" />,
  };

  const bgMap = {
    success: "bg-pass-muted border-pass/30",
    error: "bg-fail-muted border-fail/30",
    info: "bg-steel-muted border-steel/30",
  };

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border backdrop-blur-sm shadow-lg transition-all duration-300 ${bgMap[type]} ${visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"}`}
    >
      {iconMap[type]}
      <span className="text-sm text-base">{message}</span>
    </div>
  );
}
