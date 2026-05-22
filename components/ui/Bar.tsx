export function Bar({ pct, thick }: { pct: number; thick?: boolean }) {
  const w = Math.max(2, Math.min(100, pct));
  return (
    <div style={{height: thick ? 10 : 6, borderRadius:99, background:'var(--color-bg-2)', overflow:'hidden'}}>
      <div style={{height:'100%', width:`${w}%`, borderRadius:99, background:'linear-gradient(90deg, var(--color-accent), var(--color-accent-2))', boxShadow:'0 0 12px oklch(.85 .18 150 / .4)'}}/>
    </div>
  );
}
