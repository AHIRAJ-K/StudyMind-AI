/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import React, { useState } from "react"
import Link from "next/link"
import { api } from "@/lib/api"
import { motion } from "framer-motion"
import { Loader2, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!email) {
      setError("Please fill out your email address.")
      return
    }

    setIsLoading(true)
    try {
      const response = await api.post<{ message: string }>("/auth/forgot-password", { email })
      setSuccess(response.message || "Reset token has been sent. Please check your inbox.")
    } catch (err: any) {
      setError(err.message || "Failed to submit request. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-card border border-border rounded-2xl p-8 shadow-sm"
    >
      <div className="mb-6">
        <Link href="/login" className="inline-flex items-center space-x-2 text-xs text-muted-foreground hover:text-primary transition-colors mb-4 font-medium">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to login</span>
        </Link>
        <h2 className="text-2xl font-bold font-display tracking-tight text-foreground">Reset Password</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Enter your email and we will send you a reset link
        </p>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-5 p-4 rounded-xl bg-error/10 border border-error/20 flex items-start space-x-3 text-error text-sm"
        >
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </motion.div>
      )}

      {success ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-5 rounded-xl bg-success/10 border border-success/20 flex flex-col items-center text-center text-success text-sm space-y-3"
        >
          <CheckCircle2 className="w-10 h-10 shrink-0 text-success" />
          <h3 className="font-semibold text-base">Check Your Inbox</h3>
          <p className="text-muted-foreground text-xs leading-relaxed">
            {success}
          </p>
          <Link href="/login" className="w-full mt-4 py-2.5 bg-success text-white rounded-xl text-xs font-semibold hover:bg-success/90 transition-all">
            Return to Login
          </Link>
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              placeholder="you@university.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-primary hover:bg-primary/95 disabled:bg-primary/50 text-primary-foreground font-semibold rounded-xl text-sm shadow-md shadow-primary/10 hover:shadow-primary/20 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center space-x-2 transition-all cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Submitting request...</span>
              </>
            ) : (
              <span>Request Reset Link</span>
            )}
          </button>
        </form>
      )}
    </motion.div>
  )
}
