import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // The app hydrates client state (cart, wishlist, locale, auth) from
      // localStorage inside useEffect — the SSR-safe idiom, since localStorage
      // is unavailable during server render. Next 16's set-state-in-effect rule
      // flags this deliberate pattern, so we surface it as a warning rather than
      // a build/lint error. Real cascading-render mistakes still show up.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
