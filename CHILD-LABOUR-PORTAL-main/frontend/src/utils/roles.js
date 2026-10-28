export const dashboardPaths = {
  CITIZEN: '/citizen/dashboard',
  OFFICER: '/officer/dashboard',
  NGO_STAFF: '/rehabilitation',
  NGO_OFFICIAL: '/rehabilitation',
  ADMIN: '/admin/dashboard',
};

export function dashboardPathForRole(role) {
  return dashboardPaths[role] || '/login';
}
