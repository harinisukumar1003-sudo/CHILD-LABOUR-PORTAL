export const phases = ['MEDICAL_ASSESSMENT', 'EDUCATION', 'COUNSELLING', 'FAMILY_REINTEGRATION', 'VOCATIONAL_TRAINING', 'COMPLETED'];
export const phaseLabels = { MEDICAL_ASSESSMENT: 'Medical', EDUCATION: 'Education', COUNSELLING: 'Counselling', FAMILY_REINTEGRATION: 'Family reintegration', VOCATIONAL_TRAINING: 'Vocational', COMPLETED: 'Completed' };
export function daysInProgram(startDate) { return Math.max(1, Math.floor((Date.now() - new Date(`${startDate}T00:00:00`).getTime()) / 86400000)); }
