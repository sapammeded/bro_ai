/**
 * BRO AI Worker v1.0.0 — multi-provider foundation
 * Free-first routing, optional paid providers, protected server-side secrets.
 *
 * Free-first providers:
 *   1) Gemini API free tier (GEMINI_API_KEY)
 *   2) OpenRouter free router (OPENROUTER_API_KEY, OPENROUTER_MODEL=openrouter/free)
 * Optional paid providers are only considered when BRO_ALLOW_PAID=1.
 */
const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};

const PERSONAS = {
  chatgpt: "chatgpt",
  claude: "claude",
  gemini: "gemini",
  deepseek: "deepseek",
  auto: "auto",
};

const DEFAULTS = {
  GEMINI_MODEL: "gemini-2.5-flash",
  OPENROUTER_MODEL: "openrouter/free",
  GROQ_MODEL: "openai/gpt-oss-20b",
  OPENAI_MODEL: "gpt-4o-mini",
  ANTHROPIC_MODEL: "claude-3-5-haiku-latest",
  DEEPSEEK_MODEL: "deepseek-chat",
};

function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: Object.assign({}, JSON_HEADERS, headers || {}),
  });
}

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin");
  const allowed = String(env.BRO_ALLOWED_ORIGIN || "")
    .split(",").map((x) => x.trim()).filter(Boolean);
  const headers = {
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
  if (!origin) return headers;
  if (allowed.includes(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || !a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function authorized(request, env) {
  const expected = String(env.BRO_ACCESS_TOKEN || "");
  const header = request.headers.get("Authorization") || "";
  const supplied = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  return safeEqual(supplied, expected);
}

function clean(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max || 12000) : "";
}

function paidEnabled(env) {
  return String(env.BRO_ALLOW_PAID || "").trim() === "1";
}

function historyFrom(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(-16).map((m) => ({
    role: m && m.role === "assistant" ? "assistant" : "user",
    content: clean(m && m.content, 6000),
  })).filter((m) => m.content);
}

function availableProviders(env) {
  return {
    gemini: Boolean(env.GEMINI_API_KEY),
    openrouter: Boolean(env.OPENROUTER_API_KEY),
    groq: Boolean(env.GROQ_API_KEY && String(env.GROQ_ENABLE || "") === "1"),
    openai: Boolean(paidEnabled(env) && env.OPENAI_API_KEY),
    anthropic: Boolean(paidEnabled(env) && env.ANTHROPIC_API_KEY),
    deepseek: Boolean(paidEnabled(env) && env.DEEPSEEK_API_KEY),
  };
}

function candidates(persona, env) {
  const available = availableProviders(env);
  const list = [];
  // Paid keys are never used unless the owner explicitly enables paid routing.
  if (paidEnabled(env)) {
    const paidFirst = {
      chatgpt: "openai",
      claude: "anthropic",
      deepseek: "deepseek",
    };
    const preferred = paidFirst[persona];
    if (preferred && available[preferred]) list.push(preferred);
  }
  // Free-first fallback chain. Groq stays opt-in because its model pricing/allowance
  // depends on the current account and selected model.
  if (available.gemini) list.push("gemini");
  if (available.openrouter) list.push("openrouter");
  if (available.groq) list.push("groq");
  return Array.from(new Set(list));
}

function modelFor(provider, env) {
  const key = provider.toUpperCase() + "_MODEL";
  return clean(env[key], 160) || DEFAULTS[key] || "";
}

async function fetchTimed(url, init, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms || 50000);
  try {
    return await fetch(url, Object.assign({}, init, { signal: controller.signal }));
  } finally {
    clearTimeout(timer);
  }
}

function messagesFor(body) {
  return body.history.concat([{ role: "user", content: body.message }]);
}

async function callGemini(body, env) {
  const model = modelFor("gemini", env);
  const url = "https://generativelanguage.googleapis.com/v1beta/models/" +
    encodeURIComponent(model) + ":generateContent";
  const contents = messagesFor(body).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const response = await fetchTimed(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: body.system }] },
      contents,
      generationConfig: { maxOutputTokens: 3000, temperature: 0.65 },
    }),
  });
  return parseProvider(response, "gemini", model);
}

async function callOpenAICompatible(provider, body, env) {
  const cfg = {
    openrouter: {
      key: env.OPENROUTER_API_KEY,
      url: "https://openrouter.ai/api/v1/chat/completions",
      model: modelFor("openrouter", env),
      extra: { "HTTP-Referer": "https://sapammeded.github.io/bro_ai/", "X-Title": "BRO AI" },
    },
    groq: {
      key: env.GROQ_API_KEY,
      url: "https://api.groq.com/openai/v1/chat/completions",
      model: modelFor("groq", env),
      extra: {},
    },
    openai: {
      key: env.OPENAI_API_KEY,
      url: "https://api.openai.com/v1/chat/completions",
      model: modelFor("openai", env),
      extra: {},
    },
    deepseek: {
      key: env.DEEPSEEK_API_KEY,
      url: "https://api.deepseek.com/chat/completions",
      model: modelFor("deepseek", env),
      extra: {},
    },
  }[provider];

  const response = await fetchTimed(cfg.url, {
    method: "POST",
    headers: Object.assign({
      "Content-Type": "application/json",
      Authorization: "Bearer " + cfg.key,
    }, cfg.extra),
    body: JSON.stringify({
      model: cfg.model,
      messages: [{ role: "system", content: body.system }].concat(messagesFor(body)),
      max_tokens: 3000,
      temperature: 0.65,
    }),
  });
  return parseProvider(response, provider, cfg.model);
}

