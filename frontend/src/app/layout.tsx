import type { Metadata } from "next";
import "./globals.css";
import { plusJakartaSans, jetbrainsMono } from "./fonts";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const siteUrl = "https://ocarometro.com";
const title = "Carômetro - Aumento do supermercado em Curitiba";
const description =
    "Acompanhe o aumento dos preços em Curitiba: custo de mercado, cesta básica e hortifruti monitorados mês a mês, ranking de itens e os vilões que mais pesam no bolso.";

export const metadata: Metadata = {
    metadataBase: new URL(siteUrl),
    title: {
        default: title,
        template: "%s | Carômetro",
    },
    description,
    applicationName: "Carômetro",
    keywords: [
        "preço mercado Curitiba",
        "preço supermercado Curitiba",
        "preços mercado Curitiba",
        "custo de vida em Curitiba",
        "custo de vida Curitiba",
        "inflação em Curitiba",
        "inflação Curitiba",
        "preço cesta básica Curitiba",
        "cesta básica Curitiba",
        "valor cesta básica Curitiba",
        "preço dos alimentos Curitiba",
        "preço da feira Curitiba",
        "preço hortifruti Curitiba",
        "feira Curitiba preços",
        "quanto custa cesta básica Curitiba",
        "preços supermercado Paraná",
        "inflação cesta básica",
        "custo de vida Brasil",
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

const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "Carômetro — Inflação da Cesta Básica em Curitiba",
    description,
    url: siteUrl,
    creator: {
        "@type": "Person",
        name: "Narayane Demétrio",
        url: "https://github.com/nggzwk",
    },
    spatialCoverage: "Curitiba, Brasil",
    temporalCoverage: "2024/..",
    inLanguage: "pt-BR",
    keywords: [
        "preço mercado Curitiba",
        "custo de vida em Curitiba",
        "inflação em Curitiba",
        "preço cesta básica Curitiba",
        "preço hortifruti Curitiba",
        "preço da feira Curitiba",
        "cesta básica",
        "Curitiba",
        "preços",
    ],
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="pt-BR">
        <head>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
        </head>
        <body
            className={`${plusJakartaSans.variable} ${jetbrainsMono.variable}`}
        >
            {children}
            <Analytics />
            <SpeedInsights />
        </body>
        </html>
    );
}
