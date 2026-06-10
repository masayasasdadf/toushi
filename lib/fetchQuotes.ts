// 株価データの取得。Yahoo Finance(2系統)→ Stooq の順でフォールバックする。

export type QuoteData = {
  symbol: string;
  name: string;
  currency: string;
  timestamps: number[];
  opens: number[];
  highs: number[];
  lows: number[];
  closes: number[];
  volumes: number[];
};

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export async function fetchQuotes(symbol: string): Promise<QuoteData> {
  const errors: string[] = [];
  for (const host of ["query1.finance.yahoo.com", "query2.finance.yahoo.com"]) {
    try {
      return await fetchYahoo(host, symbol);
    } catch (e) {
      errors.push(`${host}: ${(e as Error).message}`);
    }
  }
  try {
    return await fetchStooq(symbol);
  } catch (e) {
    errors.push(`stooq: ${(e as Error).message}`);
  }
  throw new Error(`全てのデータソースで取得に失敗しました(${errors.join(" / ")})`);
}

async function fetchYahoo(host: string, symbol: string): Promise<QuoteData> {
  const url = `https://${host}/v8/finance/chart/${encodeURIComponent(symbol)}?range=1y&interval=1d`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const result = data?.chart?.result?.[0];
  if (!result) throw new Error(data?.chart?.error?.description ?? "銘柄が見つかりません");

  const quote = result.indicators?.quote?.[0];
  const rawTs: number[] = result.timestamp ?? [];
  const out: QuoteData = {
    symbol,
    name: result.meta?.longName ?? result.meta?.shortName ?? symbol,
    currency: result.meta?.currency ?? "JPY",
    timestamps: [],
    opens: [],
    highs: [],
    lows: [],
    closes: [],
    volumes: [],
  };
  for (let i = 0; i < rawTs.length; i++) {
    const c = quote?.close?.[i];
    if (c == null) continue;
    out.timestamps.push(rawTs[i]);
    out.opens.push(quote.open?.[i] ?? c);
    out.highs.push(quote.high?.[i] ?? c);
    out.lows.push(quote.low?.[i] ?? c);
    out.closes.push(c);
    out.volumes.push(quote.volume?.[i] ?? 0);
  }
  if (out.closes.length === 0) throw new Error("価格データが空です");
  return out;
}

// Stooq: 認証不要のCSV。日本株は 7203.jp、米国株は aapl.us 形式。
async function fetchStooq(symbol: string): Promise<QuoteData> {
  const isJp = symbol.endsWith(".T");
  const stooqSymbol = isJp
    ? symbol.replace(/\.T$/, ".jp").toLowerCase()
    : `${symbol.toLowerCase()}.us`;
  const url = `https://stooq.com/q/d/l/?s=${encodeURIComponent(stooqSymbol)}&i=d`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA },
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const csv = await res.text();
  const lines = csv.trim().split("\n");
  if (lines.length < 2 || !lines[0].startsWith("Date")) {
    throw new Error("銘柄が見つかりません");
  }

  const out: QuoteData = {
    symbol,
    name: symbol,
    currency: isJp ? "JPY" : "USD",
    timestamps: [],
    opens: [],
    highs: [],
    lows: [],
    closes: [],
    volumes: [],
  };
  // 直近1年分のみ使用
  const oneYearAgo = Date.now() / 1000 - 370 * 86400;
  for (const line of lines.slice(1)) {
    const [date, open, high, low, close, volume] = line.split(",");
    const ts = Date.parse(date) / 1000;
    if (!Number.isFinite(ts) || ts < oneYearAgo) continue;
    const c = parseFloat(close);
    if (!Number.isFinite(c)) continue;
    out.timestamps.push(ts);
    out.opens.push(parseFloat(open) || c);
    out.highs.push(parseFloat(high) || c);
    out.lows.push(parseFloat(low) || c);
    out.closes.push(c);
    out.volumes.push(parseFloat(volume) || 0);
  }
  if (out.closes.length === 0) throw new Error("価格データが空です");
  return out;
}