async function callAnthropic(body, env) {
  const model = modelFor("anthropic", env);
  const response = await fetchTimed("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 3000,
      system: body.system,
      messages: messagesFor(body),
    }),
  });
  return parseProvider(response, "anthropic", model);
}

async function parseProvider(response, provider, model) {
  const raw = await response.text();
  let data = {};
  try { data = JSON.parse(raw); } catch (_) {}
  if (!response.ok) {
    const message = clean(data && data.error && data.error.message || data && data.message || "", 220);
    const error = new Error("Provider " + provider + " HTTP " + response.status + (message ? ": " + message : ""));
    error.status = response.status;
    throw error;
  }

  let reply = "";
  if (provider === "gemini") {
    reply = (data.candidates && data.candidates[0] && data.candidates[0].content &&
      data.candidates[0].content.parts || []).map((p) => p.text || "").join("\n");
  } else if (provider === "anthropic") {
    reply = (data.content || []).filter((p) => p.type === "text").map((p) => p.text || "").join("\n");
  } else {
    const content = data.choices && data.choices[0] && data.choices[0].message &&
      data.choices[0].message.content;
    reply = typeof content === "string" ? content :
      Array.isArray(content) ? content.map((p) => p.text || "").join("\n") : "";
  }
  if (!reply.trim()) {
    const error = new Error("Provider " + provider + " mengirim respons kosong.");
    error.status = 502;
    throw error;
  }
  return { reply: reply.trim().slice(0, 40000), provider, model: data.model || model };
}

async function runProvider(provider, body, env) {
  if (provider === "gemini") return callGemini(body, env);
  if (provider === "anthropic") return callAnthropic(body, env);
  return callOpenAICompatible(provider, body, env);
}

function shouldFallback(error) {
  const status = Number(error && error.status || 0);
  return !status || status === 408 || status === 429 || status >= 500;
}

async function chat(body, env) {
  const persona = PERSONAS[clean(body.provider, 24).toLowerCase()];
  if (!persona) return { error: "Persona/provider tidak dikenal.", status: 400 };
  const message = clean(body.message, 12000);
  if (!message) return { error: "Pesan tidak boleh kosong.", status: 400 };
  const system = clean(body.system, 7000) ||
    "Kamu BRO AI, asisten pribadi yang jujur, teliti, dan membantu dalam bahasa Indonesia. Jangan mengaku telah melakukan tindakan yang belum dijalankan oleh tool.";
  const normalized = { message, system, history: historyFrom(body.history) };
  const chain = candidates(persona, env);
  if (!chain.length) {
    return {
      error: "Belum ada provider AI yang siap. Isi GEMINI_API_KEY atau OPENROUTER_API_KEY di Worker Secrets. Provider berbayar memerlukan BRO_ALLOW_PAID=1.",
      status: 503,
    };
  }

  const failures = [];
  for (let i = 0; i < chain.length; i++) {
    const provider = chain[i];
    try {
      const result = await runProvider(provider, normalized, env);
      return {
        ok: true,
        persona,
        provider: result.provider,
        model: result.model,
        reply: result.reply,
        fallbackUsed: i > 0,
      };
    } catch (error) {
      failures.push({ provider, error: clean(error.message, 260), status: error.status || 0 });
      if (!shouldFallback(error)) break;
    }
  }
  const last = failures[failures.length - 1];
  return {
    error: "Semua provider yang tersedia gagal. " + (last ? last.error : "Coba lagi nanti."),
    status: last && last.status >= 400 && last.status < 500 ? last.status : 502,
    failures,
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const headers = corsHeaders(request, env);
    const origin = request.headers.get("Origin");

    if (request.method === "OPTIONS") {
      if (origin && !headers["Access-Control-Allow-Origin"]) {
        return json({ ok: false, error: "Origin tidak diizinkan. Atur BRO_ALLOWED_ORIGIN." }, 403, headers);
      }
      return new Response(null, { status: 204, headers });
    }

    if (origin && !headers["Access-Control-Allow-Origin"]) {
      return json({ ok: false, error: "Origin tidak diizinkan. Atur BRO_ALLOWED_ORIGIN dengan URL frontend yang tepat." }, 403, headers);
    }

    if (url.pathname === "/health" || url.pathname.endsWith("/health")) {
      if (!authorized(request, env)) return json({ ok: false, error: "Token akses tidak valid." }, 401, headers);
      return json({
        ok: true,
        service: "BRO AI Multi-Provider Worker",
        version: "1.0.0",
        providers: availableProviders(env),
        paidEnabled: paidEnabled(env),
        freeFirst: true,
        voice: "Browser Web Speech API (client-side)",
        memory: "Local device until optional D1 integration is configured",
        actions: "Approval-gated client tools; no unrestricted server execution",
      }, 200, headers);
    }

    if (url.pathname === "/chat" || url.pathname.endsWith("/chat")) {
      if (request.method !== "POST") return json({ ok: false, error: "Gunakan POST untuk chat." }, 405, headers);
      if (!authorized(request, env)) return json({ ok: false, error: "Token akses tidak valid atau belum dikonfigurasi." }, 401, headers);
      let body;
      try { body = await request.json(); } catch (_) {
        return json({ ok: false, error: "Body JSON tidak valid." }, 400, headers);
      }
      const result = await chat(body || {}, env);
      if (!result.ok) return json({ ok: false, error: result.error, failures: result.failures || [] }, result.status || 502, headers);
      return json(result, 200, headers);
    }

    return json({ ok: false, error: "Endpoint tidak ditemukan. Gunakan /health atau /chat." }, 404, headers);
  },
};
