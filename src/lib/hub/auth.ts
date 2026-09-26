/** Session par code : jeton signé HMAC (Web Crypto, marche en edge et en Node). */
export const COOKIE = "kida_s";
const enc = new TextEncoder();

function secret() {
  return process.env.AUTH_SECRET || process.env.APP_CODE || "";
}
async function hmac(msg: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(msg));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/[+/=]/g, (c) => (c === "+" ? "-" : c === "/" ? "_" : ""));
}
export async function makeToken(days = 180) {
  const exp = Date.now() + days * 864e5;
  return `v1.${exp}.${await hmac(`v1.${exp}`)}`;
}
export async function checkToken(tok?: string | null) {
  if (!tok || !secret()) return false;
  const [v, exp, sig] = tok.split(".");
  if (v !== "v1" || !exp || !sig || +exp < Date.now()) return false;
  const good = await hmac(`v1.${exp}`);
  if (good.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < good.length; i++) diff |= good.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
}
