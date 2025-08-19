"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Trash2, RotateCcw, Play, Save } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

const defaultCadJson = {
  parts: {
    part_1: {
      coordinate_system: { "Euler Angles": [0, 0, 0], "Translation Vector": [0, 0, 0] },
      sketch: {
        face_1: {
          loop_1: {
            line_1: { "Start Point": [0, 0], "End Point": [1, 0] },
            line_2: { "Start Point": [1, 0], "End Point": [1, 1] },
            line_3: { "Start Point": [1, 1], "End Point": [0, 1] },
            line_4: { "Start Point": [0, 1], "End Point": [0, 0] }
          }
        }
      },
      extrusion: {
        extrude_depth_towards_normal: 1,
        extrude_depth_opposite_normal: 0,
        sketch_scale: 1,
        operation: "NewBodyFeatureOperation"
      }
    }
  },
  distances: [[0]]
}

interface CadJsonEditorProps {
  json: any
  onModelGenerated: (stlData: ArrayBuffer, filename: string) => void
}

export function CadJsonEditor({ json, onModelGenerated }: CadJsonEditorProps) {
  const [model, setModel] = useState(json)
  const [activePart, setActivePart] = useState<string>(Object.keys(json.parts)[0] || "part_1")
  const { toast } = useToast()

  useEffect(() => {
    setModel(json)
    setActivePart(Object.keys(json.parts)[0] || "part_1")
  }, [json])

  /* ---------- helpers ---------- */
  const update = (path: (string | number)[], value: any) => {
    const clone = JSON.parse(JSON.stringify(model))
    let node = clone
    for (let i = 0; i < path.length - 1; i++) node = node[path[i]]
    node[path[path.length - 1]] = value
    setModel(clone)
  }

  const reset = () => setModel(defaultCadJson)

  const handleGenerate = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/generate-stl-from-json", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `json_input=${encodeURIComponent(JSON.stringify(model))}`
      })
      const data = await response.json()
      if (!data.success) throw new Error("Generate failed")
      const binaryString = atob(data.stl_data)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i)
      onModelGenerated(bytes.buffer, `cad_${Date.now()}.stl`)
      toast({ title: "✅ Thành công", description: "Đã tạo STL từ JSON" })
    } catch (e: any) {
      toast({ variant: "destructive", title: "❌ Lỗi", description: e.message })
    }
  }

  /* ---------- render ---------- */
  const part = model.parts[activePart]

  return (
    <div className="w-full space-y-4">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={reset} title="Reset">
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => {
            const blob = new Blob([JSON.stringify(model, null, 2)], { type: "application/json" })
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = "cad.json"
            a.click()
            URL.revokeObjectURL(url)
          }} title="Save JSON">
            <Save className="w-4 h-4" />
          </Button>
          <Button onClick={handleGenerate}>
            <Play className="w-4 h-4 mr-2" />
            Tạo CAD
          </Button>
        </div>
      </div>

      {/* PART SELECTOR */}
      <div className="flex gap-2 flex-wrap">
        {Object.keys(model.parts).map(k => (
          <Button
            key={k}
            size="sm"
            variant={activePart === k ? "default" : "outline"}
            onClick={() => setActivePart(k)}
          >
            {k}
          </Button>
        ))}
      </div>

      <Card>
        <Tabs defaultValue="coordinate">
          <TabsList className="w-full">
            <TabsTrigger value="coordinate" className="flex-1">Coordinate</TabsTrigger>
            <TabsTrigger value="sketch" className="flex-1">Sketch</TabsTrigger>
            <TabsTrigger value="extrusion" className="flex-1">Extrusion</TabsTrigger>
          </TabsList>

          {/* TAB 1: COORDINATE */}
          <TabsContent value="coordinate" className="p-4 space-y-4">
            <CoordinateSection
              data={part.coordinate_system}
              onChange={(path, val) => update(["parts", activePart, "coordinate_system", ...path], val)}
            />
          </TabsContent>

          {/* TAB 2: SKETCH */}
          <TabsContent value="sketch" className="p-4">
            <SketchSection
              data={part.sketch}
              onChange={(path, val) => update(["parts", activePart, "sketch", ...path], val)}
            />
          </TabsContent>

          {/* TAB 3: EXTRUSION */}
          <TabsContent value="extrusion" className="p-4">
            <ExtrusionSection
              data={part.extrusion}
              onChange={(path, val) => update(["parts", activePart, "extrusion", ...path], val)}
            />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  )
}

/* ---------- sub-components ---------- */
function CoordinateSection({ data, onChange }: any) {
  const fields = ["Euler Angles", "Translation Vector"] as const
  const labels = ["X", "Y", "Z"]
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {fields.map(field => (
        <div key={field}>
          <Label className="font-semibold text-slate-700">{field}</Label>
          <div className="flex gap-2 mt-1">
            {labels.map((l, i) => (
              <div key={i} className="flex-1">
                <span className="text-xs text-slate-500">{l}</span>
                <Slider
                  value={[data[field][i]]}
                  onValueChange={([v]) => onChange([field, i], v)}
                  min={field === "Euler Angles" ? -180 : -5}
                  max={field === "Euler Angles" ? 180 : 5}
                  step={field === "Euler Angles" ? 1 : 0.01}
                />
                <Input
                  type="number"
                  value={data[field][i]}
                  onChange={e => onChange([field, i], +e.target.value)}
                  className="h-7 text-xs"
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function SketchSection({ data, onChange }: any) {
  /* Tự động render tất cả face/loop/line */
  return (
    <div className="space-y-3">
      {Object.entries(data).map(([faceKey, face]: any) =>
        Object.entries(face).map(([loopKey, loop]: any) =>
          Object.entries(loop).map(([lineKey, line]: any) => (
            <Card key={`${faceKey}-${loopKey}-${lineKey}`} className="p-2">
              <div className="text-xs font-bold text-slate-600 mb-1">{lineKey}</div>
              <div className="grid grid-cols-2 gap-2">
                {["Start Point", "End Point"].map(pt => (
                  <div key={pt}>
                    <Label className="text-xs">{pt}</Label>
                    <div className="flex gap-1">
                      {[0, 1].map(i => (
                        <Input
                          key={i}
                          type="number"
                          value={line[pt][i]}
                          onChange={e =>
                            onChange([faceKey, loopKey, lineKey, pt, i], +e.target.value)
                          }
                          className="h-6 text-xs w-full"
                          step={0.01}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))
        )
      )}
    </div>
  )
}

function ExtrusionSection({ data, onChange }: any) {
  const items = [
    { key: "extrude_depth_towards_normal", label: "Depth +", min: 0, max: 5, step: 0.01 },
    { key: "extrude_depth_opposite_normal", label: "Depth -", min: 0, max: 5, step: 0.01 },
    { key: "sketch_scale", label: "Scale", min: 0.1, max: 5, step: 0.01 }
  ]
  return (
    <div className="space-y-4">
      {items.map(({ key, label, min, max, step }) => (
        <div key={key}>
          <Label className="font-semibold text-slate-700">{label}</Label>
          <Slider
            value={[data[key]]}
            onValueChange={([v]) => onChange([key], v)}
            min={min}
            max={max}
            step={step}
          />
          <Input
            type="number"
            value={data[key]}
            onChange={e => onChange([key], +e.target.value)}
            className="h-7 text-xs"
          />
        </div>
      ))}
    </div>
  )
}