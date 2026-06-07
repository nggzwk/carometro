"use client";

import React from "react";

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2
    className="uppercase tracking-[0.20em] text-xs font-light text-[#8B7355] mb-6"
    style={{ fontFamily: "var(--font-card-summary)" }}
  >
    {children}
  </h2>
);

const Divider = () => (
  <div className="w-full h-[0.5px] bg-black/10 my-10" aria-hidden="true" />
);

const FormulaBlock: React.FC<{ label: string; formula: string; description: string }> = ({
  label,
  formula,
  description,
}) => (
  <div className="mb-8">
    <p
      className="text-xs uppercase tracking-widest text-[#8B7355] mb-3 font-light"
      style={{ fontFamily: "var(--font-card-summary)" }}
    >
      {label}
    </p>
    <div
      className="rounded-2xl px-5 py-4 mb-3 overflow-x-auto"
      style={{
        background: "rgba(255,255,255,0.55)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(168,155,140,0.18)",
        boxShadow: "0 2px 12px rgba(139,115,85,0.07)",
      }}
    >
      <code
        className="text-sm font-light tracking-tight text-black whitespace-pre"
        style={{ fontFamily: "var(--font-card-summary)" }}
      >
        {formula}
      </code>
    </div>
    <p
      className="text-sm font-light text-[#6B5C4E] leading-relaxed"
      style={{ fontFamily: "var(--font-card-summary)" }}
    >
      {description}
    </p>
  </div>
);

const ExternalLink: React.FC<{ href: string; children: React.ReactNode }> = ({ href, children }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-1.5 text-sm font-light underline underline-offset-4 text-[#8B7355] hover:text-black transition-colors"
    style={{ fontFamily: "var(--font-card-summary)" }}
  >
    {children}
  </a>
);

export default function Transparency() {
  return (
    <div
      className="min-h-screen px-6 py-12 sm:px-10 lg:px-16 max-w-2xl mx-auto"
      style={{ fontFamily: "var(--font-card-summary)" }}
    >
      {/* Header */}
      <div className="mb-12">
        <h1 className="heading text-3xl sm:text-5xl leading-none mb-3">
          TRANSPARÊNCIA
        </h1>
        <div className="w-[60vw] max-w-xs h-[0.5px] bg-black mb-4" aria-hidden="true" />
        <p className="text-xs uppercase tracking-widest font-light text-[#8B7355]">
          metodologia &amp; fontes
        </p>
      </div>

      {/* Sobre o projeto */}
      <section aria-labelledby="sobre-title">
        <SectionTitle>Sobre o projeto</SectionTitle>

        <p className="text-sm font-light text-[#6B5C4E] leading-relaxed mb-6">
          O Carômetro nasceu da vontade de tornar visível o que os números escondem —
          o quanto a cesta básica curitibana realmente encareceu ao longo do tempo,
          e como isso se compara ao IPCA e ao salário mínimo.
          Os dados são coletados de fontes públicas e processados de forma aberta.
        </p>

        <div className="flex flex-col gap-3">
          <ExternalLink href="#">
            API pública — em breve
          </ExternalLink>
          <ExternalLink href="#">
            Repositório no GitHub — em breve
          </ExternalLink>
        </div>
      </section>

      <Divider />

      {/* Fórmulas */}
      <section aria-labelledby="formulas-title">
        <SectionTitle>Fórmulas</SectionTitle>

        {/* Basicão & Feirão */}
        <div className="mb-10">
          <p
            className="text-base font-light text-black mb-6 uppercase"
            style={{ letterSpacing: "0.12em" }}
          >
            Basicão &amp; Feirão
          </p>

          <FormulaBlock
            label="Média Ponderada"
            formula="— em breve —"
            description="A fórmula de média ponderada utilizada para calcular o valor mensal da cesta será publicada em breve."
          />
        </div>

        <Divider />

        {/* DIEESE */}
        <div>
          <p
            className="text-base font-light text-black mb-6 uppercase"
            style={{ letterSpacing: "0.12em" }}
          >
            DIEESE — inflação acumulada
          </p>

          <FormulaBlock
            label="Inflação composta (juros sobre juros)"
            formula={
              "C₁ = r₁\n" +
              "Cₙ = (1 + Cₙ₋₁ / 100) × (1 + rₙ / 100) × 100 − 100"
            }
            description={
              "Onde rₙ é a variação anual do DIEESE no ano n e Cₙ é o acumulado composto até esse ano. " +
              "Diferente de uma soma simples, o acúmulo composto aplica cada variação anual sobre o valor já corrigido — " +
              "refletindo o efeito real da inflação sobre o poder de compra ao longo do tempo."
            }
          />

          <div
            className="rounded-2xl px-5 py-4"
            style={{
              background: "rgba(255,255,255,0.45)",
              border: "1px solid rgba(168,155,140,0.15)",
            }}
          >
            <p className="text-xs uppercase tracking-widest text-[#8B7355] mb-3 font-light">
              Exemplo — 2023 a 2026
            </p>
            <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr className="text-[#8B7355] uppercase tracking-widest">
                  <th className="text-left pb-2 font-light">Ano</th>
                  <th className="text-right pb-2 font-light">Anual</th>
                  <th className="text-right pb-2 font-light">Acumulado</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { year: "2023", annual: "19,65%", cumulative: "19,65%" },
                  { year: "2024", annual: "3,62%",  cumulative: "23,98%" },
                  { year: "2025", annual: "4,19%",  cumulative: "29,18%" },
                  { year: "2026", annual: "7,68%",  cumulative: "39,10%" },
                ].map(({ year, annual, cumulative }) => (
                  <tr key={year} className="border-t border-black/5">
                    <td className="py-1.5 font-light text-[#6B5C4E]">{year}</td>
                    <td className="py-1.5 text-right font-light text-[#6B5C4E]">{annual}</td>
                    <td className="py-1.5 text-right font-medium text-black">{cumulative}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
