/**
 * Web : sessionStorage (effacé à la fermeture de l'onglet), jamais localStorage.
 * À durcir avant la mise en production : cookie httpOnly + SameSite=Strict servi par l'API,
 * pour que le jeton ne soit plus lisible par du JavaScript en cas de faille XSS.
 */
const safe = <T>(fn: () => T, fallback: T): T => {
  try {
    return fn();
  } catch {
    return fallback;
  }
};

export const secureStorage = {
  get: async (key: string) => safe(() => sessionStorage.getItem(key), null),
  set: async (key: string, value: string) =>
    safe(() => sessionStorage.setItem(key, value), undefined),
  remove: async (key: string) =>
    safe(() => sessionStorage.removeItem(key), undefined),
};
