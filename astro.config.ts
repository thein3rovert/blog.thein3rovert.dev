import fs from "node:fs";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwind from "@tailwindcss/vite";
import expressiveCode from "astro-expressive-code";
import icon from "astro-icon";
import robotsTxt from "astro-robots-txt";
import webmanifest from "astro-webmanifest";
import { defineConfig, envField } from "astro/config";
import { expressiveCodeOptions } from "./src/site.config";
import { siteConfig } from "./src/site.config";

// Remark plugins
import remarkDirective from "remark-directive"; /* Handle ::: directives as nodes */
import { remarkAdmonitions } from "./src/plugins/remark-admonitions"; /* Add admonitions */
import { remarkReadingTime } from "./src/plugins/remark-reading-time";

// Rehype plugins
import { rehypeHeadingIds } from "@astrojs/markdown-remark";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeExternalLinks from "rehype-external-links";
import rehypeUnwrapImages from "rehype-unwrap-images";

// https://astro.build/config
export default defineConfig({
  site: siteConfig.url,
  image: {
    domains: ["webmention.io"],
  },
  integrations: [
    expressiveCode(expressiveCodeOptions),
    icon(),
    sitemap(),
    mdx(),
    robotsTxt(),
    webmanifest({
      // This section defines the web app manifest configuration for the site
      name: siteConfig.title, // The name of the web application
      short_name: "thein3rovert_blog", // An optional abbreviated name for the web app
      description: siteConfig.description, // A brief description of the web application
      lang: siteConfig.lang, // The default language of the web application
      icon: "public/icon.svg", // The source icon file for generating favicon & icons

      // TODO: Need to understand where its getting the icons from
      icons: [
        {
          src: "icons/apple-touch-icon.png", // Icon used in src/components/BaseHead.astro L:26
          sizes: "180x180", // Icon dimensions
          type: "image/png", // MIME type of the icon
        },
        {
          src: "icons/icon-192.png", // Icon file path for 192x192 size
          sizes: "192x192", // Icon dimensions
          type: "image/png", // MIME type of the icon
        },
        {
          src: "icons/icon-512.png", // Icon file path for 512x512 size
          sizes: "512x512", // Icon dimensions
          type: "image/png", // MIME type of the icon
        },
      ],
      start_url: "/", // The URL that loads when the web app is launched
      background_color: "#1d1f21", // Background color used on the launch screen
      theme_color: "#2bbc8a", // Default theme color of the application
      display: "standalone", // Display mode of the web application
      config: {
        insertFaviconLinks: false, // Configuration to not insert favicon links
        insertThemeColorMeta: false, // Configuration to not insert meta theme color
        insertManifestLink: false, // Configuration to not insert manifest link
      },
    }),
  ],
  markdown: {
    rehypePlugins: [
      rehypeHeadingIds,
      [rehypeAutolinkHeadings, { behavior: "wrap", properties: { className: ["not-prose"] } }],
      [
        rehypeExternalLinks,
        {
          rel: ["noreferrer", "noopener"],
          target: "_blank",
        },
      ],
      rehypeUnwrapImages,
    ],
    remarkPlugins: [remarkReadingTime, remarkDirective, remarkAdmonitions],
    remarkRehype: {
      footnoteLabelProperties: {
        className: [""],
      },
    },
  },
  // https://docs.astro.build/en/guides/prefetch/
  prefetch: true,
  vite: {
    optimizeDeps: {
      exclude: ["@resvg/resvg-js"],
    },
    plugins: [tailwind(), rawFonts([".ttf", ".woff"])],
  },
  env: {
    schema: {
      WEBMENTION_API_KEY: envField.string({ context: "server", access: "secret", optional: true }),
      WEBMENTION_URL: envField.string({ context: "client", access: "public", optional: true }),
      WEBMENTION_PINGBACK: envField.string({ context: "client", access: "public", optional: true }),
    },
  },
});

function rawFonts(ext: string[]) {
  return {
    name: "vite-plugin-raw-fonts",
    // @ts-expect-error:next-line
    transform(_, id) {
      if (ext.some((e) => id.endsWith(e))) {
        const buffer = fs.readFileSync(id);
        return {
          code: `export default ${JSON.stringify(buffer)}`,
          map: null,
        };
      }
    },
  };
}
