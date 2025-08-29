import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { SessionProvider } from "@/contexts/session-provider"
import ErrorBoundary from "@/components/error-boundary"

export const metadata: Metadata = {
  title: "Financial Portfolio Platform",
  description: "Generate Quality Insights From Your Investment Portfolio.",
  generator: "v0.app",
}

const inter = Inter({ 
  subsets: ["latin"], 
  variable: "--font-inter", 
  display: "swap"
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased font-normal">
        <ErrorBoundary>
          <SessionProvider>
            {children}
          </SessionProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
