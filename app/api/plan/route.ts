import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { fetchQuotes } from "@/lib/fetchQuotes";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// JSON文字列値の中に紛れ込んだ制御文字をエスケープシーケンスに置換する
function sanitizeJsonString(raw: string): string {
  // JSON文字列トークン内だけを処理するためにステートマシンで走査
  let result = "";
  let inString = false;
  let escape = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    const code = raw.charCodeAt(i);
    if (escape) {
      result += ch;
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      result += ch;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      result += ch;
      continue;
    }
    if (inString && code < 0x20 && ch !== "\n" && ch !== "\r" && ch !== "\t") {
      // 制御文字をUnicodeエスケープに変換
      result += `\\u${code.toString(16).padStart(4, "0")}`;
      continue;
    }
    result += ch;
  }
  return result;
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "サーバーにANTHROPIC_API_KEYが設定されていません。Vercelの Settings → Environment Variables で設定し、再デプロイしてください。" },
      { status: 503 }
    );
  }

  const { budget, monthly, target, period, risk, age, purpose, hasEmergencyFund } = await req.json();

  const periodLabel =
    period === "short" ? "短期（1年以内）" : period === "mid" ? "中期（1〜5年）" : "長期（5年以上）";
  const riskLabel =
    risk === "low" ? "低リスク重視（元本割れをできるだけ避けたい）" : risk === "mid" ? "バランス型" : "高リターン重視（ある程度の値動きは受け入れる）";
  const purposeLabel =
    purpose === "retirement" ? "老後資金づくり"
    : purpose === "education" ? "教育資金・住宅資金など使い道が決まっている"
    : purpose === "grow" ? "余裕資金を増やしたい"
    : "とりあえず投資を始めてみたい";
  const profitPct = Math.round((target / budget - 1) * 100);

  const prompt = `あなたは日本の個人投資家向けのファイナンシャルプランナー兼投資アドバイザーです。完全な投資初心者に向けて、「失敗する可能性を極限まで減らしながら、目標達成の可能性を高める」現実的な投資プランを作成してください。

【投資家のプロフィール】
- 一括で投資できる予算: ${budget.toLocaleString()}円
- 毎月の積立可能額: ${monthly > 0 ? `${monthly.toLocaleString()}円` : "なし（一括のみ）"}
- 目標金額: ${target.toLocaleString()}円（利益目標: ${profitPct}%）
- 投資期間: ${periodLabel}
- リスク許容度: ${riskLabel}
- 年齢層: ${age}
- 投資の目的: ${purposeLabel}
- 生活防衛資金（生活費3〜6ヶ月分の貯金）: ${hasEmergencyFund ? "確保できている" : "確保できていない"}

【最新情報の収集（必須）】
プランを作る前に、必ずWeb検索で以下を確認してから判断すること：
- 直近の日本株市場・米国株市場の状況（日経平均・S&P500の水準とトレンド）
- 推薦しようとしている個別株の最新ニュース（決算、不祥事、業績見通し）。悪材料が出ている銘柄は推薦しない
- 推薦銘柄のPER・PBR・配当利回りなどの指標。市場平均や同業他社と比べて明らかに割高な銘柄は避ける
- 推薦銘柄の次回決算発表日。決算発表が2週間以内に迫っている銘柄は株価が急変しやすいため、初心者には推薦しないか、その旨をリスクに明記する
- 金利・為替など現在のマクロ環境
- NISA・iDeCoの最新の制度内容（年間投資枠など）
検索で得た事実は、銘柄選定の理由・リスク説明・市況コメントに反映すること。

【アドバイスの方針（厳守）】
1. まず最適な「制度・口座」を判断する：新NISA（つみたて投資枠/成長投資枠）、iDeCo、特定口座のどれを使うべきか。非課税メリット、資金拘束（iDeCoは60歳まで引き出せない）、目的との整合性を考慮する。
2. 初心者の失敗パターンを避ける設計にする：集中投資、高値掴み、生活資金まで投資、短期での個別株集中、信託報酬の高い商品、を避ける。
3. 低コストのインデックス投資信託（例：eMAXIS Slim 全世界株式、eMAXIS Slim 米国株式(S&P500)など実在する代表的な商品）を土台にし、リスク許容度と期間に応じて個別株や債券・現金比率を調整する。
4. 目標が非現実的（年利15%超が必要など）な場合は、はっきり「この目標は現実的でない」と伝え、現実的な代替案（目標額の修正、期間延長、積立額の増額）を示す。
5. 生活防衛資金が無い場合は、投資額を減らして先に貯金を作るよう強く勧める。

以下のJSON形式のみで回答してください（マークダウン記法、コードブロック、JSON以外の文章は一切不要）:
{
  "summary": "プラン全体の要約。初心者に優しく2〜3文",
  "marketContext": "Web検索で確認した現在の市場環境の要約と、それがこのプランにどう影響したか。初心者向けに3〜4文",
  "feasibility": {
    "verdict": "realistic | challenging | unrealistic のいずれか",
    "requiredAnnualReturn": 目標達成に必要な概算年利（%・数値）,
    "comment": "目標の現実性についての正直な評価。非現実的なら代替案も示す"
  },
  "accountAdvice": {
    "recommended": "最優先で使うべき制度名（例：新NISA つみたて投資枠）",
    "reason": "なぜこの制度が最適か。税金面のメリットを具体的な金額感も交えて2〜3文",
    "comparison": [
      { "name": "新NISA（つみたて投資枠）", "suitability": "high | mid | low", "point": "この人にとっての評価を1文" },
      { "name": "新NISA（成長投資枠）", "suitability": "high | mid | low", "point": "1文" },
      { "name": "iDeCo", "suitability": "high | mid | low", "point": "1文" },
      { "name": "特定口座（課税口座）", "suitability": "high | mid | low", "point": "1文" }
    ],
    "howToStart": "口座開設から購入までの具体的な手順を3ステップ程度で"
  },
  "allocation": [
    { "label": "資産クラス名（例：全世界株式インデックス投信）", "percent": 配分割合（数値）, "amount": 金額（円・整数）, "why": "なぜこの配分か1文" }
  ],
  "products": [
    {
      "type": "fund | stock",
      "name": "商品名または会社名",
      "code": "銘柄コード（株のみ。投信は空文字）",
      "amount": 投資額（円・整数）,
      "shares": 株数（株のみ。投信は0）,
      "description": "どんな商品/会社かを初心者向けに1文",
      "reason": "選んだ理由を2〜3文",
      "sellRule": "売る・見直すタイミングの具体的なルール",
      "risk": "主なリスクを1〜2文"
    }
  ],
  "totalInvested": 初期投資合計（円・整数）,
  "remainingCash": 予算から初期投資を引いた残り（円・整数）,
  "monthlyPlan": "毎月の積立がある場合の使い方。なければ空文字",
  "simulation": {
    "conservative": { "label": "弱気シナリオ（年利1%）", "year1": 1年後評価額, "year5": 5年後評価額, "year10": 10年後評価額 },
    "expected": { "label": "標準シナリオ（年利5%）", "year1": 1年後評価額, "year5": 5年後評価額, "year10": 10年後評価額 },
    "optimistic": { "label": "強気シナリオ（年利8%）", "year1": 1年後評価額, "year5": 5年後評価額, "year10": 10年後評価額 }
  },
  "failureGuards": [
    "大損を避けるための具体的なルール1（初心者の失敗パターンに対応）",
    "ルール2",
    "ルール3",
    "ルール4"
  ],
  "nextActions": [
    "今日からやるべき具体的な行動1",
    "行動2",
    "行動3"
  ]
}

simulationは積立額も含めた概算で計算すること。
個別株の価格はあなたの知識時点の概算で構いません（サーバー側でリアルタイム株価を取得して株数と金額を再計算します）。`;

  // 進捗をNDJSONでクライアントに流すストリーミングレスポンス
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      const status = (message: string) => send({ type: "status", message });

      try {
        const client = new Anthropic();
        status("AIがあなたの条件を読み込んでいます");

        const msgStream = client.messages.stream({
          model: "claude-fable-5",
          max_tokens: 20000,
          thinking: { type: "adaptive" },
          tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }],
          messages: [{ role: "user", content: prompt }],
        });

        let searchCount = 0;
        let lastPhase = "";
        msgStream.on("streamEvent", (event) => {
          if (event.type !== "content_block_start") return;
          const block = event.content_block;
          if (block.type === "server_tool_use") {
            searchCount++;
            status(`最新のニュース・市況をWeb検索しています（${searchCount}回目）`);
            lastPhase = "search";
          } else if (block.type === "web_search_tool_result") {
            status("検索結果を読んで分析しています");
            lastPhase = "read";
          } else if (block.type === "thinking" && lastPhase !== "think") {
            status(searchCount === 0 ? "条件を整理して方針を考えています" : "集めた情報をもとにプランを検討しています");
            lastPhase = "think";
          } else if (block.type === "text" && lastPhase !== "write") {
            status("プランを書き起こしています");
            lastPhase = "write";
          }
        });

        const message = await msgStream.finalMessage();

        // 検索を挟むとtextブロックが複数に分かれるため、全て連結してからJSONを抽出する
        const fullText = message.content
          .filter((b): b is Anthropic.TextBlock => b.type === "text")
          .map((b) => b.text)
          .join("\n");
        if (!fullText) throw new Error("AIの応答にテキストが含まれていません");

        const jsonMatch = fullText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("AIの応答からプランを読み取れませんでした");

        // JSON文字列内の制御文字（タブ・改行以外）を安全にエスケープしてからパース
        const safeJson = sanitizeJsonString(jsonMatch[0]);
        const plan = JSON.parse(safeJson);
        status("リアルタイム株価を取得して株数を計算しています");

        // 個別株はAIの概算価格のままにせず、リアルタイム株価で株数・金額を組み直す
        if (Array.isArray(plan.products)) {
          await Promise.all(
        plan.products.map(async (p: { type: string; code: string; amount: number; shares: number; currentPrice?: number; priceChecked?: boolean; priceNote?: string }) => {
          if (p.type !== "stock" || !/^\d{4}$/.test(p.code ?? "")) return;
          try {
            const q = await fetchQuotes(`${p.code}.T`);
            const price = q.closes[q.closes.length - 1];
            if (!price || price <= 0) return;
            p.currentPrice = Math.round(price);
            p.priceChecked = true;

            // 高値掴みチェック：52週レンジ内の位置と50日移動平均からの乖離
            const closes = q.closes;
            const hi = Math.max(...closes);
            const lo = Math.min(...closes);
            const pos = hi > lo ? (price - lo) / (hi - lo) : 0.5;
            const sma50 =
              closes.length >= 50
                ? closes.slice(-50).reduce((s, c) => s + c, 0) / 50
                : closes.reduce((s, c) => s + c, 0) / closes.length;
            const dev = (price - sma50) / sma50;
            (p as Record<string, unknown>).valuation = {
              positionPct: Math.round(pos * 100),
              smaDeviationPct: Math.round(dev * 1000) / 10,
              overheated: pos > 0.92 && dev > 0.08,
            };
            const lot = 100;
            const lots = Math.floor(p.amount / (price * lot));
            if (lots >= 1) {
              p.shares = lots * lot;
              p.amount = Math.round(p.shares * price);
            } else {
              // 予算内で1単元（100株）が買えない → 単元未満株での金額指定購入を案内
              p.shares = 0;
              p.priceNote = `現在株価は約${Math.round(price).toLocaleString()}円。100株単位だと約${Math.round(price * lot).toLocaleString()}円必要なため、単元未満株（S株・ミニ株）での金額指定購入をおすすめします。`;
            }
          } catch {
            p.priceChecked = false;
          }
        })
      );

          // 実価格で組み直した後の合計と残金を再計算
          const total = plan.products.reduce((s: number, p: { amount: number }) => s + (p.amount || 0), 0);
          plan.totalInvested = total;
          plan.remainingCash = Math.max(0, budget - total);
        }

        send({ type: "plan", plan });
      } catch (e) {
        console.error("plan generation error:", e);
        let errorMsg = `プランの生成に失敗しました：${(e as Error).message}`;
        if (e instanceof Anthropic.AuthenticationError) {
          errorMsg = "APIキーが無効です。ANTHROPIC_API_KEYの値を確認してください。";
        } else if (e instanceof Anthropic.RateLimitError) {
          errorMsg = "リクエストが集中しています。1分ほど待ってからお試しください。";
        } else if (e instanceof Anthropic.APIError) {
          errorMsg = `AIサービスでエラーが発生しました（${e.status}: ${e.message}）`;
        }
        send({ type: "error", error: errorMsg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}
