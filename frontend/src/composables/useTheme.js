import { ref } from 'vue';

export function useTheme(storageKey = 'theme') {
    const isDark = ref(true);

    const initTheme = () => {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            // 优先使用用户上次手动选择的主题
            isDark.value = saved !== 'light';
        } else {
            // 首次访问：跟随操作系统主题偏好
            isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        document.documentElement.classList.toggle('dark', isDark.value);
    };

    const toggleTheme = () => {
        isDark.value = !isDark.value;
        document.documentElement.classList.toggle('dark', isDark.value);
        localStorage.setItem(storageKey, isDark.value ? 'dark' : 'light');
    };

    // 立即初始化
    initTheme();

    return { isDark, toggleTheme, initTheme };
}
