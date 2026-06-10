"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { GlobalBasketRankingRow } from "../../../lib/globalBaskets";
import {
  formatHours,
  formatPercent,
  formatUsd,
  translateCountry,
} from "../../../lib/globalBaskets";

type RankingGridProps = {
  rows: GlobalBasketRankingRow[];
  lastUpdatedAt?: string | null;
};

function getCountryFlag(countryName: string): string {
  const flags: Record<string, string> = {
    Brazil: "🇧🇷",
    Germany: "🇩🇪",
    USA: "🇺🇸",
    Argentina: "🇦🇷",
    Chile: "🇨🇱",
    India: "🇮🇳",
    Portugal: "🇵🇹",
    Russia: "🇷🇺",
    Paraguay: "🇵🇾",
    China: "🇨🇳",
  };
  return flags[countryName] || "🌍";
}

function getRankStyles(rank: number): {
  badge: string;
  cardBorder: string;
  cardBg: string;
} {
  if (rank === 1) {
    return {
      badge: "border-[#D6B25E] bg-[#FFF7DF] text-[#8B6B1B]",
      cardBorder: "#E8DDD3",
      cardBg: "#FFFDF8",
    };
  }

  if (rank === 2) {
    return {
      badge: "border-[#C7CDD3] bg-[#F3F6F8] text-[#59606A]",
      cardBorder: "#E8DDD3",
      cardBg: "#ffffff",
    };
  }

  if (rank === 3) {
    return {
      badge: "border-[#D9A17A] bg-[#FFF3EC] text-[#A05B2A]",
      cardBorder: "#E8DDD3",
      cardBg: "#FFFCFA",
    };
  }

  return {
    badge: "border-[#E8DDD3] bg-white text-[#000000]",
    cardBorder: "#EDE1D4",
    cardBg: "#ffffff",
  };
}

const containerVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.55,
      ease: [0.16, 1, 0.3, 1] as const,
      staggerChildren: 0.06,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0 },
};

const styleOnCollapsedGrid = {
  border: "1px solid #E8DDD3",
  backgroundColor: "#ffffffaf",
  boxShadow: "0 2px 16px 0 rgba(0, 0, 0, 0.04)",
};

const inViewMotionProps = {
  initial: { opacity: 0, y: 24, scale: 0.98 },
  whileInView: { opacity: 1, y: 0, scale: 1 },
  viewport: { once: true, amount: 0.25 },
  transition: {
    duration: 0.75,
    ease: [0.16, 1, 0.3, 1] as const,
  },
};

