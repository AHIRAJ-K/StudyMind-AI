"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"

export interface User {
  id: number
  email: string
  full_name: string | null
  institution: string | null
  course: string | null
  is_active: boolean
  created_at: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, full_name: string, institution: string, course: string) => Promise<void>
  logout: () => void
  updateProfile: (data: { full_name?: string; institution?: string; course?: string }) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function loadStoredAuth() {
      const storedToken = localStorage.getItem("token")
      const storedUser = localStorage.getItem("user")
      
      if (storedToken && storedUser) {
        try {
          setToken(storedToken)
          // Fetch current user from server to verify token
          const freshUser = await api.get<User>("/auth/me")
          setUser(freshUser)
          localStorage.setItem("user", JSON.stringify(freshUser))
        } catch (err) {
          console.error("Token verification failed, clearing auth", err)
          localStorage.removeItem("token")
          localStorage.removeItem("user")
          setToken(null)
          setUser(null)
        }
      }
      setLoading(false)
    }

    loadStoredAuth()
  }, [])

  const login = async (email: string, password: string) => {
    setLoading(true)
    try {
      const response = await api.post<{ access_token: string; token_type: string; user: User }>(
        "/auth/login/json",
        { email, password }
      )
      
      localStorage.setItem("token", response.access_token)
      localStorage.setItem("user", JSON.stringify(response.user))
      
      setToken(response.access_token)
      setUser(response.user)
      
      router.push("/")
    } catch (err) {
      throw err
    } finally {
      setLoading(false)
    }
  }

  const signup = async (
    email: string,
    password: string,
    full_name: string,
    institution: string,
    course: string
  ) => {
    setLoading(true)
    try {
      // 1. Create account
      await api.post("/auth/signup", {
        email,
        password,
        full_name,
        institution,
        course,
      })
      
      // 2. Perform direct login
      await login(email, password)
    } catch (err) {
      throw err
    } finally {
      setLoading(false)
    }
  }


  const logout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    setToken(null)
    setUser(null)
    router.push("/login")
  }

  const updateProfile = async (data: { full_name?: string; institution?: string; course?: string }) => {
    try {
      const updatedUser = await api.put<User>("/auth/me", data)
      setUser(updatedUser)
      localStorage.setItem("user", JSON.stringify(updatedUser))
    } catch (err) {
      throw err
    }
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
