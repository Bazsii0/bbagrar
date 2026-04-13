const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export async function apiRequest<T>(path: string, options: { method?: HttpMethod; body?: any; token?: string | null } = {}): Promise<T> {
  const { method = 'GET', body, token } = options;

  // Ellenőrizzük, hogy a body FormData-e
  const isFormData = body instanceof FormData;

  const headers: HeadersInit = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Ha nem FormData, akkor beállítjuk a Content-Type-t
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  const fetchOptions: RequestInit = {
    method,
    headers,
  };

  // Body kezelése
  if (body !== undefined) {
    if (isFormData) {
      // FormData-t közvetlenül küldjük
      fetchOptions.body = body;
    } else {
      // JSON.stringify a nem-FormData body-kra
      fetchOptions.body = JSON.stringify(body);
    }
  }

  const res = await fetch(`${API_URL}${path}`, fetchOptions);

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    const message = json?.error || json?.message || `HTTP ${res.status}`;
    throw new Error(message);
  }

  return json as T;
}