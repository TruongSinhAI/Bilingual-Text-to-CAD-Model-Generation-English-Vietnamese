"use client"

import * as React from "react"
import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  FileText, 
  Cpu, 
  Eye,
  RefreshCw
} from "lucide-react"
import { cn } from "@/lib/utils"

type LoadingStage = 'idle' | 'reading' | 'parsing' | 'processing' | 'rendering' | 'complete'

interface ProgressiveLoaderProps {
  onFileLoad: (file: File) => Promise<void>
  className?: string
}

interface LoadingStageConfig {
  message: string
  icon: React.ReactNode
  color: string
}

const stageConfigs: Record<LoadingStage, LoadingStageConfig> = {
  idle: { message: 'Ready', icon: <FileText className="w-5 h-5" />, color: 'text-muted-foreground' },
  reading: { message: 'Reading file...', icon: <FileText className="w-5 h-5" />, color: 'text-blue-500' },
  parsing: { message: 'Parsing geometry...', icon: <Cpu className="w-5 h-5" />, color: 'text-orange-500' },
  processing: { message: 'Processing mesh...', icon: <Cpu className="w-5 h-5" />, color: 'text-purple-500' },
  rendering: { message: 'Preparing render...', icon: <Eye className="w-5 h-5" />, color: 'text-green-500' },
  complete: { message: 'Ready!', icon: <CheckCircle className="w-5 h-5" />, color: 'text-green-600' }
}

export const ProgressiveLoader: React.FC<ProgressiveLoaderProps> = ({
  onFileLoad,
  className
}) => {
  const [loadingStage, setLoadingStage] = useState<LoadingStage>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string>('')

  const handleFileLoad = async (file: File) => {
    try {
      setError(null)
      setFileName(file.name)
      
      // Stage 1: Reading
      setLoadingStage('reading')
      setProgress(10)
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // Stage 2: Parsing
      setLoadingStage('parsing')
      setProgress(30)
      await new Promise(resolve => setTimeout(resolve, 400))
      
      // Stage 3: Processing (actual file load)
      setLoadingStage('processing')
      setProgress(60)
      await onFileLoad(file)
      
      // Stage 4: Rendering
      setLoadingStage('rendering')
      setProgress(90)
      await new Promise(resolve => setTimeout(resolve, 200))
      
      // Stage 5: Complete
      setLoadingStage('complete')
      setProgress(100)
      
      // Reset after success
      setTimeout(() => {
        setLoadingStage('idle')
        setProgress(0)
        setFileName('')
      }, 1500)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load file')
      setLoadingStage('idle')
      setProgress(0)
    }
  }

  const retry = () => {
    setError(null)
    setLoadingStage('idle')
    setProgress(0)
  }

  const currentConfig = stageConfigs[loadingStage]
  const isLoading = loadingStage !== 'idle' && loadingStage !== 'complete'

  return (
    <div className={cn("space-y-4", className)}>
      {/* Loading Progress Card */}
      {(isLoading || loadingStage === 'complete') && (
        <Card className={cn(
          "p-4 transition-all duration-300 ease-out",
          loadingStage === 'complete' ? "border-green-200 bg-green-50/50" : "border-blue-200 bg-blue-50/50"
        )}>
          <div className="space-y-3">
            {/* Header with icon and message */}
            <div className="flex items-center gap-3">
              <div className="relative">
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                ) : (
                  <div className={currentConfig.color}>
                    {currentConfig.icon}
                  </div>
                )}
                
                {/* Pulse ring for active loading */}
                {isLoading && (
                  <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping" />
                )}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className={cn(
                    "text-sm font-medium transition-colors",
                    currentConfig.color
                  )}>
                    {currentConfig.message}
                  </span>
                  
                  <span className="text-xs text-muted-foreground">
                    {progress}%
                  </span>
                </div>
                
                {fileName && (
                  <div className="text-xs text-muted-foreground mt-1 truncate">
                    {fileName}
                  </div>
                )}
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="space-y-1">
              <Progress 
                value={progress} 
                className={cn(
                  "h-2 transition-all duration-300",
                  loadingStage === 'complete' && "bg-green-100"
                )}
              />
              
              {/* Stage indicators */}
              <div className="flex justify-between text-xs text-muted-foreground">
                <span className={loadingStage === 'reading' ? 'text-blue-500 font-medium' : ''}>
                  Read
                </span>
                <span className={loadingStage === 'parsing' ? 'text-orange-500 font-medium' : ''}>
                  Parse
                </span>
                <span className={loadingStage === 'processing' ? 'text-purple-500 font-medium' : ''}>
                  Process
                </span>
                <span className={loadingStage === 'rendering' ? 'text-green-500 font-medium' : ''}>
                  Render
                </span>
              </div>
            </div>
            
            {/* Estimated time remaining */}
            {isLoading && (
              <div className="text-xs text-muted-foreground">
                Estimated time: {Math.ceil((100 - progress) / 20)} seconds
              </div>
            )}
          </div>
        </Card>
      )}
      
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="animate-in slide-in-from-top-1">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading File</AlertTitle>
          <AlertDescription className="mt-2">
            <div className="space-y-2">
              <p>{error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={retry}
                className="h-8"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Try Again
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      {/* Success feedback */}
      {loadingStage === 'complete' && (
        <div className="animate-in slide-in-from-bottom-1">
          <Alert className="border-green-200 bg-green-50 text-green-800">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle>File Loaded Successfully</AlertTitle>
            <AlertDescription>
              {fileName} has been loaded and is ready for viewing.
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  )
}

// Skeleton components for different loading states
export const ViewerSkeleton: React.FC = () => (
  <div className="space-y-4 p-4 animate-pulse">
    {/* Header skeleton */}
    <div className="space-y-2">
      <div className="h-6 bg-muted rounded w-32" />
      <div className="h-4 bg-muted rounded w-48" />
    </div>
    
    {/* Controls skeleton */}
    <div className="grid grid-cols-3 gap-4">
      <div className="h-24 bg-muted rounded-lg" />
      <div className="h-24 bg-muted rounded-lg" />
      <div className="h-24 bg-muted rounded-lg" />
    </div>
    
    {/* Properties skeleton */}
    <div className="space-y-2">
      <div className="h-4 bg-muted rounded w-full" />
      <div className="h-4 bg-muted rounded w-3/4" />
      <div className="h-4 bg-muted rounded w-1/2" />
    </div>
  </div>
)

export const PropertiesSkeleton: React.FC = () => (
  <div className="space-y-6 p-4 animate-pulse">
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="space-y-3">
        <div className="h-5 bg-muted rounded w-24" />
        <div className="grid grid-cols-2 gap-2">
          <div className="h-8 bg-muted rounded" />
          <div className="h-8 bg-muted rounded" />
        </div>
        <div className="h-2 bg-muted rounded w-full" />
      </div>
    ))}
  </div>
)

export default ProgressiveLoader