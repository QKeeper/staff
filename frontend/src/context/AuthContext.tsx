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
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

let cachedUser: User | null = null;
let authPromise: Promise<User | null> | null = null;

export async function initAuth(): Promise<User | null> {
  if (authPromise) return authPromise;
  authPromise = (async () => {
    try {
      const res = await api.auth.me();
      cachedUser = res.user;
      return res.user;
    } catch {
      cachedUser = null;
      return null;
    } finally {
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
}

export async function getAuthUser(forceRefresh = false): Promise<User | null> {
  if (cachedUser !== null && !forceRefresh) {
    return cachedUser;
  }
  return initAuth();
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => getCachedUser());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    initAuth().then((u) => {
      if (isMounted) setUser(u);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const refreshUser = async () => {
    setIsLoading(true);
    try {
      const res = await api.auth.me();
      cachedUser = res.user;
      setUser(res.user);
      store.dispatch(usersApiSlice.util.invalidateTags(["User"]));
    } catch {
      cachedUser = null;
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (data: { login: string; password: string }) => {
    const res = await api.auth.login(data);
    cachedUser = res.user;
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
