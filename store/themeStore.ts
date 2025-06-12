import {defineStore} from 'pinia'
import {COMPONENT_TYPES, type ThemeSetting} from "~/types";
import {toast} from "vue3-toastify";
import type BaseTheme from "~/themes/BaseTheme";
import set from 'lodash/set';
import type {ThemeType} from "~/types/themeType";

interface ThemeState  {
    setting: ThemeType,
    initialSetting: ThemeType
}

export const useThemeStore = defineStore('theme', {
    state: () => {
        const state:ThemeState  = {
            setting: {} as ThemeType,
            initialSetting: {} as ThemeType
        };
        return state
    },
    getters: {
        componentSettings() {
            return (key: COMPONENT_TYPES) => {
                const components = this.setting.components;
                if (Object.hasOwn(components, key)) {
                    return components[key];
                }
                return null;
            }
        }
    },
    actions: {
        async getSetting() {

            const requestURL = useRequestURL();
            //check wy requestUrl host is returning localhost in server
            const baseURL = ''; //`${requestURL.protocol}//${requestURL.host}`;
            const route = useRoute();
            const {themeId} = route.params;

            let url = baseURL + '/api/theme';
            /*if (themeId) {
                url = url + '/' + themeId;
            }*/

            console.log('url', url);

            const {data, error, status} = await useFetch(url, {
                params: {
                    themeId,
                }
            });

            if (status.value == 'success') {
                this.setting = data.value;
                this.initialSetting = data.value;
            }

            if (error.value) {
                //logger.error('test error')
                throw new Error('error');
            }

        },
        updateThemeSetting(key: string, value: any) {
            console.log({key, value})
            //key might be nested
            set(this.setting, key, value);
            //this.setting[key] = value;
        },
        saveTheme() {
            try {
                const response = $fetch('/api/customizer/save-theme', {
                    method: 'post',
                    body: this.setting,
                });
                toast.success('Saved Successfully');
            } catch (e) {
                toast.error('something went wrong');
                console.log('error', e);
            }
        },

    },
})