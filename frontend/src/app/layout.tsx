import "@/app/globals.css"
import { AuthProvider } from "@/context/auth-context"
import { ToastProvider } from "@/context/toast-context"

export const metadata = {
  title: "StudyMind AI | Your Premium AI Study Companion",
  description: "Organize documents, request AI summaries, run spaced repetition flashcards, generate interactive quizzes, visualize mind maps, and chat with your files utilizing Google Gemini.",
  keywords: ["StudyMind", "AI study assistant", "Gemini AI", "Spaced Repetition", "Notion AI", "NotebookLM", "Quizlet alternative"],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🧠</text></svg>" />
      </head>
      <body className="antialiased min-h-screen bg-background text-foreground transition-colors duration-150">
        <AuthProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
