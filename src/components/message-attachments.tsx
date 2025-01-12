'use client'

import {
    FileIcon,
    ImageIcon,
    FileTextIcon,
    FileArchiveIcon,
    FileVideoIcon,
    Download,
    Eye,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Database } from '@/lib/supabase/types'
import { formatFileSize } from '@/lib/utils'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

type Attachment = Database['public']['Tables']['attachments']['Row']

interface MessageAttachmentsProps {
    attachments: Attachment[]
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

function AttachmentContent({ attachment }: { attachment: Attachment }) {
    const supabase = createClient()
    const isImage = IMAGE_TYPES.includes(attachment.file_type)

    const {
        data: { publicUrl },
    } = supabase.storage
        .from('attachments')
        .getPublicUrl(attachment.storage_path)

    const handleDownload = () => {
        window.open(publicUrl, '_blank')
    }

    if (isImage) {
        return (
            <div className="relative group/attachment">
                <div className="relative w-48 h-48 rounded-md overflow-hidden bg-zinc-100">
                    <Image
                        src={publicUrl}
                        alt={attachment.file_name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                    <div className="absolute flex items-end justify-end gap-x-1 p-1 inset-0 bg-black/0 group-hover/attachment:bg-black/10 transition-colors">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover/attachment:opacity-100 transition-opacity bg-black/60 hover:bg-black/80"
                            onClick={() => window.open(publicUrl, '_blank')}
                        >
                            <Eye className="w-4 h-4 text-white" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover/attachment:opacity-100 transition-opacity bg-black/60 hover:bg-black/80"
                            onClick={handleDownload}
                        >
                            <Download className="w-4 h-4 text-white" />
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div
            className="flex items-center gap-2 bg-zinc-100 rounded-md px-3 py-2 max-w-[300px] group/attachment hover:bg-zinc-200 transition-colors cursor-pointer"
            onClick={handleDownload}
        >
            {getFileIcon(attachment.file_type)}
            <div className="flex-1 min-w-0">
                <div className="truncate text-sm text-zinc-700">
                    {attachment.file_name}
                </div>
                <div className="text-xs text-zinc-500">
                    {formatFileSize(attachment.file_size)}
                </div>
            </div>
            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 p-0 opacity-0 group-hover/attachment:opacity-100 transition-opacity"
                onClick={() => window.open(publicUrl, '_blank')}
            >
                <Eye className="w-4 h-4" />
            </Button>
        </div>
    )
}

export function MessageAttachments({ attachments }: MessageAttachmentsProps) {
    if (!attachments?.length) return null

    return (
        <div className="flex flex-wrap gap-2 mt-1">
            {attachments.map(attachment => (
                <AttachmentContent
                    key={attachment.id}
                    attachment={attachment}
                />
            ))}
        </div>
    )
}
