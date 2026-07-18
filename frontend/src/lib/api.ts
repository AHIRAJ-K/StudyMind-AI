/* eslint-disable @typescript-eslint/no-explicit-any */
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"

interface FetchOptions extends RequestInit {
  json?: any
  formData?: FormData
}

function mapErrorToFriendly(errorMsg: string, status?: number): string {
  const msg = (errorMsg || "").toUpperCase()
  
  // Check network/fetch errors first
  if (
    msg.includes("FAILED TO FETCH") || 
    msg.includes("NETWORK") || 
    msg.includes("CONNECTION") || 
    msg.includes("LOAD FAILED") ||
    status === 0
  ) {
    return "Unable to connect to AI service."
  }
  
  if (status === 429 || msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("QUOTA")) {
    return "Daily AI usage limit reached. Please try again later."
  }
  
  if (status === 500 || msg.includes("500") || msg.includes("INTERNAL") || msg.includes("INTERNAL_SERVER_ERROR") || msg.includes("SERVER ERROR")) {
    return "AI service is temporarily unavailable."
  }
  
  return "AI service is temporarily unavailable."
}

async function request<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const url = `${API_URL}${path}`
  const headers = new Headers(options.headers || {})

  // Retrieve token from local storage
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  let body: any = options.body

  if (options.json) {
    headers.set("Content-Type", "application/json")
    body = JSON.stringify(options.json)
  } else if (options.formData) {
    // Fetch automatically sets boundary header when body is FormData
    body = options.formData
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      body,
    })

    if (response.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        // Avoid infinite redirect loops
        if (!window.location.pathname.includes("/login") && !window.location.pathname.includes("/signup")) {
          window.location.href = "/login"
        }
      }
      throw new Error("Unauthorized")
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const rawDetail = errorData.detail || "An unexpected error occurred."
      throw new Error(mapErrorToFriendly(rawDetail, response.status))
    }

    return response.json() as Promise<T>
  } catch (err: any) {
    // Don't re-wrap if it's already a clean error thrown above
    if (
      err.message === "Unauthorized" ||
      err.message === "Daily AI usage limit reached. Please try again later." ||
      err.message === "AI service is temporarily unavailable." ||
      err.message === "Unable to connect to AI service."
    ) {
      throw err
    }
    // Otherwise map network/fetch exception
    throw new Error(mapErrorToFriendly(err.message || String(err), 0))
  }
}

export const api = {
  get: <T>(path: string, options?: FetchOptions) => request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: any, options?: FetchOptions) => {
    const opt = body instanceof FormData ? { formData: body } : { json: body }
    return request<T>(path, { ...options, ...opt, method: "POST" })
  },
  put: <T>(path: string, body?: any, options?: FetchOptions) => {
    const opt = body instanceof FormData ? { formData: body } : { json: body }
    return request<T>(path, { ...options, ...opt, method: "PUT" })
  },
  patch: <T>(path: string, body?: any, options?: FetchOptions) => {
    const opt = body instanceof FormData ? { formData: body } : { json: body }
    return request<T>(path, { ...options, ...opt, method: "PATCH" })
  },
  delete: <T>(path: string, options?: FetchOptions) => request<T>(path, { ...options, method: "DELETE" }),
  
  /**
   * Helper to fetch a stream of text chunks (for real-time chat completions).
   */
  async stream(
    path: string,
    body: any,
    onChunk: (text: string) => void,
    onComplete?: () => void,
    onError?: (err: Error) => void
  ) {
    try {
      const url = `${API_URL}${path}`
      const headers = new Headers()
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
      
      if (token) {
        headers.set("Authorization", `Bearer ${token}`)
      }
      headers.set("Content-Type", "application/json")
 
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      })
 
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const rawDetail = errorData.detail || "Streaming connection failed."
        throw new Error(mapErrorToFriendly(rawDetail, response.status))
      }
 
      if (!response.body) {
        throw new Error("Response body is not readable.")
      }
 
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let done = false
 
      while (!done) {
        const { value, done: readerDone } = await reader.read()
        done = readerDone
        if (value) {
          const chunk = decoder.decode(value, { stream: !done })
          
          // Check if backend yielded an error block e.g. [Error: ...]
          if (chunk.includes("[Error:")) {
            const rawErrText = chunk.replace("[Error:", "").replace("]", "").trim()
            throw new Error(mapErrorToFriendly(rawErrText))
          }
          
          onChunk(chunk)
        }
      }
      if (onComplete) onComplete()
    } catch (err: any) {
      const friendlyMsg = mapErrorToFriendly(err.message || String(err))
      if (onError) onError(new Error(friendlyMsg))
    }
  }
}
