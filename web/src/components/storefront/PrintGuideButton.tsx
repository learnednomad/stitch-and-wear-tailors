"use client";

import styles from "./storefront.module.css";

export function PrintGuideButton() {
  return (
    <button
      type="button"
      className={`${styles.buttonPrimary} ${styles.printButton} ${styles.printHidden}`}
      onClick={() => window.print()}
    >
      Print or save as PDF
    </button>
  );
}

