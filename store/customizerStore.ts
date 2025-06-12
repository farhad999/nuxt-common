import {defineStore} from "pinia";
import {useThemeStore} from "~/store/themeStore";

export const useCustomizerStore = defineStore('customizer', {
    state: () => ({
        enabled: false,
        selectedComponent: '',
        selectedComponentId: '',
        interactable: false,
        showEditModal: false,
        changes: [],
    }),
    getters: {
        changesCount(state) {
            return state.changes.length;
        }
    },
    actions: {
        setSelectedComponent(component: string) {
            this.selectedComponent = component;
            this.showEditModal = true;
        },
        setSelectedComponentId(id: string) {
            this.selectedComponentId = id;
        },
        toggleInteractable() {
            this.interactable = !this.interactable;
        },
        getChangesCount() {
            const themeStore = useThemeStore();
            const {setting} = storeToRefs(themeStore);
            const count = Object.keys(setting.value).length;
            return count;
        },
        updateThemeSetting(key: string, value: any) {
            this.changes = [...this.changes, {key, value}];
            useThemeStore().updateThemeSetting(key, value);
        },
        undoChanges() {
            const lastChange = this.changes.pop();
            if (lastChange) {
                const {key, value} = lastChange;
                useThemeStore().updateThemeSetting(key, value);
            }
        }
    }
})