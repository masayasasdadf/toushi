import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "カブナビ | 初心者のための株式投資判断サポート",
  description:
    "テクニカル指標とAIで投資判断をサポート。買い時・売り時・損切りラインを初心者にもわかりやすく表示します。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
