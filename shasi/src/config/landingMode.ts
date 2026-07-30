/**
 * Landing page mode configuration.
 *
 * Set via env variable VITE_LANDING_MODE in .env:
 *   - "2d"     : orbit-only 3D di Hero (default, ringan — tanpa model GLB)
 *   - "hero3d" : 3D full di Hero section (crystal model + orbit + particles)
 *   - "full3d" : 3D untuk semua section (single canvas scroll-journey, berat)
 *
 * Jika env variable tidak di-set, default ke "2d".
 */
export type LandingMode = "hero3d" | "full3d" | "2d";

export function getLandingMode(): LandingMode {
  const mode = import.meta.env.VITE_LANDING_MODE as string | undefined;
  if (mode === "full3d" || mode === "hero3d" || mode === "2d") {
    return mode;
  }
  return "2d";
}
