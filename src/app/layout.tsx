import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import PostHogProvider from "@/components/analytics/PostHogProvider";

export const metadata: Metadata = {
  title: "Equistra — Le Strava du cheval",
  description: "Hub central IA de gestion santé, performance et concours équestres",
  icons: {
    icon: "/favicon.ico",
    apple: "/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Equistra",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <PostHogProvider>
        {children}
        </PostHogProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: "#1A1A1A",
              color: "#FFFFFF",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: 500,
            },
            success: {
              iconTheme: { primary: "#E8440A", secondary: "#FFFFFF" },
            },
          }}
        />
      </body>
    </html>
  );
}
