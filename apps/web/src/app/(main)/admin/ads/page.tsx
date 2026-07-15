"use client";

// 최고 관리자가 광고 슬롯과 직접 배너를 관리하는 화면이다.
import { zodResolver } from "@hookform/resolvers/zod";
import dayjs from "dayjs";
import isEqual from "lodash/isEqual";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import api from "@/lib/api";
import { isSuperAdminRole, useAuthSession } from "@/lib/auth-session";

const adSlots = [
  "MAIN_TOP",
  "MAIN_LEFT",
  "MAIN_RIGHT",
  "POST_LIST_INLINE",
  "GYM_DETAIL_SIDE",
] as const;

type AdSlotName = (typeof adSlots)[number];

const slotMetadata: Record<AdSlotName, { label: string; description: string; previewClassName: string }> = {
  MAIN_TOP: {
    label: "상단 배너",
    description: "전체 화면 상단에 표시되는 가로형 배너입니다.",
    previewClassName: "aspect-[4/1]",
  },
  MAIN_LEFT: {
    label: "왼쪽 배너",
    description: "데스크톱 화면 왼쪽에 표시되는 세로형 배너입니다.",
    previewClassName: "aspect-[3/4]",
  },
  MAIN_RIGHT: {
    label: "오른쪽 배너",
    description: "데스크톱 화면 오른쪽에 표시되는 세로형 배너입니다.",
    previewClassName: "aspect-[3/4]",
  },
  POST_LIST_INLINE: {
    label: "게시글 목록 배너",
    description: "게시글 목록 중간에 표시되는 가로형 배너입니다.",
    previewClassName: "aspect-[4/1]",
  },
  GYM_DETAIL_SIDE: {
    label: "헬스장 상세 배너",
    description: "헬스장 상세 화면 측면에 표시되는 세로형 배너입니다.",
    previewClassName: "aspect-[3/4]",
  },
};

const allowedImageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const maxImageSize = 2 * 1024 * 1024;
const acceptedImageTypes = allowedImageTypes.join(",");

const imageFileSchema = z
  .custom<File | null>(
    (value) => value === null || (typeof File !== "undefined" && value instanceof File),
    "이미지 파일을 선택해 주세요.",
  )
  .refine((file) => file === null || allowedImageTypes.includes(file.type), "JPEG, PNG, WebP, GIF 이미지만 업로드할 수 있습니다.")
  .refine((file) => file === null || file.size <= maxImageSize, "이미지는 2MB 이하만 업로드할 수 있습니다.");

const bannerFormSchema = z
  .object({
    startsAt: z.string(),
    endsAt: z.string(),
    bannerImage: imageFileSchema,
    defaultImage: imageFileSchema,
    removeBannerImage: z.boolean(),
    removeDefaultImage: z.boolean(),
    hasExistingBannerImage: z.boolean(),
    noExpiry: z.boolean(),
  })
  .superRefine((values, context) => {
    if (values.removeBannerImage) {
      return;
    }

    const hasBannerImage = values.hasExistingBannerImage || values.bannerImage !== null;
    const hasScheduleInput = hasBannerImage || values.startsAt.length > 0 || values.endsAt.length > 0 || values.noExpiry;

    if (!hasScheduleInput) {
      return;
    }

    if (!hasBannerImage) {
      context.addIssue({ code: "custom", path: ["bannerImage"], message: "예약 배너 이미지를 선택해 주세요." });
    }

    if (!values.startsAt) {
      context.addIssue({ code: "custom", path: ["startsAt"], message: "노출 시작 일시를 입력해 주세요." });
    } else if (!dayjs(values.startsAt).isValid()) {
      context.addIssue({ code: "custom", path: ["startsAt"], message: "올바른 시작 일시를 입력해 주세요." });
    }

    if (!values.noExpiry) {
      if (!values.endsAt) {
        context.addIssue({ code: "custom", path: ["endsAt"], message: "노출 종료 일시를 입력해 주세요." });
      } else if (!dayjs(values.endsAt).isValid()) {
        context.addIssue({ code: "custom", path: ["endsAt"], message: "올바른 종료 일시를 입력해 주세요." });
      }

      if (
        values.startsAt &&
        values.endsAt &&
        dayjs(values.startsAt).isValid() &&
        dayjs(values.endsAt).isValid() &&
        !dayjs(values.endsAt).isAfter(dayjs(values.startsAt))
      ) {
        context.addIssue({ code: "custom", path: ["endsAt"], message: "종료 일시는 시작 일시보다 뒤여야 합니다." });
      }
    }
  });

