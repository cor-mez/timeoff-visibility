import { Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import TeamView from "./pages/TeamView";
import ManageView from "./pages/ManageView";
import StaffingView from "./pages/StaffingView";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/s/:storeId" element={<TeamView />} />
      <Route path="/s/:storeId/staffing" element={<StaffingView />} />
      <Route path="/m/:storeId/:managementKey" element={<ManageView />} />
    </Routes>
  );
}
