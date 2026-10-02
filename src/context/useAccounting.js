import { createContext, useContext } from "react";

export const AccountingContext = createContext(null);

export function useAccounting() {
  const context = useContext(AccountingContext);

  if (!context) {
    throw new Error(
      "useAccounting yalnızca AccountingProvider içinde kullanılabilir.",
    );
  }

  return context;
}