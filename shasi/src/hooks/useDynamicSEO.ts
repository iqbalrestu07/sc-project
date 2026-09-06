import { useEffect } from "react";

interface SEOData {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
}

/**
 * Updates the browser's meta tags dynamically for SEO and browser tabs.
 */
export function useDynamicSEO({ title, description, image, url }: SEOData) {
  useEffect(() => {
    if (title) {
      document.title = title;
      updateMeta("og:title", title, "property");
      updateMeta("twitter:title", title, "name");
    }
    
    if (description) {
      updateMeta("description", description, "name");
      updateMeta("og:description", description, "property");
      updateMeta("twitter:description", description, "name");
    }
    
    if (image) {
      updateMeta("og:image", image, "property");
      updateMeta("twitter:image", image, "name");
    }

    if (url) {
      updateMeta("og:url", url, "property");
    }
  }, [title, description, image, url]);
}

function updateMeta(nameOrProperty: string, content: string, type: "name" | "property") {
  let meta = document.querySelector(`meta[${type}="${nameOrProperty}"]`);
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute(type, nameOrProperty);
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", content);
}
