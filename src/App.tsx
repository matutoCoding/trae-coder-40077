import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ToastProvider } from "@/components/Toast";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import FormulaList from "@/pages/FormulaList";
import FormulaDetail from "@/pages/FormulaDetail";
import FormulaEdit from "@/pages/FormulaEdit";
import MixingBatch from "@/pages/MixingBatch";
import TemperatureMonitor from "@/pages/TemperatureMonitor";
import MillingBatch from "@/pages/MillingBatch";
import VulcanizationMonitor from "@/pages/VulcanizationMonitor";
import VulcanizationRecords from "@/pages/VulcanizationRecords";
import DeburringBatch from "@/pages/DeburringBatch";
import InspectionPage from "@/pages/InspectionPage";
import PhysicalTesting from "@/pages/PhysicalTesting";
import QualityReport from "@/pages/QualityReport";

export default function App() {
  return (
    <ToastProvider>
      <Router>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/formulas" element={<FormulaList />} />
            <Route path="/formulas/new" element={<FormulaEdit />} />
            <Route path="/formulas/:id" element={<FormulaDetail />} />
            <Route path="/formulas/:id/edit" element={<FormulaEdit />} />
            <Route path="/mixing" element={<MixingBatch />} />
            <Route path="/mixing/temperature" element={<TemperatureMonitor />} />
            <Route path="/milling" element={<MillingBatch />} />
            <Route path="/vulcanization" element={<VulcanizationMonitor />} />
            <Route path="/vulcanization/records" element={<VulcanizationRecords />} />
            <Route path="/deburring" element={<DeburringBatch />} />
            <Route path="/inspection" element={<InspectionPage />} />
            <Route path="/testing" element={<PhysicalTesting />} />
            <Route path="/reports" element={<QualityReport />} />
          </Route>
        </Routes>
      </Router>
    </ToastProvider>
  );
}
