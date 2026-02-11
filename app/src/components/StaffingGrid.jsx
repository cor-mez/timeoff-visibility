import { useState } from "react";
import { HOURS, hourLabel } from "../lib/parseAvailability";
import { staffingColor } from "../lib/staffingEngine";
import StaffingDetail from "./StaffingDetail";
import "./StaffingGrid.css";

const DAY_DISPLAY = {
  mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun",
};

export default function StaffingGrid({ gapData, weekDates, department }) {
  const [selected, setSelected] = useState(null);

  if (!gapData || !weekDates || weekDates.length === 0) {
    return <p className="staffing-empty">No staffing data yet.</p>;
  }

  const handleCellClick = (hourLabel, dayAbbr, isoDate) => {
    const cell = gapData[hourLabel]?.[dayAbbr];
    if (!cell) return;
    setSelected({ hourLabel, dayAbbr, isoDate, ...cell });
  };

  return (
    <div className="staffing-grid-wrapper">
      <div className="staffing-grid-scroll">
        <table className="staffing-grid">
          <thead>
            <tr>
              <th className="staffing-hour-header">Hour</th>
              {weekDates.map(({ dayAbbr, isoDate }) => (
                <th key={dayAbbr}>
                  <div>{DAY_DISPLAY[dayAbbr] || dayAbbr}</div>
                  <div className="staffing-date-sub">{isoDate.slice(5)}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HOURS.map((h) => {
              const label = hourLabel(h);
              const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
              const ampm = h >= 12 ? "PM" : "AM";
              return (
                <tr key={label}>
                  <td className="staffing-hour-label">{displayH} {ampm}</td>
                  {weekDates.map(({ dayAbbr, isoDate }) => {
                    const cell = gapData[label]?.[dayAbbr];
                    if (!cell) return <td key={dayAbbr} className="staffing-cell" />;
                    return (
                      <td
                        key={dayAbbr}
                        className={`staffing-cell ${staffingColor(cell.gap)}`}
                        onClick={() => handleCellClick(label, dayAbbr, isoDate)}
                      >
                        {cell.net}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selected && (
        <StaffingDetail
          data={selected}
          department={department}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
