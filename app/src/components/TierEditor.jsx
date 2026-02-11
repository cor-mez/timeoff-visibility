import { useState } from "react";
import "./TierEditor.css";

const TIERS = [
  { key: "full", label: "Full", emoji: "\u{1F7E2}", desc: "35-40 hrs/wk" },
  { key: "part", label: "Part", emoji: "\u{1F7E1}", desc: "20-30 hrs/wk" },
  { key: "limited", label: "Ltd", emoji: "\u{1F534}", desc: "10-15 hrs/wk" },
];

export default function TierEditor({ bohNames, fohNames, tiers, onSave }) {
  const [bohTiers, setBohTiers] = useState(() => {
    const t = {};
    for (const name of bohNames || []) {
      t[name] = tiers?.boh?.[name] || "part";
    }
    return t;
  });

  const [fohTiers, setFohTiers] = useState(() => {
    const t = {};
    for (const name of fohNames || []) {
      t[name] = tiers?.foh?.[name] || "part";
    }
    return t;
  });

  const [saving, setSaving] = useState(false);

  const setTier = (dept, name, tier) => {
    if (dept === "boh") {
      setBohTiers((prev) => ({ ...prev, [name]: tier }));
    } else {
      setFohTiers((prev) => ({ ...prev, [name]: tier }));
    }
  };

  const setAll = (dept, tier) => {
    if (dept === "boh") {
      const t = {};
      for (const name of bohNames || []) t[name] = tier;
      setBohTiers(t);
    } else {
      const t = {};
      for (const name of fohNames || []) t[name] = tier;
      setFohTiers(t);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave({ boh: bohTiers, foh: fohTiers });
    setSaving(false);
  };

  const hasBoh = bohNames && bohNames.length > 0;
  const hasFoh = fohNames && fohNames.length > 0;

  if (!hasBoh && !hasFoh) return null;

  return (
    <div className="tier-editor">
      <h3>Team Member Scheduling Tiers</h3>
      <p className="tier-editor-desc">
        Set each team member's typical scheduling level. This determines
        how we calculate realistic staffing numbers.
      </p>
      <div className="tier-editor-legend">
        {TIERS.map((t) => (
          <span key={t.key} className="tier-legend-item">
            {t.emoji} {t.label} = {t.desc}
          </span>
        ))}
      </div>

      {hasBoh && (
        <DeptTierList
          title={`BOH (${bohNames.length})`}
          names={bohNames}
          tierMap={bohTiers}
          dept="boh"
          onSetTier={setTier}
          onSetAll={setAll}
        />
      )}

      {hasFoh && (
        <DeptTierList
          title={`FOH (${fohNames.length})`}
          names={fohNames}
          tierMap={fohTiers}
          dept="foh"
          onSetTier={setTier}
          onSetAll={setAll}
        />
      )}

      <button
        className="btn btn-primary tier-save-btn"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? "Saving..." : "Save Tiers"}
      </button>
    </div>
  );
}

function DeptTierList({ title, names, tierMap, dept, onSetTier, onSetAll }) {
  return (
    <div className="tier-dept">
      <div className="tier-dept-header">
        <h4>{title}</h4>
        <div className="tier-quick-actions">
          <button className="tier-quick-btn" onClick={() => onSetAll(dept, "part")}>
            Set all Part
          </button>
          <button className="tier-quick-btn" onClick={() => onSetAll(dept, "full")}>
            Set all Full
          </button>
        </div>
      </div>
      <div className="tier-list">
        {names.map((name) => (
          <div className="tier-row" key={name}>
            <span className="tier-name">{name}</span>
            <div className="tier-buttons">
              {TIERS.map((t) => (
                <button
                  key={t.key}
                  className={`tier-btn tier-btn-${t.key} ${tierMap[name] === t.key ? "active" : ""}`}
                  onClick={() => onSetTier(dept, name, t.key)}
                >
                  {t.emoji} {t.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
