export default function Loading() {
  return (
    <div className="px-4 md:px-6 py-4 md:py-6 flex flex-col gap-3.5 max-w-2xl mx-auto md:max-w-none">
      <div className="h-7 w-48 rounded-lg animate-pulse" style={{background:"var(--color-bg-2)"}}/>
      <Skeleton h={140}/>
      <div className="grid grid-cols-2 gap-3">
        <Skeleton h={100}/>
        <Skeleton h={100}/>
      </div>
      <Skeleton h={80}/>
      <Skeleton h={200}/>
    </div>
  );
}

function Skeleton({ h }: { h: number }) {
  return (
    <div
      className="animate-pulse rounded-card"
      style={{ height: h, background: "var(--color-bg-2)" }}
    />
  );
}
