import { ref, watch } from "vue";

const STORAGE_KEY = "gestor-assignatures-github-settings";

export interface GitHubSettings {
    token: string;
    owner: string;
    repo: string;
    path: string;
    branch: string;
}

// Global state to share across components if needed
const settings = ref<GitHubSettings>({
    token: "",
    owner: "", // e.g. "sambro-cindrela"
    repo: "gestor-assignatures",
    path: "src/fitxers/AssignaturesMET.json",
    branch: "main"
});

export function useGitHub() {

    function loadSettings() {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                // Merge with defaults to ensure all keys exist
                settings.value = { ...settings.value, ...parsed };
            } catch (e) {
                console.warn("Failed to parse GitHub settings", e);
            }
        }
    }

    function saveSettings() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings.value));
    }

    // Auto-save whenever settings change
    watch(
        settings,
        () => {
            saveSettings();
        },
        { deep: true }
    );

    return {
        settings,
        loadSettings,
        saveSettings,
    };
}
