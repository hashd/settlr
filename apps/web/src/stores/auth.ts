import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { useAuth } from "@/composables/useAuth";

export const useAuthStore = defineStore("auth", () => {
  const auth = useAuth();

  const user = computed(() => auth.user.value);
  const isAuthenticated = computed(() => auth.isAuthenticated.value);
  const loading = computed(() => auth.loading.value);

  const error = ref<string | null>(null);

  async function initialize() {
    await auth.initialize();
  }

  async function login(email: string, password: string) {
    error.value = null;
    try {
      await auth.signInWithEmail(email, password);
    } catch (e: any) {
      error.value = e.message || "Failed to sign in";
      throw e;
    }
  }

  async function signup(email: string, password: string, name: string) {
    error.value = null;
    try {
      await auth.signUpWithEmail(email, password, name);
    } catch (e: any) {
      error.value = e.message || "Failed to sign up";
      throw e;
    }
  }

  async function loginWithGoogle() {
    error.value = null;
    try {
      await auth.signInWithGoogle();
    } catch (e: any) {
      error.value = e.message || "Failed to sign in with Google";
      throw e;
    }
  }

  async function logout() {
    error.value = null;
    try {
      await auth.signOut();
    } catch (e: any) {
      error.value = e.message || "Failed to sign out";
      throw e;
    }
  }

  async function getToken(): Promise<string | null> {
    return auth.getAccessToken();
  }

  return {
    user,
    isAuthenticated,
    loading,
    error,
    initialize,
    login,
    signup,
    loginWithGoogle,
    logout,
    getToken,
  };
});
