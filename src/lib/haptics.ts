export type HapticType = "light" | "medium" | "success" | "warning";

// Short, subtle vibration patterns tuned per intent. Roughly ordered by weight.
const PATTERNS: Record<HapticType, number[]> = {
  light: [10],
  medium: [20],
  success: [15, 40, 20],
  warning: [40, 60, 40],
};

/**
 * Fire a safe haptic pulse when the device supports the Vibration API.
 *
 * Degrades silently: unsupported browsers (desktop, iOS Safari) and any
 * thrown error are swallowed so callers never have to guard for it.
 */
export function triggerHaptic(type: HapticType = "light"): void {
  try {
    if (
      typeof window === "undefined" ||
      typeof navigator === "undefined" ||
      typeof navigator.vibrate !== "function"
    ) {
      return;
    }
    navigator.vibrate(PATTERNS[type]);
  } catch {
    /* Vibration API unavailable or blocked — ignore. */
  }
}
