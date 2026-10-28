export const dashboardPaths = {
  CITIZEN: '/citizen/dashboard',
  OFFICER: '/officer/dashboard',
  NGO_STAFF: '/ngo/dashboard',
  NGO_OFFICIAL: '/ngo/dashboard',
  ADMIN: '/admin/dashboard',
};

export function dashboardPathForRole(role) {
  return dashboardPaths[role] || '/login';
}
