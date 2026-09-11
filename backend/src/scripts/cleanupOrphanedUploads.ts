import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "../db/prisma.js";

const UPLOADS_ROOT = path.resolve(process.cwd(), "uploads");

interface ScanResult {
  category: string;
  totalFiles: number;
  activeCount: number;
  orphanedFiles: { name: string; fullPath: string; sizeBytes: number }[];
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function extractFilename(url: string | null | undefined): string | null {
  if (!url) return null;
  const parts = url.split("/");
  return parts[parts.length - 1] || null;
}

async function scanFolder(
  subfolder: string,
  activeFilenames: Set<string>,
): Promise<ScanResult> {
  const dirPath = path.join(UPLOADS_ROOT, subfolder);
  const result: ScanResult = {
    category: subfolder,
    totalFiles: 0,
    activeCount: 0,
    orphanedFiles: [],
  };

  let entries: string[];
  try {
    entries = await fs.readdir(dirPath);
  } catch (err: unknown) {
    const error = err as NodeJS.ErrnoException;
    if (error.code === "ENOENT") {
      return result; // Folder doesn't exist yet, skip
    }
    throw err;
  }

  for (const filename of entries) {
    const fullPath = path.join(dirPath, filename);
    const stat = await fs.stat(fullPath);
    if (!stat.isFile()) continue;

    result.totalFiles++;
    if (activeFilenames.has(filename)) {
      result.activeCount++;
    } else {
      result.orphanedFiles.push({
        name: filename,
        fullPath,
        sizeBytes: stat.size,
      });
    }
  }

  return result;
}

async function main() {
  const isConfirmed =
    process.argv.includes("--confirm") || process.argv.includes("--delete");
  const avatarsOnly = process.argv.includes("--avatars-only");

  console.log("\n==================================================");
  console.log(" 🧹 STAFF UPLOAD CLEANUP TOOL");
  console.log("==================================================");
  console.log(
    `Mode: ${isConfirmed ? "🚨 PERMANENT DELETE" : "🔍 DRY RUN (Preview only)"}`,
  );
  if (!isConfirmed) {
    console.log(
      "Tip: Run with '--confirm' or '--delete' to permanently remove orphaned files.\n",
    );
  }

  try {
    // 1. Collect active user avatars & banners
    const users = await prisma.user.findMany({
      select: { avatarUrl: true, bannerUrl: true },
    });

    const activeUserAvatars = new Set<string>();
    const activeUserBanners = new Set<string>();

    for (const u of users) {
      const avatarFile = extractFilename(u.avatarUrl);
      if (avatarFile) activeUserAvatars.add(avatarFile);

      const bannerFile = extractFilename(u.bannerUrl);
      if (bannerFile) activeUserBanners.add(bannerFile);
    }

    // 2. Collect active community avatars & banners
    const communities = await prisma.community.findMany({
      select: { avatarUrl: true, bannerUrl: true },
    });

    const activeCommAvatars = new Set<string>();
    const activeCommBanners = new Set<string>();

    for (const c of communities) {
      const avatarFile = extractFilename(c.avatarUrl);
      if (avatarFile) activeCommAvatars.add(avatarFile);

      const bannerFile = extractFilename(c.bannerUrl);
      if (bannerFile) activeCommBanners.add(bannerFile);
    }

    // 3. Scan categories
    const categoriesToScan: { folder: string; activeSet: Set<string> }[] = [
      { folder: "avatars", activeSet: activeUserAvatars },
    ];

    if (!avatarsOnly) {
      categoriesToScan.push(
        { folder: "banners", activeSet: activeUserBanners },
        { folder: "community-avatars", activeSet: activeCommAvatars },
        { folder: "community-banners", activeSet: activeCommBanners },
      );
    }

    let totalOrphanedCount = 0;
    let totalOrphanedBytes = 0;

    for (const cat of categoriesToScan) {
      const scan = await scanFolder(cat.folder, cat.activeSet);
      console.log(`📁 uploads/${cat.folder}:`);
      console.log(`   Total files:   ${scan.totalFiles}`);
      console.log(`   Active files:  ${scan.activeCount}`);
      console.log(`   Orphaned:      ${scan.orphanedFiles.length}`);

      if (scan.orphanedFiles.length > 0) {
        const catBytes = scan.orphanedFiles.reduce(
          (acc, f) => acc + f.sizeBytes,
          0,
        );
        console.log(`   Wasted space:  ${formatBytes(catBytes)}`);

        if (isConfirmed) {
          for (const file of scan.orphanedFiles) {
            await fs.unlink(file.fullPath);
          }
          console.log(
            `   ✅ Deleted ${scan.orphanedFiles.length} orphaned files.`,
          );
        } else {
          console.log(`   Sample orphaned files:`);
          for (const file of scan.orphanedFiles.slice(0, 5)) {
            console.log(`     - ${file.name} (${formatBytes(file.sizeBytes)})`);
          }
          if (scan.orphanedFiles.length > 5) {
            console.log(`     ... and ${scan.orphanedFiles.length - 5} more.`);
          }
        }
      }
      console.log("");

      totalOrphanedCount += scan.orphanedFiles.length;
      totalOrphanedBytes += scan.orphanedFiles.reduce(
        (acc, f) => acc + f.sizeBytes,
        0,
      );
    }

    console.log("--------------------------------------------------");
    console.log(`Total orphaned files found: ${totalOrphanedCount}`);
    console.log(
      `Total disk space to free:   ${formatBytes(totalOrphanedBytes)}`,
    );
    if (isConfirmed) {
      console.log("🎉 Cleanup completed successfully!");
    } else {
      console.log("ℹ️  No files were deleted (dry run).");
      console.log("   To perform actual deletion, run:");
      console.log("   pnpm --filter @staff/backend cleanup:uploads --confirm");
    }
    console.log("==================================================\n");
  } catch (error) {
    console.error("Cleanup error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
