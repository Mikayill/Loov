"use client";

import { useEffect, useState } from "react";
import { getRememberedAccounts, ACCOUNTS_EVENT, type RememberedAccount } from "@/lib/rememberedAccounts";

/** Hydration-safe read of the remembered-accounts list (empty on the server). */
export function useRememberedAccounts(): RememberedAccount[] {
  const [accounts, setAccounts] = useState<RememberedAccount[]>([]);
  useEffect(() => {
    const sync = () => setAccounts(getRememberedAccounts());
    sync();
    window.addEventListener(ACCOUNTS_EVENT, sync);
    window.addEventListener("storage", sync); // reflect changes from other tabs
    return () => {
      window.removeEventListener(ACCOUNTS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return accounts;
}
