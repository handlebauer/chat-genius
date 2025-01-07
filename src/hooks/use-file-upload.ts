import { useState, useCallback } from 'react'
import { createClientComponent } from '@/lib/supabase/client'
import { v4 as uuidv4 } from 'uuid'
import type { Database } from '@/lib/supabase/types'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_FILE_TYPES = {
  // Documents
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  // Images
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  // Videos
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  // Others
  'application/zip': 'zip',
  'text/plain': 'txt'
} as const

interface FileUploadState {
  uploading: boolean
  error: string | null
  progress: number
}

export type UploadedFile = Omit<Database['public']['Tables']['attachments']['Insert'], 'message_id' | 'created_at' | 'updated_at'>

export function useFileUpload() {
  const supabase = createClientComponent()
  const [state, setState] = useState<FileUploadState>({
    uploading: false,
    error: null,
    progress: 0
  })

  const validateFile = useCallback((file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('File size exceeds 10MB limit')
    }
    if (!ALLOWED_FILE_TYPES[file.type as keyof typeof ALLOWED_FILE_TYPES]) {
      throw new Error('File type not supported')
    }
  }, [])

  const uploadFile = useCallback(async (file: File, userId: string): Promise<UploadedFile> => {
    try {
      validateFile(file)

      const fileId = uuidv4()
      const fileExt = ALLOWED_FILE_TYPES[file.type as keyof typeof ALLOWED_FILE_TYPES]
      const filePath = `public/${userId}/${fileId}.${fileExt}`

      setState(prev => ({ ...prev, uploading: true, error: null }))

      const { error: uploadError, data } = await supabase.storage
        .from('attachments')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('attachments')
        .getPublicUrl(filePath)

      const uploadedFile: UploadedFile = {
        id: fileId,
        file_name: file.name,
        file_size: file.size,
        file_type: fileExt,
        storage_path: filePath,
        content_type: file.type
      }

      setState(prev => ({
        ...prev,
        uploading: false,
        progress: 100
      }))

      return uploadedFile
    } catch (error) {
      setState(prev => ({
        ...prev,
        uploading: false,
        error: error instanceof Error ? error.message : 'Failed to upload file'
      }))
      throw error
    }
  }, [supabase, validateFile])

  const uploadMultipleFiles = useCallback(async (files: File[], userId: string) => {
    const uploads = files.map(file => uploadFile(file, userId))
    return Promise.all(uploads)
  }, [uploadFile])

  return {
    ...state,
    uploadFile,
    uploadMultipleFiles
  }
}
