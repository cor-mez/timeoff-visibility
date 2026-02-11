import "./ViewToggle.css";

const VIEWS = ["all", "foh", "boh"];

export default function ViewToggle({ activeView, onChange }) {
  return (
    <div className="view-toggle">
      {VIEWS.map((v) => (
        <button
          key={v}
          className={`view-toggle-btn ${v === activeView ? "active" : ""}`}
          onClick={() => onChange(v)}
        >
          {v.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
