// Vercel serverless function: /api/vision (reads a bill PDF/photo with Gemini). Needs GEMINI_API_KEY.
// Vercel serverless function: /api/ai
// The AI key stays here (Vercel environment variables). The browser never sees it.
// Needs these Vercel environment variables:
//   AI_BASE_URL  e.g. https://api.groq.com/openai/v1   (any OpenAI-style service)
//   AI_API_KEY   the secret key
//   AI_MODEL     e.g. llama-3.3-70b-versatile
//   SUPABASE_URL and SUPABASE_ANON_KEY  (used only to check the person is logged in)
const { readBill } = require('../lib/vision.js');
const J = (res, c, o) => { res.statusCode = c; res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(o)); };
async function loggedIn(token) {
  const u = process.env.SUPABASE_URL, k = process.env.SUPABASE_ANON_KEY;
  if (!u || !k || !token || String(token).length > 200) return false;
  try {
    const h = { 'Content-Type': 'application/json', apikey: k };
    if (/^eyJ/.test(k)) h.Authorization = 'Bearer ' + k;
    // a session check that returns no data rows: ask for rows newer than a far-future time
    const r = await fetch(u.replace(/\/+$/, '') + '/rest/v1/rpc/kv_open', { method: 'POST', headers: h, body: JSON.stringify({ p_t: String(token), p_since: '2999-01-01T00:00:00Z' }) });
    if (!r.ok) return false;
    const j = await r.json();
    return !!(j && j.ok);
  } catch (e) { return false; }
}
module.exports = async (req, res) => {
  if (req.method !== 'POST') return J(res, 405, { error: 'POST only' });
  if (!(await loggedIn(req.headers['x-token']))) return J(res, 401, { error: 'Please log in again.' });
  let b = req.body; if (typeof b === 'string') { try { b = JSON.parse(b) } catch (e) { b = {} } } b = b || {};
  return J(res, 200, await readBill(b));
};
