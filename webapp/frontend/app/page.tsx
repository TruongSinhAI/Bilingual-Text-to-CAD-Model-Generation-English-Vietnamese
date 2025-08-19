"use client"

import type React from "react"
import { useState, useRef, useCallback } from "react"
import { Canvas } from "@react-three/fiber"
import { OrbitControls, Environment, Grid, Html } from "@react-three/drei"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import CardItem from "@/components/CardItem";
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { TextToCadChat } from "@/components/text-to-cad-chat"
import { PerformanceMonitor } from "@/components/performance-monitor"
import { CadJsonEditor } from "@/components/json-editor"
import {
  Upload,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Download,
  Maximize2,
  ArrowUp,
  ArrowRight,
  ArrowLeft,
  Move,
  Orbit,
  ChevronRight,
  ChevronDown,
  Layers,
  Settings,
  Palette,
  Eye,
  Zap,
  Sparkles,
  FileText,
  Monitor,
  Cpu,
  Activity,
  AlertCircle,
  CheckCircle,
  X
} from "lucide-react"
import * as THREE from "three"
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js"
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js"
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js"
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js"
import { cn } from "@/lib/utils"

interface ModelData {
  geometry: THREE.BufferGeometry
  material: THREE.MeshStandardMaterial
  name: string
  format: string
}

interface MeasurementPoint {
  position: THREE.Vector3
  id: string
}

const supportedFormats = [".stl", ".obj", ".fbx", ".gltf", ".glb", ".3dm", ".3ds", ".3mf", ".amf", ".ifc", ".ply", ".wrl"]

const defaultCadJson = {
  parts: {
    part_1: {
      coordinate_system: {
        "Euler Angles": [0, 0, -90],
        "Translation Vector": [0, 0.75, 0]
      },
      sketch: {
        face_1: {
          loop_1: {
            line_1: { "Start Point": [0, 0], "End Point": [0.5, 0] },
            line_2: { "Start Point": [0.5, 0], "End Point": [0.5, 0.25] },
            line_3: { "Start Point": [0.5, 0.25], "End Point": [0.25, 0.25] },
            line_4: { "Start Point": [0.25, 0.25], "End Point": [0.25, 0.625] },
            line_5: { "Start Point": [0.25, 0.625], "End Point": [0, 0.625] },
            line_6: { "Start Point": [0, 0.625], "End Point": [0, 0] }
          }
        }
      },
      extrusion: {
        extrude_depth_towards_normal: 0.75,
        extrude_depth_opposite_normal: 0,
        sketch_scale: 0.625,
        operation: "NewBodyFeatureOperation"
      }
    }
  },
  distances: [[0]]
}

