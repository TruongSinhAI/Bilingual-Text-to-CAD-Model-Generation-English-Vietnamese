"use client"

import * as React from "react"
import { useState, useRef, useCallback } from "react"
import { Canvas } from "@react-three/fiber"
import { OrbitControls, Environment, Grid } from "@react-three/drei"
import { 
  Upload, 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  Download, 
  Maximize2,
  Settings,
  HelpCircle,
  Palette
} from "lucide-react"

// Enhanced components
import { EnhancedButton } from "./enhanced-button"
import { InteractiveSlider } from "./interactive-slider"
import { ProgressiveLoader } from "./progressive-loader"
import { AccessibilityProvider, useAccessibility, AccessibleViewer } from "./accessibility-provider"

// Regular UI components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"

interface ModelData {
  geometry: THREE.BufferGeometry
  material: THREE.MeshStandardMaterial
  name: string
  format: string
}

const EnhancedViewerExample: React.FC = () => {
  const [model, setModel] = useState<ModelData | null>(null)
  const [loading, setLoading] = useState(false)
  const [wireframe, setWireframe] = useState(false)
  const [showGrid, setShowGrid] = useState(true)
  const [metalness, setMetalness] = useState([0.3])
  const [roughness, setRoughness] = useState([0.6])
  const [error, setError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const controlsRef = useRef<any>(null)
  
  const { announce } = useAccessibility()

  // Enhanced file loading with accessibility announcements
  const loadFile = useCallback(async (file: File) => {
    setLoading(true)
    setError(null)
    setUploadSuccess(false)
    
    announce(`Loading file: ${file.name}`)
    
    try {
      // Simulate file processing
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Mock successful load
      const mockGeometry = new THREE.BoxGeometry(1, 1, 1)
      const mockMaterial = new THREE.MeshStandardMaterial({
        color: '#4a90e2',
        metalness: metalness[0],
        roughness: roughness[0]
      })
      
      setModel({
        geometry: mockGeometry,
        material: mockMaterial,
        name: file.name,
        format: file.name.split('.').pop() || 'unknown'
      })
      
      setUploadSuccess(true)
      announce(`File ${file.name} loaded successfully`)
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load file'
      setError(errorMessage)
      announce(`Error loading file: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }, [announce, metalness, roughness])

  const handleFileUpload = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files[0]) {
      loadFile(files[0])
    }
  }

  const resetView = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.reset()
    }
    announce('View reset to default position')
  }, [announce])

  const fitView = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.reset()
    }
    announce('View fitted to model')
  }, [announce])

  const exportModel = useCallback(() => {
    if (!model) return
    announce(`Exporting ${model.name} as STL`)
    // Export logic would go here
  }, [model, announce])

  // Update material properties
  const updateMetalness = useCallback((value: number[]) => {
    setMetalness(value)
    if (model?.material) {
      model.material.metalness = value[0]
      model.material.needsUpdate = true
    }
  }, [model])

  const updateRoughness = useCallback((value: number[]) => {
    setRoughness(value)
    if (model?.material) {
      model.material.roughness = value[0]
      model.material.needsUpdate = true
    }
  }, [model])

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Enhanced Toolbar */}
      <div className="toolbar border-b bg-card/95 backdrop-blur-sm">
        <div className="toolbar-section">
          <EnhancedButton
            variant="outline"
            size="sm"
            leftIcon={<Upload className="w-4 h-4" />}
            onClick={handleFileUpload}
            loading={loading}
            success={uploadSuccess}
            className="interactive"
          >
            Open
          </EnhancedButton>
          
          <EnhancedButton
            variant="outline"
            size="sm"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={exportModel}
            disabled={!model}
            className="interactive"
          >
            Export
          </EnhancedButton>
        </div>

        <div className="toolbar-separator" />

        <div className="toolbar-section">
          <EnhancedButton
            variant="ghost"
            size="icon"
            onClick={resetView}
            disabled={!model}
            className="interactive"
            tooltip="Reset View (R)"
          >
            <RotateCcw className="w-4 h-4" />
          </EnhancedButton>
          
          <EnhancedButton
            variant="ghost"
            size="icon"
            onClick={fitView}
            disabled={!model}
            className="interactive"
            tooltip="Fit View (F)"
          >
            <Maximize2 className="w-4 h-4" />
          </EnhancedButton>
        </div>

        <div className="toolbar-separator" />

        <div className="toolbar-section">
          <div className="flex items-center gap-2">
            <Switch
              id="wireframe"
              checked={wireframe}
              onCheckedChange={setWireframe}
            />
            <Label htmlFor="wireframe" className="text-sm">Wireframe</Label>
          </div>
          
          <div className="flex items-center gap-2">
            <Switch
              id="grid"
              checked={showGrid}
              onCheckedChange={setShowGrid}
            />
            <Label htmlFor="grid" className="text-sm">Grid</Label>
          </div>
        </div>

        <div className="ml-auto">
          <Sheet>
            <SheetTrigger asChild>
              <EnhancedButton variant="ghost" size="icon" className="interactive">
                <HelpCircle className="w-4 h-4" />
              </EnhancedButton>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Help & Shortcuts</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Keyboard Shortcuts</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Open file</span>
                      <Badge variant="outline">Ctrl+O</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Reset view</span>
                      <Badge variant="outline">R</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Fit view</span>
                      <Badge variant="outline">F</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".stl,.obj,.fbx"
        onChange={handleFileChange}
        className="hidden"
        id="file-input"
      />

      {/* Main content */}
      <div className="flex-1 flex">
        {/* Left panel - Model info */}
        <div className="w-64 panel border-r">
          <div className="panel-header">
            <h3 className="panel-title">Model Information</h3>
          </div>
          <div className="panel-content space-y-4">
            {model ? (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">File Name</Label>
                  <p className="text-sm font-medium truncate">{model.name}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Format</Label>
                  <p className="text-sm font-medium">{model.format.toUpperCase()}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <div className="flex items-center gap-2">
                    <div className="status-indicator status-success" />
                    <span className="text-sm">Loaded</span>
                  </div>
                </div>
              </div>
            ) : (
              <Alert>
                <AlertDescription>
                  No model loaded. Upload a 3D file to get started.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        {/* Main viewer */}
        <div className="flex-1 relative viewer-container">
          <AccessibleViewer
            modelName={model?.name}
            vertexCount={model?.geometry.attributes.position?.count}
          >
            <Canvas
              shadows
              camera={{ position: [5, 5, 5], fov: 50 }}
              className="w-full h-full"
            >
              <ambientLight intensity={0.5} />
              <directionalLight position={[10, 10, 5]} intensity={1} />
              
              <OrbitControls
                ref={controlsRef}
                enablePan={true}
                enableZoom={true}
                enableRotate={true}
                dampingFactor={0.05}
                enableDamping={true}
              />

              <Environment preset="studio" background={false} />
              
              {showGrid && <Grid args={[20, 20]} />}
              
              {model && (
                <mesh geometry={model.geometry}>
                  <meshStandardMaterial
                    color={model.material.color}
                    metalness={metalness[0]}
                    roughness={roughness[0]}
                    wireframe={wireframe}
                  />
                </mesh>
              )}
            </Canvas>
          </AccessibleViewer>

          {/* Loading overlay */}
          <ProgressiveLoader
            onFileLoad={() => Promise.resolve()}
            className="absolute top-4 right-4 w-80"
          />
        </div>

        {/* Right panel - Properties */}
        <div className="w-80 panel border-l">
          <div className="panel-header">
            <h3 className="panel-title flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Material Properties
            </h3>
          </div>
          <div className="panel-content space-y-6">
            {model ? (
              <>
                <InteractiveSlider
                  label="Metalness"
                  value={metalness}
                  onValueChange={updateMetalness}
                  min={0}
                  max={1}
                  step={0.1}
                  color="primary"
                  showMinMax
                />
                
                <InteractiveSlider
                  label="Roughness"
                  value={roughness}
                  onValueChange={updateRoughness}
                  min={0}
                  max={1}
                  step={0.1}
                  color="success"
                  showMinMax
                />

                <Separator />

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Surface Options</Label>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="wireframe-detail" className="text-sm">Wireframe</Label>
                      <Switch
                        id="wireframe-detail"
                        checked={wireframe}
                        onCheckedChange={setWireframe}
                      />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <Alert>
                <AlertDescription>
                  Load a model to adjust material properties.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="h-8 bg-muted/30 border-t px-4 flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          {model && (
            <>
              <span>{model.name}</span>
              <span className="text-muted-foreground">•</span>
              <span>{model.format.toUpperCase()}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-4">
          {wireframe && <Badge variant="outline">Wireframe</Badge>}
          {showGrid && <Badge variant="outline">Grid</Badge>}
        </div>
      </div>
    </div>
  )
}

// Main component with accessibility provider
const EnhancedViewerApp: React.FC = () => {
  return (
    <AccessibilityProvider>
      <EnhancedViewerExample />
    </AccessibilityProvider>
  )
}

export default EnhancedViewerApp