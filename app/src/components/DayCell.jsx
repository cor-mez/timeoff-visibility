import { heatLevel } from "../lib/utils";
import "./DayCell.css";

export default function DayCell({ day, count, isSelected, onClick }) {
  const heat = heatLevel(count);

  return (
    <div
      className={`day-cell ${heat} ${isSelected ? "selected" : ""}`}
      onClick={onClick}
    >
      <span className="day-number">{day}</span>
      {count > 0 && <span className="day-count">{count}</span>}
    </div>
  );
}
