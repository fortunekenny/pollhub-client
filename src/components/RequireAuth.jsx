import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { Spinner } from './ui.jsx';

export function RequireAuth({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Wait for the session restore to finish — redirecting first would bounce a
  // signed-in user to /login on every hard refresh.
  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size={28} label="Checking your session" />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Remember where they were headed so login can return them there.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
