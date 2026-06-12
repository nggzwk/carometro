import type { Metadata } from "next";
import "./globals.css";
import { plusJakartaSans, jetbrainsMono } from "./fonts";
import { Analytics } from "@vercel/analytics/next";

const siteUrl = "https://ocarometro.com";
const title = "Carômetro — A inflação da cesta básica curitibana";
const description =
    "Carômetro acompanha a inflação da cesta básica e do hortifruti em Curitiba: preços monitorados mês a mês, ranking de itens e os vilões que mais pesam no bolso.";

export const metadata: Metadata = {
    metadataBase: new URL(siteUrl),
    title: {
        default: title,
        template: "%s | Carômetro",
    },
    description,
    applicationName: "Carômetro",
    keywords: [
        "inflação Curitiba",
        "cesta básica Curitiba",
        "preços Curitiba",
        "inflação cesta básica",
        "custo de vida Curitiba",
        "hortifruti Curitiba",
        "feira Curitiba",
        "economia",
        "política de preços",
        "inflação",
        "Carômetro",
    ],
    authors: [{ name: "Narayane Demétrio", url: "https://github.com/nggzwk" }],
    creator: "Narayane Demétrio",
    alternates: {
        canonical: "/",
    },
    openGraph: {
        type: "website",
        locale: "pt_BR",
        url: siteUrl,
        siteName: "Carômetro",
        title,
        description,
    },
    twitter: {
        card: "summary_large_image",
        title,
        description,
        creator: "@nggzwk",
    },
    robots: {
        index: true,
        follow: true,
    },
    category: "finance",
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
            <Analytics />
        </body>
        </html>
    );
}
