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

export default function AdSlot({ slot, label }: { slot: string; label?: string }) {
  const [placement, setPlacement] = useState<Placement | null>(null);

  useEffect(() => {
    let mounted = true;

    api
      .get<Placement>(`/ads/placements/${slot}`)
      .then((response) => {
        if (mounted) {
          setPlacement(response.data);
        }
      })
      .catch(() => {
        if (mounted) {
          setPlacement({ type: "PLACEHOLDER", slot, label: label ?? "광고 영역" });
        }
      });

    return () => {
      mounted = false;
    };
  }, [label, slot]);

  useEffect(() => {
    if (placement?.type === "ADSENSE") {
      try {
        window.adsbygoogle = window.adsbygoogle || [];
        window.adsbygoogle.push({});
      } catch {
        // AdSense script may be unavailable in local development.
      }
    }
  }, [placement]);

  const baseClass = `${slotSize[slot] ?? "min-h-24"} flex items-center justify-center rounded border border-dashed border-slate-300 bg-slate-50 text-center text-xs text-slate-500`;

  if (placement?.type === "DIRECT") {
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

  if (placement?.type === "ADSENSE") {
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

  return <div className={baseClass}>{label ?? placement?.label ?? "광고 영역"}</div>;
}
