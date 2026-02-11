import { useState } from "react";
import { HOURS, hourLabel } from "../lib/parseAvailability";
import { DEFAULT_STAFFING_NEEDS, DEFAULT_TIER_RATES } from "../lib/staffingEngine";
import "./StaffingSettings.css";

export default function StaffingSettings({ settings, onSave }) {
  const [collapsed, setCollapsed] = useState(true);

  const [fullRate, setFullRate] = useState(
    Math.round((settings?.tierRates?.full ?? DEFAULT_TIER_RATES.full) * 100)
  );
  const [partRate, setPartRate] = useState(
    Math.round((settings?.tierRates?.part ?? DEFAULT_TIER_RATES.part) * 100)
  );
  const [limitedRate, setLimitedRate] = useState(
    Math.round((settings?.tierRates?.limited ?? DEFAULT_TIER_RATES.limited) * 100)
  );

  const [bohNeeds, setBohNeeds] = useState(
    settings?.staffingNeeds?.boh || { ...DEFAULT_STAFFING_NEEDS.boh }
  );
  const [fohNeeds, setFohNeeds] = useState(
    settings?.staffingNeeds?.foh || { ...DEFAULT_STAFFING_NEEDS.foh }
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      tierRates: {
        full: fullRate / 100,
        part: partRate / 100,
        limited: limitedRate / 100,
      },
      staffingNeeds: { boh: bohNeeds, foh: fohNeeds },
    });
    setSaving(false);
  };

  const updateNeed = (dept, label, value) => {
    const num = parseInt(value, 10) || 0;
    if (dept === "boh") {
      setBohNeeds((prev) => ({ ...prev, [label]: num }));
    } else {
      setFohNeeds((prev) => ({ ...prev, [label]: num }));
    }
  };

  return (
    <div className="staffing-settings">
      <button
        className="staffing-settings-toggle"
        onClick={() => setCollapsed(!collapsed)}
      >
        Store Settings {collapsed ? "\u25B8" : "\u25BE"}
      </button>

      {!collapsed && (
        <div className="staffing-settings-body">
          <h4>Tier Effectiveness Rates</h4>
          <div className="staffing-eff-row">
            <label>
              Full-time:
              <input
                type="number"
                min="1"
                max="100"
                value={fullRate}
                onChange={(e) => setFullRate(parseInt(e.target.value, 10) || 0)}
              />
              %
            </label>
            <label>
              Part-time:
              <input
                type="number"
                min="1"
                max="100"
                value={partRate}
                onChange={(e) => setPartRate(parseInt(e.target.value, 10) || 0)}
              />
              %
            </label>
            <label>
              Limited:
              <input
                type="number"
                min="1"
                max="100"
                value={limitedRate}
                onChange={(e) => setLimitedRate(parseInt(e.target.value, 10) || 0)}
              />
              %
            </label>
          </div>

          <h4>Staffing Needs (per hour)</h4>
          <div className="staffing-needs-scroll">
            <table className="staffing-needs-table">
              <thead>
                <tr>
                  <th>Hour</th>
                  <th>BOH</th>
                  <th>FOH</th>
                </tr>
              </thead>
              <tbody>
                {HOURS.map((h) => {
                  const label = hourLabel(h);
                  const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
                  const ampm = h >= 12 ? "PM" : "AM";
                  return (
                    <tr key={label}>
                      <td>{displayH} {ampm}</td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          value={bohNeeds[label] ?? 0}
                          onChange={(e) => updateNeed("boh", label, e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          value={fohNeeds[label] ?? 0}
                          onChange={(e) => updateNeed("foh", label, e.target.value)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <button
            className="btn btn-primary staffing-save-btn"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      )}
    </div>
  );
}
