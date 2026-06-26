interface Props { current: 1 | 2 | 3 }

const STEPS = [
  { n: 1, label: 'Livraison' },
  { n: 2, label: 'Mode' },
  { n: 3, label: 'Paiement' },
];

export function StepBar({ current }: Props) {
  return (
    <div className="stepbar">
      {STEPS.map((s, i) => {
        const done = s.n < current;
        const active = s.n === current;
        return (
          <div key={s.n} className="step-item">
            <div className={`step-circle ${done ? 'done' : active ? 'active' : ''}`}>
              {done ? '✓' : s.n}
            </div>
            <span className={`step-label ${active ? 'active' : ''}`}>{s.label}</span>
            {i < STEPS.length - 1 && (
              <div className={`step-line ${done ? 'done' : ''}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
