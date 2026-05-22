/* BRAYAN OS · icons */
const ICONS = {
  home: <path d="M3 12L12 4l9 8M5 10v10h14V10"/>,
  target: <><path d="M12 22a10 10 0 100-20 10 10 0 000 20z"/><path d="M12 17a5 5 0 100-10 5 5 0 000 10z"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></>,
  brief: <path d="M3 8h18v12H3zM8 8V6a2 2 0 012-2h4a2 2 0 012 2v2"/>,
  cal: <path d="M3 6h18v15H3zM3 10h18M8 3v4M16 3v4"/>,
  wallet: <path d="M3 7h18v12H3zM3 7l2-3h14l2 3M16 13h.01"/>,
  plus: <path d="M12 5v14M5 12h14"/>,
  flame: <path d="M12 22c-4 0-7-2.7-7-7 0-3.5 3-6 7-12 4 6 7 8.5 7 12 0 4.3-3 7-7 7z"/>,
  shield: <path d="M12 2L4 5v7c0 5 4 8 8 10 4-2 8-5 8-10V5l-8-3z"/>,
  ai: <path d="M12 3l2 4 4 2-4 2-2 4-2-4-4-2 4-2z"/>,
  search: <><circle cx="11" cy="11" r="8"/><path d="M21 21l-4-4"/></>,
  bell: <><path d="M6 18h12l-2-3v-4a4 4 0 10-8 0v4l-2 3z"/><path d="M10 21h4"/></>,
  chev: <path d="M9 6l6 6-6 6"/>,
  check: <path d="M5 12l4 4 10-10"/>,
  trend: <><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h6v6"/></>,
  cog: <><circle cx="12" cy="12" r="3"/><path d="M12 5V3M12 21v-2M5 12H3M21 12h-2M7 7L5.5 5.5M16.5 16.5L18 18M5.5 18.5L7 17M17 7l1.5-1.5"/></>,
  pulse: <path d="M3 12h4l2-6 4 12 2-6h6"/>,
  back: <path d="M15 6l-6 6 6 6"/>,
  close: <path d="M6 6l12 12M18 6l-12 12"/>,
  more: <><circle cx="5" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="19" cy="12" r="1" fill="currentColor"/></>,
  share: <><path d="M16 8a3 3 0 100-6 3 3 0 000 6zM6 15a3 3 0 100-6 3 3 0 000 6zM16 22a3 3 0 100-6 3 3 0 000 6z"/><path d="M8.5 13.5l5-3M8.5 10.5l5 3"/></>,
  arrow: <path d="M5 12h14M13 6l6 6-6 6"/>,
  refresh: <path d="M21 12a9 9 0 11-3-6.7M21 3v6h-6"/>,
};
function Icon({ name, size = 20, stroke = 1.6, style }){
  const path = ICONS[name];
  if (!path) return null;
  return (
    <span className="ico" style={style}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
        {path}
      </svg>
    </span>
  );
}
window.Icon = Icon;
