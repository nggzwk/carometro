import React from "react";
import type { DieeseRow } from "../../../lib/annualInflation";
import { getBasketItemIcon } from "../../../lib/basketIcons";
import { RiTwitterXFill } from "react-icons/ri";
import { LiaLinkedin } from "react-icons/lia";
import { LiaGithubSquare } from "react-icons/lia";
import { TbMoneybagHeart } from "react-icons/tb";

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

export default function Transparency({
  dieeseRows = [],
}: {
  dieeseRows?: DieeseRow[];
}) {
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
          público curitibano o impacto real da inflação no dia a dia. Todos os
          dados desse projeto são públicos, extraídos de
          dadosabertos.curitiba.pr.gov.br
        </div>

        <div className="flex flex-col gap-3">
          <ExternalLink href="https://api.ocarometro.com/docs#/">
            API pública
          </ExternalLink>
          <ExternalLink href="https://github.com/nggzwk/carometro">
            Repositório no GitHub
          </ExternalLink>
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
              <tbody className="tracking-tight">
                {[
                  {
                    name: "Carne",
                    subcat: 10023,
                    a: "3,90kg",
                    b: "2,10kg",
                    c: "2,00kg",
                    final: "2,81kg",
                  },
                  {
                    name: "Frango",
                    subcat: 10011,
                    a: "3,90kg",
                    b: "3,80kg",
                    c: "2,00kg",
                    final: "3,57kg",
                  },
                  {
                    name: "Ovos",
                    subcat: 20001,
                    a: "75 un",
                    b: "21 un",
                    c: "24 un",
                    final: "43 un",
                  },
                  {
                    name: "Leite",
                    subcat: 30001,
                    a: "10,0L",
                    b: "3,2L",
                    c: "5,0L",
                    final: "6,19L",
                  },
                  {
                    name: "Arroz",
                    subcat: 40003,
                    a: "2,25kg",
                    b: "3,40kg",
                    c: "2,50kg",
                    final: "2,81kg",
                  },
                  {
                    name: "Feijão",
                    subcat: 40012,
                    a: "1,00kg",
                    b: "1,50kg",
                    c: "1,00kg",
                    final: "1,23kg",
                  },
                  {
                    name: "Café",
                    subcat: 90001,
                    a: "500g",
                    b: "480g",
                    c: "500g",
                    final: "491g",
                  },
                  {
                    name: "Óleo",
                    subcat: 60001,
                    a: "800ml",
                    b: "1.100ml",
                    c: "900ml",
                    final: "950ml",
                  },
                  {
                    name: "Açúcar",
                    subcat: 80002,
                    a: "0,70kg",
                    b: "2,10kg",
                    c: "1,00kg",
                    final: "1,38kg",
                  },
                  {
                    name: "Trigo",
                    subcat: 40017,
                    a: "1,25kg",
                    b: "0,60kg",
                    c: "1,00kg",
                    final: "0,92kg",
                  },
                ].map(({ name, subcat, a, b, c, final }) => (
                  <tr key={name} className="border-t border-black/5">
                    <td className="py-1.5 font-light text-[#6B5C4E]">
                      {getBasketItemIcon(subcat)} {name}
                    </td>
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
                    name: "Tomate",
                    subcat: 50008,
                    piso: "0,416kg",
                    teto: "1,150kg",
                    final: "0,783kg",
                  },
                  {
                    name: "Banana",
                    subcat: 50025,
                    piso: "0,583kg",
                    teto: "1,200kg",
                    final: "0,891kg",
                  },
                  {
                    name: "Batata",
                    subcat: 50005,
                    piso: "0,439kg",
                    teto: "1,120kg",
                    final: "0,779kg",
                  },
                  {
                    name: "Cebola",
                    subcat: 50002,
                    piso: "0,289kg",
                    teto: "0,510kg",
                    final: "0,399kg",
                  },
                  {
                    name: "Alface",
                    subcat: 50079,
                    piso: "0,080kg",
                    teto: "0,220kg",
                    final: "0,150kg",
                  },
                  {
                    name: "Cenoura",
                    subcat: 50007,
                    piso: "0,140kg",
                    teto: "0,320kg",
                    final: "0,230kg",
                  },
                  {
                    name: "Laranja",
                    subcat: 50021,
                    piso: "1,330kg",
                    teto: "2,400kg",
                    final: "1,865kg",
                  },
                  {
                    name: "Abóbora",
                    subcat: 50017,
                    piso: "0,160kg",
                    teto: "0,340kg",
                    final: "0,250kg",
                  },
                  {
                    name: "Maçã",
                    subcat: 50029,
                    piso: "0,310kg",
                    teto: "0,450kg",
                    final: "0,380kg",
                  },
                  {
                    name: "Batata-doce",
                    subcat: 50004,
                    piso: "0,125kg",
                    teto: "0,280kg",
                    final: "0,202kg",
                  },
                ].map(({ name, subcat, piso, teto, final }) => (
                  <tr key={name} className="border-t border-black/5">
                    <td className="py-1.5 font-light text-[#6B5C4E]">
                      {getBasketItemIcon(subcat)} {name}
                    </td>
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
        <Divider />
        <SectionTitle>Sobre o desenvolvimento</SectionTitle>

        <div className="text-sm font-light text-[#6B5C4E] leading-relaxed mt-4">
          <p className="mb-1">
            O Carômetro foi desenvolvido sem apoio institucional ou
            financiamento externo. O projeto é mantido de forma independente e
            sem fins lucrativos. Inconsistências podem ocorrer e são corrigidas
            assim que identificadas.
          </p>

          <p className="mb-1">
            Colaborações ou sugestões podem ser feitas diretamente no
            repositório do projeto. Ou entre em contato. A transparência e a
            colaboração são fundamentais para o sucesso de uma sociedade!
          </p>
          <div className="mt-8 uppercase text-[11px] flex items-center gap-2 italic">
            <a
              href="https://link.mercadopago.com.br/ocarometro"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#8B7355] hover:text-black transition-colors"
              aria-label="MercadoPago"
            >
              <TbMoneybagHeart size={24} />
            </a>
            <span className="mb-[-3px]">Ajude a manter o projeto</span>
          </div>
          <Divider />

          <div className="text-sm font-light text-[#6B5C4E] leading-relaxed mt-4">
            <p className="mb-4">
              Para mais detalhes sobre metodologia e fontes, consulte o{" "}
              <ExternalLink href="/carometro_v3.pdf">PDF</ExternalLink>
            </p>

            <div className="mb-2">
              <p>Atualizações futuras:</p>
              <ul className="list-disc list-inside">
                <li>Todos os itens disponíveis na API.</li>
                <li>Faxinão.</li>
              </ul>
            </div>
          </div>

          <div className="flex flex-row items-center gap-5">
            <a
              href="https://linkedin.com/in/narayanedemetrio/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#8B7355] hover:text-black transition-colors"
              aria-label="LinkedIn"
            >
              <LiaLinkedin size={24} />
            </a>

            <a
              href="https://x.com/nggzwk"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#8B7355] hover:text-black transition-colors"
              aria-label="Twitter / X"
            >
              <RiTwitterXFill size={24} />
            </a>

            <a
              href="https://github.com/nggzwk/carometro"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#8B7355] hover:text-black transition-colors"
              aria-label="GitHub"
            >
              <LiaGithubSquare size={30} />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
