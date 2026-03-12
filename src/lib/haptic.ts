/**
 * Haptic feedback via Web Vibration API.
 * No-ops silently on unsupported devices (iOS Safari, desktop).
 */
export function haptic(type: "light" | "medium" | "success" | "error" = "light") {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  const patterns: Record<string, number | number[]> = {
    light: 8,
    medium: 18,
    success: [8, 60, 8],
    error: [20, 40, 20],
  };
  navigator.vibrate(patterns[type]);
}
