import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Outfit } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
})

const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
})

const outfit = Outfit({
    variable: '--font-outfit',
    subsets: ['latin'],
})

export const metadata: Metadata = {
    title: 'ChatGenius',
    description: 'A real-time messaging platform for team collaboration',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <body
                className={`${geistSans.variable} ${geistMono.variable} ${outfit.variable}`}
            >
                {children}
            </body>
        </html>
    )
}
