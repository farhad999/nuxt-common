import {defineStore} from 'pinia'
import type {Product} from "~/types";

//this is for instant search only
//normal search will be  handled by product store

interface SearchState {
    loading: boolean,
    search: string,
    results: Product[],
}

const useSearchStore = defineStore('search', {
    state: () => {
        const state: SearchState = {
            loading: true,
            search: '',
            results: [],
        }
        return state;
    },
    getters: {},
    actions: {},
});