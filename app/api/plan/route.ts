import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

【アドバイスの方針（厳守）】
1. まず最適な「制度・口座」を判断する：新NISA（つみたて投資枠/成長投資枠）、iDeCo、特定口座のどれを使うべきか。非課税メリット、資金拘束（iDeCoは60歳まで引き出せない）、目的との整合性を考慮する。
2. 初心者の失敗パターンを避ける設計にする：集中投資、高値掴み、生活資金まで投資、短期での個別株集中、信託報酬の高い商品、を避ける。
3. 低コストのインデックス投資信託（例：eMAXIS Slim 全世界株式、eMAXIS Slim 米国株式(S&P500)など実在する代表的な商品）を土台にし、リスク許容度と期間に応じて個別株や債券・現金比率を調整する。
4. 目標が非現実的（年利15%超が必要など）な場合は、はっきり「この目標は現実的でない」と伝え、現実的な代替案（目標額の修正、期間延長、積立額の増額）を示す。
5. 生活防衛資金が無い場合は、投資額を減らして先に貯金を作るよう強く勧める。

以下のJSON形式のみで回答してください（マークダウン記法、コードブロック、JSON以外の文章は一切不要）:
{
  "summary": "プラン全体の要約。初心者に優しく2〜3文",
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

simulationは積立額も含めた概算で計算すること。`;

  try {
    const client = new Anthropic();
    const message = await client.messages.create({
      model: "claude-fable-5",
      max_tokens: 20000,
      thinking: { type: "adaptive" },
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") throw new Error("AIの応答にテキストが含まれていません");

    const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("AIの応答からプランを読み取れませんでした");

    const plan = JSON.parse(jsonMatch[0]);
    return NextResponse.json(plan);
  } catch (e) {
    console.error("plan generation error:", e);
    if (e instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: "APIキーが無効です。ANTHROPIC_API_KEYの値を確認してください。" }, { status: 401 });
    }
    if (e instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "リクエストが集中しています。1分ほど待ってからお試しください。" }, { status: 429 });
    }
    if (e instanceof Anthropic.APIError) {
      return NextResponse.json({ error: `AIサービスでエラーが発生しました（${e.status}: ${e.message}）` }, { status: 502 });
    }
    return NextResponse.json(
      { error: `プランの生成に失敗しました：${(e as Error).message}` },
      { status: 500 }
    );
  }
}
