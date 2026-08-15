import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout, RespondentLayout } from './components/Layout.jsx';
import { RequireAuth } from './components/RequireAuth.jsx';

import { Landing, NotFound } from './pages/Landing.jsx';
import { Login } from './pages/Login.jsx';
import { Signup } from './pages/Signup.jsx';
import { ForgotPassword, ResetPassword, VerifyEmail } from './pages/PasswordPages.jsx';
import { OAuthCallback } from './pages/OAuthCallback.jsx';
import { Dashboard } from './pages/Dashboard.jsx';
import { Builder } from './pages/Builder.jsx';
import { PollDetail } from './pages/PollDetail.jsx';
import { Discover } from './pages/Discover.jsx';
import { Settings } from './pages/Settings.jsx';
import { Respond } from './pages/Respond.jsx';

export function App() {
  return (
    <Routes>
      {/* Respondent pages get their own chrome-free shell — no nav, no
          sign-in prompt, nothing between the link and the vote. */}
      <Route element={<RespondentLayout />}>
        <Route path="/p/:slug" element={<Respond />} />
      </Route>

      <Route element={<Layout />}>
        <Route index element={<Landing />} />
        <Route path="login" element={<Login />} />
        <Route path="signup" element={<Signup />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password" element={<ResetPassword />} />
        <Route path="verify-email" element={<VerifyEmail />} />
        {/* Where the API sends the browser after Google consent. */}
        <Route path="auth/callback" element={<OAuthCallback />} />
        <Route path="discover" element={<Discover />} />

        <Route
          path="dashboard"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />
        <Route
          path="new"
          element={
            <RequireAuth>
              <Builder />
            </RequireAuth>
          }
        />
        <Route
          path="polls/:id"
          element={
            <RequireAuth>
              <PollDetail />
            </RequireAuth>
          }
        />
        <Route
          path="settings"
          element={
            <RequireAuth>
              <Settings />
            </RequireAuth>
          }
        />

        {/* Bare /polls has no page of its own. */}
        <Route path="polls" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
