import type { SVGProps } from "react";

export const I = {
  home: "M3 12L12 4l9 8M5 10v10h14V10",
  bolt: "M13 2L4 14h7l-1 8 9-12h-7l1-8z",
  target: "M12 22a10 10 0 100-20 10 10 0 000 20zM12 17a5 5 0 100-10 5 5 0 000 10zM12 13.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z",
  brief: "M3 8h18v12H3zM8 8V6a2 2 0 012-2h4a2 2 0 012 2v2",
  cal: "M3 6h18v15H3zM3 10h18M8 3v4M16 3v4",
  wallet: "M3 7h18v12H3zM3 7l2-3h14l2 3M16 13h.01",
  mic: "M12 3a3 3 0 00-3 3v6a3 3 0 006 0V6a3 3 0 00-3-3zM5 11a7 7 0 0014 0M12 18v3",
  plus: "M12 5v14M5 12h14",
  flame: "M12 22c-4 0-7-2.7-7-7 0-3.5 3-6 7-12 4 6 7 8.5 7 12 0 4.3-3 7-7 7z",
  arrow: "M5 12h14M13 6l6 6-6 6",
  shield: "M12 2L4 5v7c0 5 4 8 8 10 4-2 8-5 8-10V5l-8-3z",
  ai: "M12 3l2 4 4 2-4 2-2 4-2-4-4-2 4-2zM5 18l1 2 2 1-2 1-1 2-1-2-2-1 2-1zM19 16l1 2 2 1-2 1-1 2-1-2-2-1 2-1z",
  search: "M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4-4",
  bell: "M6 18h12l-2-3v-4a4 4 0 10-8 0v4l-2 3zM10 21h4",
  chev: "M9 6l6 6-6 6",
  check: "M5 12l4 4 10-10",
  trend: "M3 17l6-6 4 4 8-8M14 7h6v6",
  cog:  "M12 15a3 3 0 100-6 3 3 0 000 6zM19 12l2 1-1 2-2-.4M5 12l-2 1 1 2 2-.4M12 5V3M12 21v-2",
  pulse: "M3 12h4l2-6 4 12 2-6h6",
  close: "M6 6l12 12M18 6l-12 12",
  back:    "M15 6l-6 6 6 6",
  refresh: "M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15",
  edit:    "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  x:       "M18 6L6 18M6 6l12 12",
  del:     "M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2zM18 9l-6 6M12 9l6 6",
  inbox:   "M22 12h-6l-2 3H10l-2-3H2M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z",
} as const;

type IconName = keyof typeof I | "more";

export function Icon({ name, size = 18, stroke = 1.6, ...p }: { name: IconName; size?: number; stroke?: number } & Omit<SVGProps<SVGSVGElement>, "stroke">) {
  if (name === "more") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none" {...p}>
        <circle cx="5" cy="12" r="1.5"/>
        <circle cx="12" cy="12" r="1.5"/>
        <circle cx="19" cy="12" r="1.5"/>
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d={I[name as keyof typeof I]} />
    </svg>
  );
}
