import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  subscribeToCalendar,
  subscribeToMeta,
} from "../lib/storeService";
import Header from "../components/Header";
import ViewToggle from "../components/ViewToggle";
import Calendar from "../components/Calendar";
import "./TeamView.css";

export default function TeamView() {
  const { storeId } = useParams();
  const [calendar, setCalendar] = useState(null);
  const [meta, setMeta] = useState({ name: "", lastUpdated: "" });
  const [activeView, setActiveView] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubCal = subscribeToCalendar(storeId, (data) => {
      setCalendar(data);
      setLoading(false);
    });

    const unsubMeta = subscribeToMeta(storeId, (m) => {
      setMeta(m);
    });

    return () => {
      unsubCal();
      unsubMeta();
    };
  }, [storeId]);

  if (loading) {
    return (
      <div className="team-view container">
        <p className="team-view-loading">Loading calendar...</p>
      </div>
    );
  }

  if (!meta.name) {
    return (
      <div className="team-view container">
        <p className="status-error">Store not found.</p>
      </div>
    );
  }

  return (
    <div className="team-view container">
      <Header storeName={meta.name} lastUpdated={meta.lastUpdated} />

      <div className="team-view-nav">
        <span className="team-view-nav-active">Calendar</span>
        <Link to={`/s/${storeId}/staffing`} className="team-view-nav-link">
          Staffing
        </Link>
      </div>

      <ViewToggle activeView={activeView} onChange={setActiveView} />
      <Calendar data={calendar} activeView={activeView} />
    </div>
  );
}
