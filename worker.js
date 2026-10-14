/**
 * BRO AI Multi-AI Worker — v0.4.0
 * Cloudflare Worker router for OpenAI, Anthropic, Gemini, and DeepSeek.
 * All provider API keys remain in Worker Secrets, never in the public HTML.
 */
const PROVIDERS = {
  chatgpt: {
    secret: "OPENAI_API_KEY",
    model: "OPENAI_MODEL",
    defaultModel: "gpt-4o-mini",
    endpoint: "https://api.openai.com/v1/chat/completions",
  },
  claude: {
    secret: "ANTHROPIC_API_KEY",
    model: "ANTHROPIC_MODEL",
    defaultModel: "claude-3-5-haiku-latest",
    endpoint: "https://api.anthropic.com/v1/messages",
  },
  gemini: {
    secret: "GEMINI_API_KEY",
    model: "GEMINI_MODEL",
    defaultModel: "gemini-3.8-flash",
    endpoint: null,
  },
  deepseek: {
    secret: "DEEPSEEK_API_KEY",
    model: "DEEPSEEK_MODEL",
    defaultModel: "deepseek-flash",
    endpoint: "https://api.deepseek.com/chat/completions",
  },
};

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...extra },
  });
}

function allowedOrigin(request, env) {
  const origin = request.headers.get("Origin");
  const configured = String(env.BRO_ALLOWED_ORIGIN || "").trim();
  // Configure BRO_ALLOWED_ORIGIN as comma-separated exact origins for production.
  // If unset, browser origins are reflected only for requests that have an Origin.
  // Bearer-token validation remains mandatory regardless of CORS.
  if (!origin) return null;
  if (!configured) return origin;
  const list = configured.split(",").map((s) => s.trim()).filter(Boolean);
  // The production frontend is hosted on this exact GitHub Pages origin.
  // Keep this explicit origin allowed even if an older BRO_ALLOWED_ORIGIN value remains in Cloudflare.
  const trustedFrontend = origin === "https://sapammeded.github.io";
  return list.includes(origin) || trustedFrontend ? origin : "";
}

