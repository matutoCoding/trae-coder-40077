import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}

function convertKeys<T>(obj: unknown): T {
  if (obj === null || obj === undefined) return obj as T
  if (Array.isArray(obj)) return obj.map(convertKeys) as unknown as T
  if (typeof obj === "object") {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[toCamelCase(key)] = convertKeys(value)
    }
    return result as T
  }
  return obj as T
}

export interface ApiResult<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T | null> {
  try {
    const r = await fetch(url, options)
    const json = await r.json()
    if (!r.ok || json.success === false) {
      return null
    }
    const data = json?.data ?? json
    return convertKeys<T>(data)
  } catch {
    return null
  }
}

export async function apiFetchFull<T>(url: string, options?: RequestInit): Promise<ApiResult<T>> {
  try {
    const r = await fetch(url, options)
    const json = await r.json()
    if (!r.ok || json.success === false) {
      return { success: false, data: null, error: json.error || '请求失败' }
    }
    const data = json?.data ?? json
    return { success: true, data: convertKeys<T>(data), error: null }
  } catch (e) {
    return { success: false, data: null, error: '网络错误,请检查服务器连接' }
  }
}
