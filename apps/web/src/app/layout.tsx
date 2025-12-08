import type { Metadata } from 'next'
import './globals.css'
// import { ClerkProvider } from '@clerk/nextjs'
import { Toaster } from '@/components/ui/toaster'

export const metadata: Metadata = {
  title: 'AgriTrack - CRM Machinery Monitoring',
  description: 'Smart India Hackathon 2025 - Real-time monitoring of Crop Residue Management machinery',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body className="font-sans antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  )
}
