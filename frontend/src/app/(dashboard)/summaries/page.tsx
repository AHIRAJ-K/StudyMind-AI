/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import React, { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { useToast } from "@/context/toast-context"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import {
  FileText,
  Sparkles,
  Save,
  FileCheck,
  Loader2,
  AlertCircle
} from "lucide-react"

interface Document {
  id: number
  title: string
}

export default function SummariesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlDocId = searchParams.get("docId")
  const { toast } = useToast()

  const [documents, setDocuments] = useState<Document[]>([])
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null)
  
  // Summary Form states
  const [summaryType, setSummaryType] = useState("bullet")
  const [summary, setSummary] = useState<string | null>(null)
  
  // Loading & Alert state
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [savingNote, setSavingNote] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    async function loadDocs() {
      try {
        const data = await api.get<Document[]>("/documents")
        setDocuments(data)
        if (urlDocId) {
          setSelectedDocId(parseInt(urlDocId))
        } else if (data.length > 0) {
          setSelectedDocId(data[0].id)
        }
      } catch (err) {
        console.error("Failed to load documents:", err)
        setError("Error loading documents list.")
      } finally {
        setLoading(false)
      }
    }
    loadDocs()
  }, [urlDocId])

  const handleGenerateSummary = async () => {
    if (!selectedDocId) {
      setError("Please select a document from your library.")
      return
    }

    setGenerating(true)
    setError(null)
    setSuccess(null)
    setSummary(null)

    try {
      const response = await api.post<{ summary: string }>(
        `/documents/${selectedDocId}/summarize?summary_type=${summaryType}`
      )
      setSummary(response.summary)
      toast.success("Summary generated successfully.")
    } catch (err: any) {
      setError(err.message || "Failed to generate AI summary.")
      toast.error(err.message || "Failed to generate AI summary.")
    } finally {
      setGenerating(false)
    }
  }

  const handleSaveAsNote = async () => {
    if (!summary || !selectedDocId) return

    setSavingNote(true)
    setError(null)
    setSuccess(null)

    const docTitle = documents.find((d) => d.id === selectedDocId)?.title || "Document"
    
    try {
      const noteTitle = `${summaryType.toUpperCase()} Summary: ${docTitle}`
      await api.post("/notes", {
        title: noteTitle,
        content: `### Generated Summary for ${docTitle}\n\nType: **${summaryType}**\n\n---\n\n${summary}`,
        tags: ["summary", summaryType]
      })
      setSuccess("Summary successfully converted to a new study note.")
      toast.success("Summary exported to Study Notes.")
      router.push("/notes")
    } catch (err: any) {
      setError(err.message || "Failed to export summary as note.")
      toast.error(err.message || "Failed to export summary as note.")
    } finally {
      setSavingNote(false)
    }
  }

  const summaryFormats = [
    { type: "bullet", label: "Key Bullet Points", emoji: "📌" },
    { type: "short", label: "Quick Paragraph", emoji: "📝" },
    { type: "detailed", label: "Comprehensive Breakdown", emoji: "📚" },
    { type: "chapter", label: "Section Summaries", emoji: "📖" },
    { type: "exam", label: "Exam Study Notes", emoji: "🎓" },
    { type: "one-line", label: "One-line Gist", emoji: "⚡" },
  ]

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
        {/* Header Skeleton */}
        <div className="space-y-2">
          <div className="w-48 h-6 bg-muted rounded-lg" />
          <div className="w-72 h-4 bg-muted rounded-full" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left panel Skeleton */}
          <div className="md:col-span-5 space-y-4 bg-card border border-border/80 rounded-2xl p-6">
            <div className="w-32 h-4 bg-muted rounded-full" />
            <div className="w-full h-9 bg-muted rounded-lg" />
            
            <div className="w-32 h-4 bg-muted rounded-full" />
            <div className="grid grid-cols-2 gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 bg-muted/40 rounded-lg border border-border/40" />
              ))}
            </div>
            <div className="w-full h-10 bg-muted rounded-lg mt-4" />
          </div>

          {/* Right panel Skeleton */}
          <div className="md:col-span-7 bg-card border border-border/80 rounded-2xl p-6 h-96 flex flex-col justify-between">
            <div className="w-24 h-4 bg-muted rounded-full" />
            <div className="flex-1 space-y-3 mt-6">
              <div className="w-[90%] h-4 bg-muted rounded-full" />
              <div className="w-[85%] h-4 bg-muted rounded-full" />
              <div className="w-[95%] h-4 bg-muted rounded-full" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold font-display tracking-tight text-foreground">AI Summaries</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Generate structured learning guide breakdowns from your documents
        </p>
      </div>

      {/* Main Grid: Selector Column and Result Display Column */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Configurations Box (5 Cols) */}
        <div className="md:col-span-4 bg-card border border-border rounded-xl p-5 space-y-5 shadow-sm">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              Select Document
            </label>
            {documents.length === 0 ? (
              <div className="text-xs text-muted-foreground p-3 border border-dashed rounded-lg text-center">
                No documents found. Please upload a file to your{" "}
                <span
                  onClick={() => router.push("/library")}
                  className="text-primary hover:underline font-semibold cursor-pointer"
                >
                  Library
                </span>{" "}
                first.
              </div>
            ) : (
              <select
                value={selectedDocId || ""}
                onChange={(e) => {
                  setSelectedDocId(e.target.value ? parseInt(e.target.value) : null)
                  setSummary(null)
                  setError(null)
                  setSuccess(null)
                }}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm transition-all"
              >
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              Summary Format
            </label>
            <div className="space-y-1.5">
              {summaryFormats.map((fmt) => (
                <button
                  key={fmt.type}
                  onClick={() => {
                    setSummaryType(fmt.type)
                    setSummary(null)
                  }}
                  className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl border text-xs font-medium transition-all text-left ${
                    summaryType === fmt.type
                      ? "bg-primary/5 border-primary text-primary"
                      : "border-border bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-900 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>{fmt.emoji}</span>
                  <span>{fmt.label}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleGenerateSummary}
            disabled={generating || !selectedDocId}
            className="w-full py-3 bg-primary hover:bg-primary/95 disabled:bg-primary/45 text-white text-xs font-bold rounded-xl shadow-md shadow-primary/10 hover:shadow-primary/20 flex items-center justify-center space-x-2 cursor-pointer transition-all"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating Summary...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate Summary</span>
              </>
            )}
          </button>
        </div>

        {/* Viewport Box (8 Cols) */}
        <div className="md:col-span-8 flex flex-col space-y-4">
          {error && (
            <div className="p-4 rounded-xl bg-error/10 border border-error/20 flex items-start space-x-3 text-error text-xs">
              <AlertCircle className="w-4.5 h-4.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-4 rounded-xl bg-success/10 border border-success/20 flex items-start space-x-3 text-success text-xs">
              <FileCheck className="w-4.5 h-4.5 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <div className="bg-card border border-border rounded-xl p-6 shadow-sm min-h-[300px] flex flex-col relative overflow-hidden">
            {generating ? (
              <div className="m-auto flex flex-col items-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground font-semibold">Gemini is writing the summary...</p>
              </div>
            ) : summary ? (
              <div className="space-y-4 flex flex-col h-full">
                {/* Exporter Toolbar */}
                <div className="flex justify-between items-center border-b border-border/50 pb-4 mb-2">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4.5 h-4.5 text-primary" />
                    <span className="text-xs font-bold text-foreground uppercase tracking-wide">
                      {summaryType} Summary Results
                    </span>
                  </div>
                  <button
                    onClick={handleSaveAsNote}
                    disabled={savingNote}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white text-[10px] font-bold rounded-lg shadow-sm cursor-pointer transition-all"
                  >
                    {savingNote ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Save className="w-3 h-3" />
                    )}
                    <span>Save as Note</span>
                  </button>
                </div>
                
                {/* Scrollable Summary Markdown rendering */}
                <div className="overflow-y-auto max-h-[450px] pr-1 leading-relaxed text-xs text-foreground space-y-2">
                  <div className="markdown-content space-y-2">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {summary}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            ) : (
              <div className="m-auto flex flex-col items-center justify-center text-center text-muted-foreground space-y-4 max-w-sm p-6">
                <div className="p-4 bg-primary/10 rounded-full text-primary shadow-lg shadow-primary/10">
                  <FileText className="w-8 h-8" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="font-bold text-xs text-foreground">No Summary Generated</h4>
                  <p className="text-[10px] leading-normal text-muted-foreground">
                    Select a course document and a summary format style in the left sidebar, then click Generate to let Gemini outline the concepts.
                  </p>
                </div>
                <button
                  onClick={handleGenerateSummary}
                  className="px-4 py-2 bg-primary hover:bg-primary/95 text-white text-[11px] font-bold rounded-xl shadow-md shadow-primary/15 hover:shadow-primary/25 transition-all cursor-pointer"
                >
                  Generate Summary
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
