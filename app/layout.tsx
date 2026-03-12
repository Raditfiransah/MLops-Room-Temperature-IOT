import type { Metadata } from "next";
import { Gabarito } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const gabarito = Gabarito({
  weight: ["400", "600", "700", "800"],
  variable: "--font-gabarito",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TempMonitor — IoT Environmental Monitoring",
  description: "Real-time IoT sensor monitoring dashboard — Temperature, Humidity & Heat Index",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${gabarito.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
