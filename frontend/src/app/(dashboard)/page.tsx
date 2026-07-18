/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { api } from "@/lib/api"
import { useAuth } from "@/context/auth-context"
import { motion } from "framer-motion"
import LandingPage from "@/components/landing-page"
import {
  FileText,
  MessageSquare,
  Layers,
  Award,
  Clock,
  ArrowRight,
  Plus,
  StickyNote,
  Sparkles,
  TrendingUp,
  GitFork
} from "lucide-react"

interface Activity {
  id: number
  title: string
  activity_type: string
  description: string
  created_at: string
}

interface Stats {
  total_files: number
  total_chats: number
  total_flashcards: number
  total_quizzes: number
  study_time_hours: number
  average_quiz_score: number
  recent_activities: Activity[]
  file_type_distribution: Record<string, number>
  daily_activity_counts: Record<string, number>
  total_decks: number
  total_mindmaps: number
  total_summaries: number
  total_notes: number
  total_quizzes_completed: number
}

function AnimatedCounter({ value }: { value: number }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let start = 0
    const end = value
    if (start === end) {
      setTimeout(() => {
        setCount(end)
      }, 0)
      return
    }
    const totalDuration = 600 // ms
    const incrementTime = Math.max(Math.floor(totalDuration / Math.max(end, 1)), 10)
    
    const timer = setInterval(() => {
      start += Math.ceil(end / 30)
      if (start >= end) {
        clearInterval(timer)
        setCount(end)
      } else {
        setCount(start)
      }
    }, incrementTime)

    return () => clearInterval(timer)
  }, [value])

  return <span>{count}</span>
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setTimeout(() => {
        setLoading(false)
      }, 0)
      return
    }
    async function fetchStats() {
      try {
        const data = await api.get<Stats>("/dashboard/stats")
        setStats(data)
      } catch (err: any) {
        console.error("Failed to load dashboard statistics:", err)
      } finally {
        setLoading(false)
      }
    }
    setTimeout(() => {
      fetchStats()
    }, 0)
  }, [user])

  if (!user) {
    return <LandingPage />
  }

  if (loading) {
    return (
      <div className="space-y-8 max-w-6xl mx-auto animate-pulse">
        {/* 1. Header Banner Skeleton */}
        <div className="h-40 bg-muted/40 border border-border/60 rounded-2xl p-8 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-24 h-4 bg-muted/80 rounded-full" />
            <div className="w-64 h-8 bg-muted/80 rounded-lg" />
            <div className="w-[80%] max-w-[400px] h-4 bg-muted/80 rounded-full" />
          </div>
        </div>

        {/* 2. Grid Cards stats Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card border border-border/80 rounded-xl p-5 flex flex-col justify-between h-32">
              <div className="flex justify-between items-start">
                <div className="w-28 h-4 bg-muted/80 rounded-full" />
                <div className="w-8 h-8 bg-muted/80 rounded-lg" />
              </div>
              <div className="w-16 h-8 bg-muted/80 rounded-lg" />
            </div>
          ))}
        </div>

        {/* 3. Main content body split Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-card border border-border/80 rounded-xl p-6 h-64 flex flex-col justify-between">
              <div className="w-48 h-5 bg-muted/80 rounded-full" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1 mt-6">
                {[1, 2, 3, 4].map((idx) => (
                  <div key={idx} className="bg-muted/40 border border-border/40 rounded-xl p-4 flex flex-col items-center justify-center space-y-3" />
                ))}
              </div>
            </div>
          </div>
          <div className="lg:col-span-4">
            <div className="bg-card border border-border/80 rounded-xl p-6 h-64 flex flex-col justify-between">
              <div className="w-32 h-5 bg-muted/80 rounded-full" />
              <div className="space-y-3 mt-6 flex-1">
                {[1, 2, 3].map((idx) => (
                  <div key={idx} className="flex space-x-3 items-center">
                    <div className="w-6 h-6 bg-muted/80 rounded-full" />
                    <div className="space-y-1.5 flex-1">
                      <div className="w-full h-3 bg-muted/80 rounded-full" />
                      <div className="w-1/2 h-2.5 bg-muted/80 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Greeting based on time of day
  const hour = new Date().getHours()
  let greeting = "Good morning"
  if (hour >= 12 && hour < 17) greeting = "Good afternoon"
  else if (hour >= 17) greeting = "Good evening"

  const cards = [
    {
      title: "Uploaded Documents",
      value: stats?.total_files ?? 0,
      icon: FileText,
      color: "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400",
      href: "/library"
    },
    {
      title: "Flashcard Decks",
      value: stats?.total_decks ?? 0,
      icon: Layers,
      color: "bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400",
      href: "/flashcards"
    },
    {
      title: "Mind Maps",
      value: stats?.total_mindmaps ?? 0,
      icon: GitFork,
      color: "bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400",
      href: "/mindmaps"
    },
    {
      title: "Generated Summaries",
      value: stats?.total_summaries ?? 0,
      icon: FileText,
      color: "bg-pink-500/10 border-pink-500/20 text-pink-600 dark:text-pink-400",
      href: "/summaries"
    },
    {
      title: "Saved Notes",
      value: stats?.total_notes ?? 0,
      icon: StickyNote,
      color: "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400",
      href: "/notes"
    },
    {
      title: "Completed Quizzes",
      value: stats?.total_quizzes_completed ?? 0,
      icon: Award,
      color: "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
      href: "/quizzes"
    },
    {
      title: "Active Chat Sessions",
      value: stats?.total_chats ?? 0,
      icon: MessageSquare,
      color: "bg-teal-500/10 border-teal-500/20 text-teal-600 dark:text-teal-400",
      href: "/chat"
    }
  ]

  // Render SVG Chart for Daily Activity
  const activityData = stats ? Object.entries(stats.daily_activity_counts) : []
  const maxCount = activityData.length > 0 ? Math.max(...activityData.map((item) => item[1]), 1) : 1

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* 1. Header Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-primary dark:from-slate-900 dark:via-slate-800 dark:to-primary p-8 rounded-2xl text-white overflow-hidden shadow-md shadow-primary/10"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,255,255,0.15),transparent_40%)] dark:bg-[radial-gradient(circle_at_70%_20%,rgba(59,130,246,0.25),transparent_40%)]" />
        <div className="relative z-10 space-y-2">
          <span className="text-[10px] font-bold tracking-wider uppercase bg-white/20 px-3 py-1 rounded-full text-white/90">
            AI Study Workspace
          </span>
          <h2 className="text-2xl md:text-3xl font-bold font-display tracking-tight mt-2">
            {greeting}, {user?.full_name?.split(" ")[0] || "Scholar"}!
          </h2>
          <p className="text-white/80 text-xs md:text-sm max-w-xl">
            You have uploaded <span className="text-white font-semibold">{stats?.total_files} documents</span> and completed <span className="text-white font-semibold">{stats?.total_quizzes} study assessments</span>. Ready to boost your knowledge today?
          </p>
        </div>
      </motion.div>

      {/* 2. Grid Cards stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, i) => {
          const Icon = card.icon
          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card border border-border/80 rounded-xl p-5 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20 transition-all duration-300 group flex flex-col justify-between h-32 cursor-pointer"
            >
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-muted-foreground">{card.title}</span>
                <div className={`p-2 rounded-lg border ${card.color}`}>
                  <Icon className="w-4.5 h-4.5" />
                </div>
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-2xl font-bold tracking-tight">
                  <AnimatedCounter value={card.value} />
                </span>
                <Link
                  href={card.href}
                  className="text-[10px] font-semibold text-primary hover:underline flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <span>Explore</span>
                  <ArrowRight className="w-2.5 h-2.5" />
                </Link>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* 3. Main content body split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left pane: Charts & Quick Actions (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Quick Actions Panel */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-bold text-sm tracking-tight mb-4 flex items-center space-x-2">
              <Sparkles className="w-4.5 h-4.5 text-primary" />
              <span>StudyMind Quick Actions</span>
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Link href="/library" className="flex flex-col items-center justify-center p-4 rounded-xl bg-white dark:bg-slate-900 border border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-center space-y-2 group cursor-pointer shadow-sm">
                <div className="p-2.5 bg-blue-500/10 rounded-xl group-hover:scale-105 transition-transform text-blue-500">
                  <Plus className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold">Upload File</span>
              </Link>
              
              <Link href="/chat" className="flex flex-col items-center justify-center p-4 rounded-xl bg-white dark:bg-slate-900 border border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-center space-y-2 group cursor-pointer shadow-sm">
                <div className="p-2.5 bg-teal-500/10 rounded-xl group-hover:scale-105 transition-transform text-teal-500">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold">AI Chatbot</span>
              </Link>

              <Link href="/flashcards" className="flex flex-col items-center justify-center p-4 rounded-xl bg-white dark:bg-slate-900 border border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-center space-y-2 group cursor-pointer shadow-sm">
                <div className="p-2.5 bg-purple-500/10 rounded-xl group-hover:scale-105 transition-transform text-purple-500">
                  <Layers className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold">Generate Deck</span>
              </Link>

              <Link href="/notes" className="flex flex-col items-center justify-center p-4 rounded-xl bg-white dark:bg-slate-900 border border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-center space-y-2 group cursor-pointer shadow-sm">
                <div className="p-2.5 bg-amber-500/10 rounded-xl group-hover:scale-105 transition-transform text-amber-500">
                  <StickyNote className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold">Write Note</span>
              </Link>
            </div>
          </div>

          {/* SVG Activity Timeline Chart */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-bold text-sm tracking-tight flex items-center space-x-2">
                  <TrendingUp className="w-4.5 h-4.5 text-primary" />
                  <span>Activity Timeline</span>
                </h3>
                <p className="text-[11px] text-muted-foreground">Study counts logged in the past week</p>
              </div>
              
              <div className="flex items-center space-x-4 text-xs font-medium text-muted-foreground">
                <div className="flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  <span>Est. Study Time: {stats?.study_time_hours} hrs</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <Award className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Avg. Quiz Score: {stats?.average_quiz_score}%</span>
                </div>
              </div>
            </div>

            {/* Custom Responsive SVG Bar Chart */}
            <div className="w-full h-48 flex items-end justify-between px-2 pt-4 border-b border-border">
              {activityData.map(([dayStr, count]) => {
                const date = new Date(dayStr)
                const dayLabel = date.toLocaleDateString(undefined, { weekday: "short" })
                // height percent
                const barHeight = `${(count / maxCount) * 80 + 5}%` // min 5%, max 85%
                
                return (
                  <div key={dayStr} className="flex-1 flex flex-col items-center h-full group justify-end pb-1 relative">
                    {/* Tooltip on hover */}
                    <div className="absolute bottom-full mb-1 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow">
                      {count} actions
                    </div>
                    
                    {/* Visual Bar */}
                    <div
                      style={{ height: barHeight }}
                      className="w-8 sm:w-10 rounded-t-lg bg-gradient-to-t from-primary to-accent hover:from-primary/80 hover:to-accent/80 transition-all cursor-pointer shadow-sm relative overflow-hidden"
                    >
                      {/* Interactive shine highlight */}
                      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.15),transparent)]" />
                    </div>
                    
                    {/* Label */}
                    <span className="text-[10px] font-semibold text-muted-foreground mt-2">{dayLabel}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right pane: Recent Activity & File distribution (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* File Types breakdown */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-bold text-sm tracking-tight mb-4">Library Composition</h3>
            {stats && Object.keys(stats.file_type_distribution).length > 0 ? (
              <div className="space-y-3.5">
                {Object.entries(stats.file_type_distribution).map(([type, count]) => {
                  const limit = 10
                  const percent = Math.min((count / limit) * 100, 100)
                  
                  // Color codes
                  let barColor = "bg-blue-500"
                  if (type === "pdf") barColor = "bg-red-500"
                  else if (type === "docx") barColor = "bg-blue-600"
                  else if (type === "txt") barColor = "bg-slate-400"
                  else if (["png", "jpg", "jpeg"].includes(type)) barColor = "bg-teal-500"
                  
                  return (
                    <div key={type} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="uppercase font-bold text-muted-foreground tracking-wide text-[10px]">{type} File</span>
                        <span className="text-foreground">{count} ({Math.round(percent)}%)</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-900 overflow-hidden">
                        <div
                          style={{ width: `${percent}%` }}
                          className={`h-full rounded-full ${barColor}`}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-muted-foreground">
                No files uploaded yet. Composition will show here.
              </div>
            )}
          </div>

          {/* Activity Logs */}
          <div className="bg-card border border-border rounded-xl p-6 flex flex-col">
            <h3 className="font-bold text-sm tracking-tight mb-4">Recent Activity</h3>
            
            {stats?.recent_activities && stats.recent_activities.length > 0 ? (
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                {stats.recent_activities.map((act) => {
                  let badgeEmoji = "📝"
                  if (act.activity_type === "upload_doc") badgeEmoji = "📂"
                  else if (act.activity_type === "ask_ai") badgeEmoji = "🤖"
                  else if (act.activity_type === "take_quiz") badgeEmoji = "🏆"
                  else if (act.activity_type === "login") badgeEmoji = "🔑"
                  
                  return (
                    <div key={act.id} className="flex space-x-3 text-xs leading-normal">
                      <span className="text-sm shrink-0 mt-0.5">{badgeEmoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{act.description}</p>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(act.created_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-muted-foreground my-auto">
                No activities logged. Start by uploading a file or generating quizzes!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
