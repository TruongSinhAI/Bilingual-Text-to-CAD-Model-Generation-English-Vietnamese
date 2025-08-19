"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { 
  FolderTree, 
  Settings, 
  Upload, 
  Menu, 
  X,
  ChevronLeft,
  ChevronRight
} from "lucide-react"

interface ResponsiveLayoutProps {
  children?: React.ReactNode
  modelTree?: React.ReactNode
  viewer?: React.ReactNode
  properties?: React.ReactNode
  toolbar?: React.ReactNode
  onFileUpload?: () => void
}

type PanelType = 'tree' | 'properties' | null

export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  children,
  modelTree,
  viewer,
  properties,
  toolbar,
  onFileUpload
}) => {
  const [activePanel, setActivePanel] = useState<PanelType>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
      if (window.innerWidth >= 1024) {
        setActivePanel(null) // Close mobile panels on desktop
      }
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Mobile navigation component
  const MobileNavigation = () => (
    <div className="lg:hidden fixed bottom-4 left-4 right-4 z-50">
      <Card className="backdrop-blur-md bg-white/90 border border-gray-200/50 shadow-lg">
        <div className="flex justify-around p-2">
          <Sheet open={activePanel === 'tree'} onOpenChange={(open) => setActivePanel(open ? 'tree' : null)}>
            <SheetTrigger asChild>
              <Button 
                variant={activePanel === 'tree' ? 'default' : 'ghost'}
                size="sm"
                className="flex-1 mx-1"
              >
                <FolderTree className="w-4 h-4" />
                <span className="sr-only">Model Tree</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0">
              <div className="h-full flex flex-col">
                <div className="p-4 border-b">
                  <h2 className="text-lg font-semibold">Model Tree</h2>
                </div>
                <div className="flex-1 overflow-auto">
                  {modelTree}
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <Button 
            variant="ghost" 
            size="sm"
            className="flex-1 mx-1"
            onClick={onFileUpload}
          >
            <Upload className="w-4 h-4" />
            <span className="sr-only">Upload File</span>
          </Button>

          <Sheet open={activePanel === 'properties'} onOpenChange={(open) => setActivePanel(open ? 'properties' : null)}>
            <SheetTrigger asChild>
              <Button 
                variant={activePanel === 'properties' ? 'default' : 'ghost'}
                size="sm"
                className="flex-1 mx-1"
              >
                <Settings className="w-4 h-4" />
                <span className="sr-only">Properties</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 p-0">
              <div className="h-full flex flex-col">
                <div className="p-4 border-b">
                  <h2 className="text-lg font-semibold">Properties</h2>
                </div>
                <div className="flex-1 overflow-auto">
                  {properties}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </Card>
    </div>
  )

  // Desktop sidebar toggle
  const SidebarToggle = ({ side }: { side: 'left' | 'right' }) => (
    <Button
      variant="ghost"
      size="icon"
      className="absolute top-4 z-10 h-8 w-8 bg-background/80 backdrop-blur-sm border shadow-sm hover:bg-background"
      style={{
        [side === 'left' ? 'left' : 'right']: sidebarCollapsed ? '4px' : side === 'left' ? '252px' : '316px'
      }}
      onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
    >
      {side === 'left' ? (
        sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />
      ) : (
        sidebarCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
      )}
    </Button>
  )

  if (isMobile) {
    // Mobile layout: Full-screen viewer with bottom navigation
    return (
      <div className="h-screen flex flex-col bg-background">
        {/* Mobile toolbar */}
        {toolbar && (
          <div className="border-b bg-background/95 backdrop-blur-sm">
            {toolbar}
          </div>
        )}

        {/* Main viewer area */}
        <div className="flex-1 relative overflow-hidden">
          {viewer}
        </div>

        {/* Mobile navigation */}
        <MobileNavigation />

        {children}
      </div>
    )
  }

  // Desktop layout: Three-column responsive grid
  return (
    <div className="h-screen flex bg-background">
      {/* Left sidebar - Model Tree */}
      <div className={cn(
        "relative border-r bg-background transition-all duration-300 ease-in-out",
        sidebarCollapsed ? "w-0 overflow-hidden" : "w-64"
      )}>
        <div className="h-full flex flex-col">
          <div className="p-4 border-b bg-muted/30">
            <h2 className="text-lg font-semibold">Model Tree</h2>
          </div>
          <div className="flex-1 overflow-auto">
            {modelTree}
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        {toolbar && (
          <div className="border-b bg-background/95 backdrop-blur-sm">
            {toolbar}
          </div>
        )}

        {/* Viewer area */}
        <div className="flex-1 relative overflow-hidden">
          {viewer}
          
          {/* Sidebar toggles */}
          <SidebarToggle side="left" />
          <SidebarToggle side="right" />
        </div>
      </div>

      {/* Right sidebar - Properties */}
      <div className={cn(
        "relative border-l bg-background transition-all duration-300 ease-in-out",
        sidebarCollapsed ? "w-0 overflow-hidden" : "w-80"
      )}>
        <div className="h-full flex flex-col">
          <div className="p-4 border-b bg-muted/30">
            <h2 className="text-lg font-semibold">Properties</h2>
          </div>
          <div className="flex-1 overflow-auto">
            {properties}
          </div>
        </div>
      </div>

      {children}
    </div>
  )
}

// Hook for responsive behavior
export const useResponsive = () => {
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)

  useEffect(() => {
    const checkScreen = () => {
      const width = window.innerWidth
      setIsMobile(width < 768)
      setIsTablet(width >= 768 && width < 1024)
    }

    checkScreen()
    window.addEventListener('resize', checkScreen)
    return () => window.removeEventListener('resize', checkScreen)
  }, [])

  return {
    isMobile,
    isTablet,
    isDesktop: !isMobile && !isTablet
  }
}

// Responsive container component
export const ResponsiveContainer: React.FC<{
  children: React.ReactNode
  className?: string
}> = ({ children, className }) => {
  return (
    <div className={cn(
      "w-full mx-auto px-4 sm:px-6 lg:px-8",
      "max-w-sm sm:max-w-md md:max-w-lg lg:max-w-none",
      className
    )}>
      {children}
    </div>
  )
}

export default ResponsiveLayout