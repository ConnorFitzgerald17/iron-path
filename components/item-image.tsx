"use client";

import { PackageOpen } from "lucide-react";
import { useState } from "react";

export function ItemImage({ src, alt, size = 38 }: { src?: string; alt: string; size?: number }) {
  const [failedSrc, setFailedSrc] = useState<string>();
  if (!src || failedSrc === src) {
    return (
      <span className="item-image item-image--empty" style={{ width: size, height: size }} aria-label={alt}>
        <PackageOpen size={Math.max(14, size * 0.55)} />
      </span>
    );
  }

  return (
    <span className="item-image" style={{ width: size, height: size }}>
      {/* Wiki images are deliberately unoptimized: Special:FilePath responds with redirects. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} width={size} height={size} loading="lazy" onError={() => setFailedSrc(src)} />
    </span>
  );
}
