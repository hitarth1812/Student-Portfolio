import { useEffect, useState, useCallback } from "react";
import {
  getToken,
  saveToken,
  clearToken,
  fetchMe,
  loginUser,
  registerUser,
  logoutUser,
  setUnauthorizedHandler,
} from "../api";
import { AuthContext } from "./auth-context";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // Starts true because we may still have to validate a token from localStorage
  const [loading, setLoading] = useState(true);
  const [sessionMessage, setSessionMessage] = useState("");

  const logout = useCallback(async () => {
    try {
      if (getToken()) {
        await logoutUser();
      }
    } catch {
      // A failed logout call still means the client should drop its token
    } finally {
      clearToken();
      setUser(null);
    }
  }, []);

  // Any 401 from any request (expired or tampered token) lands here
  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearToken();
      setUser(null);
      setSessionMessage("Your session expired. Please log in again.");
    });

    return () => setUnauthorizedHandler(null);
  }, []);

  // On first load, exchange a stored token for the user it belongs to.
  // If the token is stale the /auth/me call 401s and the handler above clears it.
  useEffect(() => {
    const restoreSession = async () => {
      if (!getToken()) {
        setLoading(false);
        return;
      }

      try {
        const me = await fetchMe();
        setUser(me);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = async (credentials) => {
    const { user: loggedInUser, token } = await loginUser(credentials);

    saveToken(token);
    setUser(loggedInUser);
    setSessionMessage("");

    return loggedInUser;
  };

  const register = async (details) => {
    const { user: newUser, token } = await registerUser(details);

    saveToken(token);
    setUser(newUser);
    setSessionMessage("");

    return newUser;
  };

  const value = {
    user,
    loading,
    sessionMessage,
    clearSessionMessage: () => setSessionMessage(""),
    isAuthenticated: !!user,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
