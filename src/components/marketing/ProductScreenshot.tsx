"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { Expand, X } from "lucide-react";

const shots: Record<
  string,
  { width: number; height: number; variant: "modal" | "workspace"; fade?: boolean }
> = {
  "ir-agent-setup": { width: 532, height: 739, variant: "modal" },
  "knowledge-sources": { width: 888, height: 777, variant: "workspace" },
  "northvale-knowledge-settings": { width: 532, height: 739, variant: "modal" },
  "agent-instructions": { width: 532, height: 661, variant: "modal", fade: true },
};

export default function ProductScreenshot({
  name,
  alt,
  caption,
}: {
  name: string;
  alt: string;
  caption: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const src = `/images/marketing/platform/${name}.png`;
  const shot = shots[name] ?? { width: 888, height: 823, variant: "workspace" as const };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") dialog.current?.close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <figure className={`m-product-shot m-shot-${shot.variant}`}>
      {shot.variant === "workspace" && (
        <div className="m-shot-chrome" aria-hidden>
          <i />
          <i />
          <i />
        </div>
      )}
      <button
        className="m-shot-open"
        onClick={() => dialog.current?.showModal()}
        aria-label={`Enlarge screenshot: ${alt}`}
      >
        <Image
          src={src}
          alt={alt}
          width={shot.width}
          height={shot.height}
          sizes="(max-width: 760px) 90vw, 580px"
        />
        {shot.fade && <span className="m-shot-fade" aria-hidden />}
        <span className="m-shot-label">
          <Expand size={14} /> View full screenshot
        </span>
      </button>
      <figcaption>{caption}</figcaption>
      <dialog
        ref={dialog}
        className="m-shot-dialog"
        aria-label={alt}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        <button
          className="m-shot-close"
          onClick={() => dialog.current?.close()}
          aria-label="Close screenshot"
          autoFocus
        >
          <X size={22} />
        </button>
        <Image src={src} alt={alt} width={shot.width} height={shot.height} sizes="95vw" />
        <p>{caption}</p>
      </dialog>
    </figure>
  );
}
