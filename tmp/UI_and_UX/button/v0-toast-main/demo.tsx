'use client'

import { useState } from 'react'
import Toast from './toast'

export default function Demo() {
  const [state, setState] = useState<'initial' | 'loading' | 'success'>('initial')

  const handleSave = () => {
    setState('loading')
    setTimeout(() => {
      setState('success')
      setTimeout(() => {
        setState('initial')
      }, 2000)
    }, 1500)
  }

  const handleReset = () => {
    setState('initial')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090B]">
      <Toast 
        state={state}
        onSave={handleSave}
        onReset={handleReset}
      />
    </div>
  )
}
