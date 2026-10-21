import type { Tokens } from "./types";
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
interface Options {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  auth?: boolean;
  // 목록 값은 같은 이름을 여러 번 붙인다(genres=무협&genres=스릴러).
  query?: Record<string, string | number | string[] | undefined>;
}
interface Storage {
  get(): Promise<Tokens | null>;
  set(tokens: Tokens): Promise<void>;
  clear(): Promise<void>;
}
export function createTransport(
  base: string,
  storage: Storage,
  request: typeof fetch = fetch,
) {
  let refreshing: Promise<boolean> | null = null;
  const refresh = async () => {
    const before = await storage.get();
    if (!before) return false;
    const response = await request(`${base}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: before.refreshToken }),
    });
    const current = await storage.get();
    if (current?.refreshToken !== before.refreshToken) return false;
    if (!response.ok) {
      if (response.status === 401 || response.status === 403)
        await storage.clear();
      return false;
    }
    await storage.set((await response.json()) as Tokens);
    return true;
  };
  return async function api<T>(
    path: string,
    options: Options = {},
  ): Promise<T> {
    const url = new URL(base + path);
    Object.entries(options.query || {}).forEach(([name, value]) => {
      if (value === undefined) return;
      if (Array.isArray(value))
        value.forEach((each) => url.searchParams.append(name, each));
      else url.searchParams.set(name, String(value));
    });
    const send = async () => {
      const tokens = options.auth === false ? null : await storage.get();
      // 파일 업로드(FormData)는 fetch가 boundary를 붙인 Content-Type을 직접 넣어야 해서 비워 둔다.
      const isUpload =
        typeof FormData !== "undefined" && options.body instanceof FormData;
      const headers: Record<string, string> = {};
      if (!isUpload) headers["Content-Type"] = "application/json";
      if (tokens) headers.Authorization = `Bearer ${tokens.accessToken}`;
      let body: BodyInit | undefined;
      if (isUpload) body = options.body as FormData;
      else if (options.body !== undefined) body = JSON.stringify(options.body);
      try {
        return await request(url.toString(), {
          method: options.method || "GET",
          headers,
          body,
        });
      } catch {
        throw new ApiError(
          0,
          "NETWORK",
          "서버에 연결할 수 없어요. 네트워크와 API 주소를 확인해 주세요.",
        );
      }
    };
    let response = await send();
    if (response.status === 401 && options.auth !== false) {
      if (!refreshing) {
        const pending = refresh();
        refreshing = pending;
        void pending
          .finally(() => {
            if (refreshing === pending) refreshing = null;
          })
          .catch(() => {});
      }
      if (await refreshing) response = await send();
    }
    if (response.status === 204) return undefined as T;
    const raw = await response.text();
    let data: any;
    try {
      data = raw ? JSON.parse(raw) : undefined;
    } catch {
      throw new ApiError(
        response.status,
        "INVALID_RESPONSE",
        "서버 응답을 읽지 못했어요. API 주소를 확인해 주세요.",
      );
    }
    if (!response.ok)
      throw new ApiError(
        response.status,
        data?.code || "UNKNOWN",
        data?.errors?.map((e: { reason: string }) => e.reason).join("\n") ||
          data?.message ||
          "요청을 처리하지 못했어요.",
      );
    return data as T;
  };
}
