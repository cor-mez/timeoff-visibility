import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  validateManagementKey,
  updateStore,
  subscribeToCalendar,
} from "../lib/storeService";
import { parseRaw } from "../lib/parseRaw";
import {
  extractFromRecords,
  buildCalendarOutput,
} from "../lib/extractCalendar";
import Header from "../components/Header";
import PasteBox from "../components/PasteBox";
import ViewToggle from "../components/ViewToggle";
import Calendar from "../components/Calendar";
import CopyLink from "../components/CopyLink";
import QRCode from "../components/QRCode";
import "./ManageView.css";

const BASE_URL = "https://timeoffboard.web.app";

export default function ManageView() {
  const { storeId, managementKey } = useParams();

  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [storeName, setStoreName] = useState("");

  // Time-off paste
  const [bohText, setBohText] = useState("");
  const [fohText, setFohText] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [updating, setUpdating] = useState(false);

  // Calendar preview
  const [calendar, setCalendar] = useState(null);
  const [activeView, setActiveView] = useState("all");


  // Validate management key on mount
  useEffect(() => {
    async function check() {
      const result = await validateManagementKey(storeId, managementKey);
      setAuthorized(result.valid);
      setStoreName(result.storeName);
      setChecking(false);
    }
    check();
  }, [storeId, managementKey]);

  // Subscribe to calendar for preview
  useEffect(() => {
    if (!authorized) return;
    const unsub = subscribeToCalendar(storeId, (data) => {
      setCalendar(data);
    });
    return unsub;
  }, [storeId, authorized]);


  // ─── Time-Off Update ──────────────────────────────────

  const handleUpdateCalendar = async () => {
    if (!bohText.trim() && !fohText.trim()) {
      setStatus({ type: "error", message: "Paste at least one report." });
      return;
    }

    setUpdating(true);
    setStatus({ type: "", message: "" });

    try {
      const bohRecords = bohText.trim() ? parseRaw(bohText) : [];
      const fohRecords = fohText.trim() ? parseRaw(fohText) : [];

      const cal = {};
      extractFromRecords(bohRecords, "boh", cal);
      extractFromRecords(fohRecords, "foh", cal);

      const calendarData = buildCalendarOutput(cal);
      const dateCount = Object.keys(calendarData).length;

      await updateStore(storeId, managementKey, storeName, calendarData);

      setStatus({
        type: "success",
        message: `Updated! ${bohRecords.length} BOH + ${fohRecords.length} FOH records → ${dateCount} dates.`,
      });
    } catch (err) {
      setStatus({
        type: "error",
        message: "Failed to update. " + (err.message || ""),
      });
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };


  // ─── Render ──────────────────────────────────

  if (checking) {
    return (
      <div className="manage-view container">
        <p className="manage-view-loading">Validating access...</p>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="manage-view container">
        <div className="manage-denied">
          <h2>Access Denied</h2>
          <p>Invalid management link. Check the URL and try again.</p>
        </div>
      </div>
    );
  }

  const teamUrl = `${BASE_URL}/s/${storeId}`;

  return (
    <div className="manage-view container">
      <Header storeName={storeName} />

      <div className="manage-section">
        <h3>Store Name</h3>
        <input
          className="input"
          value={storeName}
          onChange={(e) => setStoreName(e.target.value)}
        />
      </div>

      {/* ─── Time-Off Reports ─── */}
      <div className="manage-section">
        <h3>Time-Off Reports</h3>
        <PasteBox
          label="BOH Report"
          value={bohText}
          onChange={setBohText}
          placeholder={"Go to HotSchedules \u2192 Time Off & Request Report \u2192 set Jobs to BOH General \u2192 Select All (Ctrl+A / \u2318+A) \u2192 Copy (Ctrl+C / \u2318+C) \u2192 Paste here (Ctrl+V / \u2318+V)\n\nNo formatting or cleanup needed \u2014 just paste the whole page exactly as it is."}
        />
        <PasteBox
          label="FOH Report"
          value={fohText}
          onChange={setFohText}
          placeholder={"Same steps, but set Jobs to FOH roles \u2192 Select All \u2192 Copy \u2192 Paste here\n\nNo formatting or cleanup needed \u2014 just paste the whole page exactly as it is."}
        />
        <button
          className="btn btn-primary"
          onClick={handleUpdateCalendar}
          disabled={updating}
        >
          {updating ? "Updating..." : "Update Calendar"}
        </button>
        {status.message && (
          <p className={`status-${status.type}`}>{status.message}</p>
        )}
      </div>

      {/* ─── Calendar Preview ─── */}
      <div className="manage-section">
        <h3>Calendar Preview</h3>
        <ViewToggle activeView={activeView} onChange={setActiveView} />
        <Calendar data={calendar} activeView={activeView} />
      </div>

      {/* ─── Share ─── */}
      <div className="manage-section">
        <h3>Share with Team</h3>
        <CopyLink url={teamUrl} label="Team link" />
        <QRCode url={teamUrl} />
      </div>
    </div>
  );
}
