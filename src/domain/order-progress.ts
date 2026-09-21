import { getProgressionIndex } from "@/domain/rank";

export function getOrderProgress(
  initialAbsoluteStar: number,
  progressAbsoluteStar: number,
  targetAbsoluteStar: number,
) {
  const initialIndex = getProgressionIndex(initialAbsoluteStar);
  const progressIndex = getProgressionIndex(progressAbsoluteStar);
  const targetIndex = getProgressionIndex(targetAbsoluteStar);
  if (initialIndex === null || progressIndex === null || targetIndex === null) {
    return { totalStars: 0, completedStars: 0, remainingStars: 0, percent: 0 };
  }
  const totalStars = targetIndex - initialIndex;
  const safeProgressIndex = Math.min(targetIndex, Math.max(initialIndex, progressIndex));
  const completedStars = safeProgressIndex - initialIndex;

  return {
    totalStars,
    completedStars,
    remainingStars: totalStars - completedStars,
    percent: totalStars === 0 ? 0 : Math.round((completedStars / totalStars) * 100),
  };
}
