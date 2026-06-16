import { useCallback, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { buildGroceryListText, shareCaption } from "./helpers";
import type { CartLine } from "./types";

export type ShareStatus = "idle" | "sharing" | "shared" | "downloaded" | "error";
export type CopyStatus = "idle" | "copied" | "error";

interface UseShareBasketResult {
  cardRef: React.RefObject<HTMLDivElement | null>;
  status: ShareStatus;
  share: (total: number) => Promise<void>;
  copyStatus: CopyStatus;
  copyList: (lines: CartLine[], total: number) => Promise<void>;
}

async function nodeToFile(node: HTMLElement, name: string): Promise<File> {
  const dataUrl = await toPng(node, { pixelRatio: 2, cacheBust: true });
  const blob = await (await fetch(dataUrl)).blob();
  return new File([blob], name, { type: "image/png" });
}

function triggerDownload(file: File) {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  URL.revokeObjectURL(url);
}

export function useShareBasket(): UseShareBasketResult {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<ShareStatus>("idle");
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");

  const copyList = useCallback(async (lines: CartLine[], total: number) => {
    const text = buildGroceryListText(lines, total);
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus("copied");
      setTimeout(() => setCopyStatus("idle"), 2000);
    } catch {
      setCopyStatus("error");
      setTimeout(() => setCopyStatus("idle"), 2000);
    }
  }, []);

  const share = useCallback(async (total: number) => {
    const container = cardRef.current;
    if (!container) return;

    const cards = Array.from(
      container.querySelectorAll<HTMLElement>(".share-card"),
    );
    if (cards.length === 0) return;

    setStatus("sharing");
    const caption = shareCaption(total);
    const single = cards.length === 1;

    try {
      const files: File[] = [];
      for (let i = 0; i < cards.length; i++) {
        const name = single ? "minha-lista.png" : `minha-lista-${i + 1}.png`;
        files.push(await nodeToFile(cards[i], name));
      }

      if (
        typeof navigator !== "undefined" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files })
      ) {
        await navigator.share({ files, text: caption });
        setStatus("shared");
        return;
      }

      files.forEach(triggerDownload);

      await navigator.clipboard?.writeText(caption).catch(() => {});
      setStatus("downloaded");
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setStatus("idle");
        return;
      }
      setStatus("error");
    }
  }, []);

  return { cardRef, status, share, copyStatus, copyList };
}
