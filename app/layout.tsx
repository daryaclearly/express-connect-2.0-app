import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
//import LeftNavMenu from "@/components/AdminLeftNavMenu";
import dynamic from "next/dynamic";
import { SessionProviderWrapper } from "@/components/SessionProviderWrapper";
import MainHeader from "@/components/MainHeader";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Express Connect",
  description: "An application for scheduling meetings",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} h-screen flex flex-col`}>
        <SessionProviderWrapper>
          <div className="flex flex-1 overflow-hidden">
            {/* Left Navigation */}
            {/* <LeftNavMenu /> */}

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Header */}
              <MainHeader />

              {/* Page Content */}
              <main className="flex-1 overflow-auto p-4">
                {children}
                {/* Copyright */}
                <div className="flex flex-col justify-center items-center text-xs text-gray-500 px-4">
                  <p className="p-2">
                    {" "}
                    Copyright © {new Date().getFullYear()}, All rights reserved
                  </p>
                  <div className="flex items-center gap-2 justify-center">
                    <a
                      href="https://forummakers.com/legal/express-connect-terms-of-service/"
                      target="_blank"
                      className="text-blue-500 block"
                    >
                      Terms and Conditions
                    </a>
                    <span className="text-gray-400 text-xs"> | </span>
                    <a
                      href="https://forummakers.com/legal/express-connect-privacy-policy"
                      target="_blank"
                      className="text-blue-500 block"
                    >
                      Privacy
                    </a>
                  </div>
                </div>
                {/* EDN Copyright */}
              </main>
            </div>
          </div>
        </SessionProviderWrapper>
      </body>
    </html>
  );
}