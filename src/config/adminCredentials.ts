// Admin credentials configuration
export const ADMIN_CREDENTIALS = {
  email: 'admin',
  password: 'Foschia1971966',
  providerId: 9999999,
  providerName: 'Administrador'
};

export const isAdminLogin = (email: string, password: string): boolean => {
  return email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password;
};