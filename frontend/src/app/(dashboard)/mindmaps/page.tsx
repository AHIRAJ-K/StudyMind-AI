/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { api } from "@/lib/api"
import {
  GitFork,
  Sparkles,
  Download,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle,
  Trash2
} from "lucide-react"

interface MindMapNode {
  name: string
  children?: MindMapNode[]
}

interface MindMap {
  id: number
  title: string
  structure: MindMapNode
  document_id: number | null
}

interface Document {
  id: number
  title: string
}

// Interface for layout coordinates
interface LayoutNode {
  name: string
  x: number
  y: number
  depth: number
  parentId: string | null
  id: string
}

interface LayoutLink {
  sourceId: string
  targetId: string
  x1: number
  y1: number
  x2: number
  y2: number
}

export default function MindMapsPage() {
  const searchParams = useSearchParams()
  const urlDocId = searchParams.get("docId")
  const urlMapId = searchParams.get("mapId")

  const [documents, setDocuments] = useState<Document[]>([])
  const [mindmaps, setMindmaps] = useState<MindMap[]>([])
  
  // Selection
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null)
  const [activeMap, setActiveMap] = useState<MindMap | null>(null)
  
  // Layout values for SVG
  const [layoutNodes, setLayoutNodes] = useState<LayoutNode[]>([])
  const [layoutLinks, setLayoutLinks] = useState<LayoutLink[]>([])
  const [viewBox, setViewBox] = useState("0 0 800 500")

  // Loaders
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  /**
   * Layout coordinate engine using depth-distributor leaf spacing
   */
  const calculateTreeLayout = useCallback((root: MindMapNode) => {
    const nodesList: LayoutNode[] = []
    const linksList: LayoutLink[] = []
    
    let leafCount = 0
    const colWidth = 220
    const rowHeight = 70
    
    // 1. Recursive spacing function
    function traverse(node: MindMapNode, depth = 0, parentId: string | null = null): { id: string; y: number } {
      const nodeId = `node_${depth}_${Math.random().toString(36).substr(2, 9)}`
      const children = node.children || []
      
      const x = 50 + depth * colWidth
      let y = 0
      
      if (children.length === 0) {
        // Leaf node gets a unique row position
        y = 40 + leafCount * rowHeight
        leafCount += 1
      } else {
        // Parent node centers between child coordinates
        const childYs = children.map((c) => traverse(c, depth + 1, nodeId))
        const sumY = childYs.reduce((sum, child) => sum + child.y, 0)
        y = sumY / children.length
      }

      nodesList.push({
        id: nodeId,
        name: node.name,
        x,
        y,
        depth,
        parentId
      })

      return { id: nodeId, y }
    }

    // Initialize traversal
    traverse(root)

    // 2. Generate Links between nodes
    nodesList.forEach((node) => {
      if (node.parentId) {
        const parentNode = nodesList.find((n) => n.id === node.parentId)
        if (parentNode) {
          linksList.push({
            sourceId: node.parentId,
            targetId: node.id,
            x1: parentNode.x,
            y1: parentNode.y,
            x2: node.x,
            y2: node.y
          })
        }
      }
    })

    setLayoutNodes(nodesList)
    setLayoutLinks(linksList)
    
    // Set custom bounding viewport
    const width = 120 + Math.max(...nodesList.map((n) => n.x))
    const height = 80 + Math.max(...nodesList.map((n) => n.y))
    setViewBox(`0 0 ${Math.max(width, 800)} ${Math.max(height, 500)}`)
  }, [])

  const handleSelectMap = useCallback((map: MindMap) => {
    setError(null)
    setActiveMap(map)
    calculateTreeLayout(map.structure)
  }, [calculateTreeLayout])

  useEffect(() => {
    async function loadWorkspace() {
      try {
        const docsData = await api.get<Document[]>("/documents")
        setDocuments(docsData)
        
        const mapsData = await api.get<MindMap[]>("/mindmaps")
        setMindmaps(mapsData)

        if (urlMapId) {
          const mapIdNum = parseInt(urlMapId)
          const match = mapsData.find((m) => m.id === mapIdNum)
          if (match) {
            setTimeout(() => {
              handleSelectMap(match)
            }, 0)
          }
        } else if (urlDocId) {
          const docIdNum = parseInt(urlDocId)
          setSelectedDocId(docIdNum)
          
          const match = mapsData.find((m) => m.document_id === docIdNum)
          if (match) {
            setTimeout(() => {
              handleSelectMap(match)
            }, 0)
          }
        }
      } catch (err) {
        console.error("Failed to load mindmap workspace:", err)
        setError("Failed to retrieve mind map workspace.")
      } finally {
        setLoading(false)
      }
    }
    setTimeout(() => {
      loadWorkspace()
    }, 0)
  }, [urlDocId, urlMapId, handleSelectMap])

  useEffect(() => {
    if (urlMapId && mindmaps.length > 0) {
      const match = mindmaps.find((m) => m.id === parseInt(urlMapId))
      if (match) {
        setTimeout(() => {
          handleSelectMap(match)
        }, 0)
      }
    }
  }, [urlMapId, mindmaps, handleSelectMap])

  const handleCreateMindMap = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDocId) {
      setError("Please select a source document.")
      return
    }

    setGenerating(true)
    setError(null)
    setSuccess(null)

    const docTitle = documents.find((d) => d.id === selectedDocId)?.title || "Document"
    const title = `Mind Map: ${docTitle}`

    try {
      const mindmap = await api.post<MindMap>("/mindmaps", {
        title,
        document_id: selectedDocId
      })
      setMindmaps((prev) => [mindmap, ...prev])
      handleSelectMap(mindmap)
      setSuccess("Mind map generated successfully!")
    } catch (err: any) {
      setError(err.message || "Failed to generate mind map structure. Try again.")
    } finally {
      setGenerating(false)
    }
  }

  const handleDeleteMap = async (mapId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm("Are you sure you want to delete this mind map?")) return

    try {
      await api.delete(`/mindmaps/${mapId}`)
      setMindmaps((prev) => prev.filter((m) => m.id !== mapId))
      if (activeMap?.id === mapId) {
        setActiveMap(null)
        setLayoutNodes([])
        setLayoutLinks([])
      }
      setSuccess("Mind map deleted successfully.")
    } catch {
      setError("Failed to delete mind map.")
    }
  }

  // Export SVG content to XML
  const handleExportSVG = () => {
    const svgEl = document.getElementById("mindmap-svg")
    if (!svgEl) return

    const serializer = new XMLSerializer()
    const svgStr = serializer.serializeToString(svgEl)
    
    const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement("a")
    link.href = url
    link.download = activeMap ? `${activeMap.title.replace(/\s+/g, "_")}.svg` : "mindmap.svg"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 animate-pulse">
        {/* Header Skeleton */}
        <div className="space-y-2">
          <div className="w-48 h-6 bg-muted rounded-lg" />
          <div className="w-72 h-4 bg-muted rounded-full" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left panel Skeleton */}
          <div className="md:col-span-4 space-y-4 bg-card border border-border/80 rounded-2xl p-6">
            <div className="w-32 h-4 bg-muted rounded-full" />
            <div className="w-full h-9 bg-muted rounded-lg" />
            <div className="w-full h-10 bg-muted rounded-lg mt-4" />
            
            <div className="w-24 h-4 bg-muted rounded-full mt-6" />
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-muted/45 border border-border/30 rounded-xl" />
              ))}
            </div>
          </div>

          {/* Right panel Skeleton */}
          <div className="md:col-span-8 bg-card border border-border/80 rounded-2xl p-6 h-96 flex flex-col justify-between">
            <div className="w-24 h-4 bg-muted rounded-full" />
            <div className="flex-1 bg-muted/20 border border-border/30 rounded-xl mt-6 flex items-center justify-center" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold font-display tracking-tight text-foreground">AI Mind Maps</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Visualize relationships and structural ideas using hierarchical node trees
          </p>
        </div>
        {activeMap && (
          <button
            onClick={() => {
              setActiveMap(null)
              setLayoutNodes([])
              setLayoutLinks([])
              setError(null)
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 border border-border bg-card text-[10px] font-bold rounded-lg cursor-pointer hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Map Directory</span>
          </button>
        )}
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

      {/* DIRECTORY VIEW */}
      {!activeMap ? (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left panel: configure settings */}
          <div className="md:col-span-5 bg-card border border-border rounded-xl p-5 space-y-4 shadow-sm">
            <h3 className="font-bold text-sm tracking-tight flex items-center space-x-2">
              <Sparkles className="w-4.5 h-4.5 text-primary" />
              <span>Map Document Content</span>
            </h3>

            <form onSubmit={handleCreateMindMap} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Select Source Document
                </label>
                <select
                  value={selectedDocId || ""}
                  onChange={(e) => setSelectedDocId(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm transition-all"
                  required
                >
                  <option value="">-- Choose File --</option>
                  {documents.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={generating || !selectedDocId}
                className="w-full py-3 bg-primary hover:bg-primary/95 disabled:bg-primary/45 text-white text-xs font-bold rounded-xl shadow-md shadow-primary/10 hover:shadow-primary/20 flex items-center justify-center space-x-2 transition-all cursor-pointer"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Building Mind Map...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Mind Map</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right panel: map list */}
          <div className="md:col-span-7 space-y-4">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block px-1">
              Your Mind Maps ({mindmaps.length})
            </span>

            {mindmaps.length === 0 ? (
              <div className="bg-card border border-border/80 rounded-2xl p-12 text-center text-muted-foreground flex flex-col items-center justify-center space-y-4 shadow-sm">
                <div className="p-4 bg-primary/10 rounded-full text-primary animate-pulse">
                  <GitFork className="w-8 h-8" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="font-bold text-xs text-foreground">No Concept Trees Yet</h4>
                  <p className="text-[10px] leading-normal text-muted-foreground">
                    Link one of your course library files on the left selector and let Gemini build a structural relational map of technical themes.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {mindmaps.map((map) => (
                  <div
                    key={map.id}
                    onClick={() => handleSelectMap(map)}
                    className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-all flex flex-col justify-between shadow-sm cursor-pointer group"
                  >
                    <div>
                      <div className="p-2.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl mb-3 w-fit">
                        <GitFork className="w-4.5 h-4.5" />
                      </div>
                      
                      <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                        {map.title}
                      </h4>
                    </div>

                    <div className="flex justify-between items-center mt-5 pt-3 border-t border-border/40">
                      <span className="text-[10px] font-bold text-primary">View Mind Map</span>
                      <button
                        onClick={(e) => handleDeleteMap(map.id, e)}
                        className="p-1 rounded text-muted-foreground hover:text-error hover:bg-error/5 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* INTERACTIVE MIND MAP SVG VIEWER */
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col space-y-4">
          <div className="border-b border-border/60 pb-4 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-foreground">{activeMap.title}</h3>
              <p className="text-[10px] text-muted-foreground">Interactive SVG Tree. Click node to review terms.</p>
            </div>
            
            <button
              onClick={handleExportSVG}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-primary hover:bg-primary/95 text-white text-[10px] font-bold rounded-lg cursor-pointer transition-all shadow-sm shadow-primary/10"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export SVG Map</span>
            </button>
          </div>

          {/* SVG Frame Viewport */}
          <div className="border border-border/80 rounded-xl bg-slate-50/50 dark:bg-slate-900/10 overflow-auto p-4 flex items-center justify-center min-h-[450px]">
            <svg
              id="mindmap-svg"
              viewBox={viewBox}
              className="w-full max-w-full h-auto bg-transparent filter select-none transition-colors"
            >
              {/* Define markers/filters for premium graphics */}
              <defs>
                <linearGradient id="edge-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.8" />
                </linearGradient>
                <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
                  <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="rgba(0,0,0,0.06)" />
                </filter>
              </defs>

              {/* DRAW CONNECTIONS WITH FLOWING BEZIER CURVES */}
              {layoutLinks.map((link, idx) => {
                const midX = (link.x1 + link.x2) / 2
                // Cubic Bezier path
                const pathStr = `M ${link.x1} ${link.y1} C ${midX} ${link.y1}, ${midX} ${link.y2}, ${link.x2} ${link.y2}`
                
                return (
                  <path
                    key={`link_${idx}`}
                    d={pathStr}
                    fill="none"
                    stroke="url(#edge-grad)"
                    strokeWidth="2"
                    className="opacity-70 dark:opacity-40"
                  />
                )
              })}

              {/* DRAW NODES (Rounded glassmorphic blocks) */}
              {layoutNodes.map((node) => {
                // Style configurations based on depth
                const isRoot = node.depth === 0
                const isTopic = node.depth === 1
                
                let rectWidth = 145
                let rectHeight = 36
                let rectX = node.x - rectWidth / 2
                let rectY = node.y - rectHeight / 2
                
                let fill = "var(--card)"
                let stroke = "var(--border)"
                let textFont = "text-[10px] font-semibold text-foreground fill-current"
                
                if (isRoot) {
                  rectWidth = 160
                  rectHeight = 44
                  rectX = node.x - rectWidth / 2
                  rectY = node.y - rectHeight / 2
                  fill = "var(--primary)"
                  stroke = "var(--primary)"
                  textFont = "text-[11px] font-bold text-white fill-current"
                } else if (isTopic) {
                  fill = "var(--card)"
                  stroke = "var(--primary)"
                  textFont = "text-[10px] font-bold text-primary dark:text-blue-400 fill-current"
                } else {
                  textFont = "text-[9px] font-medium text-slate-700 dark:text-slate-300 fill-current"
                }

                return (
                  <g key={node.id} className="cursor-pointer group">
                    <rect
                      x={rectX}
                      y={rectY}
                      width={rectWidth}
                      height={rectHeight}
                      rx="8"
                      ry="8"
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={isRoot || isTopic ? "1.5" : "1"}
                      filter="url(#shadow)"
                      className="transition-all hover:stroke-accent duration-200"
                    />
                    <text
                      x={node.x}
                      y={node.y + 3.5}
                      textAnchor="middle"
                      fill="currentColor"
                      className={`select-none ${textFont}`}
                    >
                      {node.name.length > 25 ? `${node.name.slice(0, 23)}...` : node.name}
                    </text>
                  </g>
                )
              })}
            </svg>
          </div>
        </div>
      )}
    </div>
  )
}
