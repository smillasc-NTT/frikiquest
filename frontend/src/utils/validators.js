export const validators = {
  isValidEmail: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
  isValidPassword: (password) => password && password.length >= 8,
  isValidName: (name) => name && name.trim().length > 0 && name.length <= 100,
  passwordsMatch: (pwd1, pwd2) => pwd1 === pwd2,
}
