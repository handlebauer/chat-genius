import { X, FileIcon, ImageIcon, FileTextIcon, FileArchiveIcon, FileVideoIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { UploadedFile } from '@/hooks/use-file-upload'
import { formatFileSize } from '@/lib/utils'
import Image from 'next/image'
import { createClientComponent } from '@/lib/supabase/client'

interface FilePreviewProps {
  files: UploadedFile[]
  onRemove: (fileId: string) => void
}

const IMAGE_TYPES = ['jpg', 'png', 'gif']

function getFileIcon(fileType: string) {
  switch (fileType) {
    case 'jpg':
    case 'png':
    case 'gif':
      return <ImageIcon className="w-4 h-4" />
    case 'pdf':
    case 'docx':
    case 'xlsx':
    case 'txt':
      return <FileTextIcon className="w-4 h-4" />
    case 'zip':
      return <FileArchiveIcon className="w-4 h-4" />
    case 'mp4':
    case 'mov':
      return <FileVideoIcon className="w-4 h-4" />
    default:
      return <FileIcon className="w-4 h-4" />
  }
}

function FilePreviewContent({ file, onRemove }: { file: Required<UploadedFile>; onRemove: (id: string) => void }) {
  const supabase = createClientComponent()
  const isImage = IMAGE_TYPES.includes(file.file_type)

  if (isImage) {
    const { data: { publicUrl } } = supabase.storage
      .from('attachments')
      .getPublicUrl(file.storage_path)

    return (
      <div className="relative w-12 h-12 group/preview">
        <div className="absolute inset-0 rounded-md overflow-hidden bg-zinc-200 group-hover/preview:bg-zinc-300 transition-colors cursor-pointer">
          <Image
            src={publicUrl}
            alt={file.file_name}
            fill
            className="object-cover opacity-75 group-hover/preview:opacity-60 transition-opacity"
            sizes="48px"
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="absolute -top-[6px] -right-[6px] h-4 w-4 p-0 opacity-0 group-hover/preview:opacity-100 transition-opacity bg-black/60 hover:bg-black/80 z-10 rounded-full"
          onClick={(e) => {
            e.stopPropagation()
            onRemove(file.id)
          }}
        >
          <X className="w-[14px] h-[14px] text-white" />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 bg-zinc-100 rounded-md px-2 py-1 max-w-[200px] group hover:bg-zinc-200 transition-colors">
      {getFileIcon(file.file_type)}
      <div className="flex-1 min-w-0">
        <div className="truncate text-sm text-zinc-700">{file.file_name}</div>
        <div className="text-xs text-zinc-500">{formatFileSize(file.file_size)}</div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => onRemove(file.id)}
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  )
}

export function FilePreview({ files, onRemove }: FilePreviewProps) {
  if (files.length === 0) return null

  return (
    <div className="px-3 pb-2 flex flex-wrap gap-2 overflow-visible">
      {files
        .filter((file): file is Required<UploadedFile> => !!file.file_type)
        .map((file) => (
          <FilePreviewContent key={file.id} file={file} onRemove={onRemove} />
        ))}
    </div>
  )
}
