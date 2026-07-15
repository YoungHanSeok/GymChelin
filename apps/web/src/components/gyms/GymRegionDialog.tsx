"use client";

// 행정구역 정적 데이터를 열 때 불러와 광역시도, 시군구, 읍면동 순서로 선택한다.
import { useEffect, useMemo, useState } from "react";
import Modal from "@/app/_components/modalComponent";
import type {
  LegalDistrict,
  LegalRegion,
  LegalRegionData,
  LegalTown,
  SelectedLegalRegion,
} from "@/lib/gym-types";

type GymRegionDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (selection: SelectedLegalRegion) => void;
};

const isLegalRegionData = (value: unknown): value is LegalRegionData => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<LegalRegionData>;
  return Array.isArray(candidate.regions);
};

function RegionOption({
  label,
  isSelected,
  onClick,
}: {
  label: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={onClick}
      className={`w-full rounded px-3 py-2 text-left text-sm transition ${
        isSelected
          ? "bg-emerald-700 font-semibold text-white"
          : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"
      }`}
    >
      {label}
    </button>
  );
}

export default function GymRegionDialog({ isOpen, onClose, onSelect }: GymRegionDialogProps) {
  const [data, setData] = useState<LegalRegionData | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<LegalRegion | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<LegalDistrict | null>(null);
  const [selectedTown, setSelectedTown] = useState<LegalTown | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const abortController = new AbortController();
    setData(null);
    setSelectedRegion(null);
    setSelectedDistrict(null);
    setSelectedTown(null);
    setIsLoading(true);
    setErrorMessage(null);

    const loadRegions = async () => {
      try {
        const response = await fetch("/data/korea-legal-regions.json", {
          cache: "force-cache",
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error("행정구역 데이터를 불러오지 못했습니다.");
        }

        const result: unknown = await response.json();
        if (!isLegalRegionData(result)) {
          throw new Error("행정구역 데이터 형식이 올바르지 않습니다.");
        }

        setData(result);
      } catch (error) {
        if (!abortController.signal.aborted) {
          setErrorMessage(error instanceof Error ? error.message : "행정구역 데이터를 불러오지 못했습니다.");
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void loadRegions();

    return () => abortController.abort();
  }, [isOpen]);

  const selectedLabel = useMemo(
    () => [selectedRegion?.name, selectedDistrict?.name, selectedTown?.name].filter(Boolean).join(" "),
    [selectedDistrict, selectedRegion, selectedTown],
  );

  if (!isOpen) {
    return null;
  }

  const applySelection = () => {
    if (!selectedRegion || !selectedDistrict || !selectedTown) {
      return;
    }

    onSelect({
      region: selectedRegion,
      district: selectedDistrict,
      town: selectedTown,
      label: selectedLabel,
    });
  };

  return (
    <Modal onClose={onClose} ariaLabelledBy="gym-region-dialog-title" size="xl">
      <div className="pr-8">
        <h2 id="gym-region-dialog-title" className="text-xl font-bold text-slate-950">
          다른 지역 선택
        </h2>
        <p className="mt-2 text-sm text-slate-600">광역시도, 시군구, 읍면동을 차례대로 선택해 주세요.</p>
      </div>

      {isLoading ? (
        <p role="status" className="mt-6 rounded border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
          행정구역을 불러오는 중입니다.
        </p>
      ) : errorMessage ? (
        <p role="alert" className="mt-6 rounded border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : (
        <div className="mt-6 grid max-h-[58dvh] gap-4 overflow-y-auto overscroll-contain md:h-[58dvh] md:max-h-[32rem] md:min-h-0 md:grid-cols-3 md:grid-rows-[minmax(0,1fr)] md:overflow-hidden">
          <section className="min-h-40 rounded border border-slate-200 p-2 md:min-h-0 md:overflow-y-auto md:overscroll-contain" aria-labelledby="region-step-one">
            <h3 id="region-step-one" className="sticky top-0 bg-white px-2 py-2 text-sm font-bold text-slate-950">
              1. 광역시도
            </h3>
            <div className="space-y-1">
              {(data?.regions ?? []).map((region) => (
                <RegionOption
                  key={region.code}
                  label={region.name}
                  isSelected={selectedRegion?.code === region.code}
                  onClick={() => {
                    setSelectedRegion(region);
                    setSelectedDistrict(null);
                    setSelectedTown(null);
                  }}
                />
              ))}
            </div>
          </section>

          <section className="min-h-40 rounded border border-slate-200 p-2 md:min-h-0 md:overflow-y-auto md:overscroll-contain" aria-labelledby="region-step-two">
            <h3 id="region-step-two" className="sticky top-0 bg-white px-2 py-2 text-sm font-bold text-slate-950">
              2. 시군구
            </h3>
            {selectedRegion ? (
              <div className="space-y-1">
                {selectedRegion.districts.map((district) => (
                  <RegionOption
                    key={district.code}
                    label={district.name}
                    isSelected={selectedDistrict?.code === district.code}
                    onClick={() => {
                      setSelectedDistrict(district);
                      setSelectedTown(null);
                    }}
                  />
                ))}
              </div>
            ) : (
              <p className="px-2 py-6 text-sm text-slate-500">광역시도를 먼저 선택해 주세요.</p>
            )}
          </section>

          <section className="min-h-40 rounded border border-slate-200 p-2 md:min-h-0 md:overflow-y-auto md:overscroll-contain" aria-labelledby="region-step-three">
            <h3 id="region-step-three" className="sticky top-0 bg-white px-2 py-2 text-sm font-bold text-slate-950">
              3. 읍면동
            </h3>
            {selectedDistrict ? (
              <div className="space-y-1">
                {selectedDistrict.towns.map((town) => (
                  <RegionOption
                    key={town.code}
                    label={town.name}
                    isSelected={selectedTown?.code === town.code}
                    onClick={() => setSelectedTown(town)}
                  />
                ))}
              </div>
            ) : (
              <p className="px-2 py-6 text-sm text-slate-500">시군구를 먼저 선택해 주세요.</p>
            )}
          </section>
        </div>
      )}

      <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="min-h-5 text-sm font-medium text-emerald-700">{selectedLabel || "선택된 지역이 없습니다."}</p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500">
            취소
          </button>
          <button
            type="button"
            onClick={applySelection}
            disabled={!selectedTown}
            className="rounded bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            이 지역 보기
          </button>
        </div>
      </div>
    </Modal>
  );
}
