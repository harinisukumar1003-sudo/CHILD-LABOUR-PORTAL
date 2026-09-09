import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
export default function PrivateRoute() { const { token } = useAuth(); return token ? <Outlet /> : <Navigate to="/login" replace />; }
export function RoleBasedRoute({ roles }) { const { role } = useAuth(); return roles.includes(role) ? <Outlet /> : <Navigate to="/dashboard" replace />; }
