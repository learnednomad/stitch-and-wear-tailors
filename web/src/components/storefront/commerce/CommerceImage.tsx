"use client";

import Image from "next/image";
import { useState } from "react";

export function CommerceImage({
  src,
  alt,
  sizes,
  priority = false,
  className = "object-cover",
}: {
  src?: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_50%_20%,#5b4226_0%,#191713_42%,#0c0d0c_100%)]"
      >
        <span className="font-display text-3xl text-[#b8873e]/60">S&amp;W</span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}