type BannerFormValues = z.infer<typeof bannerFormSchema>;

type ScheduledBanner = {
  id: number;
  imageUrl: string;
  startsAt: string;
  endsAt: string | null;
  noExpiry?: boolean;
};

type BannerSlotItem = {
  slot: AdSlotName;
  label: string;
  banner: ScheduledBanner | null;
  defaultImageUrl: string | null;
};

type BannerSlotsResponse = {
  items: BannerSlotItem[];
};

type FormSnapshot = {
  startsAt: string;
  endsAt: string;
  bannerImage: { name: string; size: number; lastModified: number } | null;
  defaultImage: { name: string; size: number; lastModified: number } | null;
  removeBannerImage: boolean;
  removeDefaultImage: boolean;
  hasExistingBannerImage: boolean;
  noExpiry: boolean;
};

const getApiMessage = (error: unknown, fallback: string) => {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "data" in error.response
  ) {
    const responseData = error.response.data;
    if (
      typeof responseData === "object" &&
      responseData !== null &&
      "message" in responseData &&
      typeof responseData.message === "string"
    ) {
      return responseData.message;
    }
  }

  return fallback;
};

const toDateTimeInputValue = (value?: string | null) => {
  if (!value || !dayjs(value).isValid()) {
    return "";
  }

  return dayjs(value).format("YYYY-MM-DDTHH:mm");
};

const createFormValues = (item: BannerSlotItem): BannerFormValues => ({
  startsAt: toDateTimeInputValue(item.banner?.startsAt),
  endsAt: toDateTimeInputValue(item.banner?.endsAt),
  bannerImage: null,
  defaultImage: null,
  removeBannerImage: false,
  removeDefaultImage: false,
  hasExistingBannerImage: !!item.banner?.imageUrl,
  noExpiry: item.banner?.noExpiry ?? item.banner?.endsAt === null,
});

const toFileSnapshot = (file: File | null) =>
  file
    ? {
        name: file.name,
        size: file.size,
        lastModified: file.lastModified,
      }
    : null;

const createFormSnapshot = (values: BannerFormValues): FormSnapshot => ({
  startsAt: values.startsAt,
  endsAt: values.endsAt,
  bannerImage: toFileSnapshot(values.bannerImage),
  defaultImage: toFileSnapshot(values.defaultImage),
  removeBannerImage: values.removeBannerImage,
  removeDefaultImage: values.removeDefaultImage,
  hasExistingBannerImage: values.hasExistingBannerImage,
  noExpiry: values.noExpiry,
});

const getFileValidationMessage = (file: File) => {
  if (!allowedImageTypes.includes(file.type)) {
    return "JPEG, PNG, WebP, GIF 이미지만 업로드할 수 있습니다.";
  }

  if (file.size > maxImageSize) {
    return "이미지는 2MB 이하만 업로드할 수 있습니다.";
  }

  return null;
};

function useImagePreview(file: File | null, imageUrl: string | null, removed: boolean) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setObjectUrl(null);
      return;
    }

    const nextObjectUrl = URL.createObjectURL(file);
    setObjectUrl(nextObjectUrl);

    return () => URL.revokeObjectURL(nextObjectUrl);
  }, [file]);

  if (removed) {
    return null;
  }

  return objectUrl ?? imageUrl;
}

function ImagePreview({ imageUrl, alt, className }: { imageUrl: string | null; alt: string; className: string }) {
  return (
    <div className={`relative flex w-full items-center justify-center overflow-hidden rounded border border-slate-200 bg-slate-50 ${className}`}>
      {imageUrl ? (
        <Image src={imageUrl} alt={alt} width={800} height={500} unoptimized className="h-full w-full object-contain" />
      ) : (
        <p className="px-4 text-center text-sm text-slate-400">등록된 이미지가 없습니다.</p>
      )}
    </div>
  );
}

