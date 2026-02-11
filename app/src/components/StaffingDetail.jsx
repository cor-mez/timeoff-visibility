import "./StaffingDetail.css";

const DAY_DISPLAY = {
  mon: "Monday", tue: "Tuesday", wed: "Wednesday",
  thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday",
};

export default function StaffingDetail({ data, department, onClose }) {
  if (!data) return null;

  const displayH = data.hourLabel;
  const dayName = DAY_DISPLAY[data.dayAbbr] || data.dayAbbr;
  const dept = (department || "").toUpperCase();
  const gapSign = data.gap >= 0 ? "+" : "";

  return (
    <div className="staffing-detail">
      <div className="staffing-detail-header">
        <h4>{dayName} {displayH} — {dept}</h4>
        <button className="staffing-detail-close" onClick={onClose}>
          &times;
        </button>
      </div>
      <div className="staffing-detail-body">
        <div className="staffing-detail-row">
          <span>Raw available</span>
          <span>{data.raw}</span>
        </div>
        <div className="staffing-detail-row">
          <span>Effective (tier-weighted)</span>
          <span>{data.effectiveExact ?? data.effective}</span>
        </div>
        <div className="staffing-detail-row">
          <span>Time-off</span>
          <span>-{data.timeoff}</span>
        </div>
        <div className="staffing-detail-row staffing-detail-net">
          <span>Net available</span>
          <span>{data.net}</span>
        </div>
        <div className="staffing-detail-row">
          <span>Staffing need</span>
          <span>{data.need}</span>
        </div>
        <div className={`staffing-detail-row staffing-detail-gap ${data.gap >= 0 ? "positive" : "negative"}`}>
          <span>{data.gap >= 0 ? "Surplus" : "Shortage"}</span>
          <span>{gapSign}{data.gap}</span>
        </div>
      </div>
    </div>
  );
}
