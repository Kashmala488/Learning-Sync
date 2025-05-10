import React from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import Dashboard from './pages/Dashboard';
import StudentDashboard from './pages/dashboards/StudentDashboard';
import Login from './components/Login';
import Register from './components/Register';
import Home from './components/Home';
import Profile from './pages/Profile';
import TeacherProfile from './pages/TeacherProfile';
import { useAuth } from './contexts/AuthContext';
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';
import './index.css';
import Videocall from './pages/video/Videocall';
import LearningPaths from './pages/student/LearningPaths';
import AdaptiveQuiz from './pages/student/AdaptiveQuiz';
import Resources from './pages/student/Resources';
import ResourceGenerator from './pages/student/ResourceGenerator';
import ResourceDetail from './pages/student/ResourceDetail';
import CollaborationHub from './pages/student/CollaborationHub';
import Analytics from './pages/student/Analytics';
import GroupSelection from './pages/student/GroupSelection';
import MyGroups from './pages/student/MyGroups';
import GroupChat from './pages/student/GroupChat';
import PreviousQuizzes from './pages/student/PreviousQuizzes';
import QuizFeedback from './pages/student/QuizFeedback';
import Quizzes from './pages/student/Quizzes';
import AdminRoutes from './components/admin/AdminRoutes';
import TeacherDashboard from './pages/dashboards/TeacherDashboard';
import StudentProgress from './components/teacher/StudentProgress';
import Communication from './components/teacher/Communication';
import ResourceAssignment from './components/teacher/ResourceAssignment';
import TeacherAnalytics from './components/teacher/Analytics';
import TeacherLearningPaths from './components/teacher/LearningPaths';
import ManageStudents from './components/teacher/ManageStudents';
import GroupMentoring from './pages/teacher/GroupMentoring';
import StudentCommunication from './components/student/StudentCommunication';

// Protected route component
const ProtectedRoute = ({ element }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? element : <Navigate to="/login" />;
};

// Role-based protected route component
const RoleProtectedRoute = ({ element, allowedRoles }) => {
  const { isAuthenticated, userRole } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to="/dashboard" />;
  }
  return element;
};

const App = () => {
  const GOOGLE_CLIENT_ID = '441572137222-ecsu4p53mv9s0t97th9rqu6ptj0lahlv.apps.googleusercontent.com';

  return (
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID}>
      <ToastContainer />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={<ProtectedRoute element={<Dashboard />} />}
        />
        <Route
          path="/profile"
          element={<ProtectedRoute element={<Profile />} />}
        />

        {/* Group selection route for new students */}
        <Route
          path="/group-selection"
          element={<RoleProtectedRoute element={<GroupSelection />} allowedRoles={['student']} />}
        />

        {/* My Groups page for students */}
        <Route
          path="/my-groups"
          element={<RoleProtectedRoute element={<MyGroups />} allowedRoles={['student']} />}
        />

        {/* Admin routes */}
        <Route
          path="/admin/*"
          element={<RoleProtectedRoute element={<AdminRoutes />} allowedRoles={['admin']} />}
        />

        {/* Student specific routes */}
        <Route
          path="/learning-paths"
          element={<RoleProtectedRoute element={<LearningPaths />} allowedRoles={['student']} />}
        />
        <Route
          path="/quizzes"
          element={<RoleProtectedRoute element={<Quizzes />} allowedRoles={['student']} />}
        />
        <Route
          path="/quizzes/:quizId/feedback"
          element={<RoleProtectedRoute element={<QuizFeedback />} allowedRoles={['student']} />}
        />
        <Route
          path="/quizzes/practice"
          element={<RoleProtectedRoute element={<AdaptiveQuiz />} allowedRoles={['student']} />}
        />
        <Route
          path="/quizzes/:quizId"
          element={<RoleProtectedRoute element={<AdaptiveQuiz />} allowedRoles={['student']} />}
        />
        <Route
          path="/previous-quizzes"
          element={<RoleProtectedRoute element={<PreviousQuizzes />} allowedRoles={['student']} />}
        />
        <Route
          path="/resources"
          element={<RoleProtectedRoute element={<Resources />} allowedRoles={['student']} />}
        />
        <Route
          path="/resources/generate"
          element={<RoleProtectedRoute element={<ResourceGenerator />} allowedRoles={['student']} />}
        />
        <Route
          path="/resources/:resourceId"
          element={<RoleProtectedRoute element={<ResourceDetail />} allowedRoles={['student']} />}
        />
        <Route
          path="/collaboration"
          element={<RoleProtectedRoute element={<CollaborationHub />} allowedRoles={['student']} />}
        />
        <Route
          path="/analytics"
          element={<RoleProtectedRoute element={<Analytics />} allowedRoles={['student']} />}
        />

        {/* Teacher specific routes */}
        <Route
          path="/teacher"
          element={<RoleProtectedRoute element={<TeacherDashboard />} allowedRoles={['teacher']} />}
        />
        <Route
          path="/teacher/track/:studentId"
          element={<RoleProtectedRoute element={<StudentProgress />} allowedRoles={['teacher']} />}
        />
        <Route
          path="/teacher/communication"
          element={<RoleProtectedRoute element={<Communication />} allowedRoles={['teacher']} />}
        />
        <Route
          path="/teacher/resources"
          element={<RoleProtectedRoute element={<ResourceAssignment />} allowedRoles={['teacher']} />}
        />
        <Route
          path="/teacher/analytics"
          element={<RoleProtectedRoute element={<TeacherAnalytics />} allowedRoles={['teacher']} />}
        />
        <Route
          path="/teacher/students"
          element={<RoleProtectedRoute element={<ManageStudents />} allowedRoles={['teacher']} />}
        />
        <Route
          path="/teacher/groups"
          element={<RoleProtectedRoute element={<GroupMentoring />} allowedRoles={['teacher']} />}
        />

        {/* Teacher profile view for students */}
        <Route
          path="/teacher-profile/:id"
          element={<ProtectedRoute element={<TeacherProfile />} />}
        />

        {/* Student communication route */}
        <Route
          path="/student/dashboard"
          element={<RoleProtectedRoute element={<StudentDashboard />} allowedRoles={['student']} />}
        />
        <Route
          path="/student/groups"
          element={<RoleProtectedRoute element={<MyGroups />} allowedRoles={['student']} />}
        />
        <Route
          path="/student/communication"
          element={<RoleProtectedRoute element={<StudentCommunication />} allowedRoles={['student']} />}
        />

        {/* Group Chat route */}
        <Route
          path="/group-chat/:groupId"
          element={<RoleProtectedRoute element={<GroupChat />} allowedRoles={['student']} />}
        />

        {/* Video Call route */}
        <Route
          path="/groups/:groupId/video-call"
          element={<RoleProtectedRoute element={<Videocall />} allowedRoles={['student', 'teacher']} />}
        />

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </GoogleOAuthProvider>
  );
};

export default App;