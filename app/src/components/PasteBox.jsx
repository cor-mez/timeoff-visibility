import "./PasteBox.css";

export default function PasteBox({ label, value, onChange, placeholder }) {
  return (
    <div className="paste-box">
      <label className="paste-box-label">{label}</label>
      <textarea
        className="paste-box-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "Paste HotSchedules report here..."}
        rows={8}
      />
    </div>
  );
}
