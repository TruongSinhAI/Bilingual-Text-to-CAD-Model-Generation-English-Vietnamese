"use client"

import * as React from "react"
import { useState, useRef, useEffect } from "react"
import { Canvas } from "@react-three/fiber"
import { OrbitControls, Environment, Grid, Text3D, Center } from "@react-three/drei"
import { 
  Upload, 
  RotateCcw, 
  Download, 
  Maximize2,
  Settings,
  Palette,
  Layers,
  Eye,
  Zap,
  Sparkles,
  Play,
  Pause,
  Volume2
} from "lucide-react"
import { cn } from "@/lib/utils"

// Enhanced components with visual improvements
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

const VisualShowcase: React.FC = () => {
  const [metalness, setMetalness] = useState([0.3])
  const [roughness, setRoughness] = useState([0.6])
  const [autoRotate, setAutoRotate] = useState(true)
  const [showGrid, setShowGrid] = useState(true)
  const [wireframe, setWireframe] = useState(false)
  const [currentView, setCurrentView] = useState<'front' | 'side' | 'top' | 'iso'>('iso')
  const [progress, setProgress] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  
  const controlsRef = useRef<any>(null)

  // Simulate loading progress
  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            setIsLoading(false)
            return 0
          }
          return prev + 2
        })
      }, 50)
      return () => clearInterval(interval)
    }
  }, [isLoading])

  const views = {
    front: [0, 0, 5],
    side: [5, 0, 0],
    top: [0, 5, 0],
    iso: [5, 5, 5]
  }

  const setView = (view: keyof typeof views) => {
    setCurrentView(view)
    if (controlsRef.current) {
      const [x, y, z] = views[view]
      controlsRef.current.setPosition(x, y, z)
    }
  }

  const handleProcessFile = () => {
    setIsLoading(true)
    setProgress(0)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      {/* Header Section with Glass Morphism */}
      <div className="mb-8">
        <div className="relative overflow-hidden rounded-3xl bg-white/70 backdrop-blur-xl border border-white/20 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-purple-600/5 to-pink-600/5" />
          
          <div className="relative p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Enhanced 3D Viewer
                </h1>
                <p className="text-slate-600 mt-2 text-lg">
                  Professional CAD visualization with modern design
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="px-3 py-1 bg-green-50 border-green-200 text-green-700">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
                  Online
                </Badge>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white/50 hover:bg-white/80 border-white/30"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Button>
              </div>
            </div>

            {/* Enhanced Toolbar */}
            <div className="flex items-center gap-4 p-4 bg-white/40 rounded-2xl border border-white/30">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleProcessFile}
                  disabled={isLoading}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Load Model
                    </>
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white/60 hover:bg-white/80 border-white/30 transition-all duration-200"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>

              <div className="w-px h-6 bg-white/30" />

              {/* View Controls */}
              <div className="flex items-center gap-1">
                {Object.keys(views).map((view) => (
                  <Button
                    key={view}
                    variant={currentView === view ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setView(view as keyof typeof views)}
                    className={cn(
                      "transition-all duration-200",
                      currentView === view 
                        ? "bg-white/80 shadow-md" 
                        : "bg-white/20 hover:bg-white/40"
                    )}
                  >
                    {view.charAt(0).toUpperCase() + view.slice(1)}
                  </Button>
                ))}
              </div>

              <div className="w-px h-6 bg-white/30" />

              {/* Display Options */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Switch
                    id="wireframe"
                    checked={wireframe}
                    onCheckedChange={setWireframe}
                    className="data-[state=checked]:bg-blue-600"
                  />
                  <Label htmlFor="wireframe" className="text-sm font-medium text-slate-700">
                    Wireframe
                  </Label>
                </div>
                
                <div className="flex items-center gap-2">
                  <Switch
                    id="grid"
                    checked={showGrid}
                    onCheckedChange={setShowGrid}
                    className="data-[state=checked]:bg-blue-600"
                  />
                  <Label htmlFor="grid" className="text-sm font-medium text-slate-700">
                    Grid
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    id="rotate"
                    checked={autoRotate}
                    onCheckedChange={setAutoRotate}
                    className="data-[state=checked]:bg-blue-600"
                  />
                  <Label htmlFor="rotate" className="text-sm font-medium text-slate-700">
                    Auto Rotate
                  </Label>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            {isLoading && (
              <div className="mt-4 p-4 bg-white/40 rounded-2xl border border-white/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">Processing Model</span>
                  <span className="text-sm text-slate-600">{progress}%</span>
                </div>
                <div className="h-2 bg-white/40 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[600px]">
        {/* Model Information Panel */}
        <div className="lg:col-span-1">
          <Card className="h-full bg-white/70 backdrop-blur-xl border-white/20 shadow-xl">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-slate-800">
                <Layers className="w-5 h-5 text-blue-600" />
                Model Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-100">
                  <Label className="text-xs text-slate-600 uppercase tracking-wide font-semibold">
                    File Name
                  </Label>
                  <p className="text-sm font-medium text-slate-800 mt-1">
                    sample-model.stl
                  </p>
                </div>
                
                <div className="p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-100">
                  <Label className="text-xs text-slate-600 uppercase tracking-wide font-semibold">
                    Format
                  </Label>
                  <p className="text-sm font-medium text-slate-800 mt-1">
                    STL
                  </p>
                </div>
                
                <div className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100">
                  <Label className="text-xs text-slate-600 uppercase tracking-wide font-semibold">
                    Vertices
                  </Label>
                  <p className="text-sm font-medium text-slate-800 mt-1">
                    12,847
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <Label className="text-sm font-semibold text-slate-700 mb-3 block">
                  Quick Actions
                </Label>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start bg-white/60 hover:bg-white/80 border-white/30"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Inspect Geometry
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start bg-white/60 hover:bg-white/80 border-white/30"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Auto Repair
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start bg-white/60 hover:bg-white/80 border-white/30"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Optimize Mesh
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 3D Viewer */}
        <div className="lg:col-span-2">
          <Card className="h-full bg-white/70 backdrop-blur-xl border-white/20 shadow-xl overflow-hidden">
            <div className="relative h-full">
              <Canvas
                shadows
                camera={{ position: [5, 5, 5], fov: 50 }}
                className="w-full h-full rounded-lg"
                style={{
                  background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'
                }}
              >
                <ambientLight intensity={0.6} />
                <directionalLight
                  position={[10, 10, 5]}
                  intensity={1}
                  castShadow
                  shadow-mapSize-width={2048}
                  shadow-mapSize-height={2048}
                />
                <pointLight position={[-10, -10, -10]} intensity={0.3} />

                <OrbitControls
                  ref={controlsRef}
                  enablePan={true}
                  enableZoom={true}
                  enableRotate={true}
                  autoRotate={autoRotate}
                  autoRotateSpeed={1}
                  dampingFactor={0.05}
                  enableDamping={true}
                />

                <Environment preset="studio" background={false} />

                {showGrid && (
                  <Grid
                    args={[20, 20]}
                    cellColor="#e2e8f0"
                    sectionColor="#94a3b8"
                    fadeDistance={30}
                    fadeStrength={1}
                  />
                )}

                {/* Sample 3D Object */}
                <Center>
                  <mesh castShadow receiveShadow>
                    <boxGeometry args={[2, 2, 2]} />
                    <meshStandardMaterial
                      color="#3b82f6"
                      metalness={metalness[0]}
                      roughness={roughness[0]}
                      wireframe={wireframe}
                    />
                  </mesh>
                </Center>

                {/* Floating 3D Text */}
                <Center position={[0, 3, 0]}>
                  <Text3D
                    font="/fonts/Inter_Bold.json"
                    size={0.3}
                    height={0.05}
                  >
                    3D CAD VIEWER
                    <meshStandardMaterial
                      color="#1e40af"
                      metalness={0.8}
                      roughness={0.2}
                    />
                  </Text3D>
                </Center>
              </Canvas>

              {/* Floating Controls */}
              <div className="absolute top-4 right-4 space-y-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-white/80 backdrop-blur-sm border-white/30 shadow-lg hover:shadow-xl transition-all duration-200"
                  onClick={() => controlsRef.current?.reset()}
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-white/80 backdrop-blur-sm border-white/30 shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <Maximize2 className="w-4 h-4" />
                </Button>
              </div>

              {/* View Indicator */}
              <div className="absolute bottom-4 left-4">
                <Badge
                  variant="outline"
                  className="bg-white/80 backdrop-blur-sm border-white/30 shadow-lg"
                >
                  {currentView.toUpperCase()} View
                </Badge>
              </div>
            </div>
          </Card>
        </div>

        {/* Properties Panel */}
        <div className="lg:col-span-1">
          <Card className="h-full bg-white/70 backdrop-blur-xl border-white/20 shadow-xl">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-slate-800">
                <Palette className="w-5 h-5 text-purple-600" />
                Materials
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Metalness Control */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-semibold text-slate-700">
                    Metalness
                  </Label>
                  <span className="text-sm font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded">
                    {metalness[0].toFixed(2)}
                  </span>
                </div>
                <Slider
                  value={metalness}
                  onValueChange={setMetalness}
                  max={1}
                  min={0}
                  step={0.1}
                  className="w-full"
                />
                <div className="h-2 bg-gradient-to-r from-slate-200 to-slate-400 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-300"
                    style={{ width: `${metalness[0] * 100}%` }}
                  />
                </div>
              </div>

              {/* Roughness Control */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-semibold text-slate-700">
                    Roughness
                  </Label>
                  <span className="text-sm font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded">
                    {roughness[0].toFixed(2)}
                  </span>
                </div>
                <Slider
                  value={roughness}
                  onValueChange={setRoughness}
                  max={1}
                  min={0}
                  step={0.1}
                  className="w-full"
                />
                <div className="h-2 bg-gradient-to-r from-slate-200 to-slate-400 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-300"
                    style={{ width: `${roughness[0] * 100}%` }}
                  />
                </div>
              </div>

              {/* Color Presets */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-slate-700">
                  Color Presets
                </Label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
                    '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
                  ].map((color, index) => (
                    <button
                      key={index}
                      className="w-8 h-8 rounded-lg border-2 border-white shadow-lg hover:scale-110 transition-transform duration-200"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Performance Stats */}
              <div className="pt-4 border-t border-slate-200">
                <Label className="text-sm font-semibold text-slate-700 mb-3 block">
                  Performance
                </Label>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600">FPS</span>
                    <span className="font-mono text-green-600">60</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600">Draw Calls</span>
                    <span className="font-mono text-blue-600">12</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600">Memory</span>
                    <span className="font-mono text-purple-600">2.4MB</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Status Bar */}
      <div className="mt-6">
        <div className="flex items-center justify-between p-4 bg-white/70 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg">
          <div className="flex items-center gap-4 text-sm text-slate-600">
            <span className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Ready
            </span>
            <span>Model: sample-model.stl</span>
            <span>Vertices: 12,847</span>
          </div>
          
          <div className="flex items-center gap-4">
            {wireframe && (
              <Badge variant="outline" className="bg-white/60 border-white/30">
                Wireframe
              </Badge>
            )}
            {showGrid && (
              <Badge variant="outline" className="bg-white/60 border-white/30">
                Grid
              </Badge>
            )}
            {autoRotate && (
              <Badge variant="outline" className="bg-white/60 border-white/30">
                Auto Rotate
              </Badge>
            )}
            
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Volume2 className="w-4 h-4" />
              <span className="font-mono">60 FPS</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VisualShowcase