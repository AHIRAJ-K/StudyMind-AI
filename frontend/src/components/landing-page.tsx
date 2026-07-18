"use client"

import React from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  BookOpen,
  MessageSquare,
  FileText,
  Layers,
  GitFork,
  Award,
  ArrowRight,
  Sparkles
} from "lucide-react"

export default function LandingPage() {
  const features = [
    {
      title: "Document Extraction",
      desc: "Extract text from PDFs, Word documents, or images automatically into accessible text nodes.",
      icon: BookOpen,
      color: "text-blue-500 bg-blue-500/10 border-blue-500/20"
    },
    {
      title: "Generative Summaries",
      desc: "Generate concise summaries, flashcard review decks, or study guidelines with single clicks.",
      icon: FileText,
      color: "text-pink-500 bg-pink-500/10 border-pink-500/20"
    },
    {
      title: "Interactive AI Chat",
      desc: "Chat directly with your documents to answer complex questions or search technical terms.",
      icon: MessageSquare,
      color: "text-teal-500 bg-teal-500/10 border-teal-500/20"
    },
    {
      title: "Spaced Flashcards",
      desc: "Study smart using adaptive flashcard decks with automated spaced repetition difficulty logging.",
      icon: Layers,
      color: "text-purple-500 bg-purple-500/10 border-purple-500/20"
    },
    {
      title: "Hierarchical Mind Maps",
      desc: "Render structural concept trees visually to connect formulas, modules, or chapter themes.",
      icon: GitFork,
      color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20"
    },
    {
      title: "AI Quiz Generator",
      desc: "Build self-assessment quizzes (MCQ, True/False, fill-in-blanks) directly from document sources.",
      icon: Award,
      color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
    }
  ]

  const steps = [
    {
      step: "01",
      title: "Upload Documents",
      desc: "Drag & drop your lecture notes, course slides, textbooks, or reference papers."
    },
    {
      step: "02",
      title: "AI Analysis",
      desc: "Google Gemini extracts semantic layers, structural relationships, and technical formulas."
    },
    {
      step: "03",
      title: "Smart Learning",
      desc: "Interact with AI, study cards, self-test with quizzes, and visualize layouts."
    }
  ]

  const stats = [
    { value: "98%", label: "Grade Improvement" },
    { value: "4.5hr", label: "Avg. Weekly Time Saved" },
    { value: "10K+", label: "Flashcards Automated" },
    { value: "4.9★", label: "User Satisfaction" }
  ]

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 transition-colors duration-200">
      {/* 1. HEADER BAR */}
      <header className="sticky top-0 bg-background/80 backdrop-blur-md border-b border-border z-50 h-16 flex items-center justify-between px-6 md:px-12">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-md shadow-primary/20">
            <span className="text-white font-bold text-base font-display">S</span>
          </div>
          <span className="font-bold text-sm tracking-tight font-display">StudyMind AI</span>
        </div>
        
        <div className="flex items-center space-x-4">
          <Link
            href="/login"
            className="text-xs font-semibold hover:text-primary transition-colors px-3 py-1.5 rounded-lg"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="text-xs font-semibold bg-primary hover:bg-primary/95 text-white px-4 py-2 rounded-xl transition-all shadow-md shadow-primary/10 hover:shadow-primary/20"
          >
            Get Started Free
          </Link>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative pt-24 pb-16 px-6 md:px-12 flex flex-col items-center text-center max-w-5xl mx-auto space-y-8 overflow-hidden">
        {/* Glowing background bubble */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-tr from-primary/15 to-accent/15 rounded-full blur-[120px] pointer-events-none" />

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-4xl md:text-6xl font-extrabold font-display tracking-tight text-foreground max-w-3xl leading-tight"
        >
          Learn Smarter. <span className="bg-gradient-to-r from-primary via-indigo-500 to-accent bg-clip-text text-transparent">Power Up Your Brain</span> with Gemini AI.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-sm md:text-base text-muted-foreground max-w-xl leading-relaxed font-medium"
        >
          Upload files, auto-generate markdown study notes, flashcard decks, quizzes, and visual mind maps. The complete workspace for academic excellence.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full"
        >
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }} className="w-full sm:w-auto">
            <Link
              href="/signup"
              className="w-full flex items-center justify-center space-x-2 px-6 py-3.5 bg-primary hover:bg-primary/95 text-white font-bold rounded-xl shadow-lg shadow-primary/15 transition-all text-xs cursor-pointer"
            >
              <span>Get Started For Free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
          
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }} className="w-full sm:w-auto">
            <Link
              href="/login"
              className="w-full px-6 py-3.5 border border-border bg-card dark:hover:bg-slate-900 text-foreground font-bold rounded-xl shadow-sm transition-all text-xs cursor-pointer block text-center"
            >
              Explore Dashboard
            </Link>
          </motion.div>
        </motion.div>

        {/* Workspace mockup illustration */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="relative w-full max-w-4xl border border-border/80 rounded-2xl overflow-hidden shadow-2xl shadow-primary/15 bg-card p-2 aspect-[16/9] mt-8"
        >
          <div className="absolute top-2 left-4 flex space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          </div>
          <div className="w-full h-full bg-slate-50 dark:bg-slate-950/80 rounded-xl flex items-center justify-center p-6 border border-border/40">
            <div className="space-y-4 max-w-md text-center">
              <Sparkles className="w-8 h-8 text-primary mx-auto animate-pulse" />
              <h3 className="font-bold text-sm text-foreground">Interactive AI Learning Workspace</h3>
              <p className="text-[10px] text-muted-foreground leading-normal">
                To experience the interactive workspace preview, click &quot;Get Started&quot; to sign in or create a credentials session.
              </p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* 3. STATISTICS WIDGET */}
      <section className="bg-card border-y border-border py-12 px-6 md:px-12 my-12">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((s, idx) => (
            <div key={idx} className="space-y-1.5">
              <span className="text-3xl md:text-4xl font-extrabold text-primary font-display tracking-tight block">
                {s.value}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 4. FEATURES GRID */}
      <section className="py-16 px-6 md:px-12 max-w-5xl mx-auto space-y-12">
        <div className="text-center space-y-2 max-w-lg mx-auto">
          <h2 className="text-2xl font-bold font-display tracking-tight text-foreground">One Integrated Workspace</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Everything you need to master your courses, structure concepts, and pass examinations with confidence.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, idx) => {
            const Icon = f.icon
            return (
              <div
                key={idx}
                className="bg-card border border-border/80 p-6 rounded-2xl shadow-sm hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30 transition-all duration-300 transform hover:-translate-y-1 space-y-4 group cursor-pointer"
              >
                <div className={`p-3 rounded-xl border w-fit ${f.color} transition-all`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">
                    {f.title}
                  </h3>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* 5. HOW IT WORKS SECTION */}
      <section className="bg-slate-50 dark:bg-slate-900/10 border-y border-border py-16 px-6 md:px-12">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-2 max-w-lg mx-auto">
            <h2 className="text-2xl font-bold font-display tracking-tight text-foreground">How it Works</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Mastering any complex topic in minutes is as simple as these three steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((s, idx) => (
              <div key={idx} className="relative space-y-3 p-6 rounded-2xl border border-transparent hover:border-border/60 hover:bg-slate-900/10 transition-all duration-300">
                <span className="text-5xl font-extrabold text-primary/10 font-display block">
                  {s.step}
                </span>
                <h3 className="font-bold text-xs text-foreground">{s.title}</h3>
                <p className="text-[10px] text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. CALL TO ACTION & FOOTER */}
      <section className="py-20 px-6 text-center max-w-3xl mx-auto space-y-6">
        <h2 className="text-3xl font-extrabold font-display tracking-tight">Ready to Master Your Courses?</h2>
        <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
          Create a free account today and begin automating flashcards, quizzes, and summaries with Google Gemini AI.
        </p>
        <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }} className="inline-block">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center space-x-2 px-6 py-3.5 bg-primary hover:bg-primary/95 text-white font-bold rounded-xl shadow-lg shadow-primary/15 transition-all text-xs cursor-pointer"
          >
            <span>Get Started Free</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </section>

      <footer className="border-t border-border py-10 px-6 md:px-12 text-center text-xs text-muted-foreground bg-card">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-foreground font-display">StudyMind AI</span>
            <span>|</span>
            <span className="text-[10px]">Intelligent Study Workspace</span>
          </div>
          <div className="flex flex-col items-center md:items-end gap-1">
            <span className="text-[10px] text-muted-foreground/80 font-medium">Built as an IBM SkillsBuild AI Internship Project using Google Gemini AI.</span>
            <span className="text-[10px] text-muted-foreground/50">&copy; {new Date().getFullYear()} StudyMind AI. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
