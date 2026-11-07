export const isEmail = (v = '') => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
export const isMobile = (v = '') => /^[0-9+\-\s]{10,15}$/.test(v);
export const isPincode = (v = '') => /^\d{6}$/.test(v);

export const passwordStrength = (password = '') => {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score; // 0..4
};

export const validate = (rules) => {
  const errors = {};
  Object.entries(rules).forEach(([field, checks]) => {
    for (const check of checks) {
      const message = check();
      if (message) {
        errors[field] = message;
        break;
      }
    }
  });
  return { errors, valid: Object.keys(errors).length === 0 };
};
