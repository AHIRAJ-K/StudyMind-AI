/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { useToast } from "@/context/toast-context"
import { motion, AnimatePresence } from "framer-motion"
import confetti from "canvas-confetti"
import {
  Layers,
  Sparkles,
  ArrowLeft,
  RotateCw,
  CheckCircle,
  Loader2,
  AlertCircle,
  Trash2
} from "lucide-react"

interface Flashcard {
  id: number
  question: string
  answer: string
  difficulty: string
  category: string | null
  next_review: string
  repetitions: number
  interval: number
  ease_factor: number
}

interface Deck {
  id: number
  name: string
  document_id: number | null
}

interface Document {
  id: number
  title: string
}

export default function FlashcardsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlDocId = searchParams.get("docId")
  const urlDeckId = searchParams.get("deckId")
  const { toast } = useToast()

  const [documents, setDocuments] = useState<Document[]>([])
  const [decks, setDecks] = useState<Deck[]>([])
  
  // Selected state
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null)
  const [activeDeck, setActiveDeck] = useState<Deck | null>(null)
  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  
  // Study Arena states
  const [studyMode, setStudyMode] = useState(false)
  const [currentCardIdx, setCurrentCardIdx] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  
  // Creation States
  const [newDeckName, setNewDeckName] = useState("")
  const [cardCount, setCardCount] = useState(10)
  
  // Loader and alert states
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSelectDeck = useCallback(async (deck: Deck) => {
    setLoading(true)
    setError(null)
    setSuccess(null)
    setActiveDeck(deck)
    setStudyMode(false)
    try {
      const detailedDeck = await api.get<{ flashcards: Flashcard[] }>(`/flashcards/decks/${deck.id}`)
      setFlashcards(detailedDeck.flashcards)
    } catch {
      setError("Failed to load cards for this deck.")
    } finally {
      setLoading(false)
    }
  }, [])

  const loadInitialData = useCallback(async () => {
    try {
      const docsData = await api.get<Document[]>("/documents")
      setDocuments(docsData)
      
      const decksData = await api.get<Deck[]>("/flashcards/decks")
      setDecks(decksData)

      if (urlDeckId) {
        const deckIdNum = parseInt(urlDeckId)
        const match = decksData.find((d) => d.id === deckIdNum)
        if (match) {
          handleSelectDeck(match)
        }
      } else if (urlDocId) {
        const docIdNum = parseInt(urlDocId)
        setSelectedDocId(docIdNum)
        // Find if deck exists for this document
        const match = decksData.find((d) => d.document_id === docIdNum)
        if (match) {
          handleSelectDeck(match)
        }
      }
    } catch (err) {
      console.error("Failed to load flashcard data:", err)
      setError("Failed to retrieve flashcards workspace.")
    } finally {
      setLoading(false)
    }
  }, [urlDocId, urlDeckId, handleSelectDeck])

  useEffect(() => {
    setTimeout(() => {
      loadInitialData()
    }, 0)
  }, [loadInitialData])

  useEffect(() => {
    if (urlDeckId && decks.length > 0) {
      const match = decks.find((d) => d.id === parseInt(urlDeckId))
      if (match) {
        setTimeout(() => {
          handleSelectDeck(match)
        }, 0)
      }
    }
  }, [urlDeckId, decks, handleSelectDeck])

  const handleCreateDeckAndGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDeckName.trim() || !selectedDocId) {
      setError("Please supply a deck name and select a focus document.")
      return
    }

    setGenerating(true)
    setError(null)
    setSuccess(null)

    try {
      const deck = await api.post<Deck & { flashcards: Flashcard[] }>(
        `/flashcards/decks?generate_cards=true&card_count=${cardCount}`,
        {
          name: newDeckName,
          document_id: selectedDocId
        }
      )
      setDecks((prev) => [deck, ...prev])
      setActiveDeck(deck)
      setFlashcards(deck.flashcards)
      setNewDeckName("")
      setSuccess(`Flashcard deck "${deck.name}" successfully generated with ${deck.flashcards.length} cards!`)
      toast.success("Flashcard deck generated successfully.")
    } catch (err: any) {
      setError(err.message || "Failed to generate flashcards deck via Gemini.")
      toast.error(err.message || "Failed to generate flashcard deck.")
    } finally {
      setGenerating(false)
    }
  }

  const handleDeleteDeck = async (deckId: number) => {
    if (!confirm("Permanently delete this deck and all statistics?")) return

    try {
      await api.delete(`/flashcards/decks/${deckId}`)
      setDecks((prev) => prev.filter((d) => d.id !== deckId))
      if (activeDeck?.id === deckId) {
        setActiveDeck(null)
        setFlashcards([])
      }
      setSuccess("Deck deleted.")
      toast.success("Deck deleted successfully.")
    } catch {
      setError("Failed to delete deck.")
      toast.error("Failed to delete deck.")
    }
  }

  // SM-2 Spaced Repetition Grading Review
  const handleReviewGrade = async (rating: number) => {
    if (flashcards.length === 0 || reviewing) return
    
    setReviewing(true)
    const card = flashcards[currentCardIdx]
    
    try {
      const updatedCard = await api.post<Flashcard>(`/flashcards/cards/${card.id}/review`, { rating })
      
      // Update local state list
      setFlashcards((prev) => prev.map((c) => (c.id === updatedCard.id ? updatedCard : c)))
      
      // Advance card
      setTimeout(() => {
        setIsFlipped(false)
        if (currentCardIdx < flashcards.length - 1) {
          setCurrentCardIdx((prev) => prev + 1)
        } else {
          // Finished deck
          setStudyMode(false)
          setCurrentCardIdx(0)
          setSuccess("Congratulations! You have completed studying all cards in this deck for today.")
          toast.success("Deck study completed for today! Great work! 🎉")
          confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } })
        }
        setReviewing(false)
      }, 300)
    } catch {
      setError("Failed to log card review score.")
      setReviewing(false)
    }
  }

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
            <div className="w-full h-10 bg-muted rounded-lg mt-4" />
          </div>

          {/* Right panel Skeleton */}
          <div className="md:col-span-7 bg-card border border-border/80 rounded-2xl p-6 h-96">
            <div className="w-24 h-4 bg-muted rounded-full" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-28 bg-muted/40 border border-border/40 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold font-display tracking-tight text-foreground">AI Flashcards</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Generative learning decks with spaced repetition study cycles
          </p>
        </div>
        {activeDeck && (
          <button
            onClick={() => {
              setActiveDeck(null)
              setFlashcards([])
              setStudyMode(false)
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 border border-border bg-card text-[10px] font-bold rounded-lg cursor-pointer hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Decks Directory</span>
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

      {/* RENDER DECKS DIRECTORY IF NO DECK SELECTED */}
      {!activeDeck ? (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left panel: Create deck generator (5 Cols) */}
          <div className="md:col-span-5 bg-card border border-border rounded-xl p-5 space-y-4 shadow-sm">
            <h3 className="font-bold text-sm tracking-tight flex items-center space-x-2">
              <Sparkles className="w-4.5 h-4.5 text-primary" />
              <span>Create Generative Deck</span>
            </h3>
            
            <form onSubmit={handleCreateDeckAndGenerate} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Deck Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Physics Midterm Formulae"
                  value={newDeckName}
                  onChange={(e) => setNewDeckName(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm transition-all"
                  required
                />
              </div>

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

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Card Quantity
                </label>
                <select
                  value={cardCount}
                  onChange={(e) => setCardCount(parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm transition-all"
                >
                  <option value="5">5 Cards</option>
                  <option value="10">10 Cards</option>
                  <option value="15">15 Cards</option>
                  <option value="20">20 Cards</option>
                  <option value="30">30 Cards</option>
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
                    <span>Creating Flashcards...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Auto-generate Deck</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right panel: list of decks (7 Cols) */}
          <div className="md:col-span-7 space-y-4">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block px-1">
              Your Flashcard Decks ({decks.length})
            </span>
            
            {decks.length === 0 ? (
              <div className="bg-card border border-border/80 rounded-2xl p-12 text-center text-muted-foreground flex flex-col items-center justify-center space-y-4 shadow-sm">
                <div className="p-4 bg-primary/10 rounded-full text-primary animate-pulse">
                  <Layers className="w-8 h-8" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="font-bold text-xs text-foreground">No Flashcard Decks Yet</h4>
                  <p className="text-[10px] leading-normal text-muted-foreground">
                    Create a custom title and link an uploaded lecture slide or textbook document on the left panel to auto-generate adaptive review cards.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {decks.map((deck) => (
                  <div
                    key={deck.id}
                    onClick={() => handleSelectDeck(deck)}
                    className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-all flex flex-col justify-between shadow-sm cursor-pointer group"
                  >
                    <div>
                      <div className="p-2.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl w-fit mb-3">
                        <Layers className="w-4.5 h-4.5" />
                      </div>
                      <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                        {deck.name}
                      </h4>
                      {deck.document_id && (
                        <p className="text-[10px] text-muted-foreground mt-1 truncate">
                          File: {documents.find((d) => d.id === deck.document_id)?.title || "Attached"}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex justify-between items-center mt-5 pt-3 border-t border-border/40">
                      <span className="text-[10px] font-bold text-primary">Study Deck</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteDeck(deck.id)
                        }}
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
        /* STUDY ARENA FOR SELECTED DECK */
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900/30 border border-border p-4 rounded-xl flex items-center justify-between text-xs font-semibold shadow-sm">
            <span className="text-foreground">Selected: {activeDeck.name}</span>
            <span className="text-muted-foreground">Total Cards: {flashcards.length}</span>
          </div>

          {flashcards.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-16 text-center text-muted-foreground flex flex-col items-center justify-center space-y-3 shadow-sm">
              <Layers className="w-8 h-8 text-muted-foreground/45" />
              <p className="text-xs font-bold">This deck has no cards</p>
              <button
                onClick={() => router.push(`/library`)}
                className="px-4 py-2 bg-primary text-white text-xs font-semibold rounded-xl"
              >
                Go to library to generate cards
              </button>
            </div>
          ) : !studyMode ? (
            /* PRE-STUDY DECK OVERVIEW TABLE */
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Layers className="w-12 h-12 text-primary/80 mb-3" />
                <h3 className="text-base font-bold text-foreground">Ready to start studying?</h3>
                <p className="text-xs text-muted-foreground max-w-sm leading-relaxed mt-1">
                  This deck contains Anki-style spaced repetition tracking. Grade your recall to schedule future reviews.
                </p>
                <button
                  onClick={() => {
                    setStudyMode(true)
                    setCurrentCardIdx(0)
                    setIsFlipped(false)
                  }}
                  className="mt-6 px-6 py-2.5 bg-primary hover:bg-primary/95 text-white text-xs font-semibold rounded-xl cursor-pointer shadow-md shadow-primary/10"
                >
                  Start Study Session
                </button>
              </div>

              {/* Grid overview of cards */}
              <div className="border-t border-border/60 pt-6">
                <h4 className="text-xs font-bold text-foreground mb-4">Deck Cards List</h4>
                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {flashcards.map((c) => (
                    <div key={c.id} className="p-3 bg-white dark:bg-slate-900 border border-border rounded-lg flex justify-between items-start text-xs font-semibold shadow-sm">
                      <div className="space-y-1">
                        <p className="text-foreground text-[11px] font-bold leading-tight">Q: {c.question}</p>
                        <p className="text-muted-foreground text-[10px] leading-tight">A: {c.answer}</p>
                      </div>
                      <span className="px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 text-[9px] font-bold text-purple-600 rounded-full shrink-0 uppercase tracking-wide">
                        {c.difficulty}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* THE ACTIVE 3D FLIP STUDY BOARD */
            <div className="flex flex-col items-center space-y-8">
              {/* Cards progress tracker indicator */}
              <div className="w-full max-w-md flex items-center justify-between text-xs font-semibold text-muted-foreground px-1">
                <span>Card {currentCardIdx + 1} of {flashcards.length}</span>
                <div className="w-32 h-1.5 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${((currentCardIdx + 1) / flashcards.length) * 100}%` }}
                    className="h-full bg-primary"
                  />
                </div>
              </div>

              {/* The 3D flip card envelope */}
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className="w-full max-w-md h-72 cursor-pointer perspective-1000 group relative"
              >
                <div
                  className={`w-full h-full duration-500 transform-style-3d relative rounded-2xl border border-border shadow-md hover:shadow-lg transition-transform ${
                    isFlipped ? "rotate-y-180" : ""
                  }`}
                >
                  {/* FRONT SIDE (Question) */}
                  <div className="absolute inset-0 w-full h-full rounded-2xl backface-hidden bg-card p-6 flex flex-col justify-between select-none">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-wide">
                      Question Card
                    </span>
                    <div className="my-auto text-center font-display text-sm font-bold leading-relaxed px-4">
                      {flashcards[currentCardIdx].question}
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-muted-foreground font-semibold">
                      <span className="uppercase tracking-wide px-2 py-0.5 bg-slate-100 dark:bg-slate-950 border rounded-md">
                        {flashcards[currentCardIdx].difficulty}
                      </span>
                      <span className="flex items-center space-x-1 hover:text-primary">
                        <RotateCw className="w-3 h-3" />
                        <span>Click card to flip</span>
                      </span>
                    </div>
                  </div>

                  {/* BACK SIDE (Answer) */}
                  <div className="absolute inset-0 w-full h-full rounded-2xl backface-hidden bg-slate-50 dark:bg-slate-900/60 rotate-y-180 p-6 flex flex-col justify-between select-none">
                    <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wide">
                      Correct Answer
                    </span>
                    <div className="my-auto text-center font-sans text-xs font-semibold leading-relaxed px-4 text-slate-800 dark:text-slate-100">
                      {flashcards[currentCardIdx].answer}
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-muted-foreground font-semibold">
                      <span className="uppercase tracking-wide px-2 py-0.5 bg-slate-100 dark:bg-slate-950 border rounded-md">
                        {flashcards[currentCardIdx].category || "StudyMind"}
                      </span>
                      <span className="flex items-center space-x-1 hover:text-primary">
                        <RotateCw className="w-3 h-3" />
                        <span>Click card to flip</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SM-2 Recall Grading Buttons Panel (Visible only when flipped) */}
              <div className="w-full max-w-md min-h-[110px] flex flex-col items-center justify-center">
                <AnimatePresence mode="wait">
                  {isFlipped ? (
                    <motion.div
                      key="grading"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="w-full space-y-4"
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider text-center text-muted-foreground block">
                        How well did you recall this card?
                      </span>
                      
                      <div className="grid grid-cols-5 gap-2 text-[10px] font-bold">
                        <button
                          onClick={() => handleReviewGrade(0)}
                          disabled={reviewing}
                          className="flex flex-col items-center justify-center py-2.5 rounded-xl border border-red-200 bg-red-500/5 hover:bg-red-500 text-red-600 hover:text-white transition-all cursor-pointer"
                        >
                          <span>Forgot</span>
                          <span className="text-[8px] font-medium opacity-85 mt-0.5">0</span>
                        </button>
                        
                        <button
                          onClick={() => handleReviewGrade(2)}
                          disabled={reviewing}
                          className="flex flex-col items-center justify-center py-2.5 rounded-xl border border-orange-200 bg-orange-500/5 hover:bg-orange-500 text-orange-600 hover:text-white transition-all cursor-pointer"
                        >
                          <span>Hard</span>
                          <span className="text-[8px] font-medium opacity-85 mt-0.5">2</span>
                        </button>
                        
                        <button
                          onClick={() => handleReviewGrade(3)}
                          disabled={reviewing}
                          className="flex flex-col items-center justify-center py-2.5 rounded-xl border border-blue-200 bg-blue-500/5 hover:bg-blue-500 text-blue-600 hover:text-white transition-all cursor-pointer"
                        >
                          <span>Good</span>
                          <span className="text-[8px] font-medium opacity-85 mt-0.5">3</span>
                        </button>

                        <button
                          onClick={() => handleReviewGrade(4)}
                          disabled={reviewing}
                          className="flex flex-col items-center justify-center py-2.5 rounded-xl border border-teal-200 bg-teal-500/5 hover:bg-teal-500 text-teal-600 hover:text-white transition-all cursor-pointer"
                        >
                          <span>Easy</span>
                          <span className="text-[8px] font-medium opacity-85 mt-0.5">4</span>
                        </button>

                        <button
                          onClick={() => handleReviewGrade(5)}
                          disabled={reviewing}
                          className="flex flex-col items-center justify-center py-2.5 rounded-xl border border-emerald-200 bg-emerald-500/5 hover:bg-emerald-500 text-emerald-600 hover:text-white transition-all cursor-pointer"
                        >
                          <span>Perfect</span>
                          <span className="text-[8px] font-medium opacity-85 mt-0.5">5</span>
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.p
                      key="instruction"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.7 }}
                      exit={{ opacity: 0 }}
                      className="text-xs text-muted-foreground text-center font-medium"
                    >
                      Read the question, mentally formulate your answer, then click the card to reveal the reverse side and submit rating review metrics.
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
