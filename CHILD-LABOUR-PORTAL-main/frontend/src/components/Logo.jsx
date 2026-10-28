import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dashboardPathForRole } from '../utils/roles';

const sizes = {
  sm: 'h-8 w-8',
  md: 'h-11 w-11',
  lg: 'h-16 w-16',
  xl: 'h-[120px] w-[120px]',
};

export default function Logo({ size = 'md', showText = false, className = '' }) {
  const { token, role } = useAuth();
  const destination = token ? dashboardPathForRole(role) : '/';

  return (
    <Link
      to={destination}
      aria-label="Child Labour Reporting Portal home"
      className={`inline-flex min-w-0 items-center gap-3 ${className}`}
    >
      <span className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-amber-400 bg-white p-0.5 shadow-md ${sizes[size] || sizes.md}`}>
        <img
          src="/logo.png"
          alt="Child Labour Reporting Portal logo"
          className="h-full w-full rounded-full object-contain"
        />
      </span>
      {showText && (
        <span className="hidden min-w-0 max-w-40 sm:block">
          <strong className="block whitespace-nowrap text-sm font-bold leading-tight text-slate-900">Child Labour</strong>
          <small className="mt-0.5 block text-xs leading-tight text-slate-500">Reporting &amp; Rehabilitation Portal</small>
        </span>
      )}
    </Link>
  );
}