export default function Component() {
  const [model, setModel] = useState<ModelData | null>(null)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [wireframe, setWireframe] = useState(false)
  const [showGrid, setShowGrid] = useState(true)
  const [showEdges, setShowEdges] = useState(false)
  const [smoothShading, setSmoothShading] = useState(true)
  const [measurementMode, setMeasurementMode] = useState(false)
  const [measurementPoints, setMeasurementPoints] = useState<MeasurementPoint[]>([])
  const [sectionView, setSectionView] = useState(false)
  const [sectionPosition, setSectionPosition] = useState([0])
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)

  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const controlsRef = useRef<any>(null)

  const [currentCadJson, setCurrentCadJson] = useState(defaultCadJson)
  const [selectedContent, setSelectedContent] = useState<string | null>(null)
  

  const fitView = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.reset()
    }
  }, [])

  const setView = useCallback((direction: [number, number, number]) => {
    if (controlsRef.current) {
      // Use the camera to set position and look at center
      const controls = controlsRef.current
      const camera = controls.object
      
      camera.position.set(...direction)
      camera.lookAt(0, 0, 0)
      controls.update()
    }
  }, [])

  const loadFile = useCallback(async (file: File) => {
    setLoading(true)
    setProgress(0)
    setError(null)

    try {
      toast({
        title: "Loading Model",
        description: `Processing ${file.name}...`,
      })

      const fileExtension = file.name.toLowerCase().split(".").pop()
      const arrayBuffer = await file.arrayBuffer()

      let loader: any
      let geometry: THREE.BufferGeometry

      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90))
      }, 100)

      switch (fileExtension) {
        case "stl":
          loader = new STLLoader()
          geometry = loader.parse(arrayBuffer)
          break
        case "obj":
          loader = new OBJLoader()
          const objText = new TextDecoder().decode(arrayBuffer)
          const object = loader.parse(objText)
          geometry = object.children[0]?.geometry || new THREE.BufferGeometry()
          break
        case "fbx":
          loader = new FBXLoader()
          const fbxObject = loader.parse(arrayBuffer, "")
          geometry = fbxObject.children[0]?.geometry || new THREE.BufferGeometry()
          break
        default:
          throw new Error(`Unsupported file format: ${fileExtension}`)
      }

      clearInterval(progressInterval)
      setProgress(100)

      // Validate geometry
      if (!geometry || !geometry.attributes.position) {
        throw new Error("Invalid geometry: No vertex data found")
      }

      geometry.computeBoundingBox()
      const box = geometry.boundingBox!
      const center = box.getCenter(new THREE.Vector3())
      const size = box.getSize(new THREE.Vector3())
      const maxDim = Math.max(size.x, size.y, size.z)
      
      if (maxDim === 0) {
        throw new Error("Model appears to be empty or has zero dimensions")
      }

      const scale = 5 / maxDim
      geometry.translate(-center.x, -center.y, -center.z)
      geometry.scale(scale, scale, scale)

      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color('#3b82f6'),
        metalness: 0.3,
        roughness: 0.6,
        envMapIntensity: 1.2,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 1,
        flatShading: false,
        vertexColors: false,
        wireframe: false
      })

      // Compute vertex normals for better lighting
      geometry.computeVertexNormals()

      const newModel = {
        geometry,
        material,
        name: file.name,
        format: fileExtension || "unknown",
      }

      setModel(newModel)

      toast({
        title: "Model Loaded Successfully",
        description: `${file.name} with ${(geometry.attributes.position?.count || 0).toLocaleString()} vertices`,
      })

      // Auto-fit view after loading
      setTimeout(() => {
        if (controlsRef.current) {
          controlsRef.current.reset()
        }
      }, 100)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load file"
      setError(errorMessage)
      toast({
        variant: "destructive",
        title: "Failed to Load Model",
        description: errorMessage,
      })
    } finally {
      setLoading(false)
      setProgress(0)
    }
  }, [toast])

  const handleFileUpload = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return

      const file = files[0]
      const fileExtension = "." + file.name.toLowerCase().split(".").pop()

      if (!supportedFormats.includes(fileExtension)) {
        const errorMsg = `Unsupported file format. Supported formats: ${supportedFormats.join(", ")}`
        setError(errorMsg)
        toast({
          variant: "destructive",
          title: "Unsupported File Format",
          description: errorMsg,
        })
        return
      }

      // Check file size (max 50MB)
      const maxSize = 50 * 1024 * 1024 // 50MB
      if (file.size > maxSize) {
        const errorMsg = "File too large. Maximum size is 50MB."
        setError(errorMsg)
        toast({
          variant: "destructive",
          title: "File Too Large",
          description: errorMsg,
        })
        return
      }

      loadFile(file)
    },
    [loadFile, toast],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragActive(false)
      handleFileUpload(e.dataTransfer.files)
    },
    [handleFileUpload],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    // Only set drag inactive if we're leaving the main container
    if (e.currentTarget.contains(e.relatedTarget as Node)) {
      return
    }
    setDragActive(false)
  }, [])

  const exportModel = useCallback(() => {
    if (!model) return

    try {
      const exporter = new STLExporter()
      const mesh = new THREE.Mesh(model.geometry)
      const stlString = exporter.parse(mesh) as string

      const blob = new Blob([stlString], { type: "text/plain" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${model.name.split(".")[0]}_exported.stl`
      a.click()
      URL.revokeObjectURL(url)

      toast({
        title: "Export Successful",
        description: `Model exported as ${model.name.split(".")[0]}_exported.stl`,
      })
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: "Failed to export the model. Please try again.",
      })
    }
  }, [model, toast])

  const resetView = useCallback(() => {
    setMeasurementPoints([])
    setMeasurementMode(false)
    setSectionView(false)
    setSectionPosition([0])
  }, [])

  const calculateDistance = useCallback((point1: THREE.Vector3, point2: THREE.Vector3) => {
    return point1.distanceTo(point2).toFixed(3)
  }, [])

  const handleGeneratedModel = useCallback(async (stlData: ArrayBuffer, filename: string) => {
    setLoading(true)
    setProgress(0)
    setError(null)

    try {
      toast({
        title: "Loading Generated Model",
        description: `Processing ${filename}...`,
      })

      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90))
      }, 100)

      // Parse STL data
      const loader = new STLLoader()
      const geometry = loader.parse(stlData)

      clearInterval(progressInterval)
      setProgress(100)

      // Validate geometry
      if (!geometry || !geometry.attributes.position) {
        throw new Error("Invalid geometry: No vertex data found")
      }

      geometry.computeBoundingBox()
      const box = geometry.boundingBox!
      const center = box.getCenter(new THREE.Vector3())
      const size = box.getSize(new THREE.Vector3())
      const maxDim = Math.max(size.x, size.y, size.z)
      
      if (maxDim === 0) {
        throw new Error("Model appears to be empty or has zero dimensions")
      }

      const scale = 5 / maxDim
      geometry.translate(-center.x, -center.y, -center.z)
      geometry.scale(scale, scale, scale)

      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color('#3b82f6'),
        metalness: 0.3,
        roughness: 0.6,
        envMapIntensity: 1.2,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 1,
        flatShading: false,
        vertexColors: false,
        wireframe: false
      })

      // Compute vertex normals for better lighting
      geometry.computeVertexNormals()

      const newModel = {
        geometry,
        material,
        name: filename,
        format: "stl",
      }

      setModel(newModel)

      toast({
        title: "Generated Model Loaded Successfully",
        description: `${filename} with ${(geometry.attributes.position?.count || 0).toLocaleString()} vertices`,
      })

      // Auto-fit view after loading
      setTimeout(() => {
        if (controlsRef.current) {
          controlsRef.current.reset()
        }
      }, 100)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load generated model"
      setError(errorMessage)
      toast({
        variant: "destructive",
        title: "Failed to Load Generated Model",
        description: errorMessage,
      })
    } finally {
      setLoading(false)
      setProgress(0)
    }
  }, [toast])

  return (
    <div className="w-full h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex flex-col">
      {/* Enhanced Header with Improved Contrast - Optimized Height */}
      <div className="relative flex-shrink-0">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/5 via-blue-900/5 to-purple-900/5" />
        <div className="relative bg-white/95 backdrop-blur-xl border-b border-gray-200/50 shadow-lg z-10">
          {/* Main Toolbar - Compact Height */}
          <div className="px-4 py-1">
            <div className="flex items-center justify-between gap-3 p-2 bg-gray-50/80 rounded-lg border border-gray-200">
              {/* Left side - Tools */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200 font-medium h-7 px-3 text-xs"
                  >
                    <Upload className="w-3 h-3 mr-1.5" />
                    Tải mô hình
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!model}
                    onClick={exportModel}
                    className="bg-white border-gray-300 hover:bg-gray-50 text-gray-700 font-medium disabled:opacity-50 h-7 px-3 text-xs"
                  >
                    <Download className="w-3 h-3 mr-1.5" />
                    Xuất file
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      fetch('/demo2.stl')
                        .then(response => response.blob())
                        .then(blob => {
                          const file = new File([blob], 'demo2.stl', { type: 'application/octet-stream' })
                          loadFile(file)
                        })
                        .catch(err => {
                          toast({
                            variant: "destructive",
                            title: "Failed to Load Demo",
                            description: "Could not load the demo model.",
                          })
                        })
                    }}
                    className="bg-white border-gray-300 hover:bg-gray-50 text-gray-700 font-medium h-7 px-3 text-xs"
                  >
                    <Sparkles className="w-3 h-3 mr-1.5" />
                    Thử demo
                  </Button>
                </div>
                
                <div className="w-px h-4 bg-gray-300" />
                
                <div className="flex items-center gap-0.5">
                  <Button
                    size="sm"
                    variant="outline"
                    title="Đặt lại góc nhìn"
                    onClick={resetView}
                    className="bg-white border-gray-300 hover:bg-gray-50 text-gray-700 h-7 w-7 p-0"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    title="Vừa màn hình"
                    onClick={fitView}
                    className="bg-white border-gray-300 hover:bg-gray-50 text-gray-700 h-7 w-7 p-0"
                  >
                    <Maximize2 className="w-3 h-3" />
                  </Button>
                </div>
                
                <div className="w-px h-4 bg-gray-300" />
                
                <div className="flex items-center gap-0.5">
                  <Button
                    size="sm"
                    variant="outline"
                    title="Nhìn từ trên"
                    onClick={() => setView([0, 5, 0])}
                    className="bg-white border-gray-300 hover:bg-gray-50 text-gray-700 h-7 w-7 p-0"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    title="Nhìn từ trước"
                    onClick={() => setView([0, 0, 5])}
                    className="bg-white border-gray-300 hover:bg-gray-50 text-gray-700 h-7 w-7 p-0"
                  >
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    title="Nhìn từ bên"
                    onClick={() => setView([5, 0, 0])}
                    className="bg-white border-gray-300 hover:bg-gray-50 text-gray-700 h-7 w-7 p-0"
                  >
                    <ArrowLeft className="w-3 h-3" />
                  </Button>
                </div>
                
                <div className="w-px h-4 bg-gray-300" />
                
                {/* Display Options - Compact */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <Switch
                      id="wireframe"
                      checked={wireframe}
                      onCheckedChange={setWireframe}
                      className="data-[state=checked]:bg-blue-600 scale-75"
                    />
                    <Label htmlFor="wireframe" className="text-xs font-semibold text-gray-800">
                      Khung dây
                    </Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Switch
                      id="grid"
                      checked={showGrid}
                      onCheckedChange={setShowGrid}
                      className="data-[state=checked]:bg-blue-600 scale-75"
                    />
                    <Label htmlFor="grid" className="text-xs font-semibold text-gray-800">
                      Lưới
                    </Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Switch
                      id="smooth"
                      checked={smoothShading}
                      onCheckedChange={setSmoothShading}
                      className="data-[state=checked]:bg-blue-600 scale-75"
                    />
                    <Label htmlFor="smooth" className="text-xs font-semibold text-gray-800">
                      Mịn
                    </Label>
                  </div>
                </div>
              </div>

              {/* Right side - Status and Information */}
              <div className="flex items-center gap-3">

                <div className="flex items-center gap-1">
                  <Label className="text-xs font-semibold text-gray-800">
                    Tốc độ:
                  </Label>
                  <Badge variant="outline" className="bg-green-50 border-green-200 text-green-800 text-xs px-1.5 py-0.5 font-semibold h-5">
                    10 ~ 25 tokens/giây
                  </Badge>
                </div>
                {/* Performance Monitor - Compact Version */}
                <div className="w-px h-4 bg-gray-300" />
                <PerformanceMonitor
                  modelComplexity={model?.geometry.attributes.position?.count || 0}
                  isVisible={true}
                  onOptimizationSuggest={(suggestions) => {
                    suggestions.forEach(suggestion => {
                      toast({
                        title: "Gợi ý tối ưu hóa",
                        description: suggestion,
                      })
                    })
                  }}
                />
                

                
                {/* Active mode badges */}
                <div className="flex items-center gap-1">
                  {wireframe && (
                    <Badge variant="outline" className="bg-orange-50 border-orange-200 text-orange-800 text-xs px-1.5 py-0.5 font-semibold h-5">
                      Khung
                    </Badge>
                  )}
    
                  {measurementMode && (
                    <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-800 text-xs px-1.5 py-0.5 font-semibold h-5">
                      Đo
                    </Badge>
                  )}
                  {sectionView && (
                    <Badge variant="outline" className="bg-purple-50 border-purple-200 text-purple-800 text-xs px-1.5 py-0.5 font-semibold h-5">
                      Cắt
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".stl,.obj,.fbx,.gltf,.glb,.3dm,.3ds,.3mf,.amf,.ifc,.ply,.wrl"
        onChange={(e) => handleFileUpload(e.target.files)}
        className="hidden"
      />

      {/* Main Content - Optimized Spacing */}
      <div
        className={cn(
          "flex-1 flex gap-3 p-3 transition-all duration-200 min-h-0",
          dragActive && "bg-blue-50/50 border-2 border-dashed border-blue-300"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {/* Drag Overlay */}
        {dragActive && (
          <div className="fixed inset-0 z-50 bg-blue-500/10 backdrop-blur-sm flex items-center justify-center pointer-events-none">
            <div className="text-center p-6 bg-white/95 backdrop-blur-xl border-2 border-dashed border-blue-500 rounded-xl shadow-xl max-w-md">
              <Upload className="w-12 h-12 text-blue-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Thả file 3D tại đây</h3>
              <p className="text-sm text-blue-700">Hỗ trợ STL, OBJ, FBX và nhiều định dạng khác</p>
            </div>
          </div>
        )}
        
        {/* Text to CAD Chat Panel - Responsive width */}
        <div className="w-80 xl:w-96 lg:w-80 md:w-72 flex-shrink-0">
          <TextToCadChat
            onModelGenerated={handleGeneratedModel}
            onJsonReceived={setCurrentCadJson}
            setInputContent={selectedContent || undefined}
            onInputContentSet={() => setSelectedContent(null)}
          />
        </div>

        {/* 3D Viewer - Takes remaining space */}
        <div className="flex-1 min-w-0">
          <Card className="h-full bg-white/70 backdrop-blur-xl border-white/20 shadow-xl overflow-hidden">
            <div className="relative h-full">
              <Canvas
                ref={canvasRef}
                shadows
                camera={{ position: [10, 10, 10], fov: 50 }}
                className="w-full h-full rounded-lg"
                style={{
                  background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'
                }}
                onCreated={({ gl }) => {
                  gl.setClearColor(0xf8f9fa)
                  gl.toneMapping = THREE.ACESFilmicToneMapping
                  gl.toneMappingExposure = 1.2
                }}
              >
                <ambientLight intensity={0.6} />
                <directionalLight
                  position={[10, 10, 5]}
                  intensity={1.2}
                  castShadow
                  shadow-mapSize-width={2048}
                  shadow-mapSize-height={2048}
                />
                <pointLight position={[-10, -10, -10]} intensity={0.4} />
                <pointLight position={[10, -10, -10]} intensity={0.2} />

                <OrbitControls
                  ref={controlsRef}
                  enablePan={true}
                  enableZoom={true}
                  enableRotate={true}
                  dampingFactor={0.05}
                  enableDamping={true}
                />

                <Environment
                  preset="studio"
                  background={false}
                  blur={0.6}
                  resolution={256}
                />

                {showGrid && (
                  <Grid
                    args={[20, 20]}
                    cellColor="#e2e8f0"
                    sectionColor="#94a3b8"
                    fadeDistance={30}
                    fadeStrength={1}
                  />
                )}

                {model && (
                  <mesh geometry={model.geometry} castShadow receiveShadow>
                    <meshStandardMaterial
                      color={new THREE.Color('#3b82f6')}
                      metalness={0.3}
                      roughness={0.6}
                      envMapIntensity={1.2}
                      wireframe={wireframe}
                      flatShading={!smoothShading}
                      side={THREE.DoubleSide}
                      transparent={true}
                      opacity={1}
                      clippingPlanes={sectionView ? [new THREE.Plane(new THREE.Vector3(1, 0, 0), sectionPosition[0])] : []}
                    >
                      {showEdges && (
                        <lineSegments>
                          <edgesGeometry attach="geometry" args={[model.geometry]} />
                          <lineBasicMaterial attach="material" color={0xff0000} />
                        </lineSegments>
                      )}
                    </meshStandardMaterial>
                  </mesh>
                )}

                {!model && !loading && (
                  <Html center>
                    <div className="text-center p-8 bg-white/80 backdrop-blur-xl border border-white/20 rounded-2xl shadow-xl">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Upload className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-800 mb-2">Ready for 3D Model</h3>
                      <p className="text-slate-600 mb-4">Drag & drop your STL, OBJ, or FBX file here</p>
                      <Button
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Browse Files
                      </Button>
                    </div>
                  </Html>
                )}
              </Canvas>

              {/* Floating Controls - Compact */}
              <div className="absolute top-3 right-3 space-y-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-white/80 backdrop-blur-sm border-white/30 shadow-md hover:shadow-lg transition-all duration-200 h-7 w-7 p-0"
                  onClick={() => controlsRef.current?.reset()}
                >
                  <RotateCcw className="w-3 h-3 text-gray-900" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-white/80 backdrop-blur-sm border-white/30 shadow-md hover:shadow-lg transition-all duration-200 h-7 w-7 p-0"
                  onClick={fitView}
                >
                  <Maximize2 className="w-3 h-3 text-gray-900" />
                </Button>
              </div>

              {/* Performance Stats - Compact */}
              {model && (
                <div className="absolute bottom-3 left-3">
                  <div className="flex items-center gap-2 p-1.5 bg-white/80 backdrop-blur-sm border border-white/30 rounded-md shadow-md">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-xs font-medium text-slate-700">60 FPS</span>
                    </div>
                    <div className="w-px h-3 bg-slate-300" />
                    <div className="flex items-center gap-1">
                      <Cpu className="w-2.5 h-2.5 text-slate-500" />
                      <span className="text-xs text-slate-600">{((model.geometry.attributes.position?.count || 0) / 1000).toFixed(1)}K</span>
                    </div>
                  </div>
                </div>
              )}

              {loading && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                  <div className="text-center p-6 bg-white/90 backdrop-blur-xl border border-white/20 rounded-xl shadow-xl">
                    <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
                    <div className="space-y-1 mb-3">
                      <div className="text-sm font-medium text-slate-800">Processing Model</div>
                      <div className="text-xs text-slate-600">{progress}% complete</div>
                    </div>
                    <div className="w-40 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-300 ease-out"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        <div>

          {/* KHUNG ĐỂ CHỈNH SỬA JSON VÀ SUBMIT TẠO CAD*/}
            <div className="w-72 xl:w-80 lg:w-72 md:w-64 flex-shrink-0 space-y-2">
            <CardItem
              imageSrc="/demo/model1.png"
              imageAlt="Preview"
              description="Giá đỡ trục"
              content={{
              title: "Tiêu đề A",
              body: "Part 1: Rectangular metal bracket with a central hole Begin by creating a new coordinate system with euler angles of 0, 0, and 0, and a translation vector of 0, 0, 0. Next, create a new sketch on the X-Y plane. Draw the following shape: 1. A closed loop consisting of: - An arc with a start point of [0.0, 0.1193], a mid point of [0.1193, 0.0], and an end point of [0.2386, 0.1193]. - A line with a start point of [0.2386, 0.1193], and an end point of [0.2386, 0.6307]. - An arc with a start point of [0.2386, 0.6307], a mid point of [0.1193, 0.75], and an end point of [0.0, 0.6307]. - A line with a start point of [0.0, 0.6307], and an end point of [0.0, 0.1193]. Following the sketch creation, scale it by a factor of 0.75 while maintaining the original proportions. Transform the 2D sketch into a 3D sketch using the rotation information provided in the euler angles and translation vector. Extrude the sketch using an extrusion depth of 0.1051. Part 2: Rectangular prism Create a new coordinate system with euler angles of 0, 0, and 0, and a translation vector of [0.0598, 0.2329, 0.1051]. Draw a closed loop consisting of four straight lines with the following connections: 1. [0.0, 0.0] to [0.1191, 0.0] 2. [0.1191, 0.0] to [0.1191, 0.2842] 3. [0.1191, 0.2842] to [0.0, 0.2842] 4. [0.0, 0.2842] to [0.0, 0.0] Extrude the sketch using an extrusion depth of 0.1401. Part 3: Cylindrical object Create a new coordinate system with euler angles of 0, 0, and -90, and a translation vector of [0.0598, 0.2329, 0.2453]. Draw a closed loop consisting of: 1. An arc with a start point of [0.0, 0.0], a mid point of [0.0595, 0.0595], and an end point of [0.1191, 0.0]. 2. A line with a start point of [0.1191, 0.0], and an end point of [0.0595, 0.0]. 3. A line with a start point of [0.0595, 0.0], and an end point of [0.0, 0.0]. Extrude the sketch using an extrusion depth of 0.2943 in the opposite direction. Part 4: Rectangular prism Create a new coordinate system with euler angles of -90, 0, and -90, and a translation vector of [0.1193, 0.5171, 0.1961]. Draw a closed loop consisting of: 1. A line with a start point of [0.0, 0.0], and an end point of [0.0, 0.0508]. 2. A line with a start point of [0.0, 0.0508], and an end point of [0.0, 0.1302]. 3. A line with a start point of [0.0, 0.1302], and an end point of [0.0762, 0.1302]. 4. A line with a start point of [0.0762, 0.1302], and an end point of [0.0762, 0.0]. 5. A line with a start point of [0.0762, 0.0], and an end point of [0.0, 0.0]. Extrude the sketch using an extrusion depth of 0.1401 in the opposite direction. Part 5: Rectangular prism This part is identical to the previous one (Part 4). Duplicate the coordinate system, sketch, and extrusion instructions from Part 4. Extrude the sketch in the opposite direction to create a secondary recess. Part 6: Curved rectangular prism Create a new coordinate system with euler angles of -90, 0, and -90, and a translation vector of [0.1193, 0.3234, 0.1977]. Draw two 2D faces: - Face 1: 1. A line with a start point of [0.0, 0.0492], and an end point of [0.0985, 0.0492]. 2. An arc with a start point of [0.0985, 0.0492], a mid point of [0.0492, 0], and an end point of [0.0, 0.0492]. - Face 2: 1. A line with a start point of [0.0, 0.0492], and an end point of [0.0985, 0.0492]. 2. A line with a start point of [0.0985, 0.0492], and an end point of [0.0985, 0.1874]. 3. A line with a start point of [0.0985, 0.1874], and an end point of [0.0, 0.1874]. 4. A line with a start point of [0.0, 0.1874], and an end point of [0.0, 0.0492]. Transform the 2D faces into 3D sketches using the provided euler angles and translation vector. Extrude the sketch using an extrusion depth of 0.1401 in the opposite direction. Part 7: Slightly tapered rectangular prism Create a new coordinate system with euler angles of -90, 0, and -90, and a translation vector of [0.1193, 0.3234, 0.1977]. Drawing instructions are the same as Part 6, with the following differences: - Face 1: 1. A line with a start point of [0.0, 0.0492], and an end point of [0.0985, 0.0492]. 2. An arc with a start point of [0.0985, 0.0492], a mid point of [0.0492, 0], and an end point of [0.0, 0.0492]. - Face 2: 1. A line with a start point of [0.0, 0.0492], and an end point of [0.0985, 0.0492]. 2. A line with a start point of [0.0985, 0.0492], and an end point of [0.0985, 0.1874]. 3. A line with a start point of [0.0985, 0.1874], and an end point of [0.0, 0.1874]. 4. A line with a start point of [0.0, 0.1874], and an end point of [0.0, 0.0492]. Transform the 2D faces into 3D sketches using the provided euler angles and translation vector. Extrude the sketch toward the normal direction with an extrusion depth of 0.1401.",
              }}
              onSelect={(content: { title?: string; body?: string } | string) => {
              // Set content vào input của chat
              const contentText = typeof content === 'string' ? content : content.body || content.title || '';
              setSelectedContent(contentText);
              }}
            />

            <CardItem
              imageSrc="/demo/model3.png"
              description="Ốc vít"
              content="Phần 1 Tạo một lăng trụ chữ nhật nhỏ với mặt cắt là đa giác sáu cạnh. Tạo hệ tọa độ mới: Góc Euler: [0.0, 0.0, -90.0] Vector tịnh tiến: [0.082, 0.5882, 0.2478] Vẽ phác thảo 2D trên mặt phẳng face_1 gồm Loop 1: Line 1: Bắt đầu [0.0, 0.0117] → Kết thúc [0.0187, 0.0] Line 2: [0.0187, 0.0] → [0.0382, 0.0103] Line 3: [0.0382, 0.0103] → [0.039, 0.0324] Line 4: [0.039, 0.0324] → [0.0203, 0.0441] Line 5: [0.0203, 0.0441] → [0.0008, 0.0338] Line 6: [0.0008, 0.0338] → [0.0, 0.0117] Scale phác thảo với hệ số 0.0441, chuyển sang 3D và đùn theo hướng pháp tuyến 0.0156, ngược pháp tuyến 0.0 để tạo khối mới. Phần 2 Tạo một trụ tròn nhỏ. Tạo hệ tọa độ mới: Góc Euler: [180.0, 0.0, -90.0] Vector tịnh tiến: [0.1133, 0.5882, 0.2581] Vẽ phác thảo 2D trên face_1 gồm Loop 1: Circle 1: Tâm [0.0118, 0.0118], bán kính 0.0118 Scale phác thảo với hệ số 0.0235, chuyển sang 3D và đùn theo hướng pháp tuyến 0.1618, ngược pháp tuyến 0.0, thực hiện phép Join để gắn vào khối hiện có. Phần 3 Tạo một lăng trụ chữ nhật nhỏ có lỗ tròn ở giữa. Tạo hệ tọa độ mới: Góc Euler: [0.0, 0.0, -90.0] Vector tịnh tiến: [0.1684, 0.5882, 0.2966] Vẽ phác thảo 2D trên face_1 gồm: Loop 1 (đa giác sáu cạnh): Line 1: [0.0, 0.0191] → [0.011, 0.0] Line 2: [0.011, 0.0] → [0.0331, 0.0] Line 3: [0.0331, 0.0] → [0.0442, 0.0191] Line 4: [0.0442, 0.0191] → [0.0331, 0.0382] Line 5: [0.0331, 0.0382] → [0.011, 0.0382] Line 6: [0.011, 0.0382] → [0.0, 0.0191] Loop 2: Circle 1: Tâm [0.0221, 0.0191], bán kính 0.0118 Scale phác thảo với hệ số 0.0442, chuyển sang 3D và đùn theo hướng pháp tuyến 0.0191, ngược pháp tuyến 0.0 để tạo khối mới."
              onSelect={(c) => {
              const contentText = typeof c === 'string' ? c : c.body || c.title || '';
              setSelectedContent(contentText);
              }}
            />

            <CardItem
              imageSrc="/demo/model4.png"
              description="Một khối hộp chữ nhật bo góc (rounded rectangle) được khoét rỗng bên trong"
              content="Part 1 – Construct a Rounded Rectangular Frame Base Create a new coordinate system: Euler Angles: [0.0, 0.0, 0.0] Translation Vector: [0.0, 0.0, 0.4139] On face_1, draw Loop 1 as a rounded rectangle: Arc 1: Start [0.0, 0.1077], Mid [0.0316, 0.0316], End [0.1077, 0.0] Line 1: [0.1077, 0.0] → [0.6423, 0.0] Arc 2: Start [0.6423, 0.0], Mid [0.7184, 0.0316], End [0.75, 0.1077] Line 2: [0.75, 0.1077] → [0.75, 0.6423] Arc 3: Start [0.75, 0.6423], Mid [0.7184, 0.7184], End [0.6423, 0.75] Line 3: [0.6423, 0.75] → [0.1077, 0.75] Arc 4: Start [0.1077, 0.75], Mid [0.0316, 0.7184], End [0.0, 0.6423] Line 4: [0.0, 0.6423] → [0.0, 0.1077] Add Loop 2 inside as an inner rounded rectangle offset inward: Arc 1: Start [0.0082, 0.1105], Mid [0.0381, 0.0381], End [0.1105, 0.0082] Line 1: [0.1105, 0.0082] → [0.6395, 0.0082] Arc 2: Start [0.6395, 0.0082], Mid [0.7119, 0.0381], End [0.7418, 0.1105] Line 2: [0.7418, 0.1105] → [0.7418, 0.6395] Arc 3: Start [0.7418, 0.6395], Mid [0.7119, 0.7119], End [0.6395, 0.7418] Line 3: [0.6395, 0.7418] → [0.1105, 0.7418] Arc 4: Start [0.1105, 0.7418], Mid [0.0381, 0.7119], End [0.0082, 0.6395] Line 4: [0.0082, 0.6395] → [0.0082, 0.1105] Scale the sketch by 0.75 and extrude towards normal 0.0068 (opposite normal 0.0) to create a thin frame body. Part 2 – Join Outer Shell Extension Use the same coordinate system as Part 1. On face_1, repeat Loop 1 and Loop 2 as in Part 1. On face_2, draw another inner rounded rectangle identical to Loop 2 in Part 1. Scale the sketch by 0.75 and extrude opposite normal 0.4091 (towards normal 0.0) to extend downward, joining with the existing body to form the tall outer shell walls. Part 3 – Cut Inner Cavity Create a new coordinate system: Euler Angles: [0.0, 0.0, 0.0] Translation Vector: [0.0082, 0.0082, 0.4139] On face_1, draw Loop 1 as an inner rounded rectangle: Arc 1: Start [0.0, 0.1023], Mid [0.03, 0.03], End [0.1023, 0.0] Line 1: [0.1023, 0.0] → [0.6314, 0.0] Arc 2: Start [0.6314, 0.0], Mid [0.7037, 0.03], End [0.7336, 0.1023] Line 2: [0.7336, 0.1023] → [0.7336, 0.6314] Arc 3: Start [0.7336, 0.6314], Mid [0.7037, 0.7037], End [0.6314, 0.7336] Line 3: [0.6314, 0.7336] → [0.1023, 0.7336] Arc 4: Start [0.1023, 0.7336], Mid [0.03, 0.7037], End [0.0, 0.6314] Line 4: [0.0, 0.6314] → [0.0, 0.1023] Scale the sketch by 0.7336 and extrude opposite normal 0.4091 (towards normal 0.0) as a CutFeatureOperation to remove material inside, forming the open cavity."
              onSelect={(c) => {
              const contentText = typeof c === 'string' ? c : c.body || c.title || '';
              setSelectedContent(contentText);
              }}
            />

            <CardItem
              imageSrc="/demo/model5.png"
              description="Một thanh chữ nhật mỏng gồm nhiều phần được ghép với nhau"
              content="**Part 1: Simple, Flat, Triangular Shape with a Pointed Tip** Begin by creating a new coordinate system. Set the Euler angles to 0.0, 0.0, and -90.0 degrees, and the translation vector to 0.0, 0.0073, 0.0. Next, create the 2D sketch on the X-Y plane. The sketch contains one face (face_1). On face_1, create loop_1. Loop_1 consists of four lines (line_1 to line_4). - line_1 starts at 0.0, 0.0 and ends at 0.75, 0.0. - line_2 starts at 0.75, 0.0 and ends at 0.75, 0.2183. - line_3 starts at 0.75, 0.2183 and ends at 0.0, 0.2183. - line_4 starts at 0.0, 0.2183 and ends at 0.0, 0.0. Scale the 2D sketch by a factor of 0.75. Transform the scaled 2D sketch into 3D Sketch. Set the extrude depth towards the normal to 0.0073 and keep the opposite direction depth at 0.0. Extrude the 3D sketch to generate the 3D model. **Part 2: Long, Thin, Metallic Object with a Slightly Curved Shape** Begin by creating a new coordinate system. Set the Euler angles to 180.0, 0.0, and -90.0 degrees, and the translation vector to 0.75, 0.0073, 0.1946. Next, create the 2D sketch on the X-Y plane. The sketch contains one face (face_1). On face_1, create loop_1. Loop_1 consists of four lines (line_1 to line_4). - line_1 starts at 0.0, 0.0 and ends at 0.75, 0.0. - line_2 starts at 0.75, 0.0 and ends at 0.75, 0.0237. - line_3 starts at 0.75, 0.0237 and ends at 0.0, 0.0237. - line_4 starts at 0.0, 0.0237 and ends at 0.0, 0.0. Scale the 2D sketch by a factor of 0.75. Transform the scaled 2D sketch into 3D Sketch. Set the extrude depth towards the normal to 0.0121 and keep the opposite direction depth at 0.0. Extrude the 3D sketch to generate the 3D model, joining it to the preceding CAD models. **Part 3: Long, Thin, Rectangular Prism with a Flat Top and Bottom** Begin by creating a new coordinate system. Set the Euler angles to 180.0, 0.0, and -90.0 degrees, and the translation vector to 0.75, 0.0073, 0.0. Next, create the 2D sketch on the X-Y plane. The sketch contains one face (face_1). On face_1, create loop_1. Loop_1 consists of four lines (line_1 to line_4). - line_1 starts at 0.0, 0.0 and ends at 0.75, 0.0. - line_2 starts at 0.75, 0.0 and ends at 0.75, 0.025. - line_3 starts at 0.75, 0.025 and ends at 0.0, 0.025. - line_4 starts at 0.0, 0.025 and ends at 0.0, 0.0. Scale the 2D sketch by a factor of 0.75. Transform the scaled 2D sketch into 3D Sketch. Set the extrude depth toward"
              onSelect={(c) => {
              const contentText = typeof c === 'string' ? c : c.body || c.title || '';
              setSelectedContent(contentText);
              }}
            />


            </div>
        </div>


   
      </div>

      {/* Enhanced Status Bar - Compact Height */}
      <div className="mt-2">
        <div className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded-lg shadow-md mx-3 mb-3">
          <div className="flex items-center gap-4 text-sm text-gray-800">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="font-semibold">Sẵn sàng</span>
            </div>
            
            {model && (
              <>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-600" />
                  <span className="truncate max-w-[150px] font-medium" title={model.name}>
                    {model.name.length > 20 ? `${model.name.substring(0, 20)}...` : model.name}
                  </span>
                </div>
                <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-800 text-xs px-2 py-1 font-semibold">
                  {model.format.toUpperCase()}
                </Badge>
                <div className="flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-gray-600" />
                  <span className="font-medium">{((model.geometry.attributes.position?.count || 0) / 1000).toFixed(1)}K đỉnh</span>
                </div>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {wireframe && (
              <Badge variant="outline" className="bg-orange-50 border-orange-200 text-orange-800 text-xs px-2 py-1 font-semibold">
                Khung dây
              </Badge>
            )}
            {showGrid && (
              <Badge variant="outline" className="bg-green-50 border-green-200 text-green-800 text-xs px-2 py-1 font-semibold">
                Lưới
              </Badge>
            )}
            {measurementMode && (
              <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-800 text-xs px-2 py-1 font-semibold">
                Đo khoảng cách
              </Badge>
            )}
            {sectionView && (
              <Badge variant="outline" className="bg-purple-50 border-purple-200 text-purple-800 text-xs px-2 py-1 font-semibold">
                Cắt ngang
              </Badge>
            )}
            
            {model && (
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Cpu className="w-4 h-4" />
                <span className="font-mono font-semibold">60 FPS</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="fixed top-4 right-4 z-50 max-w-md">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="ml-3 flex-shrink-0 text-red-400 hover:text-red-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <Toaster />
    </div>
  )
}
