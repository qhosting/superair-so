
export const formatPhone = (value: string): string => {
  // Remove all non-numeric chars
  const clean = value.replace(/\D/g, '');

  if (clean.length === 0) return '';
  if (clean.length <= 3) return `(${clean}`;
  if (clean.length <= 6) return `(${clean.slice(0, 3)}) ${clean.slice(3)}`;
  return `(${clean.slice(0, 3)}) ${clean.slice(3, 6)}-${clean.slice(6, 10)}`;
};

export const formatRFC = (value: string): string => {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 13);
};

export const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const isValidPhone = (phone: string): boolean => {
  const clean = phone.replace(/\D/g, '');
  return clean.length === 10;
};
