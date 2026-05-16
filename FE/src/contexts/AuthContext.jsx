import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { connectChatSocket, disconnectChatSocket, getChatSocket } from "@/client/features/chat/data/chat.socket.js";

const STORAGE_TOKEN_KEY = "pc-perfect-token";
const STORAGE_USER_KEY = "pc-perfect-user";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => loadStoredSession());
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const storedSession = loadStoredSession();

      if (!storedSession || !storedSession.token) {
        if (!cancelled) {
          setSession(null);
          setIsHydrated(true);
        }
        return;
      }

      try {
        const response = await fetch("/api/auth/me", {
          headers: {
            Authorization: `Bearer ${storedSession.token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Session expired");
        }

        const user = await response.json();
        const nextSession = {
          token: storedSession.token,
          user,
        };

        persistSession(nextSession);

        if (!cancelled) {
          setSession(nextSession);
        }

        // Connect chat socket for realtime events and forward notifications as DOM events
        try {
          const socket = connectChatSocket(nextSession.token);
          if (socket) {
            const handler = (payload) => {
              try {
                window.dispatchEvent(new CustomEvent("app:notification", { detail: payload }));
              } catch { }
            };

            socket.on("notification", handler);

            // store handler on socket for cleanup
            socket.__notification_handler = handler;
          }
        } catch { }
      } catch {
        clearSessionStorage();
        if (!cancelled) {
          setSession(null);
        }
      } finally {
        if (!cancelled) {
          setIsHydrated(true);
        }
      }
    }

    hydrate();

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(() => {
    return {
      session,
      user: session?.user ?? null,
      token: session?.token ?? null,
      isAuthenticated: Boolean(session?.token),
      isHydrated,
      setSession: (nextSession) => {
        if (!nextSession) {
          clearSessionStorage();
          // disconnect socket on logout
          try {
            const socket = getChatSocket();
            if (socket) {
              const handler = socket.__notification_handler;
              if (handler) socket.off("notification", handler);
            }
          } catch { }
          disconnectChatSocket();
          setSession(null);
          return;
        }

        persistSession(nextSession);
        setSession(nextSession);

        // connect socket when session is set
        try {
          const socket = connectChatSocket(nextSession.token);
          if (socket && !socket.__notification_handler) {
            const handler = (payload) => {
              try {
                window.dispatchEvent(new CustomEvent("app:notification", { detail: payload }));
              } catch { }
            };

            socket.on("notification", handler);
            socket.__notification_handler = handler;
          }
        } catch { }
      },
      logout: () => {
        clearSessionStorage();
        setSession(null);
      },
    };
  }, [session, isHydrated]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}

function loadStoredSession() {
  if (typeof window === "undefined") {
    return null;
  }

  const token = window.localStorage.getItem(STORAGE_TOKEN_KEY);
  const userValue = window.localStorage.getItem(STORAGE_USER_KEY);

  if (!token || !userValue) {
    return null;
  }

  try {
    return {
      token,
      user: JSON.parse(userValue),
    };
  } catch {
    clearSessionStorage();
    return null;
  }
}

function persistSession(session) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_TOKEN_KEY, session.token);
  window.localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(session.user));
}

function clearSessionStorage() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(STORAGE_TOKEN_KEY);
  window.localStorage.removeItem(STORAGE_USER_KEY);
}