function withCors(request, env) {
  const origin = allowedOrigin(request, env);
  const h = {
    ...JSON_HEADERS,
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
  if (origin) h["Access-Control-Allow-Origin"] = origin;
  return h;
}

function safeEqual(a, b) {
  // Constant-work comparison for equal-length strings (JS cannot promise cryptographic constant time).
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function authorized(request, env) {
  const expected = String(env.BRO_ACCESS_TOKEN || "");
  const header = request.headers.get("Authorization") || "";
  const supplied = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  return Boolean(expected && supplied && safeEqual(supplied, expected));
}

function paidEnabled(env) { return String(env.BRO_ALLOW_PAID || "").trim() === "1"; }
function providerAllowed(key, env) { return key === "gemini" || paidEnabled(env); }
function configured(env) {
  return Object.fromEntries(Object.entries(PROVIDERS).map(([key, p]) => [key, Boolean(env[p.secret]) && providerAllowed(key, env)]));
}

function trimText(value, max = 12000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history.slice(-14).map((m) => {
    const role = m && m.role === "assistant" ? "assistant" : "user";
    return { role, content: trimText(m && m.content, 5000) };
  }).filter((m) => m.content);
}

async function fetchWithTimeout(url, init, ms = 55000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function providerCall(provider, body, env) {
  const p = PROVIDERS[provider];
  if (!p) return { error: "Provider tidak dikenal.", status: 400 };
  const key = env[p.secret];
  if (!key) return { error: `Secret ${p.secret} belum dikonfigurasi di Cloudflare Worker.`, status: 503 };

  const model = trimText(env[p.model], 120) || p.defaultModel;
  const messages = [
    ...(body.history || []),
    { role: "user", content: body.message },
  ];

  let url, headers, payload;
  if (provider === "claude") {
    url = p.endpoint;
    headers = {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    };
    payload = {
      model,
      max_tokens: 1800,
      system: trimText(body.system, 5000) || "Jawab dengan jelas dan akurat dalam bahasa Indonesia.",
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    };
  } else if (provider === "gemini") {
    url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    headers = { "content-type": "application/json", "x-goog-api-key": key };
    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
    payload = {
      systemInstruction: { parts: [{ text: trimText(body.system, 5000) || "Jawab dengan jelas dan akurat dalam bahasa Indonesia." }] },
      contents,
      generationConfig: { maxOutputTokens: 1800, temperature: 0.7 },
    };
  } else {
    url = p.endpoint;
    headers = { Authorization: `Bearer ${key}`, "content-type": "application/json" };
    payload = {
      model,
      messages: [
        { role: "system", content: trimText(body.system, 5000) || "Jawab dengan jelas dan akurat dalam bahasa Indonesia." },
        ...messages,
      ],
      max_tokens: 1800,
      temperature: 0.7,
    };
  }

  let response;
  try {
    response = await fetchWithTimeout(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
  } catch (e) {
    return { error: e && e.name === "AbortError" ? "Provider timeout." : "Gagal menghubungi provider AI.", status: 504 };
  }

  const raw = await response.text();
  let data;
  try { data = JSON.parse(raw); } catch { data = {}; }

  if (!response.ok) {
    // Do not return raw upstream body; it can contain details that should not be exposed.
    const message = data?.error?.message || data?.message || "";
    const clean = String(message).slice(0, 240);
    return {
      error: `Provider ${provider} merespons HTTP ${response.status}${clean ? `: ${clean}` : "."}`,
      status: response.status >= 500 ? 502 : 400,
    };
  }

  let reply = "";
  if (provider === "claude") {
    reply = (data.content || []).filter((x) => x.type === "text").map((x) => x.text || "").join("\n");
  } else if (provider === "gemini") {
    reply = (data.candidates?.[0]?.content?.parts || []).map((x) => x.text || "").join("\n");
    if (!reply && data.promptFeedback?.blockReason) {
      return { error: "Permintaan tidak dapat diproses karena diblokir oleh kebijakan provider.", status: 400 };
    }
  } else {
    reply = data.choices?.[0]?.message?.content || "";
  }

  if (!String(reply).trim()) return { error: "Provider mengirim respons kosong.", status: 502 };
  return { reply: String(reply).trim().slice(0, 30000), model: data.model || model };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const headers = withCors(request, env);

    if (request.method === "OPTIONS") {
      if (headers["Access-Control-Allow-Origin"] === undefined && request.headers.get("Origin")) {
        return json({ ok: false, error: "Origin tidak diizinkan." }, 403, headers);
      }
      return new Response(null, { status: 204, headers });
    }

    if (!["GET", "POST"].includes(request.method)) {
      return json({ ok: false, error: "Method tidak didukung." }, 405, headers);
    }

    if (request.headers.get("Origin") && headers["Access-Control-Allow-Origin"] === undefined) {
      return json({ ok: false, error: "Origin tidak diizinkan. Periksa BRO_ALLOWED_ORIGIN." }, 403, headers);
    }

    if (url.pathname.endsWith("/health") || url.pathname === "/health") {
      if (!authorized(request, env)) return json({ ok: false, error: "Token akses tidak valid." }, 401, headers);
      return json({ ok: true, service: "BRO AI Multi-AI Worker", version: "0.6.1", configured: configured(env), paidEnabled: paidEnabled(env) }, 200, headers);
    }

    if (url.pathname.endsWith("/chat") || url.pathname === "/chat") {
      if (request.method !== "POST") return json({ ok: false, error: "Gunakan POST untuk chat." }, 405, headers);
      if (!authorized(request, env)) return json({ ok: false, error: "Token akses tidak valid atau belum dikonfigurasi." }, 401, headers);

      let body;
      try { body = await request.json(); } catch { return json({ ok: false, error: "Body JSON tidak valid." }, 400, headers); }

      const provider = trimText(body.provider, 30).toLowerCase();
      const message = trimText(body.message, 12000);
      if (!PROVIDERS[provider]) return json({ ok: false, error: "Provider tidak dikenal." }, 400, headers);
      if (!providerAllowed(provider, env)) return json({ ok: false, error: `Provider ${provider} memakai API berbayar dan dinonaktifkan demi kebijakan biaya Rp0. Gunakan mode Situs resmi, atau set BRO_ALLOW_PAID=1 jika sengaja ingin memakai API berbayar.` }, 403, headers);
      if (!message) return json({ ok: false, error: "Pesan tidak boleh kosong." }, 400, headers);
      if (message.length > 12000) return json({ ok: false, error: "Pesan terlalu panjang." }, 413, headers);

      const normalized = {
        message,
        system: trimText(body.system, 5000),
        history: normalizeHistory(body.history),
      };
      const result = await providerCall(provider, normalized, env);
      if (result.error) return json({ ok: false, error: result.error }, result.status || 502, headers);
      return json({ ok: true, provider, reply: result.reply, model: result.model }, 200, headers);
    }

    return json({ ok: false, error: "Endpoint tidak ditemukan. Gunakan /health atau /chat." }, 404, headers);
  },
};
