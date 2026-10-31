import test from "node:test";
import assert from "node:assert/strict";
import worker from "../worker.js";

const token = "test-token";
const origin = "https://sapammeded.github.io";
const limiter = { calls: 0, async limit() { this.calls++; return { success: true }; } };
const baseEnv = () => ({
  BRO_ACCESS_TOKEN: token,
  BRO_ALLOWED_ORIGIN: origin,
  BRO_ALLOW_PAID: "0",
  BRO_CHAT_LIMITER: { async limit() { return { success: true }; } },
});

function request(path, options = {}) {
  return new Request("https://bro-ai.test" + path, options);
}
function authHeaders(extra = {}) {
  return Object.assign({ Authorization: "Bearer " + token }, extra);
}
async function chatRequest(body, env = baseEnv(), extraHeaders = {}) {
  return worker.fetch(request("/chat", {
    method: "POST",
    headers: authHeaders(Object.assign({ "Content-Type": "application/json" }, extraHeaders)),
    body: JSON.stringify(body),
  }), env);
}

test("health requires bearer token", async () => {
  const res = await worker.fetch(request("/health"), baseEnv());
  assert.equal(res.status, 401);
});

test("health reports provider readiness and rate limiter", async () => {
  const env = Object.assign(baseEnv(), { GEMINI_API_KEY: "fake" });
  const res = await worker.fetch(request("/health", {
    headers: authHeaders({ Origin: origin }),
  }), env);
  const data = await res.json();
  assert.equal(res.status, 200);
  assert.equal(data.version, "1.0.1");
  assert.equal(data.providers.gemini, true);
  assert.equal(data.paidEnabled, false);
  assert.equal(data.rateLimitConfigured, true);
  assert.equal(data.maxRequestBytes, 65536);
  assert.equal(data.maxChatDurationMs, 55000);
  assert.equal(data.maxProviderResponseBytes, 1048576);
});

test("rejects unapproved browser origin", async () => {
  const res = await worker.fetch(request("/health", {
    headers: authHeaders({ Origin: "https://evil.example" }),
  }), baseEnv());
  assert.equal(res.status, 403);
});

test("allows CORS preflight only for configured origin", async () => {
  const good = await worker.fetch(request("/chat", {
    method: "OPTIONS",
    headers: { Origin: origin, "Access-Control-Request-Method": "POST" },
  }), baseEnv());
  assert.equal(good.status, 204);
  assert.equal(good.headers.get("Access-Control-Allow-Origin"), origin);

  const bad = await worker.fetch(request("/chat", {
    method: "OPTIONS",
    headers: { Origin: "https://evil.example" },
  }), baseEnv());
  assert.equal(bad.status, 403);
});

test("rejects non-POST chat method", async () => {
  const res = await worker.fetch(request("/chat", {
    method: "GET",
    headers: authHeaders(),
  }), baseEnv());
  assert.equal(res.status, 405);
});

test("fails closed when rate limiter binding is missing", async () => {
  const env = baseEnv();
  delete env.BRO_CHAT_LIMITER;
  const res = await chatRequest({ provider: "gemini", message: "Halo" }, env);
  assert.equal(res.status, 503);
  assert.match((await res.json()).error, /Rate limiter belum dikonfigurasi/);
});

test("returns 429 when token rate limit is exceeded", async () => {
  const env = baseEnv();
  env.BRO_CHAT_LIMITER = { async limit() { return { success: false }; } };
  const res = await chatRequest({ provider: "gemini", message: "Halo" }, env);
  assert.equal(res.status, 429);
  assert.equal(res.headers.get("Retry-After"), "60");
});

test("rejects request bodies larger than 64 KB", async () => {
  const env = baseEnv();
  const body = JSON.stringify({ provider: "gemini", message: "x".repeat(66000) });
  const res = await worker.fetch(request("/chat", {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body,
  }), env);
  assert.equal(res.status, 413);
});

test("rejects history with more than 16 messages", async () => {
  const history = Array.from({ length: 17 }, () => ({ role: "user", content: "hi" }));
  const res = await chatRequest({ provider: "gemini", message: "Halo", history });
  assert.equal(res.status, 400);
  assert.match((await res.json()).error, /maksimal 16/);
});

test("rejects malformed history entries", async () => {
  const res = await chatRequest({
    provider: "gemini", message: "Halo",
    history: [{ role: "system", content: "unexpected" }],
  });
  assert.equal(res.status, 400);
});

test("chat reports setup guidance when no provider is configured", async () => {
  const res = await chatRequest({ provider: "gemini", message: "Halo" });
  const data = await res.json();
  assert.equal(res.status, 503);
  assert.match(data.error, /GEMINI_API_KEY/);
});

