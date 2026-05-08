require("dotenv").config();
const nodemailer = require("nodemailer");

const RECIPIENT = "colmgalligan@outlook.com";
const TODAY = new Date().toLocaleDateString("en-IE", {
  weekday: "long", year: "numeric", month: "long", day: "numeric"
});

const SYSTEM = `You are a pharmaceutical intelligence analyst specialising in GLP-1 medicines. Today is ${TODAY}. The reader is a senior pharmaceutical physician in Ireland.

Use web_search to find the most recent developments (last 7 days preferred) across these five categories:
1. clinical — trial results, key efficacy or safety data (phase 2/3/4)
2. regulatory — FDA/EMA/HPRA approvals, refusals, label changes, advisory votes
3. commercial — sales figures, launches, pipeline updates, company or deal news
4. rwe — real-world evidence or observational study publications
5. hta — reimbursement/HTA decisions: NCPE Ireland, HSE, NICE, G-BA, HAS, SMC

Return ONLY valid JSON, no markdown fences, no preamble:
{
  "lead": "One sentence on the single most significant development today.",
  "categories": {
    "clinical":    { "items": [{ "headline": "max 10 words", "detail": "1-2 sentences", "geo": "US|EU|IE|Global", "days_ago": 0 }] },
    "regulatory":  { "items": [...] },
    "commercial":  { "items": [...] },
    "rwe":         { "items": [...] },
    "hta":         { "items": [...] }
  }
}

Rules: 2-4 items per category. Concise, factual. Flag IE/EU items. days_ago=0 means today. If nothing found in 30 days, return items: [].`;

async function fetchBriefing() {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 1000,
      system: SYSTEM,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [{ role: "user", content: "Run the GLP-1 briefing. Return JSON only." }]
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API ${response.status}: ${err}`);
  }

  const data = await response.json();
  const textBlock = data.content.find(b => b.type === "text");
  if (!textBlock) throw new Error("No text block in API response");

  return JSON.parse(textBlock.text.replace(/```json|```/g, "").trim());
}

function daysAgo(n) {
  if (n === 0) return "Today";
  if (n === 1) return "Yesterday";
  return `${n}d ago`;
}

const GEO_STYLE = {
  IE:     "background:#faece7;color:#712b13",
  EU:     "background:#e1f5ee;color:#085041",
  US:     "background:#e6f1fb;color:#0c447c",
  Global: "background:#eeedfe;color:#3c3489"
};

const CATS = [
  { k: "clinical",   l: "Clinical trial results" },
  { k: "regulatory", l: "Regulatory decisions" },
  { k: "commercial", l: "Commercial & pipeline" },
  { k: "rwe",        l: "Real-world evidence" },
  { k: "hta",        l: "Reimbursement & HTA" }
];

function buildHtml(data) {
  const geoTag = geo => {
    const s = GEO_STYLE[geo] || GEO_STYLE.Global;
    return `<span style="display:inline-block;font-size:10px;font-weight:600;padding:2px 6px;border-radius:4px;margin-right:4px;${s}">${geo}</span>`;
  };

  let sections = "";
  for (const c of CATS) {
    const items = data.categories?.[c.k]?.items || [];
    let rows = items.length
      ? "<ul style='margin:6px 0 0 0;padding-left:1.1rem'>" +
        items.map(it => `<li style="margin-bottom:8px;font-size:13.5px;line-height:1.6">
          ${geoTag(it.geo)}
          <span style="font-size:11px;color:#aaa;margin-right:4px">${daysAgo(it.days_ago)}</span>
          <strong style="font-weight:500;color:#1a1a18">${it.headline}</strong>
          <span style="color:#5f5e5a"> — ${it.detail}</span>
        </li>`).join("") + "</ul>"
      : `<p style="color:#aaa;font-size:13px;font-style:italic;margin:0">Nothing significant in the last 30 days.</p>`;

    sections += `
      <div style="background:#fff;border:1px solid #dddbd3;border-radius:10px;padding:14px 18px;margin-bottom:9px">
        <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:#888780;margin-bottom:8px">${c.l}</div>
        ${rows}
      </div>`;
  }

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:680px;margin:0 auto;padding:28px 20px">
    <div style="font-size:18px;font-weight:500;color:#1a1a18;margin-bottom:4px">GLP-1 daily briefing</div>
    <div style="font-size:12px;color:#888780;margin-bottom:16px">${TODAY}</div>
    ${data.lead ? `
    <div style="font-size:13px;color:#1a1a18;padding:10px 14px;background:#fff;border-radius:8px;border-left:3px solid #534ab7;margin-bottom:14px">
      <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:#534ab7;margin-bottom:3px">Lead</div>
      ${data.lead}
    </div>` : ""}
    ${sections}
    <div style="margin-top:18px;font-size:11px;color:#b4b2a9;text-align:right">GLP-1 intelligence · auto-generated</div>
  </div>
</body></html>`;
}

async function sendEmail(html) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  await transporter.sendMail({
    from: `GLP-1 Briefing <${process.env.SMTP_USER}>`,
    to: RECIPIENT,
    subject: `GLP-1 briefing — ${TODAY}`,
    html
  });
}

async function main() {
  console.log(`[${new Date().toISOString()}] Running GLP-1 briefing…`);
  const data = await fetchBriefing();
  const html = buildHtml(data);
  await sendEmail(html);
  console.log(`[${new Date().toISOString()}] Sent to ${RECIPIENT}`);
}

main().catch(err => { console.error(err.message); process.exit(1); });
