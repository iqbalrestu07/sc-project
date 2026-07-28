import { useEffect } from "react";

const DEFAULT_FAVICON = "/favicon.png";

/**
 * Updates the browser tab icon (<link rel="icon">) at runtime.
 * Pass the organization's favicon_url; when empty/undefined the bundled
 * default favicon.png is used instead.
 *
 * Safe to call from any component — it creates/updates the <link> tag in
 * <head> and cleans up only the tag it owns.
 */
export function useDynamicFavicon(faviconUrl?: string | null) {
  useEffect(() => {
    const href = faviconUrl || DEFAULT_FAVICON;
    let link = document.querySelector<HTMLLinkElement>("link[rel='icon'][data-dynamic]");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      link.setAttribute("data-dynamic", "true");
      document.head.appendChild(link);
    }
    link.href = href;
    // Prefer SVG type when the default is used; let the browser sniff otherwise.
    link.type = href.endsWith(".ico") ? "image/x-icon" : "image/png";
  }, [faviconUrl]);
}
