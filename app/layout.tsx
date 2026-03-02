import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Providers from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AutoHyre – AI Recruitment Platform',
  description: 'AI-powered recruitment automation platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[#0B0F19] text-[#F9FAFB] antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
