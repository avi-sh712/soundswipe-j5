// Centralized API client for the AWS backend.
// Set NEXT_PUBLIC_API_BASE_URL in your Vercel project settings to your AWS
// endpoint (API Gateway URL, ALB DNS, or the container's public URL).
// Example: https://abc123.execute-api.us-east-1.amazonaws.com
//
// When left empty (local dev), requests fall back to relative "/api/..." paths
// which can be proxied by next.config rewrites.

const RAW_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
const BASE = RAW_BASE.replace(/\/$/, "");

export function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${BASE}${normalized}`;
}

type FetchOptions = RequestInit & { timeoutMs?: number };

/**
 * Thin fetch wrapper with sane defaults, JSON handling, timeouts, and clear
 * errors so the UI stays responsive even when the AWS backend is slow/offline.
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const { timeoutMs = 15000, headers, ...rest } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(apiUrl(path), {
      ...rest,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(rest.body ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Request failed (${res.status}): ${text || res.statusText}`);
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      return (await res.json()) as T;
    }
    return (await res.text()) as unknown as T;
  } finally {
    clearTimeout(timer);
  }
}

// ---- Domain types -----------------------------------------------------------

export interface SoundAsset {
  id: string;
  name: string;
  category: string;
  url: string;
}

export interface PresignedUrl {
  url: string;
  fields: Record<string, string>;
}

export interface PresignedResponse {
  presigned_url: PresignedUrl;
  asset_id: string;
  object_key: string;
}

// ---- Endpoints --------------------------------------------------------------

export async function getFeed(category: string): Promise<SoundAsset[]> {
  const data = await apiFetch<{ assets?: SoundAsset[] }>(
    `/api/feed/${encodeURIComponent(category)}`,
  );
  return data.assets ?? [];
}

export async function getRecommendations(
  likedAssetIds: string[],
): Promise<SoundAsset[]> {
  const data = await apiFetch<{ assets?: SoundAsset[] }>(
    "/api/feed/recommendations",
    {
      method: "POST",
      body: JSON.stringify({ liked_asset_ids: likedAssetIds }),
    },
  );
  return data.assets ?? [];
}

export async function likeAsset(
  assetId: string,
  asset: { name: string; category: string },
  userId = "demo_user_123",
): Promise<void> {
  await apiFetch(`/api/feed/like/${encodeURIComponent(assetId)}`, {
    method: "POST",
    body: JSON.stringify({ user_id: userId, asset_data: asset }),
  });
}

export async function requestPresignedUrl(input: {
  file_name: string;
  content_type: string;
  category: string;
}): Promise<PresignedResponse> {
  return apiFetch<PresignedResponse>("/api/upload/presigned-url", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function uploadToS3(
  presigned: PresignedUrl,
  file: File,
): Promise<void> {
  const formData = new FormData();
  Object.entries(presigned.fields).forEach(([key, value]) => {
    formData.append(key, value);
  });
  formData.append("file", file);

  const res = await fetch(presigned.url, { method: "POST", body: formData });
  if (!res.ok) {
    throw new Error(`S3 upload failed (${res.status})`);
  }
}

export async function confirmUpload(input: {
  asset_id: string;
  file_name: string;
  category: string;
  object_key: string;
}): Promise<void> {
  await apiFetch("/api/upload/confirm", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
