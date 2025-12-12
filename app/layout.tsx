import "./globals.css";
import { ReactNode } from "react";
import { AppProvider } from "./contexts/AppContext";
import localFont from 'next/font/local';
import { Analytics } from "@vercel/analytics/next"

const pressStart = localFont({
  src: [
    {
      path: '../public/fonts/PressStart2P.ttf',
      weight: '400',
      style: 'normal',
    },
  ],
  variable: '--font-press-start',
  display: 'swap',
});


export const metadata = {
  title: "Eat Throw",
  description: "Eat Throw will experience your wildest thought.",
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" style={{ margin: 0, padding: 0, height: '100%' }} className={pressStart.variable}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" />
        <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
      </head>
      <body
        className="bg-black"
        style={{
          margin: 0,
          padding: 0,
          overflow: 'hidden',
          height: '100vh',
          width: '100vw',
          fontFamily: 'var(--font-press-start), monospace, arial-black' // Apply the font
        }}
      >
        <div
          className="w-full h-[100dvh] flex flex-col justify-center items-center"
          style={{
            margin: 0,
            padding: 0,
            overflow: 'hidden',
          }}
        >
          <AppProvider>
            {children}
            <Analytics />
          </AppProvider>
        </div>
      </body>
    </html>
  );
}