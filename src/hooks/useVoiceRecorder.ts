import { useState, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

const MAX_DURATION = 20 * 60 // 20 minutes in seconds

export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false)
  const [duration, setDuration] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []
      startTimeRef.current = Date.now()

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.start(250)
      setIsRecording(true)
      setDuration(0)

      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
        setDuration(elapsed)
        // Stop via mediaRecorder directly to avoid circular dep
        if (elapsed >= MAX_DURATION && mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop()
        }
      }, 1000)
    } catch {
      toast.error('Microphone permission denied')
    }
  }, [])

  const stopRecording = useCallback((): Promise<{ url: string; duration: number } | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current) { resolve(null); return }
      if (timerRef.current) clearInterval(timerRef.current)

      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
        setIsRecording(false)
        setUploading(true)

        try {
          const filename = `voice/${Date.now()}-${Math.random().toString(36).slice(2)}.webm`
          const { error } = await supabase.storage.from('kasaja-media').upload(filename, blob, {
            contentType: 'audio/webm',
            cacheControl: '3600'
          })
          if (error) throw error

          const { data: urlData } = supabase.storage.from('kasaja-media').getPublicUrl(filename)
          setAudioUrl(urlData.publicUrl)
          setUploading(false)
          resolve({ url: urlData.publicUrl, duration: elapsed })
        } catch {
          toast.error('Failed to upload voice message')
          setUploading(false)
          resolve(null)
        }

        // Stop all tracks
        mediaRecorderRef.current?.stream.getTracks().forEach(t => t.stop())
      }

      mediaRecorderRef.current.stop()
    })
  }, [])

  const cancelRecording = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    mediaRecorderRef.current?.stream.getTracks().forEach(t => t.stop())
    mediaRecorderRef.current = null
    chunksRef.current = []
    setIsRecording(false)
    setDuration(0)
  }, [])

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return { isRecording, duration, audioUrl, uploading, startRecording, stopRecording, cancelRecording, formatDuration }
}
