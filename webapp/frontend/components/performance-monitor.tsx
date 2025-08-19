"use client"

import React, { useState, useEffect, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Activity, 
  Cpu, 
  Monitor, 
  Zap, 
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp
} from "lucide-react"
import { cn } from "@/lib/utils"

interface PerformanceMetrics {
  fps: number
  memoryUsage: number
  renderTime: number
  apiLatency: number
  connectionStatus: 'connected' | 'disconnected' | 'slow'
}

interface PerformanceMonitorProps {
  modelComplexity?: number
  isVisible?: boolean
  onOptimizationSuggest?: (suggestions: string[]) => void
}

export function PerformanceMonitor({ 
  modelComplexity = 0, 
  isVisible = true,
  onOptimizationSuggest 
}: PerformanceMonitorProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    memoryUsage: 0,
    renderTime: 16,
    apiLatency: 0,
    connectionStatus: 'connected'
  })
  
  const [history, setHistory] = useState<PerformanceMetrics[]>([])
  const [isOptimized, setIsOptimized] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)
  const frameRef = useRef<number>()
  const lastTimeRef = useRef<number>()
  const framesRef = useRef<number>(0)

  // FPS Monitoring
  useEffect(() => {
    const measureFPS = (timestamp: number) => {
      if (lastTimeRef.current) {
        framesRef.current++
        const elapsed = timestamp - lastTimeRef.current
        
        if (elapsed >= 1000) {
          const fps = Math.round((framesRef.current * 1000) / elapsed)
          setMetrics(prev => ({ ...prev, fps }))
          framesRef.current = 0
          lastTimeRef.current = timestamp
        }
      } else {
        lastTimeRef.current = timestamp
      }
      
      frameRef.current = requestAnimationFrame(measureFPS)
    }
    
    frameRef.current = requestAnimationFrame(measureFPS)
    
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [])

  // Memory Monitoring
  useEffect(() => {
    const measureMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory
        const memoryUsage = Math.round(memory.usedJSHeapSize / 1024 / 1024)
        setMetrics(prev => ({ ...prev, memoryUsage }))
      }
    }

    const interval = setInterval(measureMemory, 2000)
    measureMemory()
    
    return () => clearInterval(interval)
  }, [])

  // Performance Analysis
  useEffect(() => {
    const shouldOptimize = metrics.fps < 30 || metrics.memoryUsage > 100 || metrics.renderTime > 33
    setIsOptimized(!shouldOptimize)
    
    if (shouldOptimize && onOptimizationSuggest) {
      const suggestions = []
      if (metrics.fps < 30) suggestions.push("Giảm chất lượng rendering")
      if (metrics.memoryUsage > 100) suggestions.push("Tối ưu memory usage")
      if (metrics.renderTime > 33) suggestions.push("Giảm độ phức tạp mô hình")
      
      onOptimizationSuggest(suggestions)
    }
  }, [metrics, onOptimizationSuggest])

  // API Latency Test
  const testApiLatency = async () => {
    const start = performance.now()
    try {
      await fetch('http://localhost:8000/api/health')
      const latency = performance.now() - start
      setMetrics(prev => ({ 
        ...prev, 
        apiLatency: latency,
        connectionStatus: latency > 1000 ? 'slow' : 'connected'
      }))
    } catch (error) {
      setMetrics(prev => ({ 
        ...prev, 
        connectionStatus: 'disconnected'
      }))
    }
  }

  useEffect(() => {
    testApiLatency()
    const interval = setInterval(testApiLatency, 10000)
    return () => clearInterval(interval)
  }, [])

  if (!isVisible) return null

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'text-green-600'
      case 'slow': return 'text-yellow-600'
      case 'disconnected': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getPerformanceLevel = () => {
    if (metrics.fps >= 50 && metrics.memoryUsage < 50) return 'excellent'
    if (metrics.fps >= 30 && metrics.memoryUsage < 100) return 'good'
    if (metrics.fps >= 15) return 'fair'
    return 'poor'
  }

  const performanceLevel = getPerformanceLevel()

  return (
    <div className="relative">
      {/* Collapsed State - Header Display */}
      <div 
        className="flex items-center gap-2 px-3 py-1.5 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-md shadow-sm cursor-pointer hover:bg-white/95 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <Monitor className="w-3.5 h-3.5 text-blue-600" />
        
        {/* Status indicators in a row */}
        <div className="flex items-center gap-1.5">
          {/* FPS indicator */}
          <div className="flex items-center gap-0.5">
            <Activity className="w-2.5 h-2.5 text-blue-500" />
            <span className="text-xs font-medium text-gray-700">{metrics.fps}</span>
            {metrics.fps >= 60 ? (
              <TrendingUp className="w-2 h-2 text-green-500" />
            ) : metrics.fps < 30 ? (
              <TrendingDown className="w-2 h-2 text-red-500" />
            ) : null}
          </div>

          {/* Memory indicator */}
          <div className="flex items-center gap-0.5">
            <Cpu className="w-2.5 h-2.5 text-purple-500" />
            <span className="text-xs font-medium text-gray-700">{metrics.memoryUsage}MB</span>
          </div>

          {/* Connection status */}
          <div className={cn(
            "w-2 h-2 rounded-full",
            metrics.connectionStatus === 'connected' && "bg-green-500",
            metrics.connectionStatus === 'slow' && "bg-yellow-500",
            metrics.connectionStatus === 'disconnected' && "bg-red-500"
          )} />
        </div>

        {/* Overall status badge */}
        <Badge
          variant="outline"
          className={cn(
            "text-xs px-1.5 py-0 h-4",
            performanceLevel === 'excellent' && "bg-green-50 border-green-200 text-green-700",
            performanceLevel === 'good' && "bg-blue-50 border-blue-200 text-blue-700",
            performanceLevel === 'fair' && "bg-yellow-50 border-yellow-200 text-yellow-700",
            performanceLevel === 'poor' && "bg-red-50 border-red-200 text-red-700"
          )}
        >
          {performanceLevel === 'excellent' && '✓'}
          {performanceLevel === 'good' && '○'}
          {performanceLevel === 'fair' && '△'}
          {performanceLevel === 'poor' && '⚠'}
        </Badge>

        {/* Expand/Collapse icon */}
        {isExpanded ? (
          <ChevronUp className="w-3 h-3 text-gray-400" />
        ) : (
          <ChevronDown className="w-3 h-3 text-gray-400" />
        )}
      </div>

      {/* Expanded State - Detailed View */}
      {isExpanded && (
        <Card className="absolute right-0 top-full mt-2 w-64 bg-white/95 backdrop-blur-sm border border-gray-200 shadow-lg z-50">
          <div className="p-3">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-semibold text-gray-900">Performance Monitor</h3>
              </div>
              <div className="flex items-center gap-1">
                {isOptimized ? (
                  <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-yellow-600" />
                )}
              </div>
            </div>

            {/* Detailed Metrics - Vertical Layout */}
            <div className="space-y-2 mb-3">
              {/* FPS */}
              <div className="flex items-center justify-between p-2 bg-gradient-to-r from-blue-50 to-blue-100 rounded-md border border-blue-200">
                <div className="flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Frame Rate</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-bold text-blue-900">{metrics.fps} FPS</span>
                  {metrics.fps >= 60 ? (
                    <TrendingUp className="w-3 h-3 text-green-500" />
                  ) : metrics.fps < 30 ? (
                    <TrendingDown className="w-3 h-3 text-red-500" />
                  ) : null}
                </div>
              </div>

              {/* Memory */}
              <div className="flex items-center justify-between p-2 bg-gradient-to-r from-purple-50 to-purple-100 rounded-md border border-purple-200">
                <div className="flex items-center gap-2">
                  <Cpu className="w-3.5 h-3.5 text-purple-600" />
                  <span className="text-sm font-medium text-purple-900">Memory Usage</span>
                </div>
                <span className="text-sm font-bold text-purple-900">{metrics.memoryUsage} MB</span>
              </div>

              {/* Render Time */}
              <div className="flex items-center justify-between p-2 bg-gradient-to-r from-green-50 to-green-100 rounded-md border border-green-200">
                <div className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-green-600" />
                  <span className="text-sm font-medium text-green-900">Render Time</span>
                </div>
                <span className="text-sm font-bold text-green-900">{metrics.renderTime.toFixed(1)} ms</span>
              </div>

              {/* API Status */}
              <div className="flex items-center justify-between p-2 bg-gradient-to-r from-gray-50 to-gray-100 rounded-md border border-gray-200">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    metrics.connectionStatus === 'connected' && "bg-green-500",
                    metrics.connectionStatus === 'slow' && "bg-yellow-500",
                    metrics.connectionStatus === 'disconnected' && "bg-red-500"
                  )} />
                  <span className="text-sm font-medium text-gray-900">API Connection</span>
                </div>
                <span className={cn("text-sm font-bold", getStatusColor(metrics.connectionStatus))}>
                  {metrics.connectionStatus === 'connected' && 'Connected'}
                  {metrics.connectionStatus === 'slow' && `Slow (${metrics.apiLatency.toFixed(0)}ms)`}
                  {metrics.connectionStatus === 'disconnected' && 'Disconnected'}
                </span>
              </div>
            </div>

            {/* Performance Summary */}
            <div className="mb-3 p-2 bg-gray-50 rounded-md border border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Overall Status</span>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs px-2 py-0.5",
                    performanceLevel === 'excellent' && "bg-green-50 border-green-200 text-green-800",
                    performanceLevel === 'good' && "bg-blue-50 border-blue-200 text-blue-800",
                    performanceLevel === 'fair' && "bg-yellow-50 border-yellow-200 text-yellow-800",
                    performanceLevel === 'poor' && "bg-red-50 border-red-200 text-red-800"
                  )}
                >
                  {performanceLevel === 'excellent' && 'Xuất sắc'}
                  {performanceLevel === 'good' && 'Tốt'}
                  {performanceLevel === 'fair' && 'Khá'}
                  {performanceLevel === 'poor' && 'Kém'}
                </Badge>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={testApiLatency}
                className="flex-1 text-xs h-7"
              >
                Test API
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setHistory([])
                  setMetrics(prev => ({ ...prev, memoryUsage: 0 }))
                }}
                className="flex-1 text-xs h-7"
              >
                Clear
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}