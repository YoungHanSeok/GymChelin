"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

type Placement =
  | {
      type: "DIRECT";
      slot: string;
      banner: {
        title: string;
        imageUrl: string;
        linkUrl: string;
      };
    }
  | {
      type: "ADSENSE";
      slot: string;
      adsenseClient: string;
      adsenseSlot: string;
    }
  | {
      type: "PLACEHOLDER";
      slot: string;
      label: string;
    }
  | {
      type: "EMPTY";
      slot: string;
    };

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

const slotSize: Record<string, string> = {
  MAIN_TOP: "min-h-24",
  MAIN_LEFT: "min-h-64",
  MAIN_RIGHT: "min-h-64",
  POST_LIST_INLINE: "min-h-20",
  GYM_DETAIL_SIDE: "min-h-64",
};

type AdSlotProps = {
  slot: string;
  label?: string;
  onVisibilityChange?: (slot: string, isVisible: boolean) => void;
};

const hasRenderablePlacement = (placement: Placement | null) => {
  if (placement?.type === "DIRECT") {
    return !!placement.banner.imageUrl && !!placement.banner.linkUrl;
  }

  if (placement?.type === "ADSENSE") {
    return !!placement.adsenseClient && !!placement.adsenseSlot;
  }

  return false;
};

export default function AdSlot({ slot, onVisibilityChange }: AdSlotProps) {
  const [placement, setPlacement] = useState<Placement | null>(null);

  useEffect(() => {
    let mounted = true;

    api
      .get<Placement>(`/ads/placements/${slot}`)
      .then((response) => {
        if (mounted) {
          const nextPlacement = response.data;
          setPlacement(nextPlacement);
          onVisibilityChange?.(slot, hasRenderablePlacement(nextPlacement));
        }
      })
      .catch(() => {
        if (mounted) {
          const emptyPlacement: Placement = { type: "EMPTY", slot };
          setPlacement(emptyPlacement);
          onVisibilityChange?.(slot, false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [onVisibilityChange, slot]);

  useEffect(() => {
    if (placement?.type === "ADSENSE" && hasRenderablePlacement(placement)) {
      try {
        window.adsbygoogle = window.adsbygoogle || [];
        window.adsbygoogle.push({});
      } catch {
        // 로컬 개발 환경에서는 AdSense 스크립트가 없을 수 있다.
      }
    }
  }, [placement]);

  const sizeClass = slotSize[slot] ?? "min-h-24";
  const baseClass = `${sizeClass} flex items-center justify-center rounded border border-dashed border-slate-300 bg-slate-50 text-center text-xs text-slate-500`;

  if (placement?.type === "DIRECT" && hasRenderablePlacement(placement)) {
    return (
      <a
        href={placement.banner.linkUrl}
        target="_blank"
        rel="noreferrer"
        aria-label={placement.banner.title}
        className={`${slotSize[slot] ?? "min-h-24"} block overflow-hidden rounded border border-slate-200 bg-white`}
      >
        <span
          className="block h-full min-h-24 w-full bg-cover bg-center"
          style={{ backgroundImage: `url(${placement.banner.imageUrl})` }}
        />
      </a>
    );
  }

  if (placement?.type === "ADSENSE" && hasRenderablePlacement(placement)) {
    return (
      <div className={baseClass}>
        <ins
          className="adsbygoogle block w-full"
          data-ad-client={placement.adsenseClient}
          data-ad-slot={placement.adsenseSlot}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    );
  }

  return <div className={sizeClass} aria-hidden="true" />;
}
