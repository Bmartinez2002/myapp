"use client";
import { useTransition, useOptimistic } from "react";
import { Icon } from "@/components/ui/Icon";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Bar } from "@/components/ui/Bar";
import { toggleHabit } from "@/app/actions/habits";

export type HabitWithStreak = {
  id: string;
  name: string;
  emoji: string | null;
  anti_fuga: boolean;
  streak: number;
};

type Props = {
  mainHabit: HabitWithStreak;
  otherHabits: HabitWithStreak[];
  hitIds: string[];             // habit_ids marked true today
  todayCaptures: number;
};

export function HabitsGrid({ mainHabit, otherHabits, hitIds, todayCaptures }: Props) {
  const [, startToggle] = useTransition();

  // optimistic set of habit_ids marked today
  const [optimisticHits, updateHits] = useOptimistic(
    new Set(hitIds),
    (prev: Set<string>, id: string) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    }
  );

  function tap(id: string) {
    startToggle(async () => {
      updateHits(id);
      await toggleHabit(id);
    });
  }

  const allHabits = [mainHabit, ...otherHabits];
  const todayDone = allHabits.filter(h => optimisticHits.has(h.id)).length;
  const mainChecked = optimisticHits.has(mainHabit.id);

  // microrecompensas
  const rewards = [
    ...allHabits
      .filter(h => optimisticHits.has(h.id))
      .map(h => ({ emoji: h.emoji ?? "✦", title: h.name, sub: "Marcado hoy", xp: "+15" })),
    ...(todayCaptures > 0
      ? [{ emoji: "⚡", title: `${todayCaptures} capturas hoy`, sub: "Tu sistema sabe", xp: `+${todayCaptures * 2}` }]
      : []),
  ];

  return (
    <>
      {/* ─ Grid 2×2 otros hábitos ─────────────────────────── */}
      <div className="grid grid-cols-2 gap-2.5">
        {otherHabits.slice(0, 4).map(h => {
          const checked = optimisticHits.has(h.id);
          return (
            <button
              key={h.id}
              onClick={() => tap(h.id)}
              className="rounded-card border text-left p-3"
              style={{
                background: "oklch(0.18 .007 250)",
                borderColor: checked ? "oklch(.85 .18 150 / .5)" : "var(--color-hair)",
                boxShadow: checked ? "0 0 18px -6px oklch(.85 .18 150 / .4)" : "none",
              }}
            >
              <div className="flex justify-between items-start">
                <span className="text-[22px]">{h.emoji ?? "·"}</span>
                <Icon name="flame" size={12}
                  style={{color: h.streak > 0 ? "var(--color-accent)" : "var(--color-fg-4)"}}/>
              </div>
              <div className="mono font-medium mt-1.5 leading-none"
                style={{fontSize:24, color: h.streak > 0 ? "var(--color-accent)" : "var(--color-fg-3)"}}>
                {h.streak}<span className="text-[11px] text-fg-3 ml-0.5">d</span>
              </div>
              <div className="text-[11.5px] text-fg-3 mt-1 leading-snug">{h.name}</div>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="size-4 rounded-[4px] grid place-items-center shrink-0"
                  style={{
                    background: checked ? "var(--color-accent)" : "var(--color-bg-2)",
                    border: "1px solid " + (checked ? "var(--color-accent)" : "var(--color-hair)"),
                    color: "#06120c",
                  }}>
                  {checked && <Icon name="check" size={10} stroke={3}/>}
                </span>
                <span className="mono text-[9.5px] text-fg-4">
                  {checked ? "HECHO HOY" : "TOCA · MARCAR"}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* ─ Main habit toggle card ─────────────────────────── */}
      <button
        onClick={() => tap(mainHabit.id)}
        className="w-full rounded-card border p-3.5 text-left"
        style={{
          background: "oklch(0.18 .007 250)",
          borderColor: mainChecked ? "oklch(.85 .18 150 / .4)" : "var(--color-hair)",
        }}
      >
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-[8px] grid place-items-center shrink-0"
            style={{
              background: mainChecked ? "var(--color-accent)" : "var(--color-bg-2)",
              border: "1px solid " + (mainChecked ? "var(--color-accent)" : "var(--color-hair)"),
              color: "#06120c",
              boxShadow: mainChecked ? "0 0 14px oklch(.85 .18 150 / .5)" : "none",
            }}>
            {mainChecked
              ? <Icon name="check" size={18} stroke={2.6}/>
              : <span className="text-[14px]">{mainHabit.emoji ?? "🛡️"}</span>
            }
          </div>
          <div className="flex-1">
            <div className="text-[14px] font-semibold">{mainHabit.name}</div>
            <div className="mono text-[11px] text-fg-4 mt-0.5">
              Toca para marcar hoy · racha {mainHabit.streak}d
            </div>
          </div>
          <Pill kind="green">ANTI-FUGA</Pill>
        </div>
      </button>

      {/* ─ Microrecompensas ───────────────────────────────── */}
      {rewards.length > 0 && (
        <section>
          <div className="flex justify-between items-center pt-1 pb-2.5 px-1">
            <span className="micro">MICRORECOMPENSAS · HOY</span>
            <Pill kind="green">+{rewards.length * 15} XP</Pill>
          </div>
          <div className="flex flex-col gap-2">
            {rewards.map((r, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-card border"
                style={{background:"oklch(0.18 .007 250 / .6)", borderColor:"var(--color-hair)"}}>
                <div className="size-[34px] rounded-[10px] grid place-items-center text-[18px] shrink-0"
                  style={{background:"var(--color-bg-2)"}}>
                  {r.emoji}
                </div>
                <div className="flex-1">
                  <div className="text-[13px] font-medium">{r.title}</div>
                  <div className="mono text-[10.5px] text-fg-4 mt-0.5">{r.sub}</div>
                </div>
                <Pill kind="green">{r.xp} XP</Pill>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─ Resumen del día ────────────────────────────────── */}
      <Card>
        <div className="flex justify-between items-center">
          <span className="micro">HOY</span>
          <span className="mono text-[11px]">{todayDone} / {allHabits.length}</span>
        </div>
        <div className="mt-2.5">
          <Bar pct={(todayDone / Math.max(1, allHabits.length)) * 100}/>
        </div>
        <div className="mono text-[11px] text-fg-3 mt-2">
          {todayDone === allHabits.length && allHabits.length > 0
            ? "Día completo. Identidad, no fuerza de voluntad."
            : `${allHabits.length - todayDone} hábito${allHabits.length - todayDone === 1 ? "" : "s"} pendiente${allHabits.length - todayDone === 1 ? "" : "s"}`
          }
        </div>
      </Card>
    </>
  );
}
