"use client";

// 최고 관리자가 관리자 계정을 조회하고 임명하는 화면이다.
import { zodResolver } from "@hookform/resolvers/zod";
import dayjs from "dayjs";
import isEqual from "lodash/isEqual";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Pagination from "@/components/common/Pagination";
import api from "@/lib/api";
import { isSuperAdminRole, useAuthSession } from "@/lib/auth-session";

type UserRole = "USER" | "ADMIN" | "SUPER_ADMIN";
type SearchType = "email" | "username";
type RoleFilter = "ALL" | "ADMIN" | "USER";

type AdminUserItem = {
  id: number;
  email: string;
  username: string;
  role: UserRole;
  adminExpiresAt: string | null;
};

type AdminUserListResponse = {
  items: AdminUserItem[];
  total: number;
  page: number;
  take: number;
  totalPages: number;
};

const ADMIN_USER_PAGE_SIZE = 10;
const defaultSearchValues = {
  searchType: "email" as SearchType,
  roleFilter: "ALL" as RoleFilter,
  keyword: "",
};

const searchSchema = z
  .object({
    searchType: z.enum(["email", "username"]),
    roleFilter: z.enum(["ALL", "ADMIN", "USER"]),
    keyword: z.string().trim().max(120, "검색어는 120자 이하로 입력해 주세요."),
  })
  .superRefine((values, context) => {
    if (values.searchType === "username" && values.keyword.length > 30) {
      context.addIssue({
        code: "custom",
        path: ["keyword"],
        message: "아이디 검색어는 30자 이하로 입력해 주세요.",
      });
    }
  });

const adminUserRowSchema = z
  .object({
    userId: z.number().int().positive(),
    role: z.enum(["USER", "ADMIN", "SUPER_ADMIN"]),
    adminExpiresAt: z.string(),
    noExpiry: z.boolean(),
  })
  .superRefine((row, context) => {
    if (row.role !== "ADMIN" || row.noExpiry) {
      return;
    }

    if (!row.adminExpiresAt || !dayjs(row.adminExpiresAt).isValid()) {
      context.addIssue({
        code: "custom",
        path: ["adminExpiresAt"],
        message: "관리자 권한 만료 일시를 입력해 주세요.",
      });
      return;
    }

    if (!dayjs(row.adminExpiresAt).isAfter(dayjs())) {
      context.addIssue({
        code: "custom",
        path: ["adminExpiresAt"],
        message: "관리자 권한 만료 일시는 현재보다 이후여야 합니다.",
      });
    }
  });

const roleFormSchema = z.object({
  users: z.array(adminUserRowSchema),
});

type SearchValues = z.infer<typeof searchSchema>;
type AdminUserRow = z.infer<typeof adminUserRowSchema>;
type RoleFormValues = z.infer<typeof roleFormSchema>;

const roleLabel: Record<UserRole, string> = {
  SUPER_ADMIN: "최고 관리자",
  ADMIN: "관리자",
  USER: "일반 회원",
};

const toRoleRow = (item: AdminUserItem): AdminUserRow => ({
  userId: item.id,
  role: item.role,
  adminExpiresAt: item.adminExpiresAt ? dayjs(item.adminExpiresAt).format("YYYY-MM-DDTHH:mm") : "",
  noExpiry: item.role === "ADMIN" && item.adminExpiresAt === null,
});

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

