import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { budget, target, period, risk } = await req.json();

  const periodLabel =
    period === "short" ? "短期（1年以内）" : period === "mid" ? "中期（1〜3年）" : "長期（3年以上）";
  const riskLabel =
    risk === "low" ? "低リスク重視（安全な銘柄中心）" : risk === "mid" ? "バランス型" : "高リターン重視（成長株も含む）";
  const profitPct = Math.round((target / budget - 1) * 100);

  const prompt = `あなたは日本株投資の専門家アドバイザーです。完全な投資初心者に向けて、具体的で実践的な投資プランを作成してください。

【投資家の条件】
- 投資予算: ${budget.toLocaleString()}円
- 目標金額: ${target.toLocaleString()}円（利益目標: ${profitPct}%）
- 投資期間: ${periodLabel}
- リスク許容度: ${riskLabel}

【重要な制約】
- 日本株は100株単位での購入が基本
- 予算内に収まるよう株数を調整する
- 分散投資を意識し、2〜4銘柄を推薦する
- 初心者でも知っている有名企業を優先する

以下のJSON形式のみで回答してください（マークダウン記法、コードブロック、説明文は一切不要）:
{
  "summary": "プランの概要を初心者に優しく2〜3文で説明",
  "feasibility": "目標達成の現実的な可能性についての正直なコメント（リスクも含める）",
  "stocks": [
    {
      "code": "銘柄コード（数字4桁）",
      "name": "会社名",
      "shares": 購入推奨株数（整数）,
      "estimatedPrice": 現在の概算株価（円・整数）,
      "estimatedCost": 購入総額（円・整数）,
      "businessDescription": "何をしている会社かを一言で（例：日本最大の自動車メーカー）",
      "reason": "この銘柄を選んだ理由を初心者向けに2〜3文で",
      "expectedReturn": "期待できるリターンの説明（具体的な数字も）",
      "sellTiming": "いつ売るべきかの具体的な目安（株価の数値や条件）",
      "risk": "この銘柄の主なリスクを1〜2文で"
    }
  ],
  "totalCost": 全銘柄の合計投資額（円・整数）,
  "remainingCash": 予算から合計投資額を引いた残金（円・整数）,
  "longTermScenario": "3年以上保有した場合のシナリオを具体的に",
  "shortTermScenario": "1年以内で利益を狙う場合のシナリオを具体的に",
  "beginnerTips": [
    "初心者への実践的なアドバイス1",
    "初心者への実践的なアドバイス2",
    "初心者への実践的なアドバイス3"
  ],
  "warnings": [
    "重要な注意点1",
    "重要な注意点2"
  ]
}`;

  try {
    const message = await client.messages.create({
      model: "claude-fable-5",
      max_tokens: 16000,
      thinking: { type: "enabled", budget_tokens: 8000 },
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") throw new Error("no text");

    const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("no json");

    const plan = JSON.parse(jsonMatch[0]);
    return NextResponse.json(plan);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "プランの生成に失敗しました。もう一度お試しください。" }, { status: 500 });
  }
}
