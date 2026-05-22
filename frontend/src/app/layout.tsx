import type { Metadata } from "next";
import "./globals.css";
import { plusJakartaSans, jetbrainsMono } from "./fonts";

export const metadata: Metadata = {
    title: "Carômetro - Inflação Curitibana",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="pt-BR">
        <body
            className={`${plusJakartaSans.variable} ${jetbrainsMono.variable}`}
        >
            {children}
        </body>
        </html>
    );
}
