"use client"

import { useState } from "react"
import {
  Toast,
  ToastProps,
  ToastActionElement,
  ToastProvider,
  ToastViewport,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
} from "@/components/ui/toast"

export default function Home() {
  const [state, setState] = useState<"initial" | "loading" | "success">("initial")

  const handleSave = () => {
    setState("loading")
    setTimeout(() => {
      setState("success")
      setTimeout(() => {
        setState("initial")
      }, 2000)
    }, 1500)
  }

  const handleReset = () => {
    setState("initial")
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Toast state={state} onSave={handleSave} onReset={handleReset} />
    </div>
  )
}
