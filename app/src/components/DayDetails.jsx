import { formatDate } from "../lib/utils";
import "./DayDetails.css";

export default function DayDetails({ date, info }) {
  if (!info) return null;

  return (
    <div className="day-details">
      <h4 className="day-details-date">{formatDate(date)}</h4>
      <div className="day-details-section">
        <strong>Approved ({info.approved?.length || 0})</strong>
        <ul>
          {info.approved?.length > 0 ? (
            info.approved.map((name) => <li key={name}>{name}</li>)
          ) : (
            <li className="none">None</li>
          )}
        </ul>
      </div>
      <div className="day-details-section">
        <strong>Pending ({info.pending?.length || 0})</strong>
        <ul>
          {info.pending?.length > 0 ? (
            info.pending.map((name) => (
              <li key={name} className="pending">
                {name}
              </li>
            ))
          ) : (
            <li className="none">None</li>
          )}
        </ul>
      </div>
    </div>
  );
}
