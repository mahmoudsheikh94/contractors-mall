import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { CartProvider } from '@/contexts/CartContext'
import { CartDrawer } from '@/components/CartDrawer'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'مول المقاول - سوق مواد البناء الأردني',
  description: 'منصة رقمية لربط المقاولين بموردي مواد البناء في الأردن',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Default to Arabic (RTL)
  const locale = 'ar'

  return (
    <html lang={locale} dir="rtl">
      <body className={`${inter.variable} font-sans font-arabic`}>
        <CartProvider>
          {children}
          <CartDrawer />
        </CartProvider>
      </body>
    </html>
  )
}