'use client';

/** Fil d'étapes du configurateur (assistant pas-à-pas). Cliquable pour naviguer. */
interface StepperProps {
  steps: string[];
  current: number;
  onJump: (i: number) => void;
}

export function Stepper({ steps, current, onJump }: StepperProps) {
  return (
    <ol className="cfg-stepper" aria-label="Étapes de configuration">
      {steps.map((title, i) => {
        const state = i === current ? 'current' : i < current ? 'done' : 'todo';
        return (
          <li key={title} className={`cfg-stepper-item ${state}`}>
            <button
              type="button"
              className="cfg-stepper-btn"
              onClick={() => onJump(i)}
              aria-current={i === current ? 'step' : undefined}
            >
              <span className="cfg-stepper-num">{i < current ? '✓' : i + 1}</span>
              <span className="cfg-stepper-label">{title}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
