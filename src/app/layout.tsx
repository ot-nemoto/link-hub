import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Link Hub",
  description: "ブックマーク管理アプリ",
};

const themeScript = `(function(){try{var s=localStorage.getItem('theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;if(s==='dark'||(!s&&d)){document.documentElement.classList.add('dark');}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="ja" suppressHydrationWarning>
        <head>
          {/* biome-ignore lint/security/noDangerouslySetInnerHtml: theme flash prevention */}
          <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: themeScript }} />
        </head>
        <body className="bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
