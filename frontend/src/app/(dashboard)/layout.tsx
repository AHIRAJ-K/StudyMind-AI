/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import { api } from "@/lib/api"
import { motion, AnimatePresence } from "framer-motion"
import {
  LayoutDashboard,
  BookOpen,
  MessageSquare,
  FileText,
  Layers,
  GitFork,
  Award,
  StickyNote,
  User,
  LogOut,
  Menu,
  X,
  Search,
  Loader2
} from "lucide-react"

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<any>
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const [searchData, setSearchData] = useState<{
    documents: any[]
    notes: any[]
    decks: any[]
    mindmaps: any[]
    quizzes: any[]
    sessions: any[]
  }>({
    documents: [],
    notes: [],
    decks: [],
    mindmaps: [],
    quizzes: [],
    sessions: []
  })

  const loadSearchPool = async () => {
    if (!user) return
    try {
      const [docs, notes, decks, maps, quizzes, sessions] = await Promise.all([
        api.get<any[]>("/documents").catch(() => []),
        api.get<any[]>("/notes").catch(() => []),
        api.get<any[]>("/flashcards/decks").catch(() => []),
        api.get<any[]>("/mindmaps").catch(() => []),
        api.get<any[]>("/quizzes").catch(() => []),
        api.get<any[]>("/chats/sessions").catch(() => [])
      ])
      
      setSearchData({
        documents: docs || [],
        notes: notes || [],
        decks: decks || [],
        mindmaps: maps || [],
        quizzes: quizzes || [],
        sessions: sessions || []
      })
    } catch (err) {
      console.error("Failed to load search data:", err)
    }
  }

  useEffect(() => {
    setTimeout(() => {
      loadSearchPool()
    }, 0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, user])

  const highlightMatch = (text: string, query: string, isSelected: boolean) => {
    if (!text) return <span></span>
    if (!query) return <span>{text}</span>
    const parts = text.split(new RegExp(`(${query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, "gi"))
    return (
      <span>
        {parts.map((part, idx) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark
              key={idx}
              className={`rounded-sm px-0.5 font-bold ${
                isSelected
                  ? "bg-white/30 text-white"
                  : "bg-primary/20 text-primary dark:bg-primary/30 dark:text-blue-300"
              }`}
            >
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    )
  }

  const getFilteredResults = () => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return null
    
    const results: { category: string; items: { id: number; title: string; route: string }[] }[] = []
    
    // 1. Documents & Summaries
    const filteredDocs = searchData.documents.filter(d => 
      (d.title || "").toLowerCase().includes(q)
    )
    if (filteredDocs.length > 0) {
      results.push({
        category: "Documents",
        items: filteredDocs.map(d => ({ id: d.id, title: d.title, route: `/library` }))
      })
      results.push({
        category: "Summaries",
        items: filteredDocs.map(d => ({ id: d.id, title: `Summary of: ${d.title}`, route: `/summaries?docId=${d.id}` }))
      })
    }
    
    // 2. Notes
    const filteredNotes = searchData.notes.filter(n => 
      (n.title || "").toLowerCase().includes(q) || (n.content || "").toLowerCase().includes(q)
    )
    if (filteredNotes.length > 0) {
      results.push({
        category: "Notes",
        items: filteredNotes.map(n => ({ id: n.id, title: n.title, route: `/notes?noteId=${n.id}` }))
      })
    }
    
    // 3. Flashcard Decks
    const filteredDecks = searchData.decks.filter(d => 
      (d.name || "").toLowerCase().includes(q)
    )
    if (filteredDecks.length > 0) {
      results.push({
        category: "Flashcard Decks",
        items: filteredDecks.map(d => ({ id: d.id, title: d.name, route: `/flashcards?deckId=${d.id}` }))
      })
    }
    
    // 4. Mind Maps
    const filteredMaps = searchData.mindmaps.filter(m => 
      (m.title || "").toLowerCase().includes(q)
    )
    if (filteredMaps.length > 0) {
      results.push({
        category: "Mind Maps",
        items: filteredMaps.map(m => ({ id: m.id, title: m.title, route: `/mindmaps?mapId=${m.id}` }))
      })
    }
    
    // 5. Quizzes
    const filteredQuizzes = searchData.quizzes.filter(qz => 
      (qz.title || "").toLowerCase().includes(q)
    )
    if (filteredQuizzes.length > 0) {
      results.push({
        category: "Quizzes",
        items: filteredQuizzes.map(qz => ({ id: qz.id, title: qz.title, route: `/quizzes?quizId=${qz.id}` }))
      })
    }
    
    // 6. Chat Sessions
    const filteredSessions = searchData.sessions.filter(s => 
      (s.title || "").toLowerCase().includes(q)
    )
    if (filteredSessions.length > 0) {
      results.push({
        category: "Chat Sessions",
        items: filteredSessions.map(s => ({ id: s.id, title: s.title, route: `/chat?sessionId=${s.id}` }))
      })
    }
    
    return results
  }

  // Enforce route protection
  useEffect(() => {
    if (!loading && !user && pathname !== "/") {
      router.push("/login")
    }
  }, [user, loading, router, pathname])

  const flatItems = React.useMemo(() => {
    const groups = getFilteredResults()
    if (!groups) return []
    return groups.flatMap(g => g.items.map(item => ({ ...item, category: g.category })))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, searchData])

  const [selectedIndex, setSelectedIndex] = useState(0)

  // Listen for Cmd+K / Ctrl+K and Esc
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setGlobalSearchOpen(prev => !prev)
        setSearchQuery("")
      } else if (e.key === "Escape") {
        setGlobalSearchOpen(false)
      }
    }
    window.addEventListener("keydown", handleGlobalKeys)
    return () => window.removeEventListener("keydown", handleGlobalKeys)
  }, [])

  // Listen for ArrowUp/ArrowDown/Enter in Spotlight
  useEffect(() => {
    const handleSearchNav = (e: KeyboardEvent) => {
      if (!globalSearchOpen || flatItems.length === 0) return

      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIndex(prev => (prev + 1) % flatItems.length)
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIndex(prev => (prev - 1 + flatItems.length) % flatItems.length)
      } else if (e.key === "Enter") {
        e.preventDefault()
        const selected = flatItems[selectedIndex]
        if (selected) {
          setGlobalSearchOpen(false)
          setSearchQuery("")
          router.push(selected.route)
        }
      }
    }
    window.addEventListener("keydown", handleSearchNav)
    return () => window.removeEventListener("keydown", handleSearchNav)
  }, [globalSearchOpen, flatItems, selectedIndex, router])

  // Reset selected index when search query changes
  useEffect(() => {
    setTimeout(() => {
      setSelectedIndex(0)
    }, 0)
  }, [searchQuery])

  // Sidebar Links
  const navItems: NavItem[] = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "My Library", href: "/library", icon: BookOpen },
    { name: "AI Chat", href: "/chat", icon: MessageSquare },
    { name: "Summaries", href: "/summaries", icon: FileText },
    { name: "Flashcards", href: "/flashcards", icon: Layers },
    { name: "Mind Maps", href: "/mindmaps", icon: GitFork },
    { name: "Quiz Generator", href: "/quizzes", icon: Award },
    { name: "Notes", href: "/notes", icon: StickyNote },
    { name: "Profile", href: "/profile", icon: User },
  ]

  // Close mobile menu when route changes
  useEffect(() => {
    setTimeout(() => {
      setMobileMenuOpen(false)
    }, 0)
  }, [pathname])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-accent animate-pulse flex items-center justify-center shadow-lg shadow-primary/25">
            <span className="text-white font-bold text-lg">S</span>
          </div>
          <div className="absolute -inset-1 rounded-2xl bg-primary/20 animate-ping blur-[2px] pointer-events-none" />
        </div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground animate-pulse">
          Verifying Study Workspace...
        </span>
      </div>
    )
  }

  if (!user) {
    if (pathname === "/") {
      return children
    }
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <span className="text-sm font-medium text-muted-foreground">Redirecting to session...</span>
      </div>
    )
  }

  const userInitials = user.full_name
    ? user.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "U"

  return (
    <div className="min-h-screen bg-background text-foreground flex transition-colors duration-200">
      {/* 1. Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 bg-card border-r border-border flex-col justify-between h-screen sticky top-0 shrink-0">
        <div className="flex flex-col overflow-y-auto pt-6 px-4 space-y-6">
          {/* Logo */}
          <div className="flex items-center space-x-3 px-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-md shadow-primary/20 shrink-0">
              <span className="text-white font-bold text-lg font-display">S</span>
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-tight leading-none text-foreground">StudyMind AI</h1>
              <span className="text-[9px] font-bold text-primary block tracking-wide uppercase mt-1 leading-none">
                AI Learning Workspace
              </span>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/10"
                      : "text-muted-foreground hover:bg-slate-100 hover:text-foreground dark:hover:bg-slate-900"
                  }`}
                >
                  <Icon className={`w-4.5 h-4.5 shrink-0 ${isActive ? "text-current" : "text-muted-foreground group-hover:text-foreground"}`} />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        {/* User profile footer info */}
        <div className="p-4 border-t border-border/60 flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 flex items-center justify-center font-bold text-sm text-primary shrink-0 select-none">
                {userInitials}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold truncate leading-tight text-foreground">{user.full_name || "StudyMind User"}</p>
                <p className="text-[10px] text-muted-foreground truncate leading-none mt-0.5">{user.email}</p>
              </div>
            </div>
          </div>
          
          <button
            onClick={logout}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2 border border-error/20 hover:bg-error/5 text-error text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* 2. Mobile Drawer Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black z-40 md:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed inset-y-0 left-0 w-64 bg-card border-r border-border flex flex-col justify-between z-50 md:hidden"
            >
              <div className="flex flex-col pt-6 px-4 space-y-6 overflow-y-auto">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center shrink-0">
                      <span className="text-white font-bold text-lg font-display">S</span>
                    </div>
                    <div>
                      <h1 className="font-bold text-sm tracking-tight leading-none text-foreground">StudyMind AI</h1>
                      <span className="text-[9px] font-bold text-primary block tracking-wide uppercase mt-1 leading-none">
                        AI Learning Workspace
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1.5 rounded-lg border border-border/80 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <nav className="space-y-1">
                  {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-slate-100 hover:text-foreground dark:hover:bg-slate-900"
                        }`}
                      >
                        <Icon className="w-4.5 h-4.5 shrink-0" />
                        <span>{item.name}</span>
                      </Link>
                    )
                  })}
                </nav>
              </div>

              <div className="p-4 border-t border-border flex flex-col space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center font-bold text-sm text-primary">
                      {userInitials}
                    </div>
                    <div>
                      <p className="text-xs font-semibold leading-tight">{user.full_name}</p>
                      <p className="text-[10px] text-muted-foreground truncate max-w-[130px] leading-none mt-0.5">{user.email}</p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="w-full flex items-center justify-center space-x-2 px-3 py-2 border border-error/20 hover:bg-error/5 text-error text-xs font-semibold rounded-xl cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* 3. Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 bg-background/80 backdrop-blur-md border-b border-border/50 z-30 h-16 flex items-center justify-between px-6 md:px-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -ml-2 rounded-lg border border-border/60 hover:bg-slate-50 dark:hover:bg-slate-900 md:hidden cursor-pointer"
            >
              <Menu className="w-5 h-5 text-muted-foreground hover:text-foreground" />
            </button>
            
            {/* Global search trigger bar */}
            <div className="relative hidden sm:block w-64 md:w-80">
              <button
                onClick={() => setGlobalSearchOpen(true)}
                className="w-full flex items-center justify-between pl-3 pr-2 py-1.5 bg-white dark:bg-slate-900/60 border border-border text-xs text-muted-foreground rounded-lg hover:border-slate-300 dark:hover:border-slate-800 shadow-sm transition-all cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <Search className="w-4 h-4 text-muted-foreground" />
                  <span>Search workspace...</span>
                </div>
                <kbd className="hidden md:inline-flex items-center space-x-0.5 text-[9px] font-bold bg-slate-100 dark:bg-slate-800 border border-border px-1.5 py-0.5 rounded text-muted-foreground select-none">
                  <span>⌘</span>
                  <span>K</span>
                </kbd>
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Display institution context */}
            {user.institution && (
              <div className="hidden lg:flex items-center space-x-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold text-primary tracking-wide uppercase">
                <span>🏫</span>
                <span>{user.institution}</span>
              </div>
            )}
            
            <div className="w-8 h-8 rounded-full bg-primary/15 font-bold text-xs text-primary flex items-center justify-center select-none border border-primary/20">
              {userInitials}
            </div>
          </div>
        </header>

        {/* Main Panel Viewport */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* 4. SPOTLIGHT SEARCH MODAL */}
      <AnimatePresence>
        {globalSearchOpen && (
          <div className="fixed inset-0 bg-black/45 dark:bg-black/60 backdrop-blur-sm z-[9999] flex items-start justify-center pt-[15vh] p-4">
            {/* Click outside to close */}
            <div className="fixed inset-0" onClick={() => setGlobalSearchOpen(false)} />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: -8 }}
              transition={{ duration: 0.15 }}
              className="relative bg-card border border-border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[60vh] z-10"
            >
              {/* Spotlight Input Header */}
              <div className="flex items-center px-4 border-b border-border/80 py-3.5 bg-slate-50/30 dark:bg-slate-900/10">
                <Search className="w-4.5 h-4.5 text-muted-foreground shrink-0 mr-3" />
                <input
                  type="text"
                  placeholder="Search notes, documents, quizzes, mind maps..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border-none text-xs text-foreground placeholder-muted-foreground focus:outline-none"
                  autoFocus
                />
                <button
                  onClick={() => setGlobalSearchOpen(false)}
                  className="text-muted-foreground hover:text-foreground text-[10px] font-semibold border border-border bg-card px-2 py-0.5 rounded cursor-pointer"
                >
                  ESC
                </button>
              </div>

              {/* Scrollable Results list */}
              <div className="flex-1 overflow-y-auto p-2.5">
                {(() => {
                  const groups = getFilteredResults()
                  if (searchQuery.trim() === "") {
                    return (
                      <div className="text-center py-10 text-xs text-muted-foreground space-y-2">
                        <Search className="w-8 h-8 mx-auto text-muted-foreground/35 animate-pulse" />
                        <p className="font-bold text-foreground">Search StudyMind Workspace</p>
                        <p className="text-[10px] max-w-xs mx-auto">Type anything to quickly query your library, notes logs, card decks, maps, or quizzes.</p>
                      </div>
                    )
                  }
                  if (!groups || groups.length === 0) {
                    return (
                      <div className="text-xs text-muted-foreground text-center py-10">
                        No results found for &quot;{searchQuery}&quot;
                      </div>
                    )
                  }

                  let currentFlatIdx = 0
                  return groups.map((group) => (
                    <div key={group.category} className="space-y-1 mb-3 last:mb-0">
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block px-2.5 mb-1.5">
                        {group.category}
                      </span>
                      <div className="space-y-0.5">
                        {group.items.map((item) => {
                          const itemFlatIdx = currentFlatIdx++
                          const isSelected = selectedIndex === itemFlatIdx
                          return (
                            <button
                              key={`${group.category}-${item.route}-${itemFlatIdx}`}
                              onClick={() => {
                                setGlobalSearchOpen(false)
                                setSearchQuery("")
                                router.push(item.route)
                              }}
                              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold truncate flex items-center justify-between transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-primary text-white shadow shadow-primary/10"
                                  : "text-foreground hover:bg-slate-50 dark:hover:bg-slate-900/50"
                              }`}
                            >
                              <span>{highlightMatch(item.title, searchQuery, isSelected)}</span>
                              {isSelected && (
                                <kbd className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded text-white font-bold select-none">
                                  ⏎
                                </kbd>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))
                })()}
              </div>

              {/* Hotkey Helper Footer */}
              <div className="px-4 py-2.5 border-t border-border/80 bg-slate-50/40 dark:bg-slate-900/10 flex items-center justify-between text-[9px] font-semibold text-muted-foreground">
                <div className="flex items-center space-x-3">
                  <span className="flex items-center space-x-1">
                    <kbd className="bg-card border px-1 rounded">↑↓</kbd>
                    <span>to navigate</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <kbd className="bg-card border px-1 rounded">⏎</kbd>
                    <span>to open</span>
                  </span>
                </div>
                <div>
                  <kbd className="bg-card border px-1 rounded">Esc</kbd>
                  <span> to close</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