test("paid providers are never called while BRO_ALLOW_PAID is disabled", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw new Error("unexpected provider call"); };
  try {
    const env = Object.assign(baseEnv(), {
      OPENAI_API_KEY: "fake-openai",
      ANTHROPIC_API_KEY: "fake-anthropic",
      DEEPSEEK_API_KEY: "fake-deepseek",
    });
    const res = await chatRequest({ provider: "chatgpt", message: "Halo" }, env);
    assert.equal(res.status, 503);
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

for (const upstreamStatus of [401, 403, 404, 429]) {
  test(`falls back from Gemini HTTP ${upstreamStatus} to OpenRouter`, async () => {
    const originalFetch = globalThis.fetch;
    const calls = [];
    globalThis.fetch = async (url) => {
      calls.push(String(url));
      if (String(url).includes("generativelanguage.googleapis.com")) {
        return new Response(JSON.stringify({ error: { message: "provider error" } }), { status: upstreamStatus });
      }
      return new Response(JSON.stringify({
        model: "openrouter/free",
        choices: [{ message: { content: "Halo, ini jawaban fallback." } }],
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    };
    try {
      const env = Object.assign(baseEnv(), {
        GEMINI_API_KEY: "fake-gemini",
        OPENROUTER_API_KEY: "fake-openrouter",
        OPENROUTER_MODEL: "openrouter/free",
      });
      const res = await chatRequest({
        provider: "chatgpt", message: "Halo", history: [], system: "Jawab singkat.",
      }, env);
      const data = await res.json();
      assert.equal(res.status, 200);
      assert.equal(data.provider, "openrouter");
      assert.equal(data.fallbackUsed, true);
      assert.equal(data.reply, "Halo, ini jawaban fallback.");
      assert.equal(calls.length, 2);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
}

test("rejects provider responses larger than 1 MiB", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("x".repeat(1024 * 1024 + 1), { status: 200 });
  try {
    const env = Object.assign(baseEnv(), { GEMINI_API_KEY: "fake-gemini" });
    const res = await chatRequest({ provider: "gemini", message: "Halo" }, env);
    const data = await res.json();
    assert.equal(res.status, 502);
    assert.match(data.error, /Semua provider/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("stops provider fallback when the total chat deadline expires", async () => {
  const originalFetch = globalThis.fetch;
  const originalNow = Date.now;
  let now = 1000;
  let calls = 0;
  Date.now = () => now;
  globalThis.fetch = async () => {
    calls++;
    now = 57000;
    return new Response(JSON.stringify({ error: { message: "upstream failure" } }), { status: 401 });
  };
  try {
    const env = Object.assign(baseEnv(), {
      GEMINI_API_KEY: "fake-gemini",
      OPENROUTER_API_KEY: "fake-openrouter",
    });
    const res = await chatRequest({ provider: "gemini", message: "Halo" }, env);
    const data = await res.json();
    assert.equal(res.status, 504);
    assert.equal(calls, 1);
    assert.equal(data.failures.at(-1).status, 504);
  } finally {
    globalThis.fetch = originalFetch;
    Date.now = originalNow;
  }
});

test("does not expose upstream provider error text to the client", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    error: { message: "sensitive upstream diagnostic text" },
  }), { status: 401 });
  try {
    const env = Object.assign(baseEnv(), { GEMINI_API_KEY: "fake" });
    const res = await chatRequest({ provider: "gemini", message: "Halo" }, env);
    const data = await res.json();
    assert.equal(res.status, 401);
    assert.doesNotMatch(JSON.stringify(data), /sensitive upstream diagnostic text/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("falls back after malformed successful provider response", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (url) => {
    calls++;
    if (String(url).includes("generativelanguage.googleapis.com")) {
      return new Response(JSON.stringify({ candidates: [] }), { status: 200 });
    }
    return new Response(JSON.stringify({
      choices: [{ message: { content: "Fallback berhasil." } }],
    }), { status: 200 });
  };
  try {
    const env = Object.assign(baseEnv(), {
      GEMINI_API_KEY: "fake-gemini",
      OPENROUTER_API_KEY: "fake-openrouter",
    });
    const res = await chatRequest({ provider: "gemini", message: "Halo" }, env);
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.provider, "openrouter");
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});


test("defaults Gemini to 3.8 Flash with low thinking", async () => {
  const originalFetch = globalThis.fetch;
  let capturedUrl = "";
  let capturedBody;
  globalThis.fetch = async (url, init) => {
    capturedUrl = String(url);
    capturedBody = JSON.parse(init.body);
    return new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: "Gemini test OK" }] } }],
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  try {
    const env = Object.assign(baseEnv(), { GEMINI_API_KEY: "fake-gemini" });
    const res = await chatRequest({ provider: "gemini", message: "Halo" }, env);
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.ok(capturedUrl.endsWith("/models/gemini-3.8-flash:generateContent"));
    assert.equal(capturedBody.generationConfig.thinkingConfig.thinkingLevel, "low");
    assert.equal(data.reply, "Gemini test OK");
  } finally {
    globalThis.fetch = originalFetch;
  }
});


test("routes the Grok persona directly to xAI with the configured model", async () => {
  const originalFetch = globalThis.fetch;
  let capturedUrl = "";
  let capturedHeaders;
  let capturedBody;
  globalThis.fetch = async (url, init) => {
    capturedUrl = String(url);
    capturedHeaders = init.headers;
    capturedBody = JSON.parse(init.body);
    return new Response(JSON.stringify({
      model: "grok-4.7",
      output: [{ type: "message", content: [{ type: "output_text", text: "Grok aktif." }] }],
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  try {
    const env = Object.assign(baseEnv(), { XAI_API_KEY: "fake-xai" });
    const res = await chatRequest({ provider: "grok", message: "Halo" }, env);
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(capturedUrl, "https://api.x.ai/v1/responses");
    assert.equal(capturedHeaders.Authorization, "Bearer fake-xai");
    assert.equal(capturedBody.model, "grok-4.7");
    assert.equal(capturedBody.input[0].role, "system");
    assert.equal(capturedBody.input[1].content, "Halo");
    assert.equal(capturedBody.max_output_tokens, 3000);
    assert.equal(capturedBody.store, false);
    assert.equal(data.provider, "xai");
    assert.equal(data.reply, "Grok aktif.");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
