import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClearHire AI | Autonomous Enterprise Onboarding Agent",
  description:
    "AI Employee Onboarding Agent powered by Gemini Function Calling — Cross-references unstructured hiring requests against HR policy and autonomously generates Offer Letters and IT Provisioning Tickets.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className="min-h-screen bg-slate-950 text-slate-100"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}

