import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/ui/Spinner';

export default function RoleRoute({ roles }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>;

  if (!isAuthenticated) {
    const to = location.pathname.startsWith('/admin') ? '/admin/login' : '/login';
    return <Navigate to={to} state={{ from: location }} replace />;
  }

  if (!roles.includes(user?.role)) return <Navigate to="/" replace />;

  return <Outlet />;
}
