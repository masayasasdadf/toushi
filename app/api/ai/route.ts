import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { AnalysisResult } from "@/lib/analyze";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SYSTEM_PROMPT = `あなたは株式投資の初心者に寄り添う、慎重で誠実な投資アドバイザーです。

ルール:
- 専門用語は必ずかみ砕いて説明する(例:「RSI=買われすぎ・売られすぎの体温計」)
- 渡されたテクニカル分析データのみに基づいて解説する。データにない情報を推測で補わない
- 「絶対に儲かる」「必ず上がる」という表現は禁止。常に不確実性とリスクを明示する
- 初心者が大損しやすいパターン(高値掴み、損切りできない、集中投資)に該当する状況なら必ず警告する
- 損切りラインを守ることの重要性を毎回伝える
- 400〜600字程度。見出しや箇条書きを使って読みやすく
- 最後に「今とるべき行動」を1行で明確に示す(例:「→ 今は買わずに、RSIが50を下回るまで待ちましょう」)`;

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "AI解説を使うには、VercelのEnvironment VariablesにANTHROPIC_API_KEYを設定してください。" },
      { status: 503 }
    );
  }

  try {
    const analysis = (await req.json()) as AnalysisResult;

    const summary = {
      銘柄: `${analysis.name}(${analysis.symbol})`,
      現在値: `${analysis.price.toFixed(1)} ${analysis.currency}`,
      前日比: `${analysis.changePct.toFixed(2)}%`,
      総合判定: analysis.verdict,
      スコア: `${analysis.totalScore}/${analysis.maxScore}`,
      信頼度: analysis.confidence,
      "52週レンジ内の位置": `${analysis.range52w.positionPct.toFixed(0)}%(0%=安値圏、100%=高値圏)`,
      推奨損切りライン: analysis.risk.stopLoss?.toFixed(1) ?? "計算不可",
      各シグナル: analysis.signals.map((s) => ({
        指標: s.name,
        スコア: s.score,
        内容: s.detail,
      })),
    };

    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-fable-5",
      max_tokens: 2000,
      thinking: { type: "adaptive" },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `以下のテクニカル分析結果を、株を始めたばかりの初心者に解説してください。\n\n${JSON.stringify(
            summary,
            null,
            2
          )}`,
        },
      ],
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    return NextResponse.json({ text });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: "APIキーが無効です。ANTHROPIC_API_KEYを確認してください。" }, { status: 401 });
    }
    if (e instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "AIへのリクエストが集中しています。少し待ってから再度お試しください。" }, { status: 429 });
    }
    console.error(e);
    return NextResponse.json({ error: "AI解説の生成に失敗しました。" }, { status: 500 });
  }
}
