// Vercel serverless function: /api/ai
// The AI key stays here (Vercel environment variables). The browser never sees it.
// Needs these Vercel environment variables:
//   AI_BASE_URL  e.g. https://api.groq.com/openai/v1   (any OpenAI-style service)
//   AI_API_KEY   the secret key
//   AI_MODEL     e.g. llama-3.3-70b-versatile
//   SUPABASE_URL and SUPABASE_ANON_KEY  (used only to check the person is logged in)
const SYS = "You are a helpful assistant for staff of JK Gupta & Co, a chartered accountant office in India. Help with drafting messages and emails to clients, quick conversions and calculations, GST, income tax, Tally, Excel and computer problems. Be short and practical. When you are not sure about a rate, date or rule, say so and tell them to verify it.";
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
  const base = process.env.AI_BASE_URL, key = process.env.AI_API_KEY, model = process.env.AI_MODEL;
  if (!base || !model) return J(res, 200, { error: 'The AI is not set up yet. Ask the admin to add the AI settings in Vercel.' });
  let b = req.body; if (typeof b === 'string') { try { b = JSON.parse(b) } catch (e) { b = {} } } b = b || {};
  const msgs = (Array.isArray(b.messages) ? b.messages : []).slice(-20).map(m => ({ role: m && m.role === 'assistant' ? 'assistant' : 'user', content: String((m && m.content) || '').slice(0, 6000) }));
  try {
    const r = await fetch(base.replace(/\/+$/, '') + '/chat/completions', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, key ? { Authorization: 'Bearer ' + key } : {}), body: JSON.stringify({ model, messages: [{ role: 'system', content: SYS }].concat(msgs) }), signal: AbortSignal.timeout(50000) });
    if (!r.ok) return J(res, 200, { error: 'The AI service returned an error (' + r.status + ').' });
    const j = await r.json();
    return J(res, 200, { reply: (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '' });
  } catch (e) { return J(res, 200, { error: 'The AI service did not answer. Try again.' }); }
};
