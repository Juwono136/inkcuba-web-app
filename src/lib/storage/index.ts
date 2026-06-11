export {
  uploadObject,
  fetchObject,
  deleteObject,
  sanitizeFileName,
  buildStorageKey,
  checkStorageHealth,
  ensureStorageBucket,
} from "@/lib/storage/client";
export {
  uploadAvatarToStorage,
  validateAvatarUpload,
  deleteRegisterAvatar,
  isRegisterAvatarKey,
  sanitizeEmailForStorageKey,
  type AvatarUploadInput,
} from "@/lib/storage/avatar";
export {
  ALLOWED_IMAGE_MIME_TYPES,
  ALLOWED_DOCUMENT_MIME_TYPES,
  MAX_IMAGE_SIZE_BYTES,
  MAX_POSTER_SIZE_BYTES,
  MAX_DOCUMENT_SIZE_BYTES,
  type UploadResult,
  type StorageHealthResult,
  type StorageAuthMode,
} from "@/lib/storage/types";
