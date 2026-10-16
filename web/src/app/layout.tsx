import type { Metadata } from "next";
import "./globals.css";
import ThemeToggle from "./ThemeProvider";

export const metadata: Metadata = {
  title: "Merkle Airdrop — Stellar",
  description: "Claim your token allocation from this Merkle airdrop on Stellar.",
};

// FOUC-prevention script: runs synchronously before the first paint so the
// correct data-theme is applied before any CSS is rendered.
const themeScript = `(function(){
  var theme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* eslint-disable-next-line react/no-danger */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <nav
          style={{
            borderBottom: "1px solid var(--border)",
            padding: "16px 32px",
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <a
            href="/"
            style={{
              color: "var(--accent)",
              textDecoration: "none",
              fontWeight: 700,
              fontSize: 18,
            }}
          >
            🪂 Merkle Airdrop
          </a>
          <span style={{ color: "var(--text-muted)", fontSize: 13 }}>
            Powered by Soroban · Stellar
          </span>
          <ThemeToggle />
        </nav>
        <main style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px" }}>
          {children}
        </main>
        <footer
          style={{
            textAlign: "center",
            padding: 24,
            color: "var(--text-muted)",
            fontSize: 13,
            borderTop: "1px solid var(--border)",
          }}
        >
          Built on Stellar ·{" "}
          <a
            href="https://github.com/eogenyi23-creator/soroban-merkle-airdrop"
            style={{ color: "var(--accent)" }}
          >
            GitHub
          </a>
        </footer>
      </body>
    </html>
  );
}
