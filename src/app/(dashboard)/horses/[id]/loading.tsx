import Skeleton from "@/components/ui/Skeleton";

export default function HorseLoading() {
  return (
    <div>
      {/* Hero skeleton — same dimensions as the real hero */}
      <div className="-mx-4 md:-mx-6 -mt-4 md:-mt-6">
        <Skeleton className="h-56 md:h-72 rounded-none" />

        {/* Fake tab bar */}
        <div className="flex gap-1 items-center px-4 md:px-6 py-2 bg-white border-b border-gray-100">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-8 w-16 flex-shrink-0" />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="mt-6 max-w-4xl mx-auto space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-64" />
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-44" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </div>
    </div>
  );
}
