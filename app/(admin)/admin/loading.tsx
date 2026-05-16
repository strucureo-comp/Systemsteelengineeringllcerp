import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function AdminLoading() {
  return (
    <div className="space-y-6 w-full animate-in fade-in duration-500">
      {/* Page Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64 bg-muted/60" />
          <Skeleton className="h-4 w-48 bg-muted/40" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-32 bg-muted/60 rounded-lg" />
          <Skeleton className="h-10 w-10 bg-muted/60 rounded-full" />
        </div>
      </div>

      {/* KPI Stats Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="border-border shadow-none bg-card/50 overflow-hidden relative">
             {/* Shimmer line slider effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
            <CardContent className="p-6 space-y-3">
              <Skeleton className="h-3 w-20 bg-muted/40" />
              <Skeleton className="h-7 w-32 bg-muted/70" />
              <div className="flex items-center gap-2 pt-1">
                <Skeleton className="h-4 w-12 bg-emerald-500/10" />
                <Skeleton className="h-3 w-16 bg-muted/30" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Area Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-border shadow-none bg-card/50">
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-40 bg-muted/60" />
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-4">
               {[...Array(5)].map((_, i) => (
                 <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full bg-muted/50" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-4 w-32 bg-muted/60" />
                        <Skeleton className="h-3 w-24 bg-muted/30" />
                      </div>
                    </div>
                    <Skeleton className="h-4 w-16 bg-muted/40" />
                 </div>
               ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-none bg-card/50">
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-32 bg-muted/60" />
          </CardHeader>
          <CardContent className="p-6 space-y-4">
             {[...Array(3)].map((_, i) => (
               <div key={i} className="space-y-2">
                 <div className="flex justify-between">
                   <Skeleton className="h-3 w-16 bg-muted/40" />
                   <Skeleton className="h-3 w-8 bg-muted/30" />
                 </div>
                 <Skeleton className="h-2 w-full bg-muted/20 rounded-full overflow-hidden">
                    <div className="h-full bg-primary/20 w-2/3 animate-[shimmer_3s_infinite]" />
                 </Skeleton>
               </div>
             ))}
             <div className="pt-4">
                <Skeleton className="h-[180px] w-full bg-muted/10 rounded-xl border border-dashed border-border/60" />
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
