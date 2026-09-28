// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  site: "https://siftdog.com",
  trailingSlash: "always",
  integrations: [sitemap()],
  // Code highlighting follows the light/dark theme (see .astro-code rules in style.css).
  markdown: {
    shikiConfig: { themes: { light: "github-light", dark: "github-dark" } },
  },
  // public/benchmark.html redirects the pre-Astro URL to /benchmark/ (Astro's `redirects` would
  // emit benchmark.html/index.html, which GitHub Pages doesn't serve for /benchmark.html).
});
