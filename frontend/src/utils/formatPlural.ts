import type { TFunction } from "i18next";

export function formatDaysOnStaff(
  createdAt: string,
  t: TFunction,
  lang: string,
): string {
  const date = new Date(createdAt);
  const diffInDays = Math.floor(
    (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffInDays <= 0) {
    return t("profile.onStaffZero");
  }

  if (lang.startsWith("ru")) {
    const mod10 = diffInDays % 10;
    const mod100 = diffInDays % 100;
    let word = t("profile.dayMany");
    if (mod100 < 11 || mod100 > 19) {
      if (mod10 === 1) word = t("profile.dayOne");
      else if (mod10 >= 2 && mod10 <= 4) word = t("profile.dayFew");
    }
    return t("profile.onStaff", { days: `${diffInDays} ${word}` });
  }

  const word = diffInDays === 1 ? t("profile.dayOne") : t("profile.dayMany");
  return t("profile.onStaff", { days: `${diffInDays} ${word}` });
}

export function formatPostsCount(
  count: number,
  t: TFunction,
  lang: string,
): string {
  if (lang.startsWith("ru")) {
    const mod10 = count % 10;
    const mod100 = count % 100;
    let word = t("profile.postMany");
    if (mod100 < 11 || mod100 > 19) {
      if (mod10 === 1) word = t("profile.postOne");
      else if (mod10 >= 2 && mod10 <= 4) word = t("profile.postFew");
    }
    return `${count} ${word}`;
  }
  const word = count === 1 ? t("profile.postOne") : t("profile.postMany");
  return `${count} ${word}`;
}

export function formatCommentsCount(
  count: number,
  t: TFunction,
  lang: string,
): string {
  if (lang.startsWith("ru")) {
    const mod10 = count % 10;
    const mod100 = count % 100;
    let word = t("profile.commentMany");
    if (mod100 < 11 || mod100 > 19) {
      if (mod10 === 1) word = t("profile.commentOne");
      else if (mod10 >= 2 && mod10 <= 4) word = t("profile.commentFew");
    }
    return `${count} ${word}`;
  }
  const word = count === 1 ? t("profile.commentOne") : t("profile.commentMany");
  return `${count} ${word}`;
}
