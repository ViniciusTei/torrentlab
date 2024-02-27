import { Skeleton } from 'src/ui/skeleton'

export default function Loading() {
  return (
    <div className="px-12 py-4 inline-flex gap-6 w-full">
      <Skeleton className="h-[180px] w-[240px]" />

      <div className="flex-1 h-full w-full">
        {[0, 1, 2].map(item => (
          <Skeleton key={item} className="h-[180px] w-full rounded-lg mb-4" />
        ))}
      </div>

    </div>
  )
}
