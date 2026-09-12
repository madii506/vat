// vat — live $GME quote (delayed equity quote as reference for the Robinhood Chain stock token).
// Yahoo Finance chart endpoint first, Stooq CSV as fallback. Cached 60s at the edge. No keys.
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  try {
    const r = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/GME?range=1mo&interval=1d', { headers: { 'User-Agent': 'Mozilla/5.0 (vat; +https://vat-nine.vercel.app)' } });
    if (!r.ok) throw new Error('yahoo ' + r.status);
    const j = await r.json(); const m = j.chart.result[0]; const meta = m.meta || {}; const ts = m.timestamp || []; const closes = (m.indicators.quote[0] || {}).close || [];
    const series = ts.map((t, k) => ({ t: t * 1000, c: closes[k] })).filter(x => x.c != null);
    let i = closes.length - 1; while (i >= 0 && closes[i] == null) i--;
    return res.status(200).json({ symbol: 'GME', price: meta.regularMarketPrice ?? closes[i], prevClose: meta.chartPreviousClose ?? (i > 0 ? closes[i - 1] : null), time: (meta.regularMarketTime || ts[i]) * 1000, marketState: meta.marketState || null, currency: meta.currency || 'USD', source: 'yahoo', series });
  } catch (e1) {
    try {
      const r = await fetch('https://stooq.com/q/l/?s=gme.us&f=sd2t2ohlcv&h&e=csv');
      if (!r.ok) throw new Error('stooq ' + r.status);
      const t = await r.text(); const rows = t.trim().split('\n'); const c = rows[1].split(',');
      return res.status(200).json({ symbol: 'GME', price: +c[6], prevClose: null, time: Date.parse(c[1] + 'T' + c[2] + 'Z') || Date.now(), marketState: null, currency: 'USD', source: 'stooq', series: [] });
    } catch (e2) {
      return res.status(502).json({ error: 'quote unavailable', detail: String(e1.message) + ' / ' + String(e2.message) });
    }
  }
};
