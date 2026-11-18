import './check-callout.css';

/** The event key changes only with the position, so selecting a piece cannot replay the effect. */
export default function CheckCallout({ checked, eventKey }: { checked: boolean; eventKey: string }) {
  if (!checked) return null;
  return <div key={eventKey} className="check-callout" role="status" aria-live="polite" aria-atomic="true">
    <span className="sr-only">Chiếu tướng!</span>
    <img className="check-callout__badge" src="/effects/check-ink-bagua.webp" alt="" width={768} height={768} draggable={false}/>
  </div>;
}
