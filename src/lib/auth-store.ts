import { create } from "zustand"
import { persist } from "zustand/middleware"

interface AuthUser {
  id: string
  name: string
  email: string
  mobile: string | null
  role: string
  status: string
}

interface AuthState {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  login: (user: AuthUser, token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: (user, token) => set({ user, token, isAuthenticated: true }),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    { name: "shop-ms-auth" }
  )
)
