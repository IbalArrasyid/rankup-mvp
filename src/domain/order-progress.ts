export function getOrderProgress(
  initialAbsoluteStar: number,
  progressAbsoluteStar: number,
  targetAbsoluteStar: number,
) {
  const totalStars = targetAbsoluteStar - initialAbsoluteStar;
  const safeProgress = Math.min(targetAbsoluteStar, Math.max(initialAbsoluteStar, progressAbsoluteStar));
  const completedStars = safeProgress - initialAbsoluteStar;

  return {
    totalStars,
    completedStars,
    remainingStars: totalStars - completedStars,
    percent: totalStars === 0 ? 0 : Math.round((completedStars / totalStars) * 100),
  };
}
