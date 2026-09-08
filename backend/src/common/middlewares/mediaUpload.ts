import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { BadRequestError } from "../errors/appError.js";

const uploadDir = path.resolve(process.cwd(), "uploads", "posts");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${Date.now()}-${crypto.randomUUID()}${ext}`;
    cb(null, uniqueName);
  },
});

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

export const mediaUpload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 10,
  },
  fileFilter: (_req, file, cb) => {
    if (allowedMimeTypes.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new BadRequestError(
          `Unsupported file type: ${file.mimetype}. Allowed: images (JPG, PNG, WebP, GIF, AVIF) and videos (MP4, WebM, QuickTime)`,
        ),
      );
    }
  },
});

export const getMediaType = (
  mimeType: string,
  filename: string,
): "image" | "video" | "gif" => {
  if (mimeType === "image/gif" || filename.toLowerCase().endsWith(".gif")) {
    return "gif";
  }
  if (mimeType.startsWith("video/")) {
    return "video";
  }
  return "image";
};
