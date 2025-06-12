import {defineStore} from "pinia";
import type {Product, ProductDetail} from "~/types";
import {toast} from "vue3-toastify";

interface WishlistState {
    wishlists: Product[],
}

export const useWishlistStore = defineStore('wishlist', {
    state: () => {
        const state: WishlistState = {
            wishlists: [],
        }
        return state;
    },
    getters: {
        count(state): number {
            return state.wishlists.length ?? 0;
        },
        isWishListed(state) {
            return (product) => {
                return state.wishlists.findIndex(item => item.id === product.id) > -1;
            }
        }
    },
    actions: {
        addToWishlist(product: Product) {
            //add to wish list
            //manage both localstorage and server side
            //if user is not logged in then store to localstorage

            //check if product is in the wish list

            if (this.wishlists.find((item) => item.id === product.id)) {
                return;
            }

            let products = [product, ...this.wishlists];

            localStorage.setItem('wishlist', JSON.stringify(products));
            toast.success('Added to wishlist');

            this.wishlists = products;
        },
        removeFromWishlist(product) {
            if (payload) {
                let filtered = this.wishlists.filter(
                    (item) => item.id !== product.id
                );
                localStorage.setItem('wishlist', JSON.stringify(filtered));
                this.wishlists = filtered;
            }
        },
    }
})