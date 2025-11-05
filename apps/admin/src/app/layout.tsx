import type { Metadata } from 'next'
import { Inter, Cairo } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const cairo = Cairo({ subsets: ['arabic'], variable: '--font-cairo' })

export const metadata: Metadata = {
  title: 'المقاول مول - بوابة الموردين | Contractors Mall - Supplier Portal',
  description: 'نظام إدارة الموردين والطلبات لمنصة المقاول مول | Supplier and order management system for Contractors Mall',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar">
      <body className={`${inter.variable} ${cairo.variable}`}>{children}</body>
    </html>
  )
}
