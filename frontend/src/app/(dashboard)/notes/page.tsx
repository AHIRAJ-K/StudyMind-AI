/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import React, { useState, useEffect, useRef } from "react"
import { api } from "@/lib/api"
import { useSearchParams } from "next/navigation"
import { formatDate } from "@/lib/utils"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import {
  StickyNote,
  Plus,
  Trash2,
  Pin,
  Tag,
  Eye,
  Edit,
  Search,
  Loader2,
  AlertCircle
} from "lucide-react"

interface Note {
  id: number
  title: string
  content: string | null
  is_pinned: boolean
  tags: string[]
  created_at: string
  updated_at: string
}

export default function NotesPage() {
  // Lists
  const [notes, setNotes] = useState<Note[]>([])
  
  // Selection
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  
  // Editor values
  const [noteTitle, setNoteTitle] = useState("")
  const [noteContent, setNoteContent] = useState("")
  const [notePinned, setNotePinned] = useState(false)
  const [noteTags, setNoteTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  
  // Status states
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [editorMode, setEditorMode] = useState<"write" | "preview">("write")
  const [saveStatus, setSaveStatus] = useState<"idle" | "typing" | "saving" | "saved">("idle")
  const [error, setError] = useState<string | null>(null)

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const searchParams = useSearchParams()
  const urlNoteId = searchParams.get("noteId")

  // Derived state for local search
  const query = searchQuery.trim().toLowerCase()
  const filteredNotes = query
    ? notes.filter(
        (n) =>
          n.title.toLowerCase().includes(query) ||
          (n.content && n.content.toLowerCase().includes(query))
      )
    : notes

  // Trigger API update
  const triggerAutosave = async (noteId?: number) => {
    const activeId = noteId || selectedNote?.id
    if (!activeId) return

    setSaveStatus("saving")
    try {
      const updated = await api.put<Note>(`/notes/${activeId}`, {
        title: noteTitle,
        content: noteContent,
        is_pinned: notePinned,
        tags: noteTags
      })
      
      // Update list silently
      setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)))
      setSaveStatus("saved")
    } catch (err: any) {
      console.error("Autosave error:", err)
      setSaveStatus("idle")
    }
  }

  const handleSelectNote = (note: Note) => {
    // Save active timeout if switching notes to prevent lost draft updates
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
      triggerAutosave(selectedNote?.id)
    }

    setSelectedNote(note)
    setNoteTitle(note.title)
    setNoteContent(note.content || "")
    setNotePinned(note.is_pinned)
    setNoteTags(note.tags || [])
    setEditorMode("write")
    setSaveStatus("idle")
  }

  // Create new blank note
  const handleCreateNote = async () => {
    try {
      const newNote = await api.post<Note>("/notes", {
        title: "Untitled Study Note",
        content: "# New Study Note\n\nStart writing notes here...",
        tags: ["draft"]
      })
      setNotes((prev) => [newNote, ...prev])
      handleSelectNote(newNote)
      setError(null)
    } catch {
      setError("Failed to create new note.")
    }
  }

  // Delete note
  const handleDeleteNote = async (noteId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm("Are you sure you want to delete this note?")) return

    try {
      await api.delete(`/notes/${noteId}`)
      setNotes((prev) => prev.filter((n) => n.id !== noteId))
      if (selectedNote?.id === noteId) {
        setSelectedNote(null)
      }
      setError(null)
    } catch {
      setError("Failed to delete note.")
    }
  }

  // Fetch all notes
  const fetchNotes = async (selectFirst = false) => {
    try {
      const data = await api.get<Note[]>("/notes")
      setNotes(data)

      if (urlNoteId) {
        const match = data.find((n) => n.id === parseInt(urlNoteId))
        if (match) {
          setTimeout(() => {
            handleSelectNote(match)
          }, 0)
          return
        }
      }

      if (selectFirst && data.length > 0 && !selectedNote) {
        setTimeout(() => {
          handleSelectNote(data[0])
        }, 0)
      }
    } catch {
      setError("Failed to load study notes.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setTimeout(() => {
      fetchNotes(true)
    }, 0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (urlNoteId && notes.length > 0) {
      const match = notes.find((n) => n.id === parseInt(urlNoteId))
      if (match) {
        setTimeout(() => {
          handleSelectNote(match)
        }, 0)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlNoteId, notes])

  // Effect to handle autosave timers
  useEffect(() => {
    if (!selectedNote) return
    
    // Check if anything actually changed
    const titleChanged = noteTitle !== selectedNote.title
    const contentChanged = noteContent !== (selectedNote.content || "")
    const pinChanged = notePinned !== selectedNote.is_pinned
    const tagsChanged = JSON.stringify(noteTags) !== JSON.stringify(selectedNote.tags)
    
    if (!titleChanged && !contentChanged && !pinChanged && !tagsChanged) {
      return
    }

    setTimeout(() => {
      setSaveStatus("typing")
    }, 0)

    // Clear active timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Set new timeout for 1.5 seconds
    saveTimeoutRef.current = setTimeout(() => {
      triggerAutosave()
    }, 1500)

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteTitle, noteContent, notePinned, noteTags])

  // Pinned/Unpinned action toggle
  const togglePin = () => {
    setNotePinned((prev) => !prev)
  }

  // Tag list helpers
  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault()
    const cleanTag = tagInput.trim().toLowerCase()
    if (cleanTag && !noteTags.includes(cleanTag)) {
      setNoteTags((prev) => [...prev, cleanTag])
      setTagInput("")
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setNoteTags((prev) => prev.filter((t) => t !== tagToRemove))
  }

  if (loading) {
    return (
      <div className="h-[calc(100vh-10rem)] max-w-6xl mx-auto flex border border-border bg-card rounded-2xl overflow-hidden shadow-sm animate-pulse">
        {/* LEFT COLUMN Skeleton */}
        <aside className="w-72 border-r border-border flex flex-col justify-between shrink-0 bg-white dark:bg-slate-900/10 p-4 space-y-4">
          <div className="flex justify-between items-center">
            <div className="w-24 h-4 bg-muted rounded-full" />
            <div className="w-6 h-6 bg-muted rounded-lg" />
          </div>
          <div className="w-full h-8 bg-muted rounded-lg" />
          <div className="space-y-2 flex-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-3 border border-border/40 rounded-xl space-y-2 h-16 flex flex-col justify-between" />
            ))}
          </div>
        </aside>

        {/* RIGHT COLUMN Skeleton */}
        <main className="flex-1 flex flex-col bg-slate-50/10 p-6 space-y-6">
          <div className="flex justify-between items-center">
            <div className="w-48 h-6 bg-muted rounded-lg" />
            <div className="w-12 h-6 bg-muted rounded-lg" />
          </div>
          <div className="w-32 h-4 bg-muted rounded-full" />
          <div className="flex space-x-2">
            <div className="w-16 h-6 bg-muted rounded-full" />
            <div className="w-16 h-6 bg-muted rounded-full" />
          </div>
          <div className="flex-1 border border-border/40 rounded-xl p-4 bg-card space-y-3">
            <div className="w-[90%] h-4 bg-muted rounded-full" />
            <div className="w-[85%] h-4 bg-muted rounded-full" />
            <div className="w-[95%] h-4 bg-muted rounded-full" />
            <div className="w-[40%] h-4 bg-muted rounded-full" />
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-10rem)] max-w-6xl mx-auto flex border border-border bg-card rounded-2xl overflow-hidden shadow-sm">
      {/* LEFT COLUMN: Notes Directory List */}
      <aside className="w-72 border-r border-border flex flex-col justify-between shrink-0 bg-white dark:bg-slate-900/10">
        <div className="p-4 flex flex-col space-y-4 overflow-y-auto">
          {/* Header Action Row */}
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Study Notes ({notes.length})
            </span>
            <button
              onClick={handleCreateNote}
              className="p-1.5 rounded-lg border border-border bg-white hover:bg-slate-50 dark:hover:bg-slate-900 text-primary cursor-pointer shadow-sm"
              title="Create note"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Local Search Input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search note contents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-border text-xs text-foreground placeholder-muted-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm transition-all"
            />
          </div>

          {/* Notes Stack */}
          <div className="space-y-1.5 max-h-[350px] overflow-y-auto pr-1">
            {filteredNotes.length === 0 ? (
              <p className="text-[10px] text-muted-foreground text-center py-8">No notes found.</p>
            ) : (
              filteredNotes.map((note) => {
                const isActive = selectedNote?.id === note.id
                return (
                  <div
                    key={note.id}
                    onClick={() => handleSelectNote(note)}
                    className={`flex items-start justify-between p-3 rounded-xl border text-xs font-semibold cursor-pointer group transition-all ${
                      isActive
                        ? "bg-slate-50 dark:bg-slate-900 border-border text-foreground shadow-sm"
                        : "border-transparent text-muted-foreground hover:bg-slate-50/80 hover:text-foreground dark:hover:bg-slate-900/20"
                    }`}
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center space-x-1.5">
                        {note.is_pinned && <Pin className="w-3 h-3 text-primary shrink-0 fill-current" />}
                        <h4 className="truncate font-bold text-foreground text-xs">{note.title}</h4>
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate leading-normal">
                        {note.content ? note.content.replace(/[#*`_-]/g, "").slice(0, 40) : "Empty note..."}
                      </p>
                      <span className="text-[9px] text-muted-foreground font-medium block">
                        {formatDate(note.updated_at)}
                      </span>
                    </div>
                    
                    <button
                      onClick={(e) => handleDeleteNote(note.id, e)}
                      className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-slate-200 dark:hover:bg-slate-800 text-muted-foreground hover:text-error transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </aside>

      {/* RIGHT COLUMN: The Notion Editor Area */}
      <section className="flex-1 flex flex-col bg-card min-w-0">
        {selectedNote ? (
          <div className="flex-1 flex flex-col">
            {/* Editor Toolbar Header */}
            <div className="h-14 border-b border-border/60 px-6 flex items-center justify-between bg-slate-50/20 dark:bg-slate-900/10">
              <div className="flex items-center space-x-3 text-xs">
                {/* Pin note button */}
                <button
                  onClick={togglePin}
                  className={`p-1.5 rounded-lg border border-border hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition-colors ${
                    notePinned ? "text-primary bg-primary/5 border-primary/20 fill-current" : "text-muted-foreground"
                  }`}
                  title={notePinned ? "Pinned note" : "Pin note"}
                >
                  <Pin className="w-3.5 h-3.5" />
                </button>
                
                {/* Write/Preview toggles */}
                <div className="flex items-center space-x-1 bg-slate-50 dark:bg-slate-900 p-0.5 rounded-lg border border-border">
                  <button
                    onClick={() => setEditorMode("write")}
                    className={`flex items-center space-x-1 px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${
                      editorMode === "write" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Edit className="w-3 h-3" />
                    <span>Write</span>
                  </button>
                  <button
                    onClick={() => setEditorMode("preview")}
                    className={`flex items-center space-x-1 px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${
                      editorMode === "preview" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Eye className="w-3 h-3" />
                    <span>Preview</span>
                  </button>
                </div>
              </div>

              {/* Autosave Status indicators */}
              <div className="flex items-center space-x-2 text-[10px] font-semibold">
                {saveStatus === "typing" && (
                  <span className="text-amber-500 flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                    <span>Saving draft...</span>
                  </span>
                )}
                {saveStatus === "saving" && (
                  <span className="text-blue-500 flex items-center space-x-1">
                    <Loader2 className="w-3 h-3 animate-spin text-primary" />
                    <span>Syncing...</span>
                  </span>
                )}
                {saveStatus === "saved" && (
                  <span className="text-emerald-500 flex items-center space-x-1 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    <span>✓</span>
                    <span>Autosaved</span>
                  </span>
                )}
              </div>
            </div>

            {/* Note Editor Viewport */}
            <div className="flex-1 p-6 flex flex-col space-y-4 overflow-y-auto">
              {error && (
                <div className="p-3 bg-error/10 border border-error/20 text-error text-xs rounded-xl flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}

              {/* Title input */}
              <input
                type="text"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="Name your study note..."
                className="w-full text-lg font-bold border-none text-foreground bg-transparent placeholder-muted-foreground focus:outline-none"
              />

              {/* Tags Panel */}
              <div className="flex flex-wrap items-center gap-1.5 border-b border-border/40 pb-3">
                <Tag className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                {noteTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center space-x-1 px-2.5 py-0.5 bg-slate-50 dark:bg-slate-900 border border-border text-[9px] font-bold text-muted-foreground rounded-full shadow-sm"
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="text-muted-foreground hover:text-error text-xs font-black line-none"
                    >
                      ×
                    </button>
                  </span>
                ))}
                
                {/* Inline tag adder */}
                <form onSubmit={handleAddTag} className="inline-flex">
                  <input
                    type="text"
                    placeholder="+ Tag"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    className="bg-transparent border-none text-[10px] text-foreground focus:outline-none placeholder-muted-foreground w-12"
                  />
                </form>
              </div>

              {/* Editor Workspace toggle write / preview */}
              <div className="flex-1 flex flex-col min-h-0 text-xs">
                {editorMode === "write" ? (
                  <textarea
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Write detailed markdown concepts, formula derivations, summaries or notes..."
                    className="w-full flex-1 resize-none bg-transparent text-foreground border-none focus:outline-none leading-relaxed placeholder-muted-foreground min-h-[300px]"
                  />
                ) : (
                  <div className="flex-1 overflow-y-auto pr-1 leading-relaxed text-foreground markdown-content">
                    <div className="markdown-content space-y-2">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {noteContent || "_No content. Toggle Write mode to edit notes._"}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="m-auto flex flex-col items-center justify-center text-center text-muted-foreground space-y-4 max-w-sm p-6">
            <div className="p-4 bg-primary/10 rounded-full text-primary">
              <StickyNote className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <h4 className="font-bold text-xs text-foreground">Active Note Empty</h4>
              <p className="text-[10px] leading-normal text-muted-foreground">
                Select a document-derived summary or created study draft from the sidebar panel, or click write new to open a clean canvas editor.
              </p>
            </div>
            <button
              onClick={handleCreateNote}
              className="px-4 py-2 bg-primary hover:bg-primary/95 text-white text-[11px] font-bold rounded-xl shadow-md shadow-primary/15 hover:shadow-primary/25 transition-all cursor-pointer"
            >
              Create Study Note
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
