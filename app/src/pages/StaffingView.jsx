import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { subscribeToMeta, subscribeToStaffing } from "../lib/storeService";
import Header from "../components/Header";
import StaffingGrid from "../components/StaffingGrid";
import "./StaffingView.css";

export default function StaffingView() {
  const { storeId } = useParams();
  const [meta, setMeta] = useState({ name: "", lastUpdated: "" });
  const [staffing, setStaffing] = useState(null);
  const [activeDept, setActiveDept] = useState("boh");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubMeta = subscribeToMeta(storeId, setMeta);
    const unsubStaffing = subscribeToStaffing(storeId, (data) => {
      setStaffing(data);
      setLoading(false);
    });
    return () => {
      unsubMeta();
      unsubStaffing();
    };
  }, [storeId]);

  if (loading) {
    return (
      <div className="staffing-view container">
        <p className="staffing-view-loading">Loading staffing data...</p>
      </div>
    );
  }

  if (!meta.name) {
    return (
      <div className="staffing-view container">
        <p className="status-error">Store not found.</p>
      </div>
    );
  }

  const weekStart = staffing?.weekStart || "";
  const gapData = staffing?.[activeDept]?.gap || null;
  const weekDates = staffing?.weekDates || [];

  return (
    <div className="staffing-view container">
      <Header storeName={meta.name} lastUpdated={staffing?.lastUpdated} />

      <div className="staffing-view-nav">
        <Link to={`/s/${storeId}`} className="staffing-view-nav-link">
          Calendar
        </Link>
        <span className="staffing-view-nav-active">Staffing</span>
      </div>

      {weekStart && (
        <p className="staffing-week-label">
          Week of {weekStart}
        </p>
      )}

      <div className="staffing-dept-toggle">
        {["boh", "foh"].map((d) => (
          <button
            key={d}
            className={`view-toggle-btn ${d === activeDept ? "active" : ""}`}
            onClick={() => setActiveDept(d)}
          >
            {d.toUpperCase()}
          </button>
        ))}
      </div>

      <StaffingGrid
        gapData={gapData}
        weekDates={weekDates}
        department={activeDept}
      />
    </div>
  );
}
