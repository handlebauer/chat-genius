import { Editor } from '@tiptap/react'
import { Button } from '@/components/ui/button'
import { Send, Paperclip } from 'lucide-react'
import { useRef } from 'react'
import { useFileUpload, type UploadedFile } from '@/hooks/use-file-upload'

interface ActionButtonsProps {
    editor: Editor | null
    onSend: () => void
    userId: string
    onFilesSelected: (files: File[]) => void
    onUploadComplete: (files: UploadedFile[]) => void
    onFileRemove: (fileId: string) => void
}

export function ActionButtons({
    editor,
    onSend,
    userId,
    onFilesSelected,
    onUploadComplete,
    onFileRemove,
}: ActionButtonsProps) {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const { uploadMultipleFiles, uploading, error } = useFileUpload()

    const handleFileClick = () => {
        fileInputRef.current?.click()
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        if (files.length === 0) return

        console.log(
            '🎯 Files selected:',
            files.map(f => ({ name: f.name, type: f.type, size: f.size })),
        )
        onFilesSelected(files)

        try {
            const uploadedFiles = await uploadMultipleFiles(files, userId)
            console.log('✅ Files uploaded successfully:', uploadedFiles)
            onUploadComplete(uploadedFiles)
        } catch (error) {
            console.error('❌ Failed to upload files:', error)
        } finally {
            // Clear the input
            if (fileInputRef.current) {
                fileInputRef.current.value = ''
            }
        }
    }

    return (
        <div className="message-editor-actions flex justify-between pl-[1px] pr-2 py-1 bg-zinc-50/30">
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                multiple
                onChange={handleFileChange}
                accept={[
                    'application/pdf',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'image/jpeg',
                    'image/png',
                    'image/gif',
                    'video/mp4',
                    'video/quicktime',
                    'application/zip',
                    'text/plain',
                ].join(',')}
            />
            <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-transparent text-zinc-400 group-focus-within:text-zinc-600 transition-colors disabled:opacity-50"
                onClick={handleFileClick}
                disabled={uploading}
            >
                <Paperclip className="w-4 h-4" />
            </Button>
            <Button
                size="icon"
                variant="ghost"
                className="shrink-0 h-8 w-8 p-0 hover:bg-transparent text-muted-foreground disabled:opacity-30 hover:text-primary disabled:bg-transparent"
                disabled={!editor || editor.isEmpty}
                onClick={onSend}
            >
                <Send className="w-4 h-4 text-gray-700" />
            </Button>
        </div>
    )
}
