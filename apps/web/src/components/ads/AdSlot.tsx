"use client";

// 광고 슬롯 설정에 따라 애드센스 또는 직접 배너를 렌더링한다.
import { useEffect, useState } from "react";
import api from "@/lib/api";

type Placement =
  | {
      type: "DIRECT";
      slot: string;
      banner: {
        title?: string | null;
        imageUrl: string;
        linkUrl?: string | null;
      };
    }
  | {
      type: "DEFAULT";
      slot: string;
      imageUrl: string;
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

const fixedBannerHeight: Record<string, string> = {
  MAIN_TOP: "h-24",
  POST_LIST_INLINE: "h-20",
};

const verticalBannerSlots = new Set(["MAIN_LEFT", "MAIN_RIGHT", "GYM_DETAIL_SIDE"]);

type AdSlotProps = {
  slot: string;
  label?: string;
  onVisibilityChange?: (slot: string, isVisible: boolean) => void;
};

const hasRenderablePlacement = (placement: Placement | null) => {
  if (placement?.type === "DIRECT") {
    return !!placement.banner.imageUrl;
  }

  if (placement?.type === "DEFAULT") {
    return !!placement.imageUrl;
  }

  if (placement?.type === "ADSENSE") {
    return !!placement.adsenseClient && !!placement.adsenseSlot;
  }

  return false;
};

const getSafeLinkUrl = (value?: string | null) => {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value, "http://localhost");
    return url.protocol === "http:" || url.protocol === "https:" ? value : null;
  } catch {
    return null;
  }
};

const getBannerContainerClass = (slot: string) => {
  const fixedHeight = fixedBannerHeight[slot];

  if (fixedHeight) {
    return `${fixedHeight} flex w-full items-center justify-center`;
  }

  if (verticalBannerSlots.has(slot)) {
    return "block w-full";
  }

  return "flex min-h-24 w-full items-center justify-center";
};

const getBannerImageClass = (slot: string) => {
  if (fixedBannerHeight[slot]) {
    return "block h-full w-auto max-w-full object-contain";
  }

  if (verticalBannerSlots.has(slot)) {
    return "block h-auto w-full";
  }

  return "block h-auto max-w-full object-contain";
};

type BannerImageProps = {
  slot: string;
  imageUrl: string;
  label: string;
};

function BannerImage({ slot, imageUrl, label }: BannerImageProps) {
  return (
    // 원본 크기를 알 수 없는 원격 이미지와 data URL의 자연 비율을 유지한다.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={imageUrl} alt={label} className={getBannerImageClass(slot)} />
  );
}

export default function AdSlot({ slot, label = "배너 광고", onVisibilityChange }: AdSlotProps) {
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
    const bannerLabel = placement.banner.title?.trim() || label;
    const safeLinkUrl = getSafeLinkUrl(placement.banner.linkUrl);
    const bannerContainerClass = `${getBannerContainerClass(slot)} overflow-hidden rounded border border-slate-200 bg-white`;
    const bannerImage = <BannerImage slot={slot} imageUrl={placement.banner.imageUrl} label={bannerLabel} />;

    if (!safeLinkUrl) {
      return <div className={bannerContainerClass}>{bannerImage}</div>;
    }

    return (
      <a
        href={safeLinkUrl}
        target="_blank"
        rel="noreferrer"
        aria-label={bannerLabel}
        className={bannerContainerClass}
      >
        {bannerImage}
      </a>
    );
  }

  if (placement?.type === "DEFAULT" && hasRenderablePlacement(placement)) {
    return (
      <div
        className={`${getBannerContainerClass(slot)} overflow-hidden rounded border border-slate-200 bg-white`}
      >
        <BannerImage slot={slot} imageUrl={placement.imageUrl} label={`${label} 기본 이미지`} />
      </div>
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
