import { absoluteUrl } from "@/shared/siteConfig";

export default function sitemap() {
  return [
    {
      url: absoluteUrl("/"),
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
  ];
}
