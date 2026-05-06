import {
  INITIALIZATION_DESCRIPTION,
  INITIALIZATION_TITLE,
  PROJECT_NAME,
} from "@/lib/project";
import { orbitron } from "@/lib/fonts";

export function ProjectInitializedBanner() {
  return (
    <section className="initialization-card" aria-labelledby="project-status-title">
      <p className={`initialization-card__eyebrow ${orbitron.className}`}>{PROJECT_NAME}</p>
      <h1 id="project-status-title" className={`initialization-card__title ${orbitron.className}`}>
        {INITIALIZATION_TITLE}
      </h1>
      <p className="initialization-card__description">
        {INITIALIZATION_DESCRIPTION}
      </p>
      <dl className="initialization-card__meta">
        <div>
          <dt>Architecture</dt>
          <dd>src/app + modular feature folders</dd>
        </div>
        <div>
          <dt>TypeScript</dt>
          <dd>Strict mode enabled</dd>
        </div>
        <div>
          <dt>Responsive</dt>
          <dd>Desktop-first with mobile breakpoints</dd>
        </div>
      </dl>
    </section>
  );
}
