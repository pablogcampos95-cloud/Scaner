import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import RoleRoute from './components/RoleRoute.jsx';
import AssignEvaluation from './pages/AssignEvaluation.jsx';
import AdminCatalogs from './pages/AdminCatalogs.jsx';
import AdminEvaluations from './pages/AdminEvaluations.jsx';
import AdminUsers from './pages/AdminUsers.jsx';
import DashboardAdmin from './pages/DashboardAdmin.jsx';
import DashboardSupervisor from './pages/DashboardSupervisor.jsx';
import Evaluados from './pages/Evaluados.jsx';
import EvaluationMatrix from './pages/EvaluationMatrix.jsx';
import EvaluationCompleted from './pages/EvaluationCompleted.jsx';
import EvaluationPublic from './pages/EvaluationPublic.jsx';
import Login from './pages/Login.jsx';
import ManualReview from './pages/ManualReview.jsx';
import NotFound from './pages/NotFound.jsx';
import RegisterEvaluado from './pages/RegisterEvaluado.jsx';
import Reports from './pages/Reports.jsx';
import Results from './pages/Results.jsx';
import SearchResults from './pages/SearchResults.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/evaluacion/:token" element={<EvaluationPublic />} />
      <Route path="/evaluacion-completada" element={<EvaluationCompleted />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route element={<RoleRoute allowedRoles={['admin']} />}>
            <Route path="/admin" element={<DashboardAdmin />} />
            <Route path="/admin/usuarios" element={<AdminUsers />} />
            <Route path="/admin/catalogos" element={<AdminCatalogs />} />
            <Route path="/admin/matriz-evaluaciones" element={<EvaluationMatrix />} />
            <Route path="/admin/evaluaciones" element={<AdminEvaluations />} />
            <Route path="/admin/evaluaciones/nueva" element={<AdminEvaluations mode="new" />} />
            <Route path="/admin/evaluaciones/:id/editar" element={<AdminEvaluations mode="edit" />} />
            <Route path="/admin/evaluaciones/:id/preguntas" element={<AdminEvaluations mode="questions" />} />
          </Route>

          <Route element={<RoleRoute allowedRoles={['supervisor']} />}>
            <Route path="/supervisor" element={<DashboardSupervisor />} />
            <Route path="/registrar-evaluado" element={<RegisterEvaluado />} />
            <Route path="/asignar-evaluacion" element={<AssignEvaluation />} />
          </Route>

          <Route path="/evaluados" element={<Evaluados />} />
          <Route path="/buscar" element={<SearchResults />} />
          <Route path="/reportes" element={<Reports />} />
          <Route path="/resultados" element={<Results />} />
          <Route path="/resultados/:id" element={<Results />} />
          <Route path="/resultados/:id/revision" element={<ManualReview />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
