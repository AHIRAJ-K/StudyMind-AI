/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import React, { useState, useEffect } from "react"
import { useAuth } from "@/context/auth-context"
import { useToast } from "@/context/toast-context"
import { api } from "@/lib/api"
import { motion } from "framer-motion"
import {
  User,
  Save,
  Shield,
  Trash2,
  CheckCircle,
  AlertCircle,
  Loader2
} from "lucide-react"

export default function ProfilePage() {
  const { user, updateProfile, logout } = useAuth()
  const { toast } = useToast()
  
  // Profile form fields
  const [fullName, setFullName] = useState("")
  const [institution, setInstitution] = useState("")
  const [course, setCourse] = useState("")
  
  // Security form fields
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  
  // Layout stats
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Initialize values on mount
  useEffect(() => {
    setTimeout(() => {
      if (user) {
        setFullName(user.full_name || "")
        setInstitution(user.institution || "")
        setCourse(user.course || "")
      }
    }, 0)
  }, [user])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setSavingProfile(true)

    try {
      await updateProfile({
        full_name: fullName,
        institution,
        course
      })
      setSuccess("Profile settings successfully updated.")
      toast.success("Profile updated successfully.")
    } catch (err: any) {
      setError(err.message || "Failed to update profile.")
      toast.error(err.message || "Failed to update profile.")
    } finally {
      setSavingProfile(false)
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      toast.error("Passwords do not match.")
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.")
      toast.error("Password must be at least 6 characters long.")
      return
    }

    setSavingPassword(true)
    try {
      await api.put("/auth/me", { password })
      setSuccess("Password updated successfully.")
      toast.success("Password changed successfully.")
      setPassword("")
      setConfirmPassword("")
    } catch (err: any) {
      setError(err.message || "Failed to update password.")
      toast.error(err.message || "Failed to update password.")
    } finally {
      setSavingPassword(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!confirm("CRITICAL WARNING: Are you sure you want to permanently delete your StudyMind account? This will erase all documents, chats, flashcard decks, and quiz scores. This action CANNOT be undone.")) return

    setDeletingAccount(true)
    setError(null)
    try {
      await api.delete("/auth/me")
      logout()
    } catch (err: any) {
      setError(err.message || "Failed to delete account.")
      setDeletingAccount(false)
    }
  }


  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold font-display tracking-tight text-foreground">Profile & Settings</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Manage your account credentials, dark mode theme preferences, and security settings
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 rounded-xl bg-error/10 border border-error/20 flex items-start space-x-3 text-error text-xs">
          <AlertCircle className="w-4.5 h-4.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-success/10 border border-success/20 flex items-start space-x-3 text-success text-xs">
          <CheckCircle className="w-4.5 h-4.5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Side: General Profile & Preference Settings (7 Cols) */}
        <div className="md:col-span-8 space-y-6">
          {/* Profile Form */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-5">
            <h3 className="font-bold text-sm tracking-tight flex items-center space-x-2 text-foreground">
              <User className="w-4.5 h-4.5 text-primary" />
              <span>Academic Profile Info</span>
            </h3>

            <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={user?.email || ""}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/40 border border-border rounded-xl text-muted-foreground cursor-not-allowed focus:outline-none shadow-sm"
                  disabled
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm transition-all"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Institution / School
                  </label>
                  <input
                    type="text"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Course / Major
                  </label>
                  <input
                    type="text"
                    value={course}
                    onChange={(e) => setCourse(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={savingProfile}
                className="px-4 py-2 bg-primary hover:bg-primary/95 text-white font-semibold rounded-xl cursor-pointer flex items-center space-x-1.5 shadow-md shadow-primary/10 hover:shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingProfile ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>Save Profile Info</span>
              </button>
            </form>
          </div>

          </div>

        {/* Right Side: Security Password & Deletion (5 Cols) */}
        <div className="md:col-span-4 space-y-6">
          {/* Change Password Form */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-sm tracking-tight flex items-center space-x-2 text-foreground">
              <Shield className="w-4.5 h-4.5 text-primary" />
              <span>Update Password</span>
            </h3>

            <form onSubmit={handleUpdatePassword} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  New Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Confirm Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm transition-all"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={savingPassword}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-border text-foreground font-bold rounded-xl cursor-pointer transition-all text-center block shadow-sm"
              >
                {savingPassword ? "Updating..." : "Update Password"}
              </button>
            </form>
          </div>

          {/* Delete Account Warning Box */}
          <div className="bg-card border border-error/20 rounded-2xl p-6 shadow-sm space-y-3 bg-gradient-to-br from-error/5 to-transparent text-xs text-error">
            <h3 className="font-bold text-sm tracking-tight text-error flex items-center space-x-2">
              <Trash2 className="w-4.5 h-4.5" />
              <span>Danger Zone</span>
            </h3>
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              Deleting your account is permanent. All your lecture files, note logs, quiz feedback history, and credentials will be removed.
            </p>
            
            <button
              onClick={handleDeleteAccount}
              disabled={deletingAccount}
              className="w-full py-2 bg-error text-white font-bold rounded-xl shadow-md hover:bg-error/90 transition-all text-center flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              {deletingAccount ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              <span>Delete My Account</span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
