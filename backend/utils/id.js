export const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export function generateId(len = 6) {
  let id = '';
  for (let i = 0; i < len; i++) {
    id += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }
  return id;
}

export const isValidId = (str) => /^[A-Za-z0-9]+$/.test(str);