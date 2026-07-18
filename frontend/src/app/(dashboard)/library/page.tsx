/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import React, { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { useToast } from "@/context/toast-context"
import { formatBytes, formatDate } from "@/lib/utils"
import { motion } from "framer-motion"
import {
  FileText,
  FolderPlus,
  Folder,
  ChevronRight,
  Upload,
  MoreVertical,
  Trash2,
  Edit2,
  MessageSquare,
  Layers,
  Award,
  GitFork,
  BookOpen,
  Loader2,
  CheckCircle,
  AlertCircle
} from "lucide-react"

interface Document {
  id: number
  title: string
  file_type: string
  file_size: number
  created_at: string
  folder_id: number | null
}

interface FolderType {
  id: number
  name: string
  parent_id: number | null
}

export default function LibraryPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  
  // Lists
  const [documents, setDocuments] = useState<Document[]>([])
  const [folders, setFolders] = useState<FolderType[]>([])
  
  // Selection/Filtering
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null)
  
  // Loading and alerts
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Modals / Action States
  const [newFolderName, setNewFolderName] = useState("")
  const [showFolderModal, setShowFolderModal] = useState(false)
  const [renamingDoc, setRenamingDoc] = useState<Document | null>(null)
  const [newDocTitle, setNewDocTitle] = useState("")
  const [activeMenuDocId, setActiveMenuDocId] = useState<number | null>(null)
  const [isDragActive, setIsDragActive] = useState(false)

  // Fetch documents and folders
  const fetchData = async () => {
    try {
      const docsData = await api.get<Document[]>("/documents")
      const foldersData = await api.get<FolderType[]>("/documents/folders")
      setDocuments(docsData)
      setFolders(foldersData)
    } catch (err: any) {
      console.error("Error fetching library data:", err)
      setError("Failed to load library materials.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setTimeout(() => {
      fetchData()
    }, 0)
  }, [])

  // File Upload logic
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    
    setUploading(true)
    setUploadProgress(10)
    setError(null)
    setSuccess(null)
    
    const file = files[0]
    const formData = new FormData()
    formData.append("file", file)
    
    let path = "/documents/upload"
    if (currentFolderId !== null) {
      path += `?folder_id=${currentFolderId}`
    }

    try {
      // Simulate progress bar increments
      const interval = setInterval(() => {
        setUploadProgress((prev) => (prev < 90 ? prev + 15 : prev))
      }, 300)
      
      const uploadedDoc = await api.post<Document>(path, formData)
      
      clearInterval(interval)
      setUploadProgress(100)
      setSuccess(`"${uploadedDoc.title}" uploaded and parsed successfully.`)
      toast.success("Document uploaded successfully.")
      
      // Refresh documents
      await fetchData()
    } catch (err: any) {
      setError(err.message || "Failed to upload document.")
      toast.error(err.message || "Failed to upload document.")
    } finally {
      setTimeout(() => {
        setUploading(false)
        setUploadProgress(0)
      }, 1000)
    }
  }

  // Create folder
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFolderName.trim()) return

    try {
      await api.post("/documents/folders", {
        name: newFolderName,
        parent_id: currentFolderId
      })
      setNewFolderName("")
      setShowFolderModal(false)
      setSuccess("Folder created successfully.")
      toast.success("Folder created successfully.")
      await fetchData()
    } catch (err: any) {
      setError(err.message || "Failed to create folder.")
      toast.error(err.message || "Failed to create folder.")
    }
  }

  // Rename Document
  const handleRenameDoc = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!renamingDoc || !newDocTitle.trim()) return

    try {
      await api.patch(`/documents/${renamingDoc.id}/rename`, { title: newDocTitle })
      setRenamingDoc(null)
      setNewDocTitle("")
      setSuccess("Document renamed.")
      toast.success("Document renamed successfully.")
      await fetchData()
    } catch (err: any) {
      setError(err.message || "Failed to rename document.")
      toast.error(err.message || "Failed to rename document.")
    }
  }

  // Delete Document
  const handleDeleteDoc = async (docId: number) => {
    if (!confirm("Are you sure you want to permanently delete this document and all its study statistics?")) return

    try {
      await api.delete(`/documents/${docId}`)
      setSuccess("Document deleted.")
      toast.success("Document deleted successfully.")
      await fetchData()
    } catch (err: any) {
      setError(err.message || "Failed to delete document.")
      toast.error(err.message || "Failed to delete document.")
    }
  }

  // Drag-and-Drop Handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true)
    } else if (e.type === "dragleave") {
      setIsDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files)
    }
  }

  // Filtering based on current folder
  const currentFolders = folders.filter((f) => f.parent_id === currentFolderId)
  const currentDocs = documents.filter((d) => d.folder_id === currentFolderId)

  // Current folder breadcrumbs trace
  const getBreadcrumbs = () => {
    const crumbs = []
    let folder = folders.find((f) => f.id === currentFolderId)
    while (folder) {
      crumbs.unshift(folder)
      folder = folders.find((f) => f.id === folder?.parent_id)
    }
    return crumbs
  }

  const breadcrumbs = getBreadcrumbs()

  if (loading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto animate-pulse">
        {/* Header Toolbar Skeleton */}
        <div className="flex justify-between items-center gap-4">
          <div className="space-y-2">
            <div className="w-32 h-6 bg-muted/80 rounded-full" />
            <div className="w-48 h-3.5 bg-muted/80 rounded-full" />
          </div>
          <div className="flex space-x-3">
            <div className="w-24 h-9 bg-muted/80 rounded-xl" />
            <div className="w-24 h-9 bg-muted/80 rounded-xl" />
          </div>
        </div>
        
        {/* Breadcrumbs Skeleton */}
        <div className="w-40 h-8 bg-muted/40 rounded-lg border border-border/40" />

        {/* Upload area Skeleton */}
        <div className="border border-border/80 rounded-2xl p-8 bg-card h-36 flex flex-col items-center justify-center space-y-3" />

        {/* Grid Layout Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card border border-border/80 rounded-xl p-4 h-32 flex flex-col justify-between" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold font-display tracking-tight text-foreground">My Library</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Organize materials and generate AI study components
          </p>
        </div>
        
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <button
            onClick={() => setShowFolderModal(true)}
            className="flex items-center space-x-1.5 px-4 py-2 border border-border bg-card hover:bg-slate-50 dark:hover:bg-slate-900 text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-sm"
          >
            <FolderPlus className="w-4 h-4 text-primary" />
            <span>New Folder</span>
          </button>
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-4 py-2 bg-primary hover:bg-primary/95 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-sm"
          >
            <Upload className="w-4 h-4" />
            <span>Upload File</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={(e) => handleFileUpload(e.target.files)}
            accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg"
          />
        </div>
      </div>

      {/* 2. Alerts */}
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

      {/* 3. Folder Breadcrumbs */}
      <div className="flex items-center space-x-1 text-xs text-muted-foreground bg-white dark:bg-slate-900/40 px-3 py-2 rounded-lg w-fit border border-border shadow-sm">
        <button
          onClick={() => setCurrentFolderId(null)}
          className="hover:text-primary font-semibold"
        >
          Root Library
        </button>
        {breadcrumbs.map((crumb) => (
          <React.Fragment key={crumb.id}>
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
            <button
              onClick={() => setCurrentFolderId(crumb.id)}
              className="hover:text-primary font-semibold max-w-[100px] truncate"
            >
              {crumb.name}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* 4. Drag & Drop Upload Container */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
          isDragActive
            ? "border-primary bg-primary/5 scale-[0.99]"
            : "border-border hover:border-muted-foreground/30 bg-card"
        }`}
      >
        {uploading ? (
          <div className="flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="text-xs font-semibold">Extracting text & parsing nodes ({uploadProgress}%)</span>
            <div className="w-48 h-1.5 rounded-full bg-slate-200 dark:bg-slate-900 overflow-hidden">
              <div style={{ width: `${uploadProgress}%` }} className="h-full bg-primary transition-all duration-300" />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-2 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <div className="p-3.5 bg-white dark:bg-slate-900 border border-border rounded-2xl text-muted-foreground shadow-sm">
              <Upload className="w-6 h-6" />
            </div>
            <p className="text-xs font-semibold text-foreground">
              Drag & drop lecture notes, or <span className="text-primary hover:underline">browse files</span>
            </p>
            <p className="text-[10px] text-muted-foreground">
              Supports PDF, Word, TXT, or Image files (PNG, JPG, JPEG) up to 10 MB.
            </p>
          </div>
        )}
      </div>

      {/* 5. Library Contents Grid */}
      {currentFolders.length === 0 && currentDocs.length === 0 ? (
        <div className="bg-card border border-border/80 rounded-2xl p-16 text-center text-muted-foreground flex flex-col items-center justify-center space-y-4 shadow-sm">
          <div className="p-4 bg-primary/10 rounded-full text-primary">
            <BookOpen className="w-8 h-8" />
          </div>
          <div className="space-y-1.5 max-w-sm">
            <h4 className="text-xs font-bold text-foreground">No Study Materials Yet</h4>
            <p className="text-[10px] leading-normal text-muted-foreground">
              Upload your first textbook page, lecture slide, or course PDF to unleash automated study summaries, flashcard generation, and concept mapping.
            </p>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-primary hover:bg-primary/95 text-white text-[11px] font-bold rounded-xl shadow-md shadow-primary/15 hover:shadow-primary/25 transition-all cursor-pointer"
          >
            Upload Document
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Render Folders first */}
          {currentFolders.map((folder) => (
            <motion.div
              key={folder.id}
              onClick={() => setCurrentFolderId(folder.id)}
              className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 cursor-pointer flex items-center space-x-3 shadow-sm hover:shadow-md transition-all group"
            >
              <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-500 group-hover:scale-105 transition-transform">
                <Folder className="w-5 h-5 fill-current" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold truncate text-foreground group-hover:text-primary transition-colors">
                  {folder.name}
                </h4>
                <p className="text-[10px] text-muted-foreground mt-0.5">Click to view contents</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
            </motion.div>
          ))}

          {/* Render Documents */}
          {currentDocs.map((doc) => {
            const isMenuOpen = activeMenuDocId === doc.id
            
            // Icon color styling
            let iconBg = "bg-blue-500/10 text-blue-600 dark:text-blue-400"
            if (doc.file_type === "pdf") iconBg = "bg-red-500/10 text-red-500"
            else if (doc.file_type === "docx") iconBg = "bg-blue-600/10 text-blue-600"
            else if (["png", "jpg", "jpeg"].includes(doc.file_type)) iconBg = "bg-teal-500/10 text-teal-500"

            return (
              <motion.div
                key={doc.id}
                className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between shadow-sm relative group hover:border-slate-300 dark:hover:border-slate-800 transition-all"
              >
                <div>
                  {/* File header row */}
                  <div className="flex justify-between items-start mb-3">
                    <div className={`p-2 rounded-lg ${iconBg}`}>
                      <FileText className="w-4.5 h-4.5" />
                    </div>
                    
                    {/* Action Dropdown Menu */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setActiveMenuDocId(isMenuOpen ? null : doc.id)
                        }}
                        className="p-1 rounded-lg border border-transparent hover:border-border hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer"
                      >
                        <MoreVertical className="w-4 h-4 text-muted-foreground" />
                      </button>
                      
                      {isMenuOpen && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setActiveMenuDocId(null)} />
                          <div className="absolute right-0 mt-1 w-36 bg-card border border-border rounded-lg shadow-lg py-1.5 z-20 text-xs">
                            <button
                              onClick={() => {
                                setRenamingDoc(doc)
                                setNewDocTitle(doc.title)
                                setActiveMenuDocId(null)
                              }}
                              className="w-full flex items-center space-x-2 px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-900 text-left font-medium text-foreground cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Rename</span>
                            </button>
                            <button
                              onClick={() => {
                                handleDeleteDoc(doc.id)
                                setActiveMenuDocId(null)
                              }}
                              className="w-full flex items-center space-x-2 px-3 py-1.5 hover:bg-error/5 text-error text-left font-semibold cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Title and metadata */}
                  <h4 className="text-xs font-bold text-foreground line-clamp-2 min-h-[32px] group-hover:text-primary transition-colors">
                    {doc.title}
                  </h4>
                  
                  <div className="flex items-center space-x-3 text-[10px] text-muted-foreground mt-3 border-t border-border/40 pt-2.5">
                    <span className="uppercase font-bold tracking-wider">{doc.file_type}</span>
                    <span>•</span>
                    <span>{formatBytes(doc.file_size)}</span>
                    <span>•</span>
                    <span>{formatDate(doc.created_at)}</span>
                  </div>
                </div>

                {/* AI Generative Quick Actions bar */}
                <div className="grid grid-cols-5 gap-1.5 mt-4 pt-3 border-t border-border/40">
                  <button
                    onClick={() => router.push(`/summaries?docId=${doc.id}`)}
                    title="Summary"
                    className="flex justify-center p-1.5 rounded-lg border border-border bg-white dark:bg-slate-900 hover:border-primary/30 hover:bg-primary/5 text-muted-foreground hover:text-primary transition-all cursor-pointer shadow-sm"
                  >
                    <FileText className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => router.push(`/chat?docId=${doc.id}`)}
                    title="Ask AI Chat"
                    className="flex justify-center p-1.5 rounded-lg border border-border bg-white dark:bg-slate-900 hover:border-teal-500/30 hover:bg-teal-500/5 text-muted-foreground hover:text-teal-500 transition-all cursor-pointer shadow-sm"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => router.push(`/flashcards?docId=${doc.id}`)}
                    title="Flashcards"
                    className="flex justify-center p-1.5 rounded-lg border border-border bg-white dark:bg-slate-900 hover:border-purple-500/30 hover:bg-purple-500/5 text-muted-foreground hover:text-purple-500 transition-all cursor-pointer shadow-sm"
                  >
                    <Layers className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => router.push(`/quizzes?docId=${doc.id}`)}
                    title="Quiz Generator"
                    className="flex justify-center p-1.5 rounded-lg border border-border bg-white dark:bg-slate-900 hover:border-amber-500/30 hover:bg-amber-500/5 text-muted-foreground hover:text-amber-500 transition-all cursor-pointer shadow-sm"
                  >
                    <Award className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => router.push(`/mindmaps?docId=${doc.id}`)}
                    title="Mind Map"
                    className="flex justify-center p-1.5 rounded-lg border border-border bg-white dark:bg-slate-900 hover:border-indigo-500/30 hover:bg-indigo-500/5 text-muted-foreground hover:text-indigo-500 transition-all cursor-pointer shadow-sm"
                  >
                    <GitFork className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* 6. CREATE FOLDER MODAL */}
      {showFolderModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-bold text-sm tracking-tight text-foreground mb-4">Create New Folder</h3>
            <form onSubmit={handleCreateFolder} className="space-y-4">
              <input
                type="text"
                placeholder="Folder Name (e.g. Computer Science)"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-border text-foreground placeholder-muted-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm transition-all"
                required
                autoFocus
              />
              <div className="flex space-x-2 justify-end pt-2 text-xs">
                <button
                  type="button"
                  onClick={() => setShowFolderModal(false)}
                  className="px-4 py-2 border border-border bg-white text-muted-foreground hover:bg-slate-50 rounded-xl transition-all shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary hover:bg-primary/95 text-white font-semibold rounded-xl shadow-md shadow-primary/10 transition-all"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. RENAME DOCUMENT MODAL */}
      {renamingDoc && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-bold text-sm tracking-tight text-foreground mb-4">Rename Document</h3>
            <form onSubmit={handleRenameDoc} className="space-y-4">
              <input
                type="text"
                value={newDocTitle}
                onChange={(e) => setNewDocTitle(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-border text-foreground placeholder-muted-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm transition-all"
                required
                autoFocus
              />
              <div className="flex space-x-2 justify-end pt-2 text-xs">
                <button
                  type="button"
                  onClick={() => setRenamingDoc(null)}
                  className="px-4 py-2 border border-border bg-white text-muted-foreground hover:bg-slate-50 rounded-xl transition-all shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary hover:bg-primary/95 text-white font-semibold rounded-xl shadow-md shadow-primary/10 transition-all"
                >
                  Save Rename
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
