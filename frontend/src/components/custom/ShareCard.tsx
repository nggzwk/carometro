import { formatBrl } from "../../lib/formatters";
import { wagePercent } from "./helpers";
import type { CartLine } from "./types";
import "./ShareCard.css";

interface ShareCardProps {
  lines: CartLine[];
  total: number;
  count: number;
  minimumWage: number;
  monthLabel: string;
  partLabel?: string | null;
  showTotal?: boolean;
}

export default function ShareCard({
  lines,
  total,
  count,
  minimumWage,
  monthLabel,
  partLabel = null,
  showTotal = true,
}: ShareCardProps) {
  const wagePct = minimumWage > 0 ? Math.round(wagePercent(total, minimumWage)) : null;

  return (
    <div className="share-card">
      <header className="share-card__header">
        <span className="share-card__brand">🛒 ocarometro.com</span>
        <h2 className="share-card__title">
          Minha lista
          <br />
          de compras
        </h2>
        <p className="share-card__eyebrow">
          {count} {count === 1 ? "item" : "itens"} · preços de {monthLabel}
          {partLabel ? ` · ${partLabel}` : ""}
        </p>
      </header>

      <ul className="share-card__list">
        {lines.map((line) => (
          <li key={line.subcat} className="share-card__row">
            <span className="share-card__check" aria-hidden="true" />
            <span className="share-card__row-icon" aria-hidden="true">
              {line.icon}
            </span>
            <span className="share-card__row-qty">{line.qty}×</span>
            <span className="share-card__row-name">{line.fullName}</span>
            <span className="share-card__row-sigla">{line.sigla}</span>
            <span className="share-card__row-price">{formatBrl(line.subtotal)}</span>
          </li>
        ))}
      </ul>

      {showTotal ? (
        <footer className="share-card__footer">
          <div className="share-card__total-row">
            <span className="share-card__total-label">Total estimado</span>
            <span className="share-card__total-value">{formatBrl(total)}</span>
          </div>
          {wagePct !== null && (
            <span className="share-card__wage">= {wagePct}% do salário mínimo</span>
          )}
        </footer>
      ) : (
        <footer className="share-card__footer share-card__footer--continues">
          <span className="share-card__continues">continua na parte 2 →</span>
        </footer>
      )}
    </div>
  );
}
