"use client"

import React, { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { useInputValidation, commonValidations, preprocessText } from "@/hooks/use-input-validation"
import { Textarea } from "@/components/ui/textarea"
import {
  GoogleGenAI,
} from '@google/genai';
import {
  Send,
  User,
  Bot,
  Loader2,
  Download,
  AlertCircle,
  CheckCircle,
  MessageSquare,
  Sparkles,
  Trash2,
  FileDown,
  BarChart3,
  Clock,
  RotateCcw,
  Code2,
  Save
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  type: 'user' | 'bot'
  content: string
  timestamp: Date
  isLoading?: boolean
  hasError?: boolean
  stlData?: ArrayBuffer
  modelResponse?: any
  canRetry?: boolean
  retryPrompt?: string
}

interface TextToCadChatProps {
  onModelGenerated: (stlData: ArrayBuffer, filename: string) => void
  onJsonReceived?: (json: any) => void   // thêm prop mới
  setInputContent?: string  // prop để set nội dung input từ bên ngoài
  onInputContentSet?: () => void  // callback để thông báo đã set content
}
export function TextToCadChat({ onModelGenerated, onJsonReceived, setInputContent, onInputContentSet }: TextToCadChatProps) {
  // ------------------------------------------------------------------
  // 1.  Hydration-safe initial state
  // ------------------------------------------------------------------
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [modelResponses, setModelResponses] = useState<Record<string, any>>({}) 

  const [mounted, setMounted] = useState(false)

  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  const { errors: inputErrors, isValid: isInputValid, validate: validateInput } =
    useInputValidation(commonValidations.textToCAD)

  // ------------------------------------------------------------------
  // Effect để set input content từ bên ngoài
  // ------------------------------------------------------------------
  useEffect(() => {
    if (setInputContent) {
      setInput(setInputContent)
      // Gọi callback để thông báo đã set xong
      onInputContentSet?.()
    }
  }, [setInputContent, onInputContentSet])

  // ------------------------------------------------------------------
  // 2.  Only run client-side side-effects after mounted === true
  // ------------------------------------------------------------------
  useEffect(() => {
    setMounted(true)
    try {
      const savedMessages = localStorage.getItem('text2cad-chat-history')
      const savedResponses = localStorage.getItem('text2cad-model-responses')

      if (savedMessages) {
        const parsed = JSON.parse(savedMessages).map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }))
        setMessages(parsed)
      } else {
        // default welcome message
        setMessages([
          {
            id: '1',
            type: 'bot',
            content: 'Xin chào! Tôi có thể giúp bạn tạo mô hình 3D từ mô tả văn bản. Hãy mô tả chi tiết mô hình bạn muốn tạo.',
            timestamp: new Date()
          }
        ])
      }

      if (savedResponses) setModelResponses(JSON.parse(savedResponses))
    } catch (err) {
      console.error(err)
    }
  }, [])

  // ------------------------------------------------------------------
  // 3.  Persist state whenever it changes (client-only)
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!mounted) return
    try {
      localStorage.setItem('text2cad-chat-history', JSON.stringify(messages))
      localStorage.setItem('text2cad-model-responses', JSON.stringify(modelResponses))
    } catch (err) {
      console.error(err)
    }
  }, [messages, modelResponses, mounted])

  // ------------------------------------------------------------------
  // 4.  Scroll to bottom on new message
  // ------------------------------------------------------------------
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  // ------------------------------------------------------------------
  // 5.  Rest of the logic (unchanged except for disabled props)
  // ------------------------------------------------------------------

  const generateSTL = async (prompt: string) => {
    const response = await fetch('http://localhost:8000/api/generate-stl', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `text_input=${encodeURIComponent(prompt)}`
    })

    if (!response.ok) throw new Error(`API Error: ${response.status} ${response.statusText}`)

    const data = await response.json()
    if (!data.success) throw new Error('Failed to generate STL')

    const base64Data = data.stl_data
    if (!base64Data || typeof base64Data !== 'string') throw new Error('Invalid base64 STL data')

    const binaryString = atob(base64Data)
    const len = binaryString.length
    if (len > 50 * 1024 * 1024) throw new Error(`STL file too large: ${len} bytes`)

    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i)

    return { stlData: bytes.buffer, modelResponse: data.model_response }
  }

  const handleSendMessage = async (retryMessage?: string) => {
    const rawMessage = retryMessage || input.trim()
    if (!mounted || !rawMessage || isGenerating) return

    // Preprocess the message before validation and sending
    const processedMessage = preprocessText(rawMessage)

    if (!retryMessage) {
      const validation = validateInput(rawMessage) // Still validate original for security
      if (!validation.isValid) {
        toast({ variant: 'destructive', title: 'Lỗi đầu vào', description: validation.errors[0] })
        return
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: rawMessage, // Display original message to user
      timestamp: new Date()
    }

    const loadingMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: 'bot',
      content: retryMessage ? 'Đang thử lại tạo mô hình 3D...' : 'Đang tạo mô hình 3D từ mô tả của bạn...',
      timestamp: new Date(),
      isLoading: true
    }

    if (!retryMessage) {
      setMessages(prev => [...prev, userMessage, loadingMessage])
      setInput('')
    } else {
      setMessages(prev => [...prev, loadingMessage])
    }

    setIsGenerating(true)

    try {
      // Use processed message for STL generation
      const { stlData, modelResponse } = await generateSTL(processedMessage)
      const messageId = (Date.now() + 2).toString()

      setModelResponses(prev => ({ ...prev, [messageId]: modelResponse }))
      onJsonReceived?.(modelResponse)
      

      const successMessage: Message = {
        id: messageId,
        type: 'bot',
        content:
          'Tạo mô hình 3D thành công! Mô hình đã được tải lên viewer. Bạn có thể tải xuống file STL, xem model response hoặc tiếp tục chỉnh sửa.',
        timestamp: new Date(),
        stlData,
        modelResponse
      }

      setMessages(prev => {
        const next = [...prev]
        next[next.length - 1] = successMessage
        return next
      })

      onModelGenerated(stlData, `generated_model_${messageId}.stl`)
      toast({ title: 'Mô hình đã được tạo thành công', description: 'Mô hình 3D đã được tải lên viewer' })
    } catch (error: any) {
      const isNetwork = error.message.includes('Failed to fetch') || error.message.includes('Network')
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        type: 'bot',
        content: `Xin lỗi, đã có lỗi xảy ra khi tạo mô hình: ${error.message}. ${isNetwork ? 'Kiểm tra kết nối mạng và thử lại.' : 'Vui lòng thử lại.'}`,
        timestamp: new Date(),
        hasError: true,
        canRetry: true,
        retryPrompt: processedMessage
      }
      setMessages(prev => {
        const next = [...prev]
        next[next.length - 1] = errorMessage
        return next
      })
      toast({
        variant: 'destructive',
        title: isNetwork ? 'Lỗi kết nối' : 'Lỗi tạo mô hình',
        description: isNetwork ? 'Kiểm tra kết nối mạng và thử lại' : 'Không thể tạo mô hình 3D. Vui lòng thử lại.'
      })
    } finally {
      setIsGenerating(false)
    }
  }

