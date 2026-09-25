// Portfolio gate.
//
// Public:   "/" shows landing.html (the front page) to anyone without access.
// Private:  every other page (project pages, about, admin, the work grid).
// Access:   https://jacquesdelconte.com/access/<PORTFOLIO_KEY> sets a signed
//           cookie for 90 days and lands on the full portfolio at "/".
// Preview:  /leave clears the cookie so you can see the public front page.
// Revoke:   change PORTFOLIO_KEY in Netlify and redeploy. Every existing
//           cookie and every link you have sent stops working at once.
//
// index.html and every portfolio page are untouched, so admin.html keeps
// writing the tile grid into index.html exactly as before.
// Static assets are excluded below and never run this function.

const COOKIE = "jdc_access";
const MAX_AGE = 60 * 60 * 24 * 90;
const LANDING = "/landing.html";

async function sign(secret) {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", k, enc.encode("jdc-portfolio-v1"));
  return btoa(String.fromCharCode(...new Uint8Array(mac)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function same(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

function readCookie(req, name) {
  const raw = req.headers.get("cookie") || "";
  for (const part of raw.split(";")) {
    const i = part.indexOf("=");
    if (i > -1 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return "";
}

function redirectHome(req, extra) {
  const h = new Headers({
    Location: new URL("/", req.url).toString(),
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
    "X-Robots-Tag": "noindex",
  });
  if (extra) h.append("Set-Cookie", extra);
  return new Response(null, { status: 302, headers: h });
}

export default async (req, context) => {
  const url = new URL(req.url);
  const path = url.pathname;

  // Fail closed: with no key (or a weak one) nothing is unlocked.
  const key = Netlify.env.get("PORTFOLIO_KEY") || "";
  const token = key.length >= 16 ? await sign(key) : "";

  if (path.startsWith("/access/")) {
    let supplied = "";
    try { supplied = decodeURIComponent(path.slice(8).replace(/\/+$/, "")); } catch (_) {}
    if (token && same(supplied, key)) {
      return redirectHome(req,
        `${COOKIE}=${token}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Lax`);
    }
    return redirectHome(req);
  }

  if (path === "/leave") {
    return redirectHome(req, `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`);
  }

  const allowed = token !== "" && same(readCookie(req, COOKIE), token);

  if (allowed) {
    const res = await context.next();
    const out = new Response(res.body, res);
    out.headers.set("Cache-Control", "private, no-cache");
    out.headers.set("X-Robots-Tag", "noindex, nofollow");
    return out;
  }

  if (path === "/" || path === "/index" || path === "/index.html") {
    return new URL(LANDING, req.url);
  }

  return redirectHome(req);
};

export const config = {
  path: "/*",
  excludedPath: [
    "/landing.html",
    "/fonts/*",
    "/images/*",
    "/*.css",
    "/*.js",
    "/*.png",
    "/*.ico",
    "/*.woff2",
    "/*.txt",
  ],
};