export default function AdminUsersPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuthSession();
  const userIsSuperAdmin = isSuperAdminRole(user?.role);
  const didRequestInitialData = useRef(false);
  const initialRowsRef = useRef<AdminUserRow[]>([]);
  const [items, setItems] = useState<AdminUserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [appliedFilters, setAppliedFilters] = useState<SearchValues>(defaultSearchValues);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isListLoading, setIsListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const searchForm = useForm<SearchValues>({
    resolver: zodResolver(searchSchema),
    defaultValues: defaultSearchValues,
  });
  const roleForm = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: { users: [] },
  });
  const watchedRows = roleForm.watch("users") ?? [];

  const loadUsers = useCallback(
    async (filters: SearchValues, page = 1, showLoading = true) => {
      if (showLoading) {
        setIsListLoading(true);
      }
      setListError(null);
      setSaveMessage(null);
      setSaveError(null);

      try {
        const response = await api.get<AdminUserListResponse>("/admin/users", {
          params: {
            searchType: filters.searchType,
            roleFilter: filters.roleFilter,
            keyword: filters.keyword.trim(),
            page,
            take: ADMIN_USER_PAGE_SIZE,
          },
        });
        const rows = response.data.items.map(toRoleRow);

        setItems(response.data.items);
        setTotal(response.data.total);
        setCurrentPage(response.data.page);
        setTotalPages(Math.max(response.data.totalPages, 1));
        setAppliedFilters(filters);
        initialRowsRef.current = rows;
        roleForm.reset({ users: rows });
      } catch (error) {
        setItems([]);
        setTotal(0);
        setListError(getApiMessage(error, "회원 목록을 불러오지 못했습니다."));
      } finally {
        if (showLoading) {
          setIsListLoading(false);
        }
      }
    },
    [roleForm],
  );

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!user) {
      router.replace("/login?redirect=/admin/users");
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

    const loadInitialData = async () => {
      setIsInitialLoading(true);
      await loadUsers(defaultSearchValues, 1);
      setIsInitialLoading(false);
    };

    void loadInitialData();
  }, [isAuthLoading, loadUsers, router, user, userIsSuperAdmin]);

  if (isAuthLoading || !user || !userIsSuperAdmin) {
    return <div className="py-12 text-center text-sm text-slate-500">최고 관리자 권한을 확인하는 중입니다.</div>;
  }

  const submitSearch = searchForm.handleSubmit((values) => {
    if (roleForm.formState.isDirty) {
      setSaveError("현재 페이지의 변경 사항을 저장하거나 취소한 후 조회해 주세요.");
      return;
    }

    void loadUsers(values, 1);
  });

  const changePage = (page: number) => {
    if (roleForm.formState.isDirty) {
      setSaveError("현재 페이지의 변경 사항을 저장하거나 취소한 후 이동해 주세요.");
      return;
    }

    void loadUsers(appliedFilters, page);
  };

  const cancelRoleChanges = () => {
    roleForm.reset({ users: initialRowsRef.current });
    setSaveError(null);
    setSaveMessage("현재 페이지의 변경 사항을 취소했습니다.");
  };

  const saveRoles = roleForm.handleSubmit(async (values) => {
    setSaveMessage(null);
    setSaveError(null);

    const updates = values.users.flatMap((row) => {
      const item = items.find((candidate) => candidate.id === row.userId);
      const original = initialRowsRef.current.find((candidate) => candidate.userId === row.userId);

      if (!item || !original || item.role === "SUPER_ADMIN" || isEqual(row, original)) {
        return [];
      }

      return [
        {
          userId: row.userId,
          role: row.role,
          adminExpiresAt:
            row.role === "ADMIN" && !row.noExpiry ? dayjs(row.adminExpiresAt).toISOString() : null,
        },
      ];
    });

    if (updates.length === 0) {
      setSaveMessage("변경된 회원 권한이 없습니다.");
      return;
    }

    try {
      await api.patch("/admin/users/roles", { updates });
      await loadUsers(appliedFilters, currentPage, false);
      setSaveMessage("회원 권한을 저장했습니다.");
    } catch (error) {
      setSaveError(getApiMessage(error, "회원 권한을 저장하지 못했습니다."));
    }
  });

  return (
    <div className="space-y-7">
      <header className="border-b border-slate-200 pb-4">
        <p className="text-sm font-semibold text-rose-700">최고 관리자 기능</p>
        <h1 className="mt-2 text-2xl font-black text-slate-950">관리자 임명</h1>
        <p className="mt-2 text-sm text-slate-600">회원별 관리자 권한과 만료 일시를 설정합니다.</p>
      </header>

      <form onSubmit={submitSearch} className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-4 md:grid-cols-[140px_140px_minmax(220px,1fr)_auto]">
        <label className="grid gap-1 text-xs font-semibold text-slate-600">
          검색 조건
          <select {...searchForm.register("searchType")} className="h-10 rounded border border-slate-300 bg-white px-3 text-sm text-slate-800">
            <option value="email">이메일</option>
            <option value="username">아이디</option>
          </select>
        </label>
        <label className="grid gap-1 text-xs font-semibold text-slate-600">
          현재 권한
          <select {...searchForm.register("roleFilter")} className="h-10 rounded border border-slate-300 bg-white px-3 text-sm text-slate-800">
            <option value="ALL">전체</option>
            <option value="ADMIN">ADMIN</option>
            <option value="USER">USER</option>
          </select>
        </label>
        <label className="grid gap-1 text-xs font-semibold text-slate-600">
          검색어
          <input
            {...searchForm.register("keyword")}
            placeholder="검색어를 입력해 주세요"
            className="h-10 rounded border border-slate-300 bg-white px-3 text-sm outline-none focus:border-emerald-500"
          />
        </label>
        <button
          type="submit"
          disabled={isListLoading}
          className="mt-auto h-10 rounded bg-slate-950 px-5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          조회
        </button>
        {searchForm.formState.errors.keyword?.message && (
          <p role="alert" className="text-xs text-red-700 md:col-span-4">
            {searchForm.formState.errors.keyword.message}
          </p>
        )}
      </form>

      <section aria-labelledby="admin-user-list-title" className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 id="admin-user-list-title" className="text-lg font-bold text-slate-950">회원 목록</h2>
          <span className="text-sm text-slate-500">총 {total.toLocaleString()}명</span>
        </div>

        {listError && <p role="alert" className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{listError}</p>}
        {saveError && <p role="alert" className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{saveError}</p>}
        {saveMessage && <p role="status" className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{saveMessage}</p>}

        <form onSubmit={saveRoles} className="space-y-5">
          <div className="w-full max-w-full overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[1180px] border-collapse whitespace-nowrap bg-white text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="min-w-64 whitespace-nowrap px-4 py-3">이메일</th>
                  <th className="min-w-36 whitespace-nowrap px-4 py-3">아이디</th>
                  <th className="min-w-36 whitespace-nowrap px-4 py-3">현재 권한</th>
                  <th className="min-w-40 whitespace-nowrap px-4 py-3">권한</th>
                  <th className="min-w-64 whitespace-nowrap px-4 py-3">기간</th>
                  <th className="min-w-28 whitespace-nowrap px-4 py-3 text-center">기간 없음</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isInitialLoading || isListLoading ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-500">회원 목록을 불러오는 중입니다.</td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-500">검색 조건에 맞는 회원이 없습니다.</td></tr>
                ) : (
                  items.map((item, index) => {
                    const selectedRole = watchedRows[index]?.role ?? item.role;
                    const hasNoExpiry = watchedRows[index]?.noExpiry ?? false;
                    const roleRegistration = roleForm.register(`users.${index}.role`);

                    return (
                      <tr key={item.id} className="whitespace-nowrap align-top text-slate-700">
                        <td className="whitespace-nowrap px-4 py-4 font-medium text-slate-950">{item.email}</td>
                        <td className="whitespace-nowrap px-4 py-4">{item.username}</td>
                        <td className="whitespace-nowrap px-4 py-4">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                            item.role === "SUPER_ADMIN"
                              ? "bg-rose-100 text-rose-700"
                              : item.role === "ADMIN"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-100 text-slate-600"
                          }`}>
                            {roleLabel[item.role]}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-4">
                          <input type="hidden" {...roleForm.register(`users.${index}.userId`, { valueAsNumber: true })} />
                          <select
                            {...roleRegistration}
                            disabled={item.role === "SUPER_ADMIN" || roleForm.formState.isSubmitting}
                            onChange={(event) => {
                              void roleRegistration.onChange(event);
                              const nextRole = event.target.value as UserRole;

                              if (nextRole === "USER") {
                                roleForm.setValue(`users.${index}.adminExpiresAt`, "", { shouldDirty: true });
                                roleForm.setValue(`users.${index}.noExpiry`, false, { shouldDirty: true });
                              }
                            }}
                            className="h-10 min-w-32 rounded border border-slate-300 bg-white px-3 disabled:bg-slate-100"
                          >
                            {item.role === "SUPER_ADMIN" && <option value="SUPER_ADMIN">SUPER_ADMIN</option>}
                            {item.role !== "SUPER_ADMIN" && (
                              <>
                                <option value="ADMIN">ADMIN</option>
                                <option value="USER">USER</option>
                              </>
                            )}
                          </select>
                        </td>
                        <td className="whitespace-nowrap px-4 py-4">
                          {selectedRole === "ADMIN" ? (
                            <div>
                              <input
                                type="datetime-local"
                                step={60}
                                disabled={hasNoExpiry || roleForm.formState.isSubmitting}
                                {...roleForm.register(`users.${index}.adminExpiresAt`)}
                                className="h-10 min-w-52 rounded border border-slate-300 px-3 disabled:bg-slate-100"
                              />
                              {roleForm.formState.errors.users?.[index]?.adminExpiresAt?.message && (
                                <p role="alert" className="mt-1 text-xs text-red-700">
                                  {roleForm.formState.errors.users[index]?.adminExpiresAt?.message}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-center">
                          {selectedRole === "ADMIN" ? (
                            <input
                              type="checkbox"
                              aria-label={`${item.username} 관리자 기간 없음`}
                              disabled={roleForm.formState.isSubmitting}
                              {...roleForm.register(`users.${index}.noExpiry`)}
                              className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
                            />
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              disabled={isListLoading || roleForm.formState.isSubmitting}
              ariaLabel="회원 목록 페이지"
              onPageChange={changePage}
            />
            <div className="flex items-center gap-2">
              {roleForm.formState.isDirty && (
                <button
                  type="button"
                  onClick={cancelRoleChanges}
                  disabled={roleForm.formState.isSubmitting}
                  className="rounded border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  변경 취소
                </button>
              )}
              <button
                type="submit"
                disabled={items.length === 0 || isListLoading || roleForm.formState.isSubmitting}
                className="rounded bg-slate-950 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {roleForm.formState.isSubmitting ? "저장 중" : "저장"}
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}