const handleAIEnhance = async () => {
  if (!input.trim()) return

  // Lưu input gốc để có thể fallback nếu có lỗi
  const originalInput = input.trim()
  
  // Hiển thị loading state trong input
  setInput('Đang tăng cường mô tả bằng AI...')
  setIsGenerating(true)

  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY,
    });

    const config = {
      thinkingConfig: {
        thinkingBudget: -1,
      },
      systemInstruction: [
          {
            text: `You are given a short and simple user input sentence describing an object (e.g., "I want a rectangular block with a hole in the center." or "cái bàn").  
  Your task is to output a **structured CAD modeling instruction** in **raw text only**.  

  Output Rules:
  - Do not add any introduction, explanation, or commentary.  
  - Do not say phrases like “Based on the request…” or “Here is the CAD model…”.  
  - The output must only contain the structured CAD description with the following sections:  

  1. Part i: Title  
  2. Coordinate System  
    - Euler Angles: [X, Y, Z]  
    - Translation Vector: [X, Y, Z]  
  3. 2D Sketch Instructions  
    - Sketch plane used (XY, YZ, or XZ).  
    - Explicit loop(s) with line segments (start/end coordinates).  
  4. Sketch Scaling  
  5. Extrusion Parameters  
    - extrude_depth_towards_normal  
    - extrude_depth_opposite_normal  
    - sketch_scale  
    - Boolean operation  
  6. Final Dimensions  
  7. Design Purpose  

  Assembly Rule:
  - Break the design into multiple Parts if applicable (Part 1, Part 2, …).  
  - Each Part must be described fully (no “same as previous”).  
  - After all Parts, provide a Final CAD Model section summarizing overall dimensions and design purpose.  

  Language Rule:
  - If input is English → output in English.  
  - If input is Vietnamese → output in Vietnamese.  

  Style Guide:
  - Always professional CAD terminology.  
  - Raw text only — no commentary, no markdown, no explanations.  
  - The response must look like professional CAD modeling instructions.  

  Example for a good output:
  - Part 1 – Construct a Rounded Rectangular Frame Base Create a new coordinate system: Euler Angles: [0.0, 0.0, 0.0] Translation Vector: [0.0, 0.0, 0.4139] On face_1, draw Loop 1 as a rounded rectangle: Arc 1: Start [0.0, 0.1077], Mid [0.0316, 0.0316], End [0.1077, 0.0] Line 1: [0.1077, 0.0] → [0.6423, 0.0] Arc 2: Start [0.6423, 0.0], Mid [0.7184, 0.0316], End [0.75, 0.1077] Line 2: [0.75, 0.1077] → [0.75, 0.6423] Arc 3: Start [0.75, 0.6423], Mid [0.7184, 0.7184], End [0.6423, 0.75] Line 3: [0.6423, 0.75] → [0.1077, 0.75] Arc 4: Start [0.1077, 0.75], Mid [0.0316, 0.7184], End [0.0, 0.6423] Line 4: [0.0, 0.6423] → [0.0, 0.1077] Add Loop 2 inside as an inner rounded rectangle offset inward: Arc 1: Start [0.0082, 0.1105], Mid [0.0381, 0.0381], End [0.1105, 0.0082] Line 1: [0.1105, 0.0082] → [0.6395, 0.0082] Arc 2: Start [0.6395, 0.0082], Mid [0.7119, 0.0381], End [0.7418, 0.1105] Line 2: [0.7418, 0.1105] → [0.7418, 0.6395] Arc 3: Start [0.7418, 0.6395], Mid [0.7119, 0.7119], End [0.6395, 0.7418] Line 3: [0.6395, 0.7418] → [0.1105, 0.7418] Arc 4: Start [0.1105, 0.7418], Mid [0.0381, 0.7119], End [0.0082, 0.6395] Line 4: [0.0082, 0.6395] → [0.0082, 0.1105] Scale the sketch by 0.75 and extrude towards normal 0.0068 (opposite normal 0.0) to create a thin frame body. Part 2 – Join Outer Shell Extension Use the same coordinate system as Part 1. On face_1, repeat Loop 1 and Loop 2 as in Part 1. On face_2, draw another inner rounded rectangle identical to Loop 2 in Part 1. Scale the sketch by 0.75 and extrude opposite normal 0.4091 (towards normal 0.0) to extend downward, joining with the existing body to form the tall outer shell walls. Part 3 – Cut Inner Cavity Create a new coordinate system: Euler Angles: [0.0, 0.0, 0.0] Translation Vector: [0.0082, 0.0082, 0.4139] On face_1, draw Loop 1 as an inner rounded rectangle: Arc 1: Start [0.0, 0.1023], Mid [0.03, 0.03], End [0.1023, 0.0] Line 1: [0.1023, 0.0] → [0.6314, 0.0] Arc 2: Start [0.6314, 0.0], Mid [0.7037, 0.03], End [0.7336, 0.1023] Line 2: [0.7336, 0.1023] → [0.7336, 0.6314] Arc 3: Start [0.7336, 0.6314], Mid [0.7037, 0.7037], End [0.6314, 0.7336] Line 3: [0.6314, 0.7336] → [0.1023, 0.7336] Arc 4: Start [0.1023, 0.7336], Mid [0.03, 0.7037], End [0.0, 0.6314] Line 4: [0.0, 0.6314] → [0.0, 0.1023] Scale the sketch by 0.7336 and extrude opposite normal 0.4091 (towards normal 0.0) as a CutFeatureOperation to remove material inside, forming the open cavity.

  `,
          }
      ],
    };

    

    const model = 'gemini-2.5-pro';

    const contents = [
      {
        role: 'user',
        parts: [
          {
            text: `${originalInput}`,
          },
        ],
      },
    ];

    const response = await ai.models.generateContentStream({
      model,
      config, 
      contents,
    });

    // Reset input và streaming text vào
    setInput('')
    let enhancedDescription = '';
    
    for await (const chunk of response) {
      enhancedDescription += chunk.text;
      // Update input real-time với text đang stream
      setInput(enhancedDescription);
    }

    toast({ 
      title: 'Tăng cường mô tả thành công', 
      description: 'Mô tả đã được AI cải thiện. Kiểm tra và chỉnh sửa nếu cần thiết.' 
    })
  } catch (error) {
    console.error('Error enhancing description:', error)
    
    // Khôi phục input gốc nếu có lỗi
    setInput(originalInput)
    
    toast({
      variant: 'destructive',
      title: 'Lỗi tăng cường mô tả',
      description: 'Không thể tăng cường mô tả bằng AI. Vui lòng thử lại.'
    })
  } finally {
    setIsGenerating(false)
  }
}

  const handleRetry = (prompt: string) => handleSendMessage(prompt)

  const downloadSTL = (stlData: ArrayBuffer, messageId: string) => {
    try {
      const blob = new Blob([stlData], { type: 'application/octet-stream' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `generated_model_${messageId}.stl`
      a.click()
      URL.revokeObjectURL(url)
      toast({ title: 'Tải xuống thành công', description: 'File STL đã được tải xuống' })
    } catch {
      toast({ variant: 'destructive', title: 'Lỗi tải xuống', description: 'Không thể tải xuống file STL' })
    }
  }

  const downloadModelResponse = (messageId: string) => {
    try {
      const resp = modelResponses[messageId]
      if (!resp) throw new Error('Model response not found')
      const blob = new Blob([JSON.stringify(resp, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `model_response_${messageId}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast({ title: 'Tải xuống thành công', description: 'File JSON model response đã được tải xuống' })
    } catch {
      toast({ variant: 'destructive', title: 'Lỗi tải xuống', description: 'Không thể tải xuống model response' })
    }
  }

  const viewModelResponse = (messageId: string) => {
    console.log('Model Response for message', messageId, ':', modelResponses[messageId])
    toast({
      title: 'Model Response',
      description: 'Model response đã được in ra console. Mở Developer Tools để xem chi tiết.'
    })
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const clearChat = () => {
    setMessages([
      {
        id: '1',
        type: 'bot',
        content: 'Xin chào! Tôi có thể giúp bạn tạo mô hình 3D từ mô tả văn bản. Hãy mô tả chi tiết mô hình bạn muốn tạo.',
        timestamp: new Date()
      }
    ])
    setModelResponses({})
    try {
      localStorage.removeItem('text2cad-chat-history')
      localStorage.removeItem('text2cad-model-responses')
    } catch (err) {
      console.error(err)
    }
    toast({ title: 'Đã xóa cuộc trò chuyện', description: 'Lịch sử chat và model responses đã được xóa sạch' })
  }

  const exportChatHistory = () => {
    try {
      const data = {
        exportDate: new Date().toISOString(),
        totalMessages: messages.length,
        messages: messages.map(m => ({ ...m, timestamp: m.timestamp.toISOString() })),
        modelResponses
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `text2cad-chat-history-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast({ title: 'Đã xuất lịch sử chat', description: 'File JSON đã được tải xuống (bao gồm model responses)' })
    } catch {
      toast({ variant: 'destructive', title: 'Lỗi xuất file', description: 'Không thể xuất lịch sử chat' })
    }
  }

  const getChatStats = () => ({
    userMessages: messages.filter(m => m.type === 'user').length,
    botMessages: messages.filter(m => m.type === 'bot').length,
    successfulGenerations: messages.filter(m => m.stlData).length,
    total: messages.length
  })

  // ------------------------------------------------------------------
  // 6.  Hydration-safe render
  // ------------------------------------------------------------------
  if (!mounted) {
    // identical placeholder to avoid mismatches
    return (
      <Card className="h-full bg-white border-gray-200 shadow-xl flex flex-col rounded-xl overflow-hidden">
        <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                <MessageSquare className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 leading-tight">Text to CAD AI</h3>
                <p className="text-xs text-gray-700 font-medium">Tạo mô hình 3D từ mô tả</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 px-3 py-2">
            <div className="space-y-3">
              <div className="flex gap-3 items-start justify-start">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="max-w-[75%] rounded-xl p-4 text-sm leading-relaxed shadow-md bg-gray-50 border border-gray-200 text-gray-900 rounded-bl-md">
                  <div className="whitespace-pre-wrap break-words font-medium">
                    Xin chào! Tôi có thể giúp bạn tạo mô hình 3D từ mô tả văn bản. Hãy mô tả chi tiết mô hình bạn muốn tạo.
                  </div>
                  <div className="mt-3 text-xs text-gray-600 font-medium">—</div>
                </div>
              </div>
            </div>
          </ScrollArea>
          <div className="p-3 bg-gray-50 border-t border-gray-200">
            <div className="flex gap-2 mb-2">
              <Input
                value=""
                disabled
                placeholder="Đang tải..."
                className="h-8 bg-white border-gray-300 placeholder:text-gray-500 text-sm font-medium"
              />
              <Button disabled size="sm" className="h-8 w-8 p-0" />
            </div>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="h-full bg-white border-gray-200 shadow-xl flex flex-col rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 leading-tight">Text to CAD AI</h3>
              <p className="text-xs text-gray-700 font-medium">Tạo mô hình 3D từ mô tả</p>
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            <Button
              onClick={exportChatHistory}
              variant="outline"
              size="sm"
              className="h-6 w-6 p-0 bg-white hover:bg-blue-50 border-gray-300 hover:border-blue-300 text-gray-600 hover:text-blue-600 transition-all"
              disabled={messages.length <= 1}
              title="Xuất lịch sử chat"
            >
              <FileDown className="w-3 h-3" />
            </Button>
            <Button
              onClick={clearChat}
              variant="outline"
              size="sm"
              className="h-6 w-6 p-0 bg-white hover:bg-red-50 border-gray-300 hover:border-red-300 text-gray-600 hover:text-red-600 transition-all"
              disabled={isGenerating || messages.length <= 1}
              title="Xóa cuộc trò chuyện"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <ScrollArea ref={scrollAreaRef} className="flex-1 px-3 py-2">
          <div className="space-y-3">
            {messages.map(message => (
              <div
                key={message.id}
                className={cn('flex gap-3 items-start', message.type === 'user' ? 'justify-end' : 'justify-start')}
              >
                {message.type === 'bot' && (
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                    {message.isLoading ? (
                      <Loader2 className="w-4 h-4 text-white animate-spin" />
                    ) : message.hasError ? (
                      <AlertCircle className="w-4 h-4 text-white" />
                    ) : (
                      <Bot className="w-4 h-4 text-white" />
                    )}
                  </div>
                )}

                <div
                  className={cn(
                    'max-w-[75%] rounded-xl p-4 text-sm leading-relaxed shadow-md',
                    message.type === 'user'
                      ? 'bg-blue-600 text-white rounded-br-md'
                      : message.hasError
                      ? 'bg-red-50 border-2 border-red-200 text-red-900 rounded-bl-md'
                      : 'bg-gray-50 border border-gray-200 text-gray-900 rounded-bl-md'
                  )}
                >
                  <div className="whitespace-pre-wrap break-words font-medium">{message.content}</div>

                  {message.stlData && (
                    <div className="mt-3 pt-3 border-t border-gray-300">
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-gray-700 font-semibold">Mô hình STL sẵn sàng</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-9 bg-white hover:bg-gray-50 border-gray-300 text-gray-700 font-medium"
                          onClick={() => downloadSTL(message.stlData!, message.id)}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Tải STL
                        </Button>

                      </div>
                    </div>
                  )}

                  {message.hasError && message.canRetry && message.retryPrompt && (
                    <div className="mt-3 pt-3 border-t border-red-200">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full h-9 bg-red-50 hover:bg-red-100 border-red-300 text-red-700 font-medium"
                        onClick={() => handleRetry(message.retryPrompt!)}
                        disabled={isGenerating}
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Thử lại
                      </Button>
                    </div>
                  )}

                  <div className="mt-3 text-xs text-gray-600 font-medium" suppressHydrationWarning>
                    {new Intl.DateTimeFormat('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZone: 'Asia/Ho_Chi_Minh'
                    }).format(message.timestamp)}
                  </div>
                </div>

                {message.type === 'user' && (
                  <div className="w-8 h-8 bg-gradient-to-br from-gray-500 to-gray-700 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-3 bg-gray-50 border-t border-gray-200">
          <div className="flex gap-2 mb-2">
            <div className="flex-1">
              <Textarea
                value={input}
                onChange={e => {
                  setInput(e.target.value)
                  if (e.target.value.trim()) validateInput(e.target.value.trim())
                }}
                onKeyDown={handleKeyPress}
                placeholder="VD: Tạo một hình lập phương 10x10x10..."
                disabled={isGenerating}
                rows={3}
                className={cn(
                  'h-36 min-h-[3rem] bg-white border-gray-300 text-gray-900 placeholder:text-gray-500 text-base font-medium px-4 py-2 resize-none rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500',
                  inputErrors.length > 0 && 'border-red-300 focus:border-red-500 focus:ring-red-500'
                )}
              />

              {inputErrors.length > 0 && <div className="mt-1 text-xs text-red-600">{inputErrors[0]}</div>}
            </div>
            <div className="flex flex-col gap-1 bg-center">

            <Button
              onClick={() => handleAIEnhance()} 
              disabled={!input.trim() || isGenerating || input.length > 6144}
              size="sm"
              className="h-8 w-8 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0 p-0 shadow-md hover:shadow-lg transition-all"
              title="Tăng cường mô tả cho mô hình 3D bằng AI" // Added detailed tooltip text
            >
              {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            </Button>

            <Button
              onClick={() => handleSendMessage()}
              disabled={!input.trim() || isGenerating || input.length > 6144}
              size="sm"
              className="h-8 w-8 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0 p-0 shadow-md hover:shadow-lg transition-all"
              title="Gửi mô tả để tạo mô hình 3D"
            >
              {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
            </Button>
            </div>
            
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-3">
              {messages.length > 1 && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <BarChart3 className="w-3 h-3" />
                  <span>{getChatStats().userMessages} tin nhắn</span>
                  <span>•</span>
                  <span>{getChatStats().successfulGenerations} mô hình</span>
                </div>
              )}
            </div>
            <div
              className={cn(
                'font-mono font-semibold',
                input.length > 2048 * 2.5 ? 'text-red-600' : input.length > 2048 * 2.2 ? 'text-orange-600' : 'text-gray-500'
              )}
            >
              {input.length}/6144
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}