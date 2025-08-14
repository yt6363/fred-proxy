// Serverless FRED proxy with CORS + light caching (Vercel, Node 20)
export default async function handler(req, res) {
  // CORS so your Framer page can call this
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { series_id, start = "2000-01-01", end } = req.query;
  if (!series_id) return res.status(400).json({ error: "series_id required" });

  const apiKey = process.env.FRED_API_KEY || "";
  if (!apiKey) return res.status(500).json({ error: "FRED_API_KEY not set" });

  const url = new URL("https://api.stlouisfed.org/fred/series/observations");
  url.searchParams.set("series_id", String(series_id));
  url.searchParams.set("observation_start", String(start));
  url.searchParams.set("observation_end", String(end || new Date().toISOString().slice(0, 10)));
  url.searchParams.set("file_type", "json");
  url.searchParams.set("api_key", apiKey);

  try {
    // Cache at the edge for 5 minutes to avoid rate limits
    const r = await fetch(url, { next: { revalidate: 300 } });
    const text = await r.text(); // pass through body even on non-200
    res.setHeader("Content-Type", "application/json");
    return res.status(r.status).send(text);
  } catch (e) {
    return res.status(502).json({ error: String(e) });
  }
}
