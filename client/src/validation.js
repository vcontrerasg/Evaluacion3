const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEmail(value) {
  const v = value.trim();
  if (!v) return 'Ingresa tu correo';
  if (v.length > 120 || !EMAIL.test(v)) return 'Ingresa un correo válido';
  return '';
}

export function validatePassword(value) {
  if (value.length < 10) return 'La contraseña debe tener al menos 10 caracteres';
  if (value.length > 72) return 'La contraseña no puede superar 72 caracteres';
  if (!/[A-Za-z]/.test(value)) return 'La contraseña debe incluir al menos una letra';
  if (!/[0-9]/.test(value)) return 'La contraseña debe incluir al menos un número';
  return '';
}

export function validateName(value) {
  const v = value.trim();
  if (v.length < 2) return 'Ingresa tu nombre';
  if (v.length > 80) return 'El nombre es demasiado largo';
  return '';
}
