import {defineStore} from "pinia";
import type {User} from "~/types";
import {fetchUser} from "~/apis";

interface AuthState {
    user: null | User,
}

export const useAuthStore = defineStore('auth', {

    state: function () {
        const state: AuthState = {
            user: null,
        }
        return state;
    },
    getters: {
        isLoggedIn(state) {
            return !!state.user;
        }
    },
    actions: {
        async getUser() {
            try {
                let data = await fetchUser();
                this.user = data;
            } catch (e) {
                console.log({error: e});
            }
        },
        logout() {
            this.user = null;
            //remove token
            useCookie('access-token').value = null;
        }
    }
});