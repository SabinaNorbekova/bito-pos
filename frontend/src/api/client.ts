const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export class ApiClientError extends Error {
  code: string;
  status: number;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function getToken(): string | null {
  return sessionStorage.getItem("bito_token");
}

export function setToken(token: string | null) {
  if (token) sessionStorage.setItem("bito_token", token);
  else sessionStorage.removeItem("bito_token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json() : undefined;

  if (!res.ok) {
    const message = body?.error?.message ?? `Request failed (${res.status})`;
    const code = body?.error?.code ?? "UNKNOWN";
    throw new ApiClientError(res.status, code, message);
  }

  return body as T;
}

export const api = {
  login: (email: string, password: string) =>
    request<{
      token: string;
      user: {
        id: string;
        email: string;
        name: string;
        role: string;
        tenantId: string;
      };
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  searchProducts: (search: string, page = 1, limit = 20) =>
    request<{
      items: import("../types").Product[];
      total: number;
      page: number;
      totalPages: number;
    }>(
      `/products?search=${encodeURIComponent(
        search
      )}&page=${page}&limit=${limit}`
    ),

  placeOrder: (items: Array<{ productId: string; qty: number }>) =>
    request<import("../types").OrderReceipt>("/orders", {
      method: "POST",
      body: JSON.stringify({ items }),
    }),

  getOrder: (id: string) =>
    request<import("../types").OrderReceipt>(`/orders/${id}`),

  getSalesReport: (from: string, to: string) =>
    request<import("../types").SalesReport>(
      `/reports/sales?from=${encodeURIComponent(from)}&to=${encodeURIComponent(
        to
      )}`
    ),
};
