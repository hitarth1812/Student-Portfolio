import { createContext, useContext } from "react";

// Kept in its own module (no components) so the provider file stays
// fast-refresh friendly.
export const AuthContext = createContext(null);

// Small hook so components read auth state without importing the context object
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }

  return context;
};
