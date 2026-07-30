import { useEffect, useState } from "react";

interface DeviceCapability {
  /** Whether the device is powerful enough for 3D rendering (Three.js). */
  supports3D: boolean;
  /** Whether the device is mobile (touch + small screen). */
  isMobile: boolean;
  /** Whether the user prefers reduced motion (accessibility). */
  prefersReducedMotion: boolean;
}

/**
 * Detects the device's capability to render 3D scenes smoothly.
 * Used by the landing page to decide whether to load Three.js or
 * fall back to the 2D hero.
 *
 * Heuristics:
 * - `prefers-reduced-motion` → disable 3D (accessibility)
 * - `navigator.hardwareConcurrency` < 4 → likely low-end, disable 3D
 * - WebGL context creation failure → disable 3D
 * - Mobile + low RAM (`navigator.deviceMemory` < 4) → disable 3D
 */
export function useDeviceCapability(): DeviceCapability {
  const [capability, setCapability] = useState<DeviceCapability>({
    supports3D: true,
    isMobile: false,
    prefersReducedMotion: false,
  });

  useEffect(() => {
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) || window.innerWidth < 768;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const cores = navigator.hardwareConcurrency ?? 4;
    // @ts-expect-error — deviceMemory is non-standard but available on Chrome Android
    const memory: number = navigator.deviceMemory ?? 4;

    // WebGL availability check
    let hasWebGL = true;
    try {
      const canvas = document.createElement("canvas");
      const gl =
        canvas.getContext("webgl2") ||
        canvas.getContext("webgl") ||
        canvas.getContext("experimental-webgl");
      hasWebGL = !!gl;
    } catch {
      hasWebGL = false;
    }

    // Disable 3D when any of these conditions are met:
    // - reduced motion preference
    // - no WebGL support
    // - very low core count (< 4)
    // - mobile + low memory (< 4 GB)
    const supports3D =
      !prefersReducedMotion &&
      hasWebGL &&
      cores >= 4 &&
      !(isMobile && memory < 4);

    setCapability({ supports3D, isMobile, prefersReducedMotion });
  }, []);

  return capability;
}