export default function RankingGrid({ rows, lastUpdatedAt }: RankingGridProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  return (
    <section className="w-full py-8 sm:py-12 mb-4">
      <div className="flex flex-col items-center gap-1 px-4 text-center sm:px-6 mb-6 sm:mb-12">
        <p className="text-[11px] font-semibold uppercase tracking-[0.20em] text-[#A89B8C]">
          Valor médio da cesta básica oficial
        </p>
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <h2
            className="text-4xl font-bold tracking-tight sm:text-4xl"
            style={{
              fontFamily: "var(--font-header)",
              color: "#1A120B",
              letterSpacing: "-0.02em",
            }}
          >
            Ranking
          </h2>
        </div>
      </div>

      <motion.div
        {...inViewMotionProps}
        className="w-full overflow-visible rounded-3xl"
        style={{
          background: "#ffffffaf",
          border: "1px solid rgba(200, 185, 170, 0.35)",
          boxShadow: "0 4px 32px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="relative px-4 py-6 sm:px-6 sm:py-8">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#E5CF8A] to-transparent opacity-60" />

          {rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#E4D7CB] bg-[#FCFAF7] px-6 py-10 text-center text-sm text-[#7B6758]">
              Nenhum dado de cesta global encontrado.
            </div>
          ) : (
            // Mobile: Card Grid (Compact)
            <div className="sm:hidden">
              <div className="grid gap-4 pt-2">
                {rows.map((row) => {
                  const styles = getRankStyles(row.rank);
                  const flag = getCountryFlag(row.country_region);
                  const isExpanded = expandedId === row.id;

                  return (
                    <div key={row.id} id={`ranking-row-${row.rank}`} className="relative w-full">
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20">
                        <span
                          className={`inline-flex h-7 px-3 items-center justify-center rounded-full border text-xs font-bold shadow-sm ${styles.badge}`}
                        >
                          {row.rank}
                        </span>
                      </div>

                      <motion.article
                        variants={itemVariants}
                        onClick={() =>
                          setExpandedId(isExpanded ? null : row.id)
                        }
                        className="rounded-2xl border px-6 py-2 transition-all duration-200 cursor-pointer relative"
                        style={{
                          backgroundColor: styles.cardBg,
                          borderColor: styles.cardBorder,
                          boxShadow: isExpanded
                            ? "0 10px 26px rgba(26,18,11,0.08)"
                            : "0 1px 0 rgba(0,0,0,0.02)",
                        }}
                      >
                        <div className="grid grid-cols-3 items-center w-full text-center">
                          <div id={`ranking-${row.rank}-usd`} className="flex flex-col items-start text-left gap-0.5">
                            <div className="text-[9px] uppercase tracking-[0.16em] text-[#A89B8C]">
                              USD
                            </div>
                            <div className="text-s font-semibold text-[#1A120B]">
                              {formatUsd(row.basket_usd)}
                            </div>
                          </div>

                          <div className="flex justify-center">
                            <span className="inline-flex h-11 w-11 items-center justify-center text-4xl">
                              {flag}
                            </span>
                          </div>

                          <div id={`ranking-${row.rank}-wage-pct`} className="flex flex-col items-end text-right gap-0.5">
                            <div className="text-[9px] uppercase tracking-[0.16em] text-[#A89B8C]">
                              Salário
                            </div>
                            <div className="text-s font-semibold text-[#A23C2B]">
                              {formatPercent(row.wage_pct)}
                            </div>
                          </div>
                        </div>

                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <motion.div
                              key="expanded"
                              initial={{ height: 0, opacity: 0 }}
                              animate={{
                                height: "auto",
                                opacity: 1,
                                transition: {
                                  height: { duration: 0.38, ease: [0.16, 1, 0.3, 1] },
                                  opacity: { duration: 0.28, delay: 0.08 },
                                },
                              }}
                              exit={{
                                height: 0,
                                opacity: 0,
                                transition: {
                                  height: { duration: 0.28, ease: [0.4, 0, 1, 1] },
                                  opacity: { duration: 0.16 },
                                },
                              }}
                              style={{ overflow: "hidden" }}
                            >
                              <div className="pt-4 pb-1 space-y-4">
                                <div className="flex items-start justify-between border-t border-[#E8DDD3] pt-4">
                                  <div>
                                    <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#A89B8C]">
                                      País
                                    </div>
                                    <p
                                      className="text-lg font-semibold text-black uppercase tracking-tight"
                                      style={{ fontFamily: "var(--font-subtitle)" }}
                                    >
                                      {translateCountry(row.country_region)}
                                    </p>
                                    <p className="mt-1 text-sm text-[#7B6758]">
                                      Órgão responsável:{" "}
                                      {row.responsible_authority}
                                    </p>
                                  </div>
                                  <span className="inline-flex h-11 w-11 items-center justify-center text-3xl">
                                    {flag}
                                  </span>
                                </div>

                                <div className="space-y-3">
                                  <p className="flex justify-between items-center mt-1 text-sm text-[#7B6758] px-3">
                                    A cesta básica oficial custa
                                  </p>
                                  <div
                                    id={`ranking-${row.rank}-usd-expanded`}
                                    className="flex justify-between items-center rounded-xl bg-[#FFF8F1] px-3 py-2.5"
                                    style={styleOnCollapsedGrid}
                                  >
                                    <span className="text-sm font-bold text-[#1A120B]">
                                      {formatUsd(row.basket_usd)}
                                    </span>
                                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#A89B8C]">
                                      Dólares por pessoa
                                    </span>
                                  </div>

                                  <div
                                    id={`ranking-${row.rank}-wage-pct-expanded`}
                                    className="flex justify-between items-center rounded-xl bg-[#FAF7F4] px-3 py-2.5"
                                    style={styleOnCollapsedGrid}
                                  >
                                    <span className="text-sm font-bold text-[#A23C2B]">
                                      {formatPercent(row.wage_pct)}
                                    </span>
                                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#A89B8C]">
                                      Salário consumido
                                    </span>
                                  </div>

                                  <div
                                    id={`ranking-${row.rank}-hours-expanded`}
                                    className="flex justify-between items-center rounded-xl bg-[#F8F6F2] px-3 py-2.5"
                                    style={styleOnCollapsedGrid}
                                  >
                                    <span className="text-sm font-bold text-[#1A120B]">
                                      {formatHours(row.hours_needed)}
                                    </span>
                                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#A89B8C]">
                                      Horas de trabalho
                                    </span>
                                  </div>
                                </div>

                                <p
                                  className="text-xs text-center text-[#A89B8C] pt-1 animate-pulse"
                                  style={{ animationDuration: "2.5s" }}
                                >
                                  Toque para fechar
                                </p>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.article>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Desktop: Original Layout */}
          {rows.length > 0 && (
            <div className="hidden sm:block">
              <div className="grid gap-3">
                {rows.map((row) => {
                  const styles = getRankStyles(row.rank);

                  return (
                    <motion.article
                      key={row.id}
                      id={`ranking-row-${row.rank}`}
                      variants={itemVariants}
                      className="relative overflow-hidden rounded-2xl border px-4 py-4 transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_26px_rgba(26,18,11,0.08)] sm:px-5 sm:py-5"
                      style={{
                        backgroundColor: styles.cardBg,
                        borderColor: styles.cardBorder,
                        boxShadow: "0 1px 0 rgba(0,0,0,0.02)",
                      }}
                    >
                      <div className="flex flex-col gap-4 md:grid md:grid-cols-[72px_minmax(180px,1.15fr)_minmax(190px,1fr)_minmax(210px,1.15fr)_minmax(220px,1fr)_minmax(210px,1fr)] md:gap-x-4 md:items-center">
                        <div className="flex items-center justify-between md:justify-start">
                          <span
                            className={`inline-flex h-9 min-w-9 items-center justify-center rounded-full border text-sm font-thin ${styles.badge}`}
                          >
                            #{row.rank}
                          </span>
                          <span className="sm:text-[25px] pl-3" />

                          <div className="text-right md:hidden">
                            <div className="text-[10px] uppercase tracking-[0.16em] text-[#A89B8C]">
                              País
                            </div>
                            <div className="text-sm font-semibold text-[#1A120B]">
                              {translateCountry(row.country_region)}
                            </div>
                          </div>
                        </div>

                        <div className="hidden min-w-0 flex-col justify-center md:flex">
                          <span className="truncate text-lg font-medium text-[#1A120B] uppercase tracking-wide">
                            <span className="mr-1 text-xl">
                              {getCountryFlag(row.country_region)}
                            </span>
                            {translateCountry(row.country_region)}
                          </span>
                        </div>

                        <div className="flex min-w-0 flex-col justify-center">
                          <span className="text-[10px] uppercase tracking-[0.16em] text-[#A89B8C] md:hidden">
                            Órgão oficial
                          </span>
                          <span className="truncate text-sm text-[#4E4337] sm:text-[15px]">
                            {row.responsible_authority}
                          </span>
                        </div>

                        <div id={`ranking-${row.rank}-usd`} className="flex min-w-0 flex-col justify-center rounded-2xl bg-[#FFF8F1] px-3 py-2 md:bg-transparent md:px-0 md:py-0">
                          <span className="text-[10px] uppercase tracking-[0.16em] text-[#A89B8C] md:hidden">
                            Valor em USD por pessoa
                          </span>
                          <span className="text-sm font-semibold text-[#1A120B] sm:text-[15px]">
                            {formatUsd(row.basket_usd)}
                          </span>
                          <span className="text-[11px] uppercase tracking-[0.12em] text-[#A89B8C]">
                            USD por pessoa
                          </span>
                        </div>

                        <div id={`ranking-${row.rank}-wage-pct`} className="flex min-w-0 flex-col justify-center rounded-2xl bg-[#FAF7F4] px-3 py-2 md:bg-transparent md:px-0 md:py-0">
                          <span className="text-[10px] uppercase tracking-[0.16em] text-[#A89B8C] md:hidden">
                            % da cesta vs salário
                          </span>
                          <span className="text-sm font-semibold text-[#A23C2B] sm:text-[15px]">
                            {formatPercent(row.wage_pct)}
                          </span>
                          <span className="text-[11px] uppercase tracking-[0.12em] text-[#A89B8C]">
                            salário mensal
                          </span>
                        </div>

                        <div id={`ranking-${row.rank}-hours`} className="flex min-w-0 flex-col justify-center rounded-2xl bg-[#F8F6F2] px-3 py-2 md:bg-transparent md:px-0 md:py-0">
                          <span className="text-[10px] uppercase tracking-[0.16em] text-[#A89B8C] md:hidden">
                            Horas necessárias
                          </span>
                          <span className="text-sm font-semibold text-[#1A120B] sm:text-[15px]">
                            {formatHours(row.hours_needed)}
                          </span>
                          <span className="text-[11px] uppercase tracking-[0.12em] text-[#A89B8C]">
                            Horas necessárias
                          </span>
                        </div>
                      </div>
                    </motion.article>
                  );
                })}
              </div>
            </div>
          )}

          {lastUpdatedAt && (
            <span className="mt-4 block text-[10px] uppercase tracking-[0.18em] font-medium text-[#A89B8C]"
              style={{ fontFamily: "var(--font-card-summary)" }}
            >
              Cotação atualizada em{" "}
              {new Date(lastUpdatedAt).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>
          )}
        </div>
      </motion.div>
    </section>
  );
}
