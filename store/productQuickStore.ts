import {defineStore} from "pinia";
import {getProduct} from "~/apis";
import type {ProductDetail, Variation} from "~/types";
import {useCartStore} from "~/store/cartStore";
import {toast} from "vue3-toastify";
import {useProductLogic} from "~/composables/useProductLogic";

interface ProductDetailState {
    loading: boolean,
    product: ProductDetail | null,
    selectedVariant: null | { [key: string]: string },
    qty: number,
    addingToCart: boolean
}

const useProductQuickStore = defineStore('product-quick', {
        state() {
            const state: ProductDetailState = {
                loading: true,
                product: null,
                selectedVariant: null,
                qty: 1,
                addingToCart: false
            }
            return state
        },
        getters: {
            permutedVariations(state) {
                return useProductLogic().getProductVariations(state.product);
            },
            images(state) {

                if (state.loading) {
                    return [];
                }

                return useProductLogic().getProductImages(state.product);

            },
            isRequiredVariationSelected(state) {
                if (state.product == null) {
                    return null;
                }

                if (state.product.type === 'single') {
                    return true;
                }

                if (state.selectedVariant === null) {
                    return false;
                }

                return (
                    state.product.variation_name.split('|').length ===
                    Object.keys(state.selectedVariant).length
                );
            },
            selectedProductVariant(state) {
                return useProductLogic().selectedProductVariant(state.product, state.selectedVariant);
            },
        },
        actions: {
            onSelectVariation(key: string, variant: string) {
                this.selectedVariant = {...this.selectedVariant, [key]: variant};
            },
            async getProduct(slug: string) {
                const {data, error, loading} = await getProduct(slug);

                if (error.value) {
                    return createError('error3424')
                }

                if (!loading && data) {
                    this.product = data.value as ProductDetail

                    //reset selected variant && quantity
                    this.selectedVariant = null
                    this.qty = 1;
                    this.loading = false;

                }
            },
            isVariationActive(key: string, variant: string) {
                return this.selectedVariant && this.selectedVariant[key] === variant;

            },
            updateQty(qty: number) {
                this.qty = qty
            },
            async addToCart() {
                this.addingToCart = true;
                await useProductLogic()
                    .addToCart(this.product, this.selectedProductVariant, this.isRequiredVariationSelected, this.qty);
                this.addingToCart = false;
            },
            async buyNow() {
                await this.addToCart();
                //then redirect to checkout
                await useRouter().push({
                    path: makeRelativeLink('/checkout'),
                })
            },
        }
    }
)

export default useProductQuickStore