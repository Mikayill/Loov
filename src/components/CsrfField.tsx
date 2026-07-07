"use client";

import { useEffect, useState } from "react";
import { getCsrfToken } from "@/lib/csrf";

/**
 * Hidden CSRF token field for forms. Placeholder until backend validation
 * lands in Phase 2 (see src/lib/csrf.ts). Rendered client-side only so the
 * token never gets baked into static HTML.
 */
export default function CsrfField() {
  const [token, setToken] = useState("");

  useEffect(() => {
    setToken(getCsrfToken());
  }, []);

  return <input type="hidden" name="csrf_token" value={token} readOnly aria-hidden="true" />;
}
