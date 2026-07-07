import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/checkout", "/cart", "/wishlist"] },
    sitemap: "https://loov.ge/sitemap.xml",
  };
}
