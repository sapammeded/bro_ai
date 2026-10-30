import test from "node:test";
import assert from "node:assert/strict";
import worker from "../worker.js";

const token = "test-token";
const env = {
  BRO_ACCESS_TOKEN: token,
  BRO_ALLOWED_ORIGIN: "https://sapammeded.github.io",
  BRO_ALLOW_PAID: "0",
};

function request(path, options = {}) {
  return new Request("https://bro-ai.test" + path, options);
}

test("health requires bearer token", async () => {
  const res = await worker.fetch(request("/health"), env);
  assert.equal(res.status, 401);
});

test("health reports v1 and provider readiness", async () => {
  const res = await worker.fetch(request("/health", {
    headers: { Authorization: "Bearer " + token, Origin: "https://sapammeded.github.io" },
  }), Object.assign({}, env, { GEMINI_API_KEY: "fake" }));
  const data = await res.json();
  assert.equal(res.status, 200);
  assert.equal(data.version, "1.0.0");
  assert.equal(data.providers.gemini, true);
  assert.equal(data.paidEnabled, false);
});

test("rejects unapproved browser origin", async () => {
  const res = await worker.fetch(request("/health", {
    headers: { Authorization: "Bearer " + token, Origin: "https://evil.example" },
  }), env);
  assert.equal(res.status, 403);
});

test("chat reports setup guidance when no free provider is configured", async () => {
  const res = await worker.fetch(request("/chat", {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify({ provider: "gemini", message: "Halo" }),
  }), env);
  const data = await res.json();
  assert.equal(res.status, 503);
  assert.match(data.error, /GEMINI_API_KEY/);
});

test("falls back from Gemini rate limit to OpenRouter free route", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    if (String(url).includes("generativelanguage.googleapis.com")) {
      return new Response(JSON.stringify({ error: { message: "quota exceeded" } }), { status: 429 });
    }
    return new Response(JSON.stringify({
      model: "openrouter/free",
      choices: [{ message: { content: "Halo, ini jawaban fallback." } }],
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  try {
    const res = await worker.fetch(request("/chat", {
      method: "POST",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: "chatgpt",
        message: "Halo",
        history: [],
        system: "Jawab singkat.",
      }),
    }), Object.assign({}, env, {
      GEMINI_API_KEY: "fake-gemini",
      OPENROUTER_API_KEY: "fake-openrouter",
      OPENROUTER_MODEL: "openrouter/free",
    }));
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
