import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppShell from './components/layout/AppShell'
import DashboardPage from './pages/DashboardPage'
import HabitsPage from './pages/HabitsPage'
import MindsetPage from './pages/MindsetPage'
import ProjectDetailPage from './pages/ProjectDetailPage'
import ProjectsPage from './pages/ProjectsPage'
import SettingsPage from './pages/SettingsPage'
import WeeklyGoalsPage from './pages/WeeklyGoalsPage'
import YearInProgressPage from './pages/YearInProgressPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="projects/:id" element={<ProjectDetailPage />} />
          <Route path="habits" element={<HabitsPage />} />
          <Route path="mindset" element={<MindsetPage />} />
          <Route path="goals" element={<WeeklyGoalsPage />} />
          <Route path="year-in-progress" element={<YearInProgressPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
