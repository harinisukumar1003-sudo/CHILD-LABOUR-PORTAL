import { useAuth } from '../context/AuthContext';
import CitizenDashboard from './CitizenDashboard';
import OfficerDashboard from './OfficerDashboard';
import NgoDashboard from './NgoDashboard';

export default function Dashboard() {
  const { role } = useAuth();
  if (role === 'CITIZEN') return <CitizenDashboard />;
  if (role === 'NGO_STAFF' || role === 'NGO_OFFICIAL') return <NgoDashboard />;
  return <OfficerDashboard />;
}
