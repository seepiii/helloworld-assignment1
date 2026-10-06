"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { nextVote, type Vote } from "@/lib/observatory";
import { castVote } from "./actions";

export default function VoteButtons({
  reportId, score, myVote, signedIn,
}: { reportId: string; score: number; myVote: Vote; signedIn: boolean }) {
  const [state, setState] = useState({ score, myVote });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!signedIn) {
    return (
      <div className="flex items-center gap-3 font-mono text-xs">
        <span className="text-white/70 tabular-nums">{score > 0 ? `+${score}` : score}</span>
        <Link href="/login" className="rounded-full border border-[#e9c46a]/40 px-3 py-1 tracking-[0.15em] text-[#f4dfa6] uppercase hover:bg-[#e9c46a]/10">
          Sign in to vote
        </Link>
      </div>
    );
  }

  function vote(clicked: 1 | -1) {
    const prev = state;
    const mine = nextVote(prev.myVote, clicked);
    setState({ score: prev.score - prev.myVote + mine, myVote: mine }); // optimistic
    setError(null);
    startTransition(async () => {
      const res = await castVote(reportId, clicked);
      if ("error" in res) {
        setState(prev);
        setError(res.error ?? "Vote failed");
      } else {
        setState({ score: res.score, myVote: res.myVote });
      }
    });
  }

  const btn = (active: boolean, color: string) =>
    `flex h-8 w-8 items-center justify-center rounded-full border text-sm transition disabled:opacity-60 ${
      active ? `${color} text-[#050505]` : "border-white/15 text-white/60 hover:border-white/40 hover:text-white"
    }`;

  return (
    <div className="flex items-center gap-2 font-mono text-xs">
      <button aria-label="Upvote" aria-pressed={state.myVote === 1} disabled={pending}
        onClick={() => vote(1)} className={btn(state.myVote === 1, "border-[#7ee2a8] bg-[#7ee2a8]")}>▲</button>
      <span className="w-8 text-center text-white tabular-nums">
        {state.score > 0 ? `+${state.score}` : state.score}
      </span>
      <button aria-label="Downvote" aria-pressed={state.myVote === -1} disabled={pending}
        onClick={() => vote(-1)} className={btn(state.myVote === -1, "border-[#e98a6a] bg-[#e98a6a]")}>▼</button>
      {error && <span className="text-red-300">{error}</span>}
    </div>
  );
}
