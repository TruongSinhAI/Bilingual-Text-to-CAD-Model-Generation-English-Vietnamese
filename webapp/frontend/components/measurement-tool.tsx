"use client"

import { useRef, useCallback, useState, useEffect } from "react"
import { useThree, useFrame } from "@react-three/fiber"
import { Html } from "@react-three/drei"
import * as THREE from "three"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"

interface MeasurementToolProps {
  enabled: boolean
  onMeasurement: (points: THREE.Vector3[]) => void
}

export function MeasurementTool({ enabled, onMeasurement }: MeasurementToolProps) {
  const { camera, scene, gl } = useThree()
  const raycaster = useRef(new THREE.Raycaster())
  const mouse = useRef(new THREE.Vector2())
  const points = useRef<THREE.Vector3[]>([])
  const [hoverPoint, setHoverPoint] = useState<THREE.Vector3 | null>(null)
  const { toast } = useToast()

  // Hover effect material
  const hoverMaterial = useRef(
    new THREE.MeshBasicMaterial({
      color: "#2563eb",
      transparent: true,
      opacity: 0.5,
    })
  )

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!enabled) return

      const rect = gl.domElement.getBoundingClientRect()
      mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.current.setFromCamera(mouse.current, camera)
      const intersects = raycaster.current.intersectObjects(scene.children, true)

      if (intersects.length > 0) {
        setHoverPoint(intersects[0].point.clone())
      } else {
        setHoverPoint(null)
      }
    },
    [enabled, camera, scene, gl]
  )

  const handleClick = useCallback(
    (event: MouseEvent) => {
      if (!enabled || !hoverPoint) return

      points.current.push(hoverPoint.clone())

      if (points.current.length === 1) {
        toast({
          title: "Point placed",
          description: "Click another point to complete the measurement",
        })
      }

      if (points.current.length >= 2) {
        onMeasurement([...points.current])
        points.current = []
        toast({
          title: "Measurement complete",
          description: "Distance has been calculated",
        })
      }
    },
    [enabled, hoverPoint, onMeasurement, toast]
  )

  useEffect(() => {
    const canvas = gl.domElement

    if (enabled) {
      canvas.addEventListener("mousemove", handleMouseMove)
      canvas.addEventListener("click", handleClick)
    }

    return () => {
      canvas.removeEventListener("mousemove", handleMouseMove)
      canvas.removeEventListener("click", handleClick)
    }
  }, [enabled, gl, handleMouseMove, handleClick])

  return (
    <>
      {/* Hover indicator */}
      {enabled && hoverPoint && (
        <mesh position={hoverPoint} scale={[0.1, 0.1, 0.1]}>
          <sphereGeometry />
          <meshBasicMaterial color="#2563eb" transparent opacity={0.5} />
          <Html center>
            <Badge variant="outline" className="bg-background/80 backdrop-blur-sm animate-in fade-in">
              Click to place point
            </Badge>
          </Html>
        </mesh>
      )}

      {/* Current measurement points */}
      {points.current.map((point, index) => (
        <group key={index}>
          <mesh position={point} scale={[0.05, 0.05, 0.05]}>
            <sphereGeometry />
            <meshBasicMaterial color={index === 0 ? "#2563eb" : "#16a34a"} />
            <Html center>
              <Badge 
                variant={index === 0 ? "default" : "secondary"}
                className="animate-in zoom-in"
              >
                Point {index + 1}
              </Badge>
            </Html>
          </mesh>
        </group>
      ))}

      {/* Measurement line */}
      {points.current.length === 2 && (
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[
                new Float32Array([
                  ...points.current[0].toArray(),
                  ...points.current[1].toArray(),
                ]),
                3
              ]}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#2563eb" linewidth={2} />
        </line>
      )}
    </>
  )
}
