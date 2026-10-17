// src/App.jsx
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import ToastContainer from './components/common/ToastContainer';
import AuthModal from './components/common/AuthModal';
import ErrorBoundary from './components/common/ErrorBoundary';

import LandingPage         from './pages/LandingPage';
import DashboardPage       from './pages/DashboardPage';
import CreateCoursePage    from './pages/CreateCoursePage';
import GenerationPage      from './pages/GenerationPage';
import CourseOverviewPage  from './pages/CourseOverviewPage';
import CourseWorkspacePage from './pages/CourseWorkspacePage';
import SlideEditorPage     from './pages/SlideEditorPage';
import VerificationPage    from './pages/VerificationPage';
import ExercisesPage       from './pages/ExercisesPage';
import QuizPage            from './pages/QuizPage';
import NotFoundPage        from './pages/NotFoundPage';

/**
 * RouterBridge: Rendered inside BrowserRouter so useNavigate is available.
 * It wires up the navigate function into AppContext so AuthModal can navigate.
 */
function RouterBridge() {
  const navigate = useNavigate();
  const { authModalOpen, closeAuthModal } = useApp();

  return (
    <>
      <AuthModal
        isOpen={authModalOpen}
        onClose={closeAuthModal}
        onNavigate={navigate}
      />
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        {/* RouterBridge must be inside BrowserRouter to access useNavigate */}
        <RouterBridge />

        <ErrorBoundary>
          <Routes>
            {/* Landing */}
            <Route path="/"                                      element={<LandingPage />} />

            {/* Course Creation Flow */}
            <Route path="/create"                                element={<CreateCoursePage />} />
            <Route path="/generate"                              element={<GenerationPage />} />

            {/* Course Library */}
            <Route path="/dashboard"                             element={<DashboardPage />} />

            {/* New unified Course Workspace (/course/:courseId and /course/:courseId/:section) */}
            <Route path="/course/:courseId"                      element={<CourseWorkspacePage />} />
            <Route path="/course/:courseId/:section"             element={<CourseWorkspacePage />} />

            {/* Legacy Studio routes — kept for backward-compat so existing links don't break */}
            <Route path="/studio/:courseId"                      element={<CourseOverviewPage />} />
            <Route path="/studio/:courseId/generate"             element={<GenerationPage />} />
            <Route path="/studio/:courseId/slides"               element={<SlideEditorPage />} />
            <Route path="/studio/:courseId/verification"         element={<VerificationPage />} />
            <Route path="/studio/:courseId/exercises"            element={<ExercisesPage />} />
            <Route path="/studio/:courseId/quiz"                 element={<QuizPage />} />

            {/* 404 Fallback */}
            <Route path="*"                                      element={<NotFoundPage />} />
          </Routes>
        </ErrorBoundary>

        <ToastContainer />
      </BrowserRouter>
    </AppProvider>
  );
}
