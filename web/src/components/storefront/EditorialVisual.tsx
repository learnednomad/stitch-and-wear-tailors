import type { CSSProperties } from "react";
import type { VisualTone } from "@/lib/storefront-content";
import styles from "./storefront.module.css";

const toneClasses: Record<VisualTone, string> = {
  ink: styles.toneInk,
  bronze: styles.toneBronze,
  indigo: styles.toneIndigo,
  clay: styles.toneClay,
  forest: styles.toneForest,
  sand: styles.toneSand,
};

function Figure({ portrait = false }: { portrait?: boolean }) {
  if (portrait) {
    return (
      <svg viewBox="0 0 360 520" fill="none" className={`${styles.visualFigure} ${styles.visualFigureCenter}`} aria-hidden>
        <ellipse cx="182" cy="104" rx="45" ry="53" fill="currentColor" opacity=".4" />
        <path d="M139 164c17-22 72-25 91 0l45 278H82l57-278Z" fill="currentColor" opacity=".24" />
        <path d="M138 166 55 273l42 24 43-58m90-73 82 107-41 24-43-58" fill="currentColor" opacity=".2" />
        <path d="M172 166h20l18 178-28 36-28-36 18-178Z" stroke="currentColor" strokeWidth="2" opacity=".7" />
        <path d="m159 214 23 23 23-23m-42 50 19 19 19-19m-32 45 13 13 13-13" stroke="currentColor" opacity=".75" />
        <path d="M111 441h143M139 164c17-22 72-25 91 0" stroke="currentColor" strokeWidth="2" opacity=".45" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 420 560" fill="none" className={styles.visualFigure} aria-hidden>
      <ellipse cx="223" cy="90" rx="39" ry="47" fill="currentColor" opacity=".38" />
      <path d="M178 145c17-18 72-20 88 0l99 137-62 45-30-42 35 216H126l42-219-38 45-67-45 115-137Z" fill="currentColor" opacity=".23" />
      <path d="M178 146 63 282l67 45m136-181 99 136-62 45" stroke="currentColor" strokeWidth="2" opacity=".4" />
      <path d="M194 147h46l20 171-43 52-43-52 20-171Z" stroke="currentColor" strokeWidth="2" opacity=".72" />
      <path d="m191 199 26 28 26-28m-45 55 19 21 19-21m-32 47 13 14 13-14" stroke="currentColor" opacity=".78" />
      <path d="M126 501h182" stroke="currentColor" strokeWidth="2" opacity=".45" />
    </svg>
  );
}

export function EditorialVisual({
  image,
  alt,
  tone = "ink",
  portrait = false,
  className = "",
}: {
  image?: string;
  alt: string;
  tone?: VisualTone;
  portrait?: boolean;
  className?: string;
}) {
  const imageStyle: CSSProperties | undefined = image
    ? { backgroundImage: `url(${JSON.stringify(image).slice(1, -1)})` }
    : undefined;

  return (
    <div
      className={`${styles.visual} ${toneClasses[tone]} ${image ? styles.visualWithImage : ""} ${className}`}
      style={imageStyle}
      role="img"
      aria-label={alt}
    >
      {!image && (
        <>
          <span className={styles.visualPattern} aria-hidden />
          <Figure portrait={portrait} />
        </>
      )}
    </div>
  );
}

