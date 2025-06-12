import {defineStore} from "pinia";
import type {Brand} from '~/types';

interface BrandState  {
    brands: Brand[],
}

export const useBrandStore = defineStore('brands', {
    state: () => {
        const state:BrandState =  {
            brands: [],
        }

        return state;
    },
    getters: {},
    actions: {
        async getBrands() {
            try {
                const data = await this.$axios.$get('/brands');
                this.brands = data;
            } catch (err) {
                console.log(err);
            }
        },
    }
})

