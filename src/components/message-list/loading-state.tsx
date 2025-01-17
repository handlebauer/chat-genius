import { MessageSkeleton } from './loading-skeleton'

const SKELETON_COUNT = 3
const skeletonArray = Array.from({ length: SKELETON_COUNT })

export function LoadingState() {
    return (
        <div className="flex flex-col p-4 pb-3">
            <div className="space-y-4">
                {skeletonArray.map((_, i) => (
                    <MessageSkeleton key={i} />
                ))}
            </div>
        </div>
    )
}
