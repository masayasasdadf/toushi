import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "中村家投資アプリ | はじめての投資ガイド",
  description:
    "予算と目標を入れるだけで、AIがNISA・iDeCoの制度選びから銘柄の組み合わせ、売り時まで提案する初心者向け投資アプリ。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
