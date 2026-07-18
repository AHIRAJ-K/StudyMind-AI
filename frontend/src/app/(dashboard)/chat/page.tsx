/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import React, { useState, useEffect, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { api } from "@/lib/api"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import {
  MessageSquare,
  Send,
  Bot,
  User,
  Paperclip,
  Trash2,
  FileText,
  Loader2,
  Plus
} from "lucide-react"

interface Message {
  id?: number
  role: "user" | "assistant"
  content: string
  created_at?: string
}

interface ChatSession {
  id: number
  title: string
  document_id: number | null
}

interface Document {
  id: number
  title: string
}

export default function ChatPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlDocId = searchParams.get("docId")
  const urlSessionId = searchParams.get("sessionId")

  // List states
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  
  // Selected items
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null)
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null)
  
  // Active Chat Messages
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  
  // Layout States
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [streaming, setStreaming] = useState(false)
  const [activeStreamText, setActiveStreamText] = useState("")
  const [error, setError] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const handleSelectSession = async (session: ChatSession) => {
    setError(null)
    setActiveSession(session)
    setSelectedDocId(session.document_id)
    try {
      const detailedSession = await api.get<{ messages: Message[] }>(`/chats/sessions/${session.id}`)
      setMessages(detailedSession.messages)
    } catch {
      setError("Failed to load message history.")
    }
  }

  const handleCreateSession = async (title: string, docId: number | null = null) => {
    setError(null)
    try {
      const newSession = await api.post<ChatSession>("/chats/sessions", {
        title,
        document_id: docId
      })
      setSessions((prev) => [newSession, ...prev])
      setActiveSession(newSession)
      setSelectedDocId(docId)
      setMessages([])
    } catch {
      setError("Failed to create new chat session.")
    }
  }

  const handleDeleteSession = async (sessionId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm("Delete this chat session permanently?")) return
    try {
      await api.delete(`/chats/sessions/${sessionId}`)
      setSessions((prev) => prev.filter((s) => s.id !== sessionId))
      if (activeSession?.id === sessionId) {
        setActiveSession(null)
        setMessages([])
      }
    } catch {
      setError("Failed to delete chat session.")
    }
  }

  // Load chat sessions and library items on mount
  useEffect(() => {
    async function loadData() {
      try {
        const docsData = await api.get<Document[]>("/documents")
        setDocuments(docsData)
        
        const sessionsData = await api.get<ChatSession[]>("/chats/sessions")
        setSessions(sessionsData)
        setSessionsLoading(false)

        // Handle URL trigger to start/select chat
        if (urlSessionId) {
          const sessionIdNum = parseInt(urlSessionId)
          const match = sessionsData.find((s) => s.id === sessionIdNum)
          if (match) {
            handleSelectSession(match)
          }
        } else if (urlDocId) {
          const docIdNum = parseInt(urlDocId)
          setSelectedDocId(docIdNum)
          
          // Check if there is an existing session for this document
          const match = sessionsData.find((s) => s.document_id === docIdNum)
          if (match) {
            handleSelectSession(match)
          } else {
            // Auto start a session for this doc
            const doc = docsData.find((d) => d.id === docIdNum)
            await handleCreateSession(doc?.title ? `Chat about: ${doc.title}` : "Document Chat", docIdNum)
          }
        } else if (sessionsData.length > 0) {
          handleSelectSession(sessionsData[0])
        }
      } catch (err: any) {
        console.error("Failed to load chat workspace:", err)
        setError("Error loading chat workspace.")
      }
    }
    loadData()
  }, [urlDocId, urlSessionId])

  useEffect(() => {
    if (urlSessionId && sessions.length > 0) {
      const match = sessions.find((s) => s.id === parseInt(urlSessionId))
      if (match) {
        setTimeout(() => {
          handleSelectSession(match)
        }, 0)
      }
    }
  }, [urlSessionId, sessions])

  // Scroll to bottom of message list
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, activeStreamText])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || streaming) return

    let session = activeSession
    
    // 1. If no active session, create one
    if (!session) {
      const activeDoc = documents.find((d) => d.id === selectedDocId)
      const title = activeDoc ? `Chat: ${activeDoc.title}` : `Chat - ${inputValue.slice(0, 20)}...`
      try {
        const newSession = await api.post<ChatSession>("/chats/sessions", {
          title,
          document_id: selectedDocId
        })
        setSessions((prev) => [newSession, ...prev])
        session = newSession
        setActiveSession(newSession)
      } catch {
        setError("Failed to start session.")
        return
      }
    }

    const userMessageContent = inputValue.trim()
    setInputValue("")
    
    // Append user message directly to UI
    const userMsg: Message = { role: "user", content: userMessageContent }
    setMessages((prev) => [...prev, userMsg])
    
    setStreaming(true)
    setActiveStreamText("")

    // Call SSE streaming service
    let accumulatedText = ""
    await api.stream(
      `/chats/sessions/${session.id}/stream`,
      { content: userMessageContent },
      // onChunk
      (textChunk) => {
        accumulatedText += textChunk
        setActiveStreamText(accumulatedText)
        scrollToBottom()
      },
      // onComplete
      async () => {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: accumulatedText }
        ])
        setActiveStreamText("")
        setStreaming(false)
        
        try {
          const sessionsData = await api.get<ChatSession[]>("/chats/sessions")
          setSessions(sessionsData)
          const updatedSession = sessionsData.find((s) => s.id === session.id)
          if (updatedSession) {
            setActiveSession(updatedSession)
          }
        } catch (err) {
          console.error("Failed to refresh sessions:", err)
        }
        setTimeout(scrollToBottom, 50)
      },
      // onError
      (err) => {
        if (accumulatedText) {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: accumulatedText }
          ])
        }
        setError(err.message || "Failed to generate AI stream.")
        setStreaming(false)
        setActiveStreamText("")
        setTimeout(scrollToBottom, 50)
      }
    )
  }

  return (
    <div className="h-[calc(100vh-10rem)] max-w-6xl mx-auto flex border border-border bg-card rounded-2xl overflow-hidden shadow-sm">
      {/* LEFT SIDEBAR: Conversations List */}
      <aside className="w-64 border-r border-border flex flex-col justify-between shrink-0 bg-white dark:bg-slate-900/10">
        <div className="p-4 flex flex-col space-y-4 overflow-y-auto">
          <button
            onClick={() => handleCreateSession("New Chat Session", selectedDocId)}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-primary/10 hover:bg-primary/15 text-primary text-xs font-semibold rounded-xl border border-primary/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </button>

          {/* Sessions List */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block px-2 mb-2">
              Recent Chats
            </span>
            
            {sessionsLoading ? (
              <div className="space-y-1.5 animate-pulse">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-9 w-full bg-muted/40 border border-border/30 rounded-xl" />
                ))}
              </div>
            ) : sessions.length === 0 ? (
              <p className="text-[10px] text-muted-foreground text-center py-6">No chat sessions found.</p>
            ) : (
              sessions.map((s) => {
                const isActive = activeSession?.id === s.id
                return (
                  <div
                    key={s.id}
                    onClick={() => handleSelectSession(s)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold cursor-pointer group transition-all ${
                      isActive
                        ? "bg-slate-50 dark:bg-slate-900 border border-border text-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-slate-50 hover:text-foreground dark:hover:bg-slate-900/50"
                    }`}
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      <MessageSquare className="w-4 h-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{s.title}</span>
                    </div>
                    
                    <button
                      onClick={(e) => handleDeleteSession(s.id, e)}
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

        {/* Selected Document Indicator */}
        <div className="p-4 border-t border-border bg-white dark:bg-slate-900/20 text-xs">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
            Focus Document
          </label>
          <select
            value={selectedDocId || ""}
            onChange={async (e) => {
              const val = e.target.value ? parseInt(e.target.value) : null
              setSelectedDocId(val)
              if (activeSession) {
                try {
                  const updatedSession = await api.patch<ChatSession>(`/chats/sessions/${activeSession.id}`, {
                    document_id: val
                  })
                  setActiveSession(updatedSession)
                  setSessions((prev) =>
                    prev.map((s) => (s.id === updatedSession.id ? updatedSession : s))
                  )
                } catch (err: any) {
                  setError("Failed to update chat focus document.")
                  console.error(err)
                }
              }
            }}
            className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-card text-foreground focus:outline-none"
          >
            <option value="">General Knowledge (No File)</option>
            {documents.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
        </div>
      </aside>

      {/* RIGHT SIDEBAR: Chat Pane */}
      <section className="flex-1 flex flex-col bg-card min-w-0 relative">
        {/* Top title bar */}
        <div className="h-14 border-b border-border/60 px-6 flex items-center justify-between bg-slate-50/20 dark:bg-slate-900/10">
          <div className="flex items-center space-x-2">
            <Bot className="w-5 h-5 text-primary" />
            <h3 className="text-xs font-bold text-foreground">
              {activeSession ? activeSession.title : "StudyMind AI Chatbot"}
            </h3>
          </div>
          {selectedDocId && (
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-[10px] font-bold text-teal-600 dark:text-teal-400">
              <FileText className="w-3.5 h-3.5" />
              <span className="truncate max-w-[120px]">
                {documents.find((d) => d.id === selectedDocId)?.title}
              </span>
            </div>
          )}
        </div>

        {/* Message bubble stream viewport */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3.5 bg-error/10 border border-error/20 text-error text-xs rounded-xl flex items-center space-x-2">
              <Plus className="w-4 h-4 rotate-45 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {messages.length === 0 && !streaming && (
            <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground space-y-4 max-w-sm mx-auto p-6">
              <div className="p-4 bg-primary/10 rounded-full text-primary shadow-lg shadow-primary/10 animate-pulse">
                <MessageSquare className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h4 className="font-bold text-xs text-foreground">AI Chat Assistant</h4>
                <p className="text-[10px] leading-normal text-muted-foreground">
                  {selectedDocId
                    ? "Grounded on your active document. Ask me to extract formulas, summarize chapters, or quiz you on content details."
                    : "No document active. Start a new general study workspace topic, or query historical notes definitions."}
                </p>
              </div>
            </div>
          )}

          {messages.map((msg, idx) => {
            const isAI = msg.role === "assistant"
            return (
              <div
                key={idx}
                className={`flex space-x-3.5 ${isAI ? "justify-start" : "justify-end"}`}
              >
                {isAI && (
                  <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                    <Bot className="w-4.5 h-4.5" />
                  </div>
                )}
                <div className="max-w-[80%] flex flex-col space-y-1">
                  <div
                    className={`rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                      isAI
                        ? "bg-slate-100 dark:bg-slate-900 border border-border/60 text-foreground"
                        : "bg-primary text-white"
                    }`}
                  >
                    <div className="markdown-content space-y-2">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                  <span className={`text-[9px] text-muted-foreground ${isAI ? "text-left ml-2" : "text-right mr-2"}`}>
                    {isAI ? "Gemini 1.5 Pro" : "You"}
                  </span>
                </div>
                {!isAI && (
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-900 border border-border flex items-center justify-center shrink-0">
                    <User className="w-4.5 h-4.5 text-muted-foreground" />
                  </div>
                )}
              </div>
            )
          })}

          {/* Active Streaming Chunk bubble */}
          {streaming && activeStreamText && (
            <div className="flex space-x-3.5 justify-start">
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                <Bot className="w-4.5 h-4.5" />
              </div>
              <div className="max-w-[80%] flex flex-col space-y-1">
                <div className="rounded-2xl px-4 py-3 text-xs bg-slate-100 dark:bg-slate-900 border border-border/60 text-foreground leading-relaxed">
                  <div className="markdown-content space-y-2">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {activeStreamText}
                    </ReactMarkdown>
                  </div>
                  <span className="inline-block w-1.5 h-4 bg-primary animate-pulse ml-0.5" />
                </div>
                <span className="text-[9px] text-muted-foreground text-left ml-2">
                  Gemini streaming...
                </span>
              </div>
            </div>
          )}

          {streaming && !activeStreamText && (
            <div className="flex space-x-3.5 justify-start">
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                <Bot className="w-4.5 h-4.5 animate-pulse" />
              </div>
              <div className="rounded-2xl px-4 py-3 bg-slate-100 dark:bg-slate-900 border border-border/60 text-muted-foreground text-xs flex items-center space-x-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                <span>Thinking...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input box */}
        <div className="p-4 border-t border-border bg-white dark:bg-slate-900/10">
          <form onSubmit={handleSendMessage} className="relative flex items-center bg-white dark:bg-slate-900 border border-border rounded-2xl overflow-hidden px-4 py-1 shadow-sm">
            <button
              type="button"
              onClick={() => router.push("/library")}
              title="Attach library file"
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
            >
              <Paperclip className="w-4.5 h-4.5" />
            </button>
            <input
              type="text"
              placeholder={selectedDocId ? "Ask a question about this document..." : "Ask a general study question..."}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={streaming}
              className="w-full px-3 py-3.5 bg-transparent text-xs text-foreground placeholder-muted-foreground focus:outline-none"
            />
            <button
              type="submit"
              disabled={streaming || !inputValue.trim()}
              className="p-2.5 rounded-xl bg-primary hover:bg-primary/95 text-white disabled:bg-primary/45 disabled:text-white/60 transition-colors shadow shadow-primary/10 cursor-pointer shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </section>
    </div>
  )
}
