/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { api } from "@/lib/api"
import { useToast } from "@/context/toast-context"
import { motion, AnimatePresence } from "framer-motion"
import confetti from "canvas-confetti"
import {
  Award,
  Sparkles,
  CheckCircle,
  XCircle,
  HelpCircle,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Trash2
} from "lucide-react"

interface Question {
  id: number
  question_text: string
  question_type: string
  options: string[] | null
  correct_answer: string
}

interface Quiz {
  id: number
  title: string
  document_id: number | null
  score_percentage: number | null
  score: number | null
  created_at: string
}

interface Document {
  id: number
  title: string
}

interface FeedbackQuestion {
  id: number
  question_text: string
  question_type: string
  options: string[] | null
  correct_answer: string
  submitted_answer: string
  is_correct: boolean
  explanation: string | null
}

interface QuizResult {
  score: number
  total_questions: number
  feedback: FeedbackQuestion[]
}

export default function QuizzesPage() {
  const searchParams = useSearchParams()
  const urlDocId = searchParams.get("docId")
  const urlQuizId = searchParams.get("quizId")
  const { toast } = useToast()

  const [documents, setDocuments] = useState<Document[]>([])
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  
  // Selected state
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null)
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  
  // Quiz taking state
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({})
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null)
  
  // Configurations
  const [totalQuestions, setTotalQuestions] = useState(5)
  
  // Loader and Alert status
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSelectQuiz = useCallback(async (quiz: Quiz) => {
    setLoading(true)
    setError(null)
    setSuccess(null)
    setQuizResult(null)
    setUserAnswers({})
    setActiveQuiz(quiz)
    
    try {
      const detailedQuiz = await api.get<{ questions: Question[] }>(`/quizzes/${quiz.id}`)
      setQuestions(detailedQuiz.questions)
    } catch {
      setError("Failed to load quiz questions.")
    } finally {
      setLoading(false)
    }
  }, [])

  const loadInitialData = useCallback(async () => {
    try {
      const docsData = await api.get<Document[]>("/documents")
      setDocuments(docsData)
      
      const quizzesData = await api.get<Quiz[]>("/quizzes")
      setQuizzes(quizzesData)

      if (urlQuizId) {
        const quizIdNum = parseInt(urlQuizId)
        const match = quizzesData.find((q) => q.id === quizIdNum)
        if (match) {
          handleSelectQuiz(match)
        }
      } else if (urlDocId) {
        const docIdNum = parseInt(urlDocId)
        setSelectedDocId(docIdNum)
        // Find if a quiz is already generated for this doc
        const match = quizzesData.find((q) => q.document_id === docIdNum)
        if (match) {
          handleSelectQuiz(match)
        }
      }
    } catch (err) {
      console.error("Failed to load quizzes workspace:", err)
      setError("Failed to load quizzes workspace.")
    } finally {
      setLoading(false)
    }
  }, [urlDocId, urlQuizId, handleSelectQuiz])

  useEffect(() => {
    setTimeout(() => {
      loadInitialData()
    }, 0)
  }, [loadInitialData])

  useEffect(() => {
    if (urlQuizId && quizzes.length > 0) {
      const match = quizzes.find((q) => q.id === parseInt(urlQuizId))
      if (match) {
        setTimeout(() => {
          handleSelectQuiz(match)
        }, 0)
      }
    }
  }, [urlQuizId, quizzes, handleSelectQuiz])

  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDocId) {
      setError("Please select a source document.")
      return
    }

    setGenerating(true)
    setError(null)
    setSuccess(null)
    setQuizResult(null)

    const docTitle = documents.find((d) => d.id === selectedDocId)?.title || "Document"
    const title = `Quiz: ${docTitle}`

    try {
      const quiz = await api.post<Quiz & { questions: Question[] }>("/quizzes", {
        title,
        document_id: selectedDocId,
        total_questions: totalQuestions
      })
      setQuizzes((prev) => [quiz, ...prev])
      setActiveQuiz(quiz)
      setQuestions(quiz.questions)
      setSuccess(`Quiz successfully generated! ${quiz.questions.length} questions ready.`)
      toast.success("Quiz generated successfully!")
    } catch (err: any) {
      setError(err.message || "Failed to generate quiz. Make sure the document is text-friendly.")
      toast.error(err.message || "Failed to generate quiz.")
    } finally {
      setGenerating(false)
    }
  }

  const handleAnswerSelect = (qId: number, val: string) => {
    setUserAnswers((prev) => ({
      ...prev,
      [qId]: val
    }))
  }

  const handleQuizSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeQuiz || submitting) return

    // Verify all questions have answers
    const unanswered = questions.filter((q) => !userAnswers[q.id])
    if (unanswered.length > 0) {
      setError(`Please answer all questions before submitting. (${unanswered.length} remaining)`)
      toast.warning(`Please answer all questions before submitting. (${unanswered.length} remaining)`)
      return
    }

    setSubmitting(true)
    setError(null)

    const answersPayload = Object.entries(userAnswers).map(([qId, val]) => ({
      question_id: parseInt(qId),
      submitted_answer: val
    }))

    try {
      const result = await api.post<QuizResult>(`/quizzes/${activeQuiz.id}/submit`, {
        answers: answersPayload
      })
      
      setQuizResult(result)
      toast.success(`Quiz submitted! You scored ${result.score}%.`)
      
      // Update list score silently
      setQuizzes((prev) =>
        prev.map((q) => (q.id === activeQuiz.id ? { ...q, score: result.score } : q))
      )
      
      // Spray confetti on high scores
      if (result.score >= 80) {
        confetti({
          particleCount: 120,
          spread: 70,
          origin: { y: 0.6 }
        })
      }
    } catch (err: any) {
      setError(err.message || "Failed to submit answers.")
      toast.error(err.message || "Failed to submit answers.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteQuiz = async (quizId: number) => {
    if (!confirm("Permanently delete this quiz?")) return
    try {
      await api.delete(`/quizzes/${quizId}`)
      setQuizzes((prev) => prev.filter((q) => q.id !== quizId))
      if (activeQuiz?.id === quizId) {
        setActiveQuiz(null)
        setQuestions([])
        setQuizResult(null)
      }
      setSuccess("Quiz deleted.")
    } catch {
      setError("Failed to delete quiz.")
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
                <div key={i} className="h-24 bg-muted/40 border border-border/40 rounded-xl" />
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
          <h2 className="text-2xl font-bold font-display tracking-tight text-foreground">Quiz Generator</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Test your knowledge with custom interactive AI assessments
          </p>
        </div>
        {activeQuiz && (
          <button
            onClick={() => {
              setActiveQuiz(null)
              setQuestions([])
              setQuizResult(null)
              setError(null)
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 border border-border bg-card text-[10px] font-bold rounded-lg cursor-pointer hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quizzes List</span>
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
      <AnimatePresence mode="wait">
        {!activeQuiz ? (
          <motion.div
            key="directory"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-12 gap-6 w-full"
          >
            {/* Left panel: generator settings */}
            <div className="md:col-span-5 bg-card border border-border rounded-xl p-5 space-y-4 shadow-sm">
              <h3 className="font-bold text-sm tracking-tight flex items-center space-x-2">
                <Sparkles className="w-4.5 h-4.5 text-primary" />
                <span>Generate New Quiz</span>
              </h3>

              <form onSubmit={handleCreateQuiz} className="space-y-4 text-xs">
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
                    Number of Questions
                  </label>
                  <select
                    value={totalQuestions}
                    onChange={(e) => setTotalQuestions(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm transition-all"
                  >
                    <option value="3">3 Questions</option>
                    <option value="5">5 Questions</option>
                    <option value="10">10 Questions</option>
                    <option value="15">15 Questions</option>
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
                      <span>Generating Quiz...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Generate Quiz</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Right panel: quiz list */}
            <div className="md:col-span-7 space-y-4">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block px-1">
                Your Quizzes ({quizzes.length})
              </span>

              {quizzes.length === 0 ? (
                <div className="bg-card border border-border/80 rounded-2xl p-12 text-center text-muted-foreground flex flex-col items-center justify-center space-y-4 shadow-sm">
                  <div className="p-4 bg-primary/10 rounded-full text-primary animate-pulse">
                    <Award className="w-8 h-8" />
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-xs text-foreground">No AI Quizzes Yet</h4>
                    <p className="text-[10px] leading-normal text-muted-foreground">
                      Pick an uploaded course note page and select your quiz options (like Multiple Choice or True/False) in the left panel to auto-generate questions.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {quizzes.map((q) => (
                    <div
                      key={q.id}
                      onClick={() => handleSelectQuiz(q)}
                      className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-all flex flex-col justify-between shadow-sm cursor-pointer group"
                    >
                      <div>
                        <div className="flex justify-between items-start">
                          <div className="p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl mb-3">
                            <Award className="w-4.5 h-4.5" />
                          </div>
                          
                          {q.score !== null && (
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                              q.score >= 80
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                : q.score >= 50
                                ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                : "bg-red-500/10 text-red-600 border-red-500/20"
                            }`}>
                              Score: {q.score}%
                            </span>
                          )}
                        </div>
                        
                        <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                          {q.title}
                        </h4>
                      </div>

                      <div className="flex justify-between items-center mt-5 pt-3 border-t border-border/40">
                        <span className="text-[10px] font-bold text-primary">
                          {q.score !== null ? "Retake Quiz" : "Start Quiz"}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteQuiz(q.id)
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
          </motion.div>
        ) : (
          /* QUIZ RUNNER INTERFACE */
          <motion.div
            key="runner"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="bg-card border border-border rounded-xl p-6 shadow-sm w-full"
          >
            <div className="border-b border-border/60 pb-4 mb-6 flex justify-between items-center text-xs">
              <div>
                <h3 className="text-sm font-bold text-foreground">{activeQuiz.title}</h3>
                <p className="text-[10px] text-muted-foreground">Total Questions: {questions.length}</p>
              </div>
              
              {quizResult && (
                <div className="text-right">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Result Grade</span>
                  <span className={`text-lg font-black ${quizResult.score >= 80 ? "text-emerald-500" : "text-amber-500"}`}>
                    {quizResult.score}%
                  </span>
                </div>
              )}
            </div>

            {/* RENDER GRADED RESULTS FEEDBACK IF SUBMITTED */}
            {quizResult ? (
              <div className="space-y-6">
                <div className="space-y-4">
                  {quizResult.feedback.map((f, idx) => (
                    <div
                      key={f.id}
                      className={`p-5 rounded-xl border text-xs leading-normal ${
                        f.is_correct
                          ? "bg-emerald-500/5 border-emerald-500/15"
                          : "bg-red-500/5 border-red-500/15"
                      }`}
                    >
                      <div className="flex items-start space-x-2.5">
                        {f.is_correct ? (
                          <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        )}
                        <div className="space-y-3 w-full">
                          <p className="font-bold text-foreground">
                            Question {idx + 1}: {f.question_text}
                          </p>

                          {f.options && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-1">
                              {f.options.map((opt) => {
                                const isCorrectOption = opt.toLowerCase() === f.correct_answer.toLowerCase()
                                const isSelectedOption = opt.toLowerCase() === f.submitted_answer.toLowerCase()
                                
                                let optStyle = "border-border text-muted-foreground"
                                if (isCorrectOption) optStyle = "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold"
                                else if (isSelectedOption && !f.is_correct) optStyle = "border-red-500 bg-red-500/10 text-red-700 dark:text-red-300 font-semibold"

                                return (
                                  <div key={opt} className={`px-3 py-2 border rounded-lg ${optStyle}`}>
                                    {opt}
                                  </div>
                                )
                              })}
                            </div>
                          )}

                          <div className="space-y-1 bg-card/60 p-3 rounded-lg border border-border/40">
                            <p className="text-[10px] text-muted-foreground leading-none">
                              Submitted Answer:{" "}
                              <span className={f.is_correct ? "text-emerald-600 font-bold" : "text-red-600 font-bold"}>
                                {f.submitted_answer}
                              </span>
                            </p>
                            {!f.is_correct && (
                              <p className="text-[10px] text-muted-foreground leading-none mt-1">
                                Correct Answer: <span className="text-emerald-600 font-bold">{f.correct_answer}</span>
                              </p>
                            )}
                            {f.explanation && (
                              <p className="text-[10px] text-muted-foreground leading-relaxed mt-2.5 border-t border-border/40 pt-2">
                                <span className="font-bold text-foreground">AI Explanation:</span> {f.explanation}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={() => {
                      setQuizResult(null);
                      setUserAnswers({});
                      setError(null);
                    }}
                    className="px-6 py-2.5 bg-primary hover:bg-primary/95 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
                  >
                    Retake Quiz
                  </button>
                </div>
              </div>
            ) : (
              /* ACTIVE QUIZ FILL-OUT FORM */
              <form onSubmit={handleQuizSubmit} className="space-y-6 text-xs">
                {questions.map((q, idx) => {
                  const selectedAns = userAnswers[q.id] || ""

                  return (
                    <div key={q.id} className="p-5 bg-card border border-border rounded-xl space-y-4 shadow-sm">
                      <div className="flex items-start space-x-2.5">
                        <HelpCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <p className="font-bold text-foreground text-xs leading-normal">
                          Question {idx + 1}: {q.question_text}
                        </p>
                      </div>

                      {/* Render inputs based on Question Type */}
                      {q.question_type === "mcq" && q.options && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-7.5">
                          {q.options.map((opt) => {
                            const isSelected = selectedAns === opt
                            return (
                              <label
                                key={opt}
                                className={`px-4 py-3 rounded-xl border text-xs font-semibold select-none flex items-center space-x-2 transition-all ${
                                  isSelected
                                    ? "border-primary bg-primary/5 text-primary"
                                    : "border-border bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-900 text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`q_${q.id}`}
                                  checked={isSelected}
                                  onChange={() => handleAnswerSelect(q.id, opt)}
                                  className="hidden"
                                />
                                <span>{opt}</span>
                              </label>
                            )
                          })}
                        </div>
                      )}

                      {q.question_type === "true_false" && (
                        <div className="flex space-x-3 pl-7.5">
                          {["True", "False"].map((opt) => {
                            const isSelected = selectedAns === opt
                            return (
                              <label
                                key={opt}
                                className={`px-6 py-2.5 rounded-xl border text-xs font-semibold cursor-pointer flex items-center space-x-2 transition-all ${
                                  isSelected
                                    ? "border-primary bg-primary/5 text-primary"
                                    : "border-border bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-900 text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`q_${q.id}`}
                                  checked={isSelected}
                                  onChange={() => handleAnswerSelect(q.id, opt)}
                                  className="hidden"
                                />
                                <span>{opt}</span>
                              </label>
                            )
                          })}
                        </div>
                      )}

                      {["fill_in_blanks", "short_answer"].includes(q.question_type) && (
                        <div className="pl-7.5">
                          <input
                            type="text"
                            placeholder="Type your answer here..."
                            value={selectedAns}
                            onChange={(e) => handleAnswerSelect(q.id, e.target.value)}
                            className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm transition-all"
                            required
                          />
                        </div>
                      )}
                    </div>
                  )
                })}

                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-8 py-3 bg-primary hover:bg-primary/95 disabled:bg-primary/50 text-white font-bold rounded-xl shadow-md flex items-center space-x-2 cursor-pointer transition-all"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Grading submission...</span>
                      </>
                    ) : (
                      <span>Submit Answers</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
