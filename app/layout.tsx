import type { Metadata } from 'next'
import './globals.css'
import Providers from './providers'

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
      <body className="bg-[#0B0F19] text-[#F9FAFB] antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
