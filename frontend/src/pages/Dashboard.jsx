import { useAuth } from '../context/AuthContext';
import CitizenDashboard from './CitizenDashboard';
import OfficerDashboard from './OfficerDashboard';

export default function Dashboard() {
  const { role } = useAuth();
  return role === 'CITIZEN' ? <CitizenDashboard /> : <OfficerDashboard />;
}
