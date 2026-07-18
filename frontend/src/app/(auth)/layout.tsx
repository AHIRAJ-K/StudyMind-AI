"use client"

import React from "react"
import { motion } from "framer-motion"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-background transition-colors duration-200">
      {/* Branding and Marketing Pane (Hidden on mobile) */}
      <div className="hidden lg:flex lg:col-span-5 relative bg-slate-900 overflow-hidden flex-col justify-between p-12 text-white">
        {/* Abstract Background Elements */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,#3b82f630,transparent_50%),radial-gradient(circle_at_70%_80%,#7c3aed35,transparent_50%)]" />
        
        {/* Tech Grid Patterns */}
        <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]" />

        {/* Brand Header */}
        <div className="relative z-10 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
            <span className="text-xl font-bold text-white font-display">S</span>
          </div>
          <div>
            <h2 className="text-lg font-bold font-display tracking-tight leading-none">StudyMind AI</h2>
            <span className="text-xs text-slate-400 font-sans">Learning Companion</span>
          </div>
        </div>

        {/* Centered Graphic and Text Carousel */}
        <div className="relative z-10 my-auto max-w-sm">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            {/* Visual Glowing Brain Orb */}
            <div className="relative w-40 h-40 mx-auto flex items-center justify-center mb-6">
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
              <div className="absolute inset-4 bg-accent/20 blur-2xl rounded-full" />
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="w-24 h-24 rounded-full border border-dashed border-primary/30 flex items-center justify-center"
              >
                <div className="w-16 h-16 rounded-full border border-dashed border-accent/40 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-accent shadow-inner" />
                </div>
              </motion.div>
            </div>
            
            <h1 className="text-3xl font-bold font-display tracking-tight leading-tight mb-3 text-center">
              Supercharge Your Learning
            </h1>
            <p className="text-slate-400 text-sm text-center leading-relaxed">
              Upload lectures, PDFs, and textbooks. Get instant summaries, customized quizzes, mind maps, and interactive chat.
            </p>
          </motion.div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-xs text-slate-500">
          © {new Date().getFullYear()} StudyMind AI. All rights reserved.
        </div>
      </div>

      {/* Form Container */}
      <div className="lg:col-span-7 flex items-center justify-center p-6 sm:p-12 md:p-16">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  )
}
