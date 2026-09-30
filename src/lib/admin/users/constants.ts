/** Soft-deleted users are retained this long before automatic hard delete. */
export const USER_SOFT_DELETE_RETENTION_DAYS = 30;

export const USER_LIST_DEFAULT_PAGE_SIZE = 20;
export const USER_LIST_MAX_PAGE_SIZE = 100;

export const USER_SORT_FIELDS = [
  "name",
  "email",
  "role",
  "createdAt",
  "lastLoginAt",
  "isActive",
] as const;

export type UserSortField = (typeof USER_SORT_FIELDS)[number];
