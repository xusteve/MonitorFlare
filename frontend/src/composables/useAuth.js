import { ref, computed } from 'vue';
import { API_BASE, fetchT } from '../utils/api';

const storedToken = ref(sessionStorage.getItem('uptime_admin_token') || '');
const isAuthenticated = computed(() => !!storedToken.value && storedToken.value.length > 0);

export function useAuth() {
    const inputPassword = ref('');
    const loginError = ref('');
    const loggingIn = ref(false);

    const login = async (onSuccess) => {
        if (!inputPassword.value) return;
        loggingIn.value = true;
        loginError.value = '';
        try {
            const res = await fetchT(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: inputPassword.value }),
            });
            if (!res.ok) {
                loginError.value = res.status === 503 ? 'login.notConfigured' : 'login.wrongPassword';
                return;
            }
            const data = await res.json();
            storedToken.value = data.token || '';
            sessionStorage.setItem('uptime_admin_token', storedToken.value);
            sessionStorage.removeItem('uptime_admin_password');
            inputPassword.value = '';
            onSuccess?.();
        } catch {
            loginError.value = 'login.requestFailed';
        } finally {
            loggingIn.value = false;
        }
    };

    const logout = () => {
        sessionStorage.removeItem('uptime_admin_token');
        sessionStorage.removeItem('uptime_admin_password');
        storedToken.value = '';
        window.location.href = '/';
    };

    return {
        inputPassword,
        loginError,
        loggingIn,
        storedToken,
        isAuthenticated,
        login,
        logout,
    };
}
