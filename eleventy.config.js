/**
 * Eleventy configuration — 李飚 / Li Biao portfolio
 * Content lives in src/about.md and src/projects/*.md; everything else is
 * presentation and can be replaced without touching the content.
 */

const CATEGORIES = {
  built: { zh: "建成与装置", en: "Built & Installation" },
  tool: { zh: "数字工具", en: "Digital Tools" },
  research: { zh: "研究", en: "Research" }
};

import MarkdownIt from "markdown-it";

const markdown = new MarkdownIt({ html: true, linkify: false, typographer: false });

const get = (obj, path) =>
  path.split(".").reduce((value, key) => (value == null ? value : value[key]), obj);

export default function (eleventyConfig) {
  /* -- static files ------------------------------------------------------ */
  eleventyConfig.addPassthroughCopy({ public: "/" });
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });

  /* -- categories (shared by templates and filters) ---------------------- */
  eleventyConfig.addGlobalData("categories", CATEGORIES);

  /* -- projects collection, newest first -------------------------------- */
  eleventyConfig.addCollection("projects", (collectionApi) =>
    collectionApi
      .getFilteredByGlob("src/projects/*.md")
      .sort((a, b) => (a.data.order || 0) - (b.data.order || 0))
  );

  /* -- filters ----------------------------------------------------------- */
  eleventyConfig.addFilter("md", (content) => markdown.render(String(content || "")));

  eleventyConfig.addFilter("pad2", (value) => String(value).padStart(2, "0"));

  eleventyConfig.addFilter("countBy", (items, path, value) =>
    (items || []).filter((item) => get(item, path) === value).length
  );

  eleventyConfig.addFilter("metaLine", (item, lang) => {
    const data = item.data || item;
    const category = CATEGORIES[data.category];
    return [
      data.year,
      lang === "zh" ? data.location : data.locationEn,
      category ? category[lang] : ""
    ]
      .filter(Boolean)
      .join(" · ");
  });

  eleventyConfig.addFilter("neighbors", (url, items) => {
    const index = items.findIndex((item) => item.url === url);
    return {
      prev: index > 0 ? items[index - 1] : null,
      next: index > -1 && index < items.length - 1 ? items[index + 1] : null,
      index: index + 1,
      total: items.length
    };
  });

  /* -- engine ------------------------------------------------------------ */
  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data"
    },
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
    templateFormats: ["md", "njk", "html"]
  };
}
