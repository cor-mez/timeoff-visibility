import { useState } from "react";
import DayCell from "./DayCell";
import DayDetails from "./DayDetails";
import "./Calendar.css";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Calendar({ data, activeView }) {
  const [selectedDay, setSelectedDay] = useState(null);

  if (!data || Object.keys(data).length === 0) {
    return <p className="calendar-empty">No calendar data yet.</p>;
  }

  // Group dates by YYYY-MM
  const byMonth = {};
  Object.keys(data).forEach((d) => {
    const ym = d.slice(0, 7);
    if (!byMonth[ym]) byMonth[ym] = [];
    byMonth[ym].push(d);
  });

  return (
    <div className="calendar">
      {Object.keys(byMonth)
        .sort()
        .map((monthKey) => {
          const [y, m] = monthKey.split("-").map(Number);
          const monthLabel = new Date(y, m - 1, 1).toLocaleString("default", {
            month: "long",
            year: "numeric",
          });
          const firstDow = new Date(y, m - 1, 1).getDay();
          const daysInMonth = new Date(y, m, 0).getDate();

          // Build the selected day info for this month
          const selectedInfo =
            selectedDay && selectedDay.startsWith(monthKey)
              ? { date: selectedDay, info: data[selectedDay]?.[activeView] }
              : null;

          return (
            <div className="month" key={monthKey}>
              <h2 className="month-title">{monthLabel}</h2>
              <div className="calendar-grid">
                {DOW.map((d) => (
                  <div className="dow" key={d}>
                    {d}
                  </div>
                ))}
                {Array.from({ length: firstDow }, (_, i) => (
                  <div key={`pad-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const day = i + 1;
                  const iso = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const dayData = data[iso]?.[activeView];
                  return (
                    <DayCell
                      key={iso}
                      day={day}
                      count={dayData?.count || 0}
                      isSelected={selectedDay === iso}
                      onClick={() => setSelectedDay(iso)}
                    />
                  );
                })}
              </div>
              {selectedInfo && selectedInfo.info && (
                <DayDetails date={selectedInfo.date} info={selectedInfo.info} />
              )}
            </div>
          );
        })}
    </div>
  );
}
