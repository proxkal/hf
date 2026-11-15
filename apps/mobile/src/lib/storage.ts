import * as SecureStore from 'expo-secure-store';

/** iOS / Android : le jeton de rafraîchissement est chiffré dans le Keychain / Keystore. */
export const secureStorage = {
  get: (key: string) => SecureStore.getItemAsync(key),
  set: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  remove: (key: string) => SecureStore.deleteItemAsync(key),
};
