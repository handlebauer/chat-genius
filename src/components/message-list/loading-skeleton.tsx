import { Skeleton } from '@/components/ui/skeleton'

export function MessageSkeleton() {
    return (
        <div className="flex gap-2 items-start p-1 pb-[2px] relative">
            <Skeleton className="w-7 h-7 rounded-full" />
            <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-12" />
                </div>
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
            </div>
        </div>
    )
}
