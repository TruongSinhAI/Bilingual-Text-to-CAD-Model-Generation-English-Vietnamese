import { useState, useCallback } from 'react'

interface ValidationRule {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  custom?: (value: string) => string | null
}

// Text preprocessing functions based on your data pipeline
export function cleanText(text: string): string {
  // Remove lines with 3 or more consecutive dashes, equals, or hashes
  text = text.replace(/[-=#]{3,}/g, '')
  
  // Replace multiple newlines with single space
  text = text.replace(/\n+/g, ' ')
  
  // Replace multiple whitespaces with single space
  text = text.replace(/\s+/g, ' ')
  
  return text.trim()
}

export function roundNumbersInText(text: string, decimalPlaces: number = 4): string {
  return text.replace(/\d+\.\d+/g, (match) => {
    const num = parseFloat(match)
    return num.toFixed(decimalPlaces)
  })
}

export function preprocessText(text: string): string {
  const cleaned = cleanText(text)
  return roundNumbersInText(cleaned, 4)
}

interface ValidationResult {
  isValid: boolean
  errors: string[]
}

export function useInputValidation(rules: ValidationRule) {
  const [errors, setErrors] = useState<string[]>([])
  const [isValid, setIsValid] = useState(true)

  const validate = useCallback((value: string): ValidationResult => {
    const newErrors: string[] = []

    // Required validation
    if (rules.required && (!value || value.trim().length === 0)) {
      newErrors.push('Trường này là bắt buộc')
    }

    // Min length validation
    if (rules.minLength && value.length < rules.minLength) {
      newErrors.push(`Tối thiểu ${rules.minLength} ký tự`)
    }

    // Max length validation
    if (rules.maxLength && value.length > rules.maxLength) {
      newErrors.push(`Tối đa ${rules.maxLength} ký tự`)
    }

    // Pattern validation
    if (rules.pattern && value && !rules.pattern.test(value)) {
      newErrors.push('Định dạng không hợp lệ')
    }

    // Custom validation
    if (rules.custom && value) {
      const customError = rules.custom(value)
      if (customError) {
        newErrors.push(customError)
      }
    }

    const result = {
      isValid: newErrors.length === 0,
      errors: newErrors
    }

    setErrors(newErrors)
    setIsValid(result.isValid)

    return result
  }, [rules])

  const clearErrors = useCallback(() => {
    setErrors([])
    setIsValid(true)
  }, [])

  return {
    errors,
    isValid,
    validate,
    clearErrors
  }
}

// Predefined validation rules for common use cases
export const commonValidations = {
  textToCAD: {
    required: true,
    minLength: 3,
    maxLength: 2048*3,
    custom: (value: string) => {
      // Preprocess the text first
      const processedText = preprocessText(value)
      
      const dangerousPatterns = ['<script', 'javascript:', 'eval(', 'exec(']
      if (dangerousPatterns.some(pattern => processedText.toLowerCase().includes(pattern))) {
        return 'Phát hiện nội dung nguy hiểm'
      }
      
      // Check for meaningful content after preprocessing
      if (processedText.trim().length < 3) {
        return 'Mô tả quá ngắn sau khi xử lý'
      }
      
      return null
    }
  },
  
  filename: {
    required: true,
    minLength: 1,
    maxLength: 100,
    pattern: /^[a-zA-Z0-9_\-\s\.]+$/,
    custom: (value: string) => {
      if (value.includes('..')) {
        return 'Tên file không được chứa ".."'
      }
      return null
    }
  }
}