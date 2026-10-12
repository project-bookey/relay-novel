import { test } from "node:test";
import assert from "node:assert/strict";
import { ApiError, createTransport } from "../src/api/transport";
import type { Tokens } from "../src/api/types";
const store = () => {
  let tokens: Tokens | null = { accessToken: "old", refreshToken: "refresh" };
  return {
    get: async () => tokens,
    set: async (t: Tokens) => {
      tokens = t;
    },
    clear: async () => {
      tokens = null;
    },
  };
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
test("concurrent unauthorized requests share one refresh and retry with the new token", async () => {
  const storage = store();
  let refreshCount = 0;
  const request: typeof fetch = async (input, init) => {
    if (String(input).endsWith("/auth/refresh")) {
      refreshCount++;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return json({ accessToken: "new", refreshToken: "rotated" });
    }
    return (init?.headers as Record<string, string>).Authorization ===
      "Bearer new"
      ? json({ ok: true })
      : json({ code: "EXPIRED" }, 401);
  };
  const api = createTransport("http://example.test", storage, request);
  const result = await Promise.all([api("/first"), api("/second")]);
  assert.equal(refreshCount, 1);
  assert.deepEqual(result, [{ ok: true }, { ok: true }]);
});
test("expired refresh tokens clear the session and do not repeat the write", async () => {
  const storage = store();
  let writes = 0;
  const request: typeof fetch = async (input) => {
    if (String(input).endsWith("/auth/refresh"))
      return json({ code: "EXPIRED" }, 401);
    writes++;
    return json({ code: "EXPIRED", message: "다시 로그인해 주세요." }, 401);
  };
  const api = createTransport("http://example.test", storage, request);
  await assert.rejects(
    api("/api/v1/novels/1/chapters", {
      method: "POST",
      body: { turnNumber: 2 },
    }),
    (e) => e instanceof ApiError && e.status === 401,
  );
  assert.equal(writes, 1);
  assert.equal(await storage.get(), null);
});
test("a relay turn conflict surfaces the backend error without retrying publication", async () => {
  let calls = 0;
  const request: typeof fetch = async () => {
    calls++;
    return json(
      { code: "NOVEL_NOT_YOUR_TURN", message: "집필 차례가 바뀌었어요." },
      409,
    );
  };
  const api = createTransport("http://example.test", store(), request);
  await assert.rejects(
    api("/api/v1/novels/1/chapters", {
      method: "POST",
      body: { turnNumber: 2, title: "회차", body: "원고" },
    }),
    (e) => e instanceof ApiError && e.code === "NOVEL_NOT_YOUR_TURN",
  );
  assert.equal(calls, 1);
});
test("a refresh completing after logout cannot restore the old session", async () => {
  const storage = store();
  let release: () => void = () => {};
  const wait = new Promise<void>((resolve) => {
    release = resolve;
  });
  const request: typeof fetch = async (input) => {
    if (String(input).endsWith("/auth/refresh")) {
      await wait;
      return json({ accessToken: "new", refreshToken: "rotated" });
    }
    return json({ code: "EXPIRED" }, 401);
  };
  const api = createTransport("http://example.test", storage, request),
    pending = api("/first");
  await new Promise((resolve) => setTimeout(resolve, 5));
  await storage.clear();
  release();
  await assert.rejects(pending);
  assert.equal(await storage.get(), null);
});
test("public login requests omit bearer tokens and backend validation errors are readable", async () => {
  const request: typeof fetch = async (input, init) => {
    assert.equal(
      (init?.headers as Record<string, string>).Authorization,
      undefined,
    );
    return json({ errors: [{ reason: "이메일을 확인해 주세요." }] }, 400);
  };
  await assert.rejects(
    createTransport(
      "http://example.test",
      store(),
      request,
    )("/auth/login", {
      method: "POST",
      auth: false,
      body: { email: "invalid" },
    }),
    (e) => e instanceof ApiError && e.message === "이메일을 확인해 주세요.",
  );
});
