"use client";

import React, { useEffect, useState } from "react";
import getAnnualInflation from "../../../lib/annualInflation";

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
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

const FormulaBlock: React.FC<{
  label: string;
  formula: string;
  description: string;
}> = ({ label, formula, description }) => (
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

const ExternalLink: React.FC<{ href: string; children: React.ReactNode }> = ({
  href,
  children,
}) => (
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

type DieeseRow = { year: string; annual: string; cumulative: string };

export default function Transparency() {
  const [dieeseRows, setDieeseRows] = useState<DieeseRow[]>([]);

  useEffect(() => {
    getAnnualInflation().then((rows) => {
      if (!rows) return;
      let cumulative = 0;
      const computed = rows.map((r, i) => {
        const annual =
          r.annual_inflation_pct === null
            ? null
            : Number(r.annual_inflation_pct);
        if (annual !== null) {
          cumulative =
            i === 0
              ? annual
              : (1 + cumulative / 100) * (1 + annual / 100) * 100 - 100;
        }
        return {
          year: String(r.year),
          annual:
            annual !== null ? `${annual.toFixed(2).replace(".", ",")}%` : "—",
          cumulative:
            annual !== null
              ? `${cumulative.toFixed(2).replace(".", ",")}%`
              : "—",
        };
      });
      setDieeseRows(computed);
    });
  }, []);

  return (
    <div
      className="min-h-screen px-8 py-10"
      style={{ fontFamily: "var(--font-card-summary)" }}
    >
      <div className="mb-12">
        <h1 className="heading text-3xl sm:text-4xl leading-none mb-3">
          TRANSPARÊNCIA
        </h1>
        <div className="w-24 h-[0.5px] bg-black mb-4" aria-hidden="true" />
        <p className="text-xs uppercase tracking-widest font-light text-[#8B7355]">
          metodologia &amp; fontes
        </p>
      </div>

      <section aria-labelledby="sobre-title">
        <SectionTitle>Sobre o projeto</SectionTitle>

        <div className="text-sm font-light text-[#6B5C4E] leading-relaxed mb-6">
          O Carômetro nasceu da vontade de tornar acessível e democrático ao
          público curitibano o impacto real da inflação no cotidiano. Todos os
          dados desse projeto são públicos, extraídos de
          /dadosabertos.curitiba.pr.gov.br
        </div>

        <div className="flex flex-col gap-3">
          <ExternalLink href="#">API pública — em breve</ExternalLink>
          <ExternalLink href="#">Repositório no GitHub</ExternalLink>
        </div>
      </section>
      <Divider />

      <section aria-labelledby="formulas-title">
        <SectionTitle>Fórmulas</SectionTitle>

        <div className="mb-10">
          <p
            className="text-base font-light text-black mb-6 uppercase"
            style={{ letterSpacing: "0.12em" }}
          >
            Basicão
          </p>

          <FormulaBlock
            label="Média Ponderada"
            formula={"Qtd_Final = (A × 0.40) + (B × 0.45) + (C × 0.15)"}
            description={
              "A fórmula de média ponderada acima foi usada para definir a quantidade de cada um dos dez itens do BASICÃO: " +
              "A = Dieta ideal. " +
              "B = Consumo real. " +
              "C = Dados do varejo. "
            }
          />

          <div className="flex flex-col gap-1.5 mb-6">
            {[
              { key: "A", label: "Ideal (ESPEN/SBAN)", weight: "40%" },
              { key: "B", label: "Real (IBGE/POF)", weight: "45%" },
              { key: "C", label: "Varejo (ABRAS)", weight: "15%" },
            ].map(({ key, label, weight }) => (
              <div
                key={key}
                className="flex items-center gap-3 text-xs font-light text-[#6B5C4E]"
              >
                <span className="text-black font-normal w-4">{key}</span>
                <span>{label}</span>
                <span className="ml-auto text-[#8B7355]">{weight}</span>
              </div>
            ))}
          </div>

          <div
            className="rounded-2xl px-5 py-4 overflow-x-auto"
            style={{
              background: "rgba(255,255,255,0.45)",
              border: "1px solid rgba(168,155,140,0.15)",
            }}
          >
            <table
              className="w-full text-xs"
              style={{ borderCollapse: "collapse" }}
            >
              <thead>
                <tr className="text-[#8B7355] uppercase tracking-widest">
                  <th className="text-left pb-2 font-light">Item</th>
                  <th className="text-right pb-2 font-light">A</th>
                  <th className="text-right pb-2 font-light">B</th>
                  <th className="text-right pb-2 font-light">C</th>
                  <th className="text-right pb-2 font-light">Final</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    item: "Carne Vermelha",
                    a: "3,90 kg",
                    b: "2,10 kg",
                    c: "2,00 kg",
                    final: "2,81 kg",
                  },
                  {
                    item: "Filé de Frango",
                    a: "3,90 kg",
                    b: "3,80 kg",
                    c: "2,00 kg",
                    final: "3,57 kg",
                  },
                  {
                    item: "Ovos",
                    a: "75 unid.",
                    b: "21 unid.",
                    c: "24 unid.",
                    final: "43 unid.",
                  },
                  {
                    item: "Leite Integral",
                    a: "10,0 L",
                    b: "3,2 L",
                    c: "5,0 L",
                    final: "6,19 L",
                  },
                  {
                    item: "Arroz Polido",
                    a: "2,25 kg",
                    b: "3,40 kg",
                    c: "2,50 kg",
                    final: "2,81 kg",
                  },
                  {
                    item: "Feijão Carioca",
                    a: "1,00 kg",
                    b: "1,50 kg",
                    c: "1,00 kg",
                    final: "1,23 kg",
                  },
                  {
                    item: "Café a Vácuo",
                    a: "500 g",
                    b: "480 g",
                    c: "500 g",
                    final: "491 g",
                  },
                  {
                    item: "Óleo de Soja",
                    a: "800 ml",
                    b: "1.100 ml",
                    c: "900 ml",
                    final: "950 ml",
                  },
                  {
                    item: "Açúcar",
                    a: "0,70 kg",
                    b: "2,10 kg",
                    c: "1,00 kg",
                    final: "1,38 kg",
                  },
                  {
                    item: "Farinha de Trigo",
                    a: "1,25 kg",
                    b: "0,60 kg",
                    c: "1,00 kg",
                    final: "0,92 kg",
                  },
                ].map(({ item, a, b, c, final }) => (
                  <tr key={item} className="border-t border-black/5">
                    <td className="py-1.5 font-light text-[#6B5C4E]">{item}</td>
                    <td className="py-1.5 text-right font-light text-[#6B5C4E]">
                      {a}
                    </td>
                    <td className="py-1.5 text-right font-light text-[#6B5C4E]">
                      {b}
                    </td>
                    <td className="py-1.5 text-right font-light text-[#6B5C4E]">
                      {c}
                    </td>
                    <td className="py-1.5 text-right font-normal text-black">
                      {final}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-10">
          <p
            className="text-base font-light text-black mb-6 uppercase"
            style={{ letterSpacing: "0.12em" }}
          >
            Feirão
          </p>

          <FormulaBlock
            label="Média Simples"
            formula={"Qtd_Final = (Piso + Teto) / 2"}
            description={
              "A quantidade de cada item do FEIRÃO é calculada como média simples 50/50 entre dois limites: " +
              "Piso = referência mínima (IBGE) e Teto = referência máxima (CEPEA/CONAB). "
            }
          />

          <div className="flex flex-col gap-1.5 mb-6">
            {[
              { key: "Piso", label: "IBGE", weight: "50%" },
              { key: "Teto", label: "CEPEA / CONAB", weight: "50%" },
            ].map(({ key, label, weight }) => (
              <div
                key={key}
                className="flex items-center gap-3 text-xs font-light text-[#6B5C4E]"
              >
                <span className="text-black font-normal w-8">{key}</span>
                <span>{label}</span>
                <span className="ml-auto text-[#8B7355]">{weight}</span>
              </div>
            ))}
          </div>

          <div
            className="rounded-2xl px-5 py-4 overflow-x-auto"
            style={{
              background: "rgba(255,255,255,0.45)",
              border: "1px solid rgba(168,155,140,0.15)",
            }}
          >
            <table
              className="w-full text-xs"
              style={{ borderCollapse: "collapse" }}
            >
              <thead>
                <tr className="text-[#8B7355] uppercase tracking-widest">
                  <th className="text-left pb-2 font-light">Alimento</th>
                  <th className="text-right pb-2 font-light">Piso</th>
                  <th className="text-right pb-2 font-light">Teto</th>
                  <th className="text-right pb-2 font-light">Final</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    item: "Tomate 🍅",
                    piso: "0,416 kg",
                    teto: "1,150 kg",
                    final: "0,783 kg",
                  },
                  {
                    item: "Banana 🍌",
                    piso: "0,583 kg",
                    teto: "1,200 kg",
                    final: "0,891 kg",
                  },
                  {
                    item: "Batata 🥔",
                    piso: "0,439 kg",
                    teto: "1,120 kg",
                    final: "0,779 kg",
                  },
                  {
                    item: "Cebola 🧅",
                    piso: "0,289 kg",
                    teto: "0,510 kg",
                    final: "0,399 kg",
                  },
                  {
                    item: "Alface 🥬",
                    piso: "0,080 kg",
                    teto: "0,220 kg",
                    final: "0,150 kg",
                  },
                  {
                    item: "Cenoura 🥕",
                    piso: "0,140 kg",
                    teto: "0,320 kg",
                    final: "0,230 kg",
                  },
                  {
                    item: "Laranja 🍊",
                    piso: "1,330 kg",
                    teto: "2,400 kg",
                    final: "1,865 kg",
                  },
                  {
                    item: "Abóbora 🎃",
                    piso: "0,160 kg",
                    teto: "0,340 kg",
                    final: "0,250 kg",
                  },
                  {
                    item: "Maçã 🍎",
                    piso: "0,310 kg",
                    teto: "0,450 kg",
                    final: "0,380 kg",
                  },
                  {
                    item: "Batata-doce 🥔",
                    piso: "0,125 kg",
                    teto: "0,280 kg",
                    final: "0,202 kg",
                  },
                ].map(({ item, piso, teto, final }) => (
                  <tr key={item} className="border-t border-black/5">
                    <td className="py-1.5 font-light text-[#6B5C4E]">{item}</td>
                    <td className="py-1.5 text-right font-light text-[#6B5C4E]">
                      {piso}
                    </td>
                    <td className="py-1.5 text-right font-light text-[#6B5C4E]">
                      {teto}
                    </td>
                    <td className="py-1.5 text-right font-normal text-black">
                      {final}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <Divider />

        <div>
          <p
            className="text-base font-light text-black mb-6 uppercase"
            style={{ letterSpacing: "0.12em" }}
          >
            DIEESE
          </p>

          <FormulaBlock
            label="Fórmula Recursiva"
            formula={
              "C₁ = r₁\n" + "Cₙ = (1 + Cₙ₋₁ / 100) × (1 + rₙ / 100) × 100 − 100"
            }
            description={
              "O rₙ é a variação anual da DIEESE no ano n e Cₙ é o acumulado até agora. " +
              "Essa fórmula é recomendada para refletir o impacto real da inflação no poder de compra ao longo do tempo."
            }
          />

          <div
            className="rounded-2xl px-5 py-4"
            style={{
              background: "rgba(255,255,255,0.45)",
              border: "1px solid rgba(168,155,140,0.15)",
            }}
          >
            <table
              className="w-full text-xs"
              style={{ borderCollapse: "collapse" }}
            >
              <thead>
                <tr className="text-[#8B7355] uppercase tracking-widest">
                  <th className="text-left pb-2 font-light">Ano</th>
                  <th className="text-right pb-2 font-light">Anual</th>
                  <th className="text-right pb-2 font-light">Acumulado</th>
                </tr>
              </thead>
              <tbody>
                {dieeseRows.map(({ year, annual, cumulative }) => (
                  <tr key={year} className="border-t border-black/5">
                    <td className="py-1.5 font-light text-[#6B5C4E]">{year}</td>
                    <td className="py-1.5 text-right font-light text-[#6B5C4E]">
                      {annual}
                    </td>
                    <td className="py-1.5 text-right font-normal text-black">
                      {cumulative}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="text-sm font-light text-[#6B5C4E] leading-relaxed mt-4">
          <p>
            O projeto foi idealizado e executado por mim, Para mais detalhes
            sobre metodologia e fontes, consulte o{" "}
            <ExternalLink href="#">PDF</ExternalLink>.
          </p>
        </div>

        <Divider />
        <SectionTitle>Sobre o desenvolvimento</SectionTitle>

        <div className="text-sm font-light text-[#6B5C4E] leading-relaxed mt-4">
          <p className="mb-2">
            O Carômetro foi desenvolvido exclusivamente por mim, sem apoio
            institucional ou financiamento externo. O projeto é mantido de forma
            independente e sem fins lucrativos, como uma ferramenta simples e
            transparente para a população curitibana.
          </p>

          <p className="mb-2">
            Inconsistências podem ocorrer e são corrigidas assim que
            identificadas. Contribuições e reportes podem ser feitos diretamente
            no repositório do projeto.
          </p>
          <p className="mb-2">
            A transparência e a colaboração são fundamentais para o sucesso de
            uma sociedade!
          </p>
          <div className="flex flex-col gap-3">
            <ExternalLink href="https://www.linkedin.com/in/narayanedemetrio/">
              LinkedIn
            </ExternalLink>

            <ExternalLink href="https://twitter.com/nggzwk">
              Twitter
            </ExternalLink>
          </div>
        </div>
      </section>
    </div>
  );
}
