interface FlashcardProps {
  frontText: string;
  backText: string;
  flipped: boolean;
  flagged: boolean;
  onFlip: () => void;
}

export function Flashcard({ frontText, backText, flipped, flagged, onFlip }: FlashcardProps) {
  return (
    <div className="relative [perspective:1200px]" style={{ width: 480, height: 260 }}>
      {flagged && (
        // Pinned to the non-rotating outer container so it stays upright and
        // visible on both faces instead of flipping (and mirroring) with the card.
        <div
          title="Flagged"
          className="absolute -right-2 -top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-accent-amber text-neutral-0 shadow-sm"
        >
          <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
            <path d="M3 1.5a.5.5 0 0 1 1 0V2h8.5a.5.5 0 0 1 .4.8L11 6l1.9 3.2a.5.5 0 0 1-.4.8H4v4.5a.5.5 0 0 1-1 0v-13Z" />
          </svg>
        </div>
      )}
      <div
        onClick={onFlip}
        className="relative h-full w-full cursor-pointer transition-transform duration-[180ms] ease-out [transform-style:preserve-3d]"
        style={{ transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
      >
        <div className="absolute inset-0 flex items-center justify-center rounded-xl border border-neutral-200 bg-neutral-0 px-8 text-center shadow-sm [backface-visibility:hidden]">
          <span className="text-[28px] font-medium tracking-tight text-neutral-900">{frontText}</span>
        </div>
        <div
          className="absolute inset-0 flex items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 px-8 text-center shadow-sm [backface-visibility:hidden]"
          style={{ transform: 'rotateY(180deg)' }}
        >
          <span className="text-[28px] font-medium tracking-tight text-neutral-0">{backText}</span>
        </div>
      </div>
    </div>
  );
}
