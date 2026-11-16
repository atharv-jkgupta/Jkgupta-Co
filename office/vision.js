// Reads a bill (PDF or photo) with Google Gemini. Shared by api/vision.js (Vercel) and the office servers.
// Key stays on the server: GEMINI_API_KEY (env). Optional GEMINI_MODEL (default gemini-2.5-flash).
const MODEL_DEFAULT = 'gemini-2.5-flash';
const MAX_BYTES = 3 * 1024 * 1024;

function prompt(o) {
  const own = (o.company || '') + (o.gstin ? ' (GSTIN ' + o.gstin + ')' : '');
  return [
    'You read Indian GST invoices for a chartered accountant office. Reply with ONLY one JSON object, no other words.',
    'Our client is: ' + (own || 'unknown') + '. The sheet is for the month ' + (o.month || 'unknown') + '.',
    'The file may hold one bill or several bills (one per page group). Return every bill in "bills".',
    'Schema: {"bills":[{"kind":"sales|purchase","no":"","date":"YYYY-MM-DD","party":"","gstin":"","items":[{"hsn":"digits","desc":"","qty":0,"unit":"","taxable":0,"cgst":0,"sgst":0,"igst":0}],"total":0,"tax_cgst":0,"tax_sgst":0,"tax_igst":0,"transport":0,"amount_includes_gst":false,"notes":""}]}',
    'RULES:',
    '1. DATE: use only the date printed against "Dated", "Date" or "Invoice Date" of the invoice itself. NEVER use Ack date, Printed on, PO / Order date, Delivery Note date, E-way bill date, challan, due date or vehicle / dispatch dates. If the invoice date is not printed, use "".',
    '2. kind: "purchase" if our client is the BUYER (the bill was issued to our client by someone else); "sales" if our client is the seller.',
    '3. party: on a sales bill the party is the BUYER (customer). On a purchase bill the party is the SELLER (the company that issued the bill, usually at the top or in the letterhead). Give the company name only, never an address.',
    '4. gstin: the GSTIN of that same party (the buyer on a sales bill, the SELLER on a purchase bill). Never give our client\'s own GSTIN. Use "" if the party has none printed.',
    '5. cgst, sgst, igst are RATES in percent (for example 9, 9, 0 or 0, 0, 18). taxable is the line amount before tax. qty and unit come from the line (if a packing line like "3 Rolls" exists, use it).',
    '6. total is the final invoice total as printed (after round off). tax_cgst, tax_sgst, tax_igst are the tax AMOUNTS printed in the tax summary (0 if none).',
    '7. transport: freight / transport / cartage charge printed as a separate charge, else 0. Do not also put it in items.',
    '8. amount_includes_gst: true only if the item amounts printed on the lines already include GST (for example the column is "Amount incl. GST" and the tax is shown only as a break-up).',
    '9. Never guess. Use "" or 0 when unreadable, and say what was unclear in "notes".'
  ].join('\n');
}

async function readBill(o) {
  const key = process.env.GEMINI_API_KEY || (o.key || '');
  if (!key) return { unavailable: true, error: 'Gemini is not set up yet. Add GEMINI_API_KEY.' };
  const b64 = String(o.data || '');
  if (!b64 || Math.floor(b64.length * 0.75) > MAX_BYTES) return { unavailable: true, error: 'File is empty or over 3 MB.' };
  const mime = /^(application\/pdf|image\/(png|jpe?g|webp))$/i.test(o.mime || '') ? o.mime : '';
  if (!mime) return { unavailable: true, error: 'Only PDF, JPG, PNG or WEBP.' };
  const model = (process.env.GEMINI_MODEL || o.model || MODEL_DEFAULT).replace(/[^A-Za-z0-9.\-]/g, '');
  try {
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ inline_data: { mime_type: mime, data: b64 } }, { text: prompt(o) }] }],
        generationConfig: { temperature: 0, responseMimeType: 'application/json' }
      }),
      signal: AbortSignal.timeout(55000)
    });
    if (!r.ok) return { unavailable: true, error: 'Gemini returned an error (' + r.status + ').' };
    const j = await r.json();
    const t = j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts && j.candidates[0].content.parts.map(p => p.text || '').join('');
    if (!t) return { unavailable: true, error: 'Gemini gave no answer.' };
    const m = t.replace(/```json|```/g, '').match(/\{[\s\S]*\}/);
    const x = JSON.parse(m ? m[0] : t);
    if (!x || !Array.isArray(x.bills)) return { unavailable: true, error: 'Gemini answer was not understood.' };
    return { bills: x.bills.slice(0, 40) };
  } catch (e) { return { unavailable: true, error: 'Gemini did not answer.' }; }
}

// Plain chat with Gemini (used by /api/ai when no Groq key is set)
async function chat(msgs, sys) {
  const key = process.env.GEMINI_API_KEY || '';
  if (!key) return { error: 'The AI is not set up yet. Ask the admin to add GEMINI_API_KEY in Vercel.' };
  const model = (process.env.GEMINI_MODEL || MODEL_DEFAULT).replace(/[^A-Za-z0-9.\-]/g, '');
  try {
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: sys }] }, contents: msgs.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })) }),
      signal: AbortSignal.timeout(50000)
    });
    if (!r.ok) return { error: 'The AI service returned an error (' + r.status + ').' };
    const j = await r.json();
    return { reply: (j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts || []).map(p => p.text || '').join('') };
  } catch (e) { return { error: 'The AI service did not answer. Try again.' }; }
}
module.exports = { readBill, chat, MAX_BYTES };
