import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "arc_access_token";
const REFRESH_KEY = "arc_refresh_token";
const USER_KEY = "arc_user";

export async function getStoredTokens() {
  const [accessToken, refreshToken, userStr] = await Promise.all([
    SecureStore.getItemAsync(TOKEN_KEY),
    SecureStore.getItemAsync(REFRESH_KEY),
    SecureStore.getItemAsync(USER_KEY),
  ]);

  return {
    accessToken,
    refreshToken,
    user: userStr ? JSON.parse(userStr) : null,
  };
}

export async function storeTokens(
  accessToken: string,
  refreshToken: string,
  user: { id: string; email: string; firstName: string; lastName: string; role: string },
) {
  await Promise.all([
    SecureStore.setItemAsync(TOKEN_KEY, accessToken),
    SecureStore.setItemAsync(REFRESH_KEY, refreshToken),
    SecureStore.setItemAsync(USER_KEY, JSON.stringify(user)),
  ]);
}

export async function setAccessToken(accessToken: string) {
  await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
}

export async function clearTokens() {
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_KEY),
    SecureStore.deleteItemAsync(USER_KEY),
  ]);
}
