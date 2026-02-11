import { useState } from "react";
import { createStore } from "../lib/storeService";
import CopyLink from "../components/CopyLink";
import QRCode from "../components/QRCode";
import "./Landing.css";

const BASE_URL = "https://timeoffboard.web.app";

export default function Landing() {
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setCreating(true);
    setError("");

    try {
      const { storeId, managementKey } = await createStore(name.trim());
      setResult({ storeId, managementKey });
    } catch (err) {
      setError("Failed to create store. Please try again.");
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const teamUrl = result ? `${BASE_URL}/s/${result.storeId}` : "";
  const manageUrl = result
    ? `${BASE_URL}/m/${result.storeId}/${result.managementKey}`
    : "";

  return (
    <div className="landing">
      <div className="landing-card">
        <h1 className="landing-title">Time-Off Calendar for Your Team</h1>
        <p className="landing-subtitle">
          Paste your HotSchedules report and share a live calendar with your
          team. No logins required.
        </p>

        {!result ? (
          <form onSubmit={handleCreate} className="landing-form">
            <input
              className="input"
              type="text"
              placeholder="Store name (e.g. CFA Gateway)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            <button
              className="btn btn-primary"
              type="submit"
              disabled={creating || !name.trim()}
            >
              {creating ? "Creating..." : "Create My Calendar"}
            </button>
            {error && <p className="status-error">{error}</p>}
          </form>
        ) : (
          <div className="landing-result">
            <p className="status-success">
              Calendar created for <strong>{name}</strong>
            </p>

            <CopyLink url={teamUrl} label="Team link (share with your team)" />
            <CopyLink
              url={manageUrl}
              label="Management link (keep this private!)"
            />

            <QRCode url={teamUrl} />
          </div>
        )}
      </div>
    </div>
  );
}