function BannerSlotCard({ item, onSaved }: { item: BannerSlotItem; onSaved: (item: BannerSlotItem) => void }) {
  const bannerFileInputRef = useRef<HTMLInputElement | null>(null);
  const defaultFileInputRef = useRef<HTMLInputElement | null>(null);
  const initialValues = useMemo(() => createFormValues(item), [item]);
  const initialSnapshot = useMemo(() => createFormSnapshot(initialValues), [initialValues]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    control,
    register,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<BannerFormValues>({
    resolver: zodResolver(bannerFormSchema),
    defaultValues: initialValues,
  });

  const watchedValues = useWatch({ control }) as BannerFormValues;
  const bannerPreviewUrl = useImagePreview(
    watchedValues.bannerImage,
    item.banner?.imageUrl ?? null,
    watchedValues.removeBannerImage,
  );
  const defaultPreviewUrl = useImagePreview(
    watchedValues.defaultImage,
    item.defaultImageUrl,
    watchedValues.removeDefaultImage,
  );
  const hasChanges = !isEqual(createFormSnapshot(watchedValues), initialSnapshot);
  const metadata = slotMetadata[item.slot];

  const selectImage = (
    field: "bannerImage" | "defaultImage",
    removeField: "removeBannerImage" | "removeDefaultImage",
    event: ChangeEvent<HTMLInputElement>,
    onChange: (file: File | null) => void,
  ) => {
    setSubmitError(null);
    setSuccessMessage(null);
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      return;
    }

    const validationMessage = getFileValidationMessage(file);
    if (validationMessage) {
      onChange(null);
      setError(field, { type: "manual", message: validationMessage });
      event.target.value = "";
      return;
    }

    clearErrors(field);
    onChange(file);
    setValue(removeField, false, { shouldDirty: true });
  };

  const removeImage = (
    field: "bannerImage" | "defaultImage",
    removeField: "removeBannerImage" | "removeDefaultImage",
    inputRef: React.RefObject<HTMLInputElement | null>,
    hasExistingImage: boolean,
  ) => {
    setSubmitError(null);
    setSuccessMessage(null);
    setValue(field, null, { shouldDirty: true, shouldValidate: true });
    setValue(removeField, hasExistingImage, { shouldDirty: true });
    clearErrors(field);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const saveBannerSlot = handleSubmit(async (values) => {
    setSubmitError(null);
    setSuccessMessage(null);

    const formData = new FormData();
    if (values.bannerImage) {
      formData.append("bannerImage", values.bannerImage);
    }
    if (values.defaultImage) {
      formData.append("defaultImage", values.defaultImage);
    }

    const hasBannerAfterSave = !values.removeBannerImage && (values.hasExistingBannerImage || values.bannerImage !== null);
    if (hasBannerAfterSave) {
      formData.append("startsAt", dayjs(values.startsAt).toISOString());
      if (!values.noExpiry) {
        formData.append("endsAt", dayjs(values.endsAt).toISOString());
      }
    }
    formData.append("noExpiry", String(values.noExpiry));
    formData.append("removeBannerImage", String(values.removeBannerImage));
    formData.append("removeDefaultImage", String(values.removeDefaultImage));

    try {
      const response = await api.patch<BannerSlotItem>(`/admin/ads/slots/${item.slot}`, formData, {
        headers: {
          "Content-Type": undefined,
        },
      });
      const nextItem = response.data;
      reset(createFormValues(nextItem));
      if (bannerFileInputRef.current) {
        bannerFileInputRef.current.value = "";
      }
      if (defaultFileInputRef.current) {
        defaultFileInputRef.current.value = "";
      }
      onSaved(nextItem);
      setSuccessMessage(`${metadata.label} 설정을 저장했습니다.`);
    } catch (error) {
      setSubmitError(getApiMessage(error, `${metadata.label} 설정을 저장하지 못했습니다.`));
    }
  });

  return (
    <article className="border border-slate-200 bg-white p-5">
      <div className="border-b border-slate-200 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-black text-slate-950">{metadata.label}</h2>
          <span className="rounded bg-slate-100 px-2 py-1 text-xs font-bold text-slate-500">{item.slot}</span>
        </div>
        <p className="mt-1 text-sm text-slate-500">{metadata.description}</p>
      </div>

      <form onSubmit={saveBannerSlot} className="mt-5 space-y-6">
        <section className="grid gap-5 lg:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.2fr)]">
          <div>
            <h3 className="text-sm font-bold text-slate-950">예약 배너 이미지</h3>
            <div className="mt-3">
              <ImagePreview imageUrl={bannerPreviewUrl} alt={`${metadata.label} 예약 이미지 미리보기`} className={metadata.previewClassName} />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor={`${item.slot}-banner-image`} className="mb-1.5 block text-sm font-semibold text-slate-700">
                이미지 업로드
              </label>
              <Controller
                name="bannerImage"
                control={control}
                render={({ field }) => (
                  <input
                    ref={(element) => {
                      field.ref(element);
                      bannerFileInputRef.current = element;
                    }}
                    id={`${item.slot}-banner-image`}
                    name={field.name}
                    type="file"
                    accept={acceptedImageTypes}
                    onBlur={field.onBlur}
                    onChange={(event) => selectImage("bannerImage", "removeBannerImage", event, field.onChange)}
                    className="input-style file:mr-3 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:py-1 file:text-sm file:font-semibold file:text-slate-700"
                  />
                )}
              />
              <p className="mt-1 text-xs text-slate-500">JPEG, PNG, WebP, GIF · 최대 2MB</p>
              {errors.bannerImage && <p className="mt-1 text-xs text-red-700">{errors.bannerImage.message}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor={`${item.slot}-starts-at`} className="mb-1.5 block text-sm font-semibold text-slate-700">
                  노출 시작 <span className="text-red-600">*</span>
                </label>
                <input
                  id={`${item.slot}-starts-at`}
                  type="datetime-local"
                  step={60}
                  disabled={watchedValues.removeBannerImage}
                  {...register("startsAt")}
                  className="input-style disabled:bg-slate-100 disabled:text-slate-400"
                />
                {errors.startsAt && <p className="mt-1 text-xs text-red-700">{errors.startsAt.message}</p>}
              </div>
              <div>
                <label htmlFor={`${item.slot}-ends-at`} className="mb-1.5 block text-sm font-semibold text-slate-700">
                  노출 종료 {!watchedValues.noExpiry && <span className="text-red-600">*</span>}
                </label>
                <input
                  id={`${item.slot}-ends-at`}
                  type="datetime-local"
                  step={60}
                  disabled={watchedValues.removeBannerImage || watchedValues.noExpiry}
                  {...register("endsAt")}
                  className="input-style disabled:bg-slate-100 disabled:text-slate-400"
                />
                {errors.endsAt && <p className="mt-1 text-xs text-red-700">{errors.endsAt.message}</p>}
              </div>
            </div>

            <div>
              <label className="flex w-fit items-center gap-2 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  {...register("noExpiry")}
                  className="h-4 w-4 accent-emerald-700"
                />
                기간 없음
              </label>
              <p className="mt-1 text-xs text-slate-500">체크하면 시작 일시부터 종료 없이 계속 노출됩니다.</p>
            </div>

            <button
              type="button"
              onClick={() => removeImage("bannerImage", "removeBannerImage", bannerFileInputRef, !!item.banner?.imageUrl)}
              disabled={!bannerPreviewUrl}
              className="rounded border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
            >
              예약 이미지 삭제
            </button>
            {watchedValues.removeBannerImage && (
              <p className="text-xs font-semibold text-red-700">저장하면 현재 예약 이미지와 노출 기간이 삭제됩니다.</p>
            )}
          </div>
        </section>

        <section className="grid gap-5 border-t border-slate-200 pt-6 lg:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.2fr)]">
          <div>
            <h3 className="text-sm font-bold text-slate-950">기본 이미지</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">예약 기간이 아니거나 기간이 지나면 표시됩니다.</p>
            <div className="mt-3">
              <ImagePreview imageUrl={defaultPreviewUrl} alt={`${metadata.label} 기본 이미지 미리보기`} className={metadata.previewClassName} />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor={`${item.slot}-default-image`} className="mb-1.5 block text-sm font-semibold text-slate-700">
                기본 이미지 업로드
              </label>
              <Controller
                name="defaultImage"
                control={control}
                render={({ field }) => (
                  <input
                    ref={(element) => {
                      field.ref(element);
                      defaultFileInputRef.current = element;
                    }}
                    id={`${item.slot}-default-image`}
                    name={field.name}
                    type="file"
                    accept={acceptedImageTypes}
                    onBlur={field.onBlur}
                    onChange={(event) => selectImage("defaultImage", "removeDefaultImage", event, field.onChange)}
                    className="input-style file:mr-3 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:py-1 file:text-sm file:font-semibold file:text-slate-700"
                  />
                )}
              />
              <p className="mt-1 text-xs text-slate-500">기본 이미지는 노출 기간을 설정하지 않습니다.</p>
              {errors.defaultImage && <p className="mt-1 text-xs text-red-700">{errors.defaultImage.message}</p>}
            </div>

            <button
              type="button"
              onClick={() => removeImage("defaultImage", "removeDefaultImage", defaultFileInputRef, !!item.defaultImageUrl)}
              disabled={!defaultPreviewUrl}
              className="rounded border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
            >
              기본 이미지 삭제
            </button>
            {watchedValues.removeDefaultImage && (
              <p className="text-xs font-semibold text-red-700">저장하면 현재 기본 이미지가 삭제됩니다.</p>
            )}
          </div>
        </section>

        {submitError && <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{submitError}</p>}
        {successMessage && <p role="status" className="rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{successMessage}</p>}

        <div className="flex justify-end border-t border-slate-200 pt-5">
          <button type="submit" disabled={isSubmitting || !hasChanges} className="button-primary w-auto min-w-28">
            {isSubmitting ? "저장 중" : "저장"}
          </button>
        </div>
      </form>
    </article>
  );
}

const createEmptySlot = (slot: AdSlotName): BannerSlotItem => ({
  slot,
  label: slotMetadata[slot].label,
  banner: null,
  defaultImageUrl: null,
});

export default function AdminAdsPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuthSession();
  const didRequestInitialData = useRef(false);
  const [items, setItems] = useState<BannerSlotItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const userIsSuperAdmin = isSuperAdminRole(user?.role);

  const loadSlots = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const response = await api.get<BannerSlotsResponse | BannerSlotItem[]>("/admin/ads/slots");
      const responseItems = Array.isArray(response.data) ? response.data : response.data.items;
      const itemBySlot = new Map(responseItems.map((item) => [item.slot, item]));
      setItems(adSlots.map((slot) => itemBySlot.get(slot) ?? createEmptySlot(slot)));
    } catch (error) {
      setItems([]);
      setLoadError(getApiMessage(error, "배너 관리 정보를 불러오지 못했습니다."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!user) {
      router.replace("/login?redirect=/admin/ads");
      return;
    }

    if (!userIsSuperAdmin) {
      router.replace("/");
      return;
    }

    if (didRequestInitialData.current) {
      return;
    }
    didRequestInitialData.current = true;
    void loadSlots();
  }, [isAuthLoading, loadSlots, router, user, userIsSuperAdmin]);

  const updateSlot = (nextItem: BannerSlotItem) => {
    setItems((currentItems) => currentItems.map((item) => (item.slot === nextItem.slot ? nextItem : item)));
  };

  if (isAuthLoading || !user || !userIsSuperAdmin) {
    return <div className="py-12 text-center text-sm text-slate-500">최고 관리자 권한을 확인하는 중입니다.</div>;
  }

  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200 pb-5">
        <p className="text-sm font-semibold text-emerald-700">최고 관리자 기능</p>
        <h1 className="mt-2 text-2xl font-black text-slate-950">배너 관리</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          짐슐랭의 각 광고 영역에 기간 배너와 기간이 없는 기본 이미지를 설정합니다.
        </p>
      </header>

      {isLoading ? (
        <p role="status" className="py-12 text-center text-sm text-slate-500">배너 관리 정보를 불러오는 중입니다.</p>
      ) : loadError ? (
        <div className="border border-red-200 bg-red-50 p-5 text-center">
          <p role="alert" className="text-sm text-red-700">{loadError}</p>
          <button type="button" onClick={() => void loadSlots()} className="button-secondary mt-4 w-auto">
            다시 불러오기
          </button>
        </div>
      ) : (
        <section aria-label="배너 목록" className="space-y-6">
          {items.map((item) => (
            <BannerSlotCard key={item.slot} item={item} onSaved={updateSlot} />
          ))}
        </section>
      )}
    </div>
  );
}
