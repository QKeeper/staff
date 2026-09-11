import fs from "node:fs/promises";
import path from "node:path";

const UPLOADS_ROOT = path.resolve(process.cwd(), "uploads");

/**
 * Safely deletes a previously uploaded local file from the disk.
 *
 * Checks that:
 * 1. The URL points to a local upload path (/api/uploads/... or /uploads/...).
 * 2. The resolved path strictly resides within the project's uploads directory
 *    (preventing path traversal).
 *
 * Silently ignores errors if the file does not exist.
 */
export async function deleteLocalUpload(
  fileUrl?: string | null,
): Promise<void> {
  if (!fileUrl || typeof fileUrl !== "string") {
    return;
  }

  let relativePath: string | null = null;
  if (fileUrl.startsWith("/api/uploads/")) {
    relativePath = fileUrl.slice("/api/uploads/".length);
  } else if (fileUrl.startsWith("/uploads/")) {
    relativePath = fileUrl.slice("/uploads/".length);
  }

  if (!relativePath) {
    return;
  }

  // Prevent directory traversal attacks
  const targetPath = path.resolve(UPLOADS_ROOT, relativePath);
  const normalizedUploadsRoot = path.normalize(UPLOADS_ROOT) + path.sep;
  const normalizedTargetPath = path.normalize(targetPath);

  if (!normalizedTargetPath.startsWith(normalizedUploadsRoot)) {
    return;
  }

  try {
    await fs.unlink(normalizedTargetPath);
  } catch (err: unknown) {
    const error = err as NodeJS.ErrnoException;
    if (error.code !== "ENOENT") {
      console.error(
        `Failed to delete local upload file: ${normalizedTargetPath}`,
        error,
      );
    }
  }
}
