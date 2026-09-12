import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  api,
  type User,
  communityCacheUtils,
  myCommunitiesCacheUtils,
} from "@/api/client";
import { store } from "@/app/store";
import { apiSlice } from "@/features/api/apiSlice";
import { usersApiSlice } from "@/features/users/usersApiSlice";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (data: { login: string; password: string }) => Promise<void>;
  register: (data: {
    username: string;
    email: string;
    password: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: (updatedUser?: User) => Promise<void>;
  updateUser: (partialUser: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "staff_auth_user";

function loadStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

function saveStoredUser(user: User | null) {
  try {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

let cachedUser: User | null = loadStoredUser();
let isAuthInitialized = false;
let authPromise: Promise<User | null> | null = null;

export async function initAuth(): Promise<User | null> {
  if (authPromise) return authPromise;

  authPromise = (async () => {
    try {
      const res = await store
        .dispatch(
          usersApiSlice.endpoints.getMe.initiate(undefined, {
            subscribe: false,
            forceRefetch: true,
          }),
        )
        .unwrap();
      cachedUser = res.user;
      saveStoredUser(res.user);
      return res.user;
    } catch {
      // If 401 or unauthorized, clear storage
      cachedUser = null;
      saveStoredUser(null);
      return null;
    } finally {
      isAuthInitialized = true;
      authPromise = null;
    }
  })();

  return authPromise;
}

export function getCachedUser(): User | null {
  return cachedUser;
}

export function setCachedUser(user: User | null) {
  cachedUser = user;
  saveStoredUser(user);
}

export async function getAuthUser(forceRefresh = false): Promise<User | null> {
  if (isAuthInitialized && !forceRefresh) {
    return cachedUser;
  }
  if (forceRefresh) {
    isAuthInitialized = false;
  }
  return initAuth();
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => getCachedUser());
  const isLoading = false;

  useEffect(() => {
    let isMounted = true;
    initAuth().then((u) => {
      if (isMounted) setUser(u);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const updateUser = (partialUser: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...partialUser };
      cachedUser = updated;
      saveStoredUser(updated);
      return updated;
    });
  };

  const refreshUser = async (updatedUser?: User) => {
    if (updatedUser) {
      cachedUser = updatedUser;
      saveStoredUser(updatedUser);
      setUser(updatedUser);
      store.dispatch(usersApiSlice.util.invalidateTags(["User"]));
      return;
    }
    try {
      const res = await store
        .dispatch(
          usersApiSlice.endpoints.getMe.initiate(undefined, {
            subscribe: false,
            forceRefetch: true,
          }),
        )
        .unwrap();
      cachedUser = res.user;
      saveStoredUser(res.user);
      setUser(res.user);
      store.dispatch(usersApiSlice.util.invalidateTags(["User"]));
    } catch {
      cachedUser = null;
      saveStoredUser(null);
      setUser(null);
    }
  };

  const login = async (data: { login: string; password: string }) => {
    const res = await api.auth.login(data);
    cachedUser = res.user;
    saveStoredUser(res.user);
    isAuthInitialized = true;
    setUser(res.user);
    store.dispatch(
      usersApiSlice.util.invalidateTags(["User", "MyCommunities"]),
    );
  };

  const register = async (data: {
    username: string;
    email: string;
    password: string;
  }) => {
    const res = await api.auth.register(data);
    cachedUser = res.user;
    saveStoredUser(res.user);
    isAuthInitialized = true;
    setUser(res.user);
    store.dispatch(
      usersApiSlice.util.invalidateTags(["User", "MyCommunities"]),
    );
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } finally {
      cachedUser = null;
      saveStoredUser(null);
      isAuthInitialized = true;
      setUser(null);
      myCommunitiesCacheUtils.clear();
      communityCacheUtils.clear();
      store.dispatch(apiSlice.util.resetApiState());
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
