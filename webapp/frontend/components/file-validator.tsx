"use client"

interface FileValidatorProps {
  file: File
  onValidation: (isValid: boolean, error?: string) => void
}

export function FileValidator({ file, onValidation }: FileValidatorProps) {
  const validateFile = async () => {
    try {
      // Check file size (max 100MB)
      const maxSize = 100 * 1024 * 1024
      if (file.size > maxSize) {
        onValidation(false, "File size exceeds 100MB limit")
        return
      }

      // Check file extension
      const allowedExtensions = [".stl", ".obj", ".fbx", ".step", ".stp", ".iges", ".igs", ".brep"]
      const fileExtension = "." + file.name.toLowerCase().split(".").pop()

      if (!allowedExtensions.includes(fileExtension)) {
        onValidation(false, `Unsupported file format: ${fileExtension}`)
        return
      }

      // Basic file content validation
      const arrayBuffer = await file.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)

      // Check if file is not empty
      if (uint8Array.length === 0) {
        onValidation(false, "File is empty")
        return
      }

      // Basic format-specific validation
      switch (fileExtension) {
        case ".stl":
          // STL files should start with "solid" (ASCII) or have specific binary header
          const textDecoder = new TextDecoder()
          const header = textDecoder.decode(uint8Array.slice(0, 5))
          const isBinary = uint8Array[79] === 0 // Binary STL has null byte at position 79

          if (!header.startsWith("solid") && !isBinary) {
            onValidation(false, "Invalid STL file format")
            return
          }
          break

        case ".obj":
          // OBJ files are text-based and should contain vertices or faces
          const objContent = textDecoder.decode(uint8Array)
          if (!objContent.includes("v ") && !objContent.includes("f ")) {
            onValidation(false, "Invalid OBJ file format")
            return
          }
          break
      }

      onValidation(true)
    } catch (error) {
      onValidation(false, "File validation failed")
    }
  }

  validateFile()
  return null
}
