"use client"

import * as React from "react"
import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { cn } from "@/lib/utils"

interface AccessibilityContextType {
  announcements: string
  announce: (message: string, priority?: 'polite' | 'assertive') => void
  highContrast: boolean
  setHighContrast: (enabled: boolean) => void
  reducedMotion: boolean
  setReducedMotion: (enabled: boolean) => void
  fontSize: 'sm' | 'base' | 'lg' | 'xl'
  setFontSize: (size: 'sm' | 'base' | 'lg' | 'xl') => void
  keyboardNavigation: boolean
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined)

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext)
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider')
  }
  return context
}

interface AccessibilityProviderProps {
  children: React.ReactNode
}

export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({ children }) => {
  const [announcements, setAnnouncements] = useState('')
  const [highContrast, setHighContrast] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg' | 'xl'>('base')
  const [keyboardNavigation, setKeyboardNavigation] = useState(false)

  // Check for system preferences
  useEffect(() => {
    // Check for reduced motion preference
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(reducedMotionQuery.matches)
    
    const handleReducedMotionChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches)
    }
    
    reducedMotionQuery.addEventListener('change', handleReducedMotionChange)

    // Check for high contrast preference
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)')
    setHighContrast(highContrastQuery.matches)
    
    const handleHighContrastChange = (e: MediaQueryListEvent) => {
      setHighContrast(e.matches)
    }
    
    highContrastQuery.addEventListener('change', handleHighContrastChange)

    // Load saved preferences
    const savedHighContrast = localStorage.getItem('accessibility-high-contrast')
    const savedReducedMotion = localStorage.getItem('accessibility-reduced-motion')
    const savedFontSize = localStorage.getItem('accessibility-font-size')
    
    if (savedHighContrast) setHighContrast(savedHighContrast === 'true')
    if (savedReducedMotion) setReducedMotion(savedReducedMotion === 'true')
    if (savedFontSize) setFontSize(savedFontSize as 'sm' | 'base' | 'lg' | 'xl')

    return () => {
      reducedMotionQuery.removeEventListener('change', handleReducedMotionChange)
      highContrastQuery.removeEventListener('change', handleHighContrastChange)
    }
  }, [])

  // Save preferences to localStorage
  useEffect(() => {
    localStorage.setItem('accessibility-high-contrast', highContrast.toString())
  }, [highContrast])

  useEffect(() => {
    localStorage.setItem('accessibility-reduced-motion', reducedMotion.toString())
  }, [reducedMotion])

  useEffect(() => {
    localStorage.setItem('accessibility-font-size', fontSize)
  }, [fontSize])

  // Keyboard navigation detection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        setKeyboardNavigation(true)
      }
    }

    const handleMouseDown = () => {
      setKeyboardNavigation(false)
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleMouseDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleMouseDown)
    }
  }, [])

  // Apply CSS classes based on preferences
  useEffect(() => {
    const root = document.documentElement
    
    // High contrast
    if (highContrast) {
      root.classList.add('high-contrast')
    } else {
      root.classList.remove('high-contrast')
    }

    // Reduced motion
    if (reducedMotion) {
      root.classList.add('reduced-motion')
    } else {
      root.classList.remove('reduced-motion')
    }

    // Font size
    root.classList.remove('text-sm', 'text-base', 'text-lg', 'text-xl')
    root.classList.add(`text-${fontSize}`)

    // Keyboard navigation
    if (keyboardNavigation) {
      root.classList.add('keyboard-navigation')
    } else {
      root.classList.remove('keyboard-navigation')
    }
  }, [highContrast, reducedMotion, fontSize, keyboardNavigation])

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    setAnnouncements(message)
    
    // Clear announcement after a delay
    setTimeout(() => {
      setAnnouncements('')
    }, 1000)
  }, [])

  const value: AccessibilityContextType = {
    announcements,
    announce,
    highContrast,
    setHighContrast,
    reducedMotion,
    setReducedMotion,
    fontSize,
    setFontSize,
    keyboardNavigation
  }

  return (
    <AccessibilityContext.Provider value={value}>
      {/* Screen reader announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcements}
      </div>
      
      {children}
    </AccessibilityContext.Provider>
  )
}

// Comprehensive keyboard navigation hook
export const useKeyboardNavigation = () => {
  const { announce } = useAccessibility()

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // File operations
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'o':
            event.preventDefault()
            announce('Opening file dialog')
            // Trigger file upload
            document.getElementById('file-input')?.click()
            break
          case 's':
            event.preventDefault()
            announce('Exporting model')
            // Trigger export
            document.getElementById('export-button')?.click()
            break
          case 'r':
            event.preventDefault()
            announce('Resetting view')
            // Trigger reset
            document.getElementById('reset-button')?.click()
            break
        }
      }

      // View controls
      switch (event.key) {
        case '1':
          announce('Switching to front view')
          break
        case '2':
          announce('Switching to side view')
          break
        case '3':
          announce('Switching to top view')
          break
        case 'f':
          announce('Fitting view to model')
          break
        case 'w':
          announce('Toggling wireframe mode')
          break
        case 'g':
          announce('Toggling grid visibility')
          break
        case 'Escape':
          // Close any open modals/panels
          announce('Closing dialog')
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [announce])
}

// Focus management hook for modals and complex interactions
export const useFocusTrap = (active: boolean) => {
  const trapRef = React.useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!active || !trapRef.current) return

    const focusableElements = trapRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )

    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement?.focus()
          e.preventDefault()
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement?.focus()
          e.preventDefault()
        }
      }
    }

    document.addEventListener('keydown', handleTab)
    firstElement?.focus()

    return () => document.removeEventListener('keydown', handleTab)
  }, [active])

  return trapRef
}

// Color contrast checker
export const useColorContrast = () => {
  const checkContrast = useCallback((foreground: string, background: string) => {
    const getRelativeLuminance = (color: string) => {
      // Convert hex to RGB and calculate relative luminance
      const rgb = parseInt(color.slice(1), 16)
      const r = (rgb >> 16) & 0xff
      const g = (rgb >> 8) & 0xff
      const b = rgb & 0xff

      const sRGB = [r, g, b].map(c => {
        c = c / 255
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
      })

      return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2]
    }

    const l1 = getRelativeLuminance(foreground)
    const l2 = getRelativeLuminance(background)

    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)

    return {
      ratio,
      passAA: ratio >= 4.5,
      passAAA: ratio >= 7,
      passLargeAA: ratio >= 3
    }
  }, [])

  return { checkContrast }
}

// Accessible viewer component wrapper
export const AccessibleViewer: React.FC<{
  children: React.ReactNode
  modelName?: string
  vertexCount?: number
}> = ({ children, modelName, vertexCount }) => {
  const { announce } = useAccessibility()

  useEffect(() => {
    if (modelName) {
      announce(`3D model ${modelName} loaded with ${vertexCount || 0} vertices`)
    }
  }, [modelName, vertexCount, announce])

  return (
    <div
      role="img"
      aria-label={modelName ? `3D model: ${modelName}` : '3D viewer canvas'}
      aria-describedby="canvas-description"
      tabIndex={0}
    >
      {children}
      
      {/* Hidden description for screen readers */}
      <div id="canvas-description" className="sr-only">
        {modelName ? (
          `Loaded 3D model ${modelName} with ${vertexCount || 0} vertices. 
           Use toolbar buttons or keyboard shortcuts to interact with the model.
           Press Ctrl+O to upload a file, F to fit view, 1-3 for standard views.`
        ) : (
          'Empty 3D viewer. Upload a file to view a 3D model. 
           Use Ctrl+O to open file dialog.'
        )}
      </div>
    </div>
  )
}