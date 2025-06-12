import {defineStore} from "pinia";
import {getProduct, getQuickProduct} from "~/apis";
import type {ProductDetail, Variation} from "~/types";
import {useCartStore} from "~/store/cartStore";
import {toast} from "vue3-toastify";
import {useProductLogic} from "~/composables/useProductLogic";
import {useCommonStore} from "~/store/commonStore";

interface ProductDetailState {
    loading: boolean;
    product: ProductDetail | null;
    selectedVariant: null | { [key: string]: string };
    qty: number;
    compareProducts: ProductDetail[];
    quickViewModalStatus: boolean,
    addingToCart: boolean,
    addingMode: 'add' | 'buy'
}

export function createProductStore(storeId: string) {
    return defineStore(storeId, {
        state: () => {
            const state: ProductDetailState = {
                loading: true,
                product: null,
                selectedVariant: null,
                qty: 1,
                compareProducts: [],
                quickViewModalStatus: false,
                addingToCart: false,
                buyingNow: false,
                addingMode: 'add',
            };
            return state;
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

                if (state.product.type === "single") {
                    return true;
                }

                if (state.selectedVariant === null) {
                    return false;
                }

                return (
                    state.product.variation_name.split("|").length ===
                    Object.keys(state.selectedVariant).length
                );
            },
            selectedProductVariant(state) {
                return useProductLogic().selectedProductVariant(
                    state.product,
                    state.selectedVariant
                );
            },
            isProductInCart(state) {
                if (!this.selectedProductVariant) return false
                let cartStore = useCartStore();
                return cartStore.items.find(item => item.variation_id === this.selectedProductVariant.variation_id);
            },
        },
        actions: {
            onSelectVariation(key: string, variant: string) {
                this.selectedVariant = {...this.selectedVariant, [key]: variant};
            },
            async getProduct(slug: string) {
                this.loading = true;
                const {data, error} = await getProduct(slug);
                this.loading = false;
                if (error.value) {
                    return createError("error3424");
                }

                if (!this.loading && data) {
                    this.product = data.value as ProductDetail;

                    //reset selected variant && quantity
                    this.selectedVariant = null;
                    this.qty = 1;
                    this.loading = false;
                }
            },
            isVariationActive(key: string, variant: string) {
                return this.selectedVariant && this.selectedVariant[key] === variant;
            },
            updateQty(qty: number) {
                this.qty = qty;
            },
            async addToCart(mode: "add" | "buy" = "add") {
                this.addingToCart = true;
                this.addingMode = mode;
                let status = await useProductLogic().addToCart(
                    this.product,
                    this.selectedProductVariant,
                    this.isRequiredVariationSelected,
                    this.qty,
                );
                this.addingToCart = false;
                return status;
            },
            async buyNow() {
                let status = await this.addToCart('buy');
                //then redirect to checkout
                if (status == 'success') {
                    await useRouter().push({
                        path: makeRelativeLink("/checkout"),
                    });
                }
            },
            addToCompare(product: ProductDetail) {
                let products = this.compareProducts;
                //state.compareProducts = [...state.compareProducts, payload];

                if (this.compareProducts.find((item) => item.id === product.id)) {
                    return;
                }

                if (products.length >= 3) {
                    products.pop();
                }

                products = [product, ...this.compareProducts];

                this.compareProducts = products;
                localStorage.setItem("compareProducts", JSON.stringify(products));
                toast.success("Added to compare list");
            },
            removeFromCompare(product: ProductDetail) {
                if (product) {
                    let filtered = this.compareProducts.filter(
                        (item) => item.id !== product.id
                    );
                    this.compareProducts = filtered;
                    localStorage.setItem("compareProducts", JSON.stringify(filtered));
                }
            },
            async openQuickView(slug: string) {
                this.loading = true;
                this.quickViewModalStatus = true;
                try {
                    const data = await getQuickProduct(slug);
                    this.loading = false;
                    if (!this.loading && data) {
                        this.product = data as ProductDetail;

                        //reset selected variant && quantity
                        this.selectedVariant = null;
                        this.qty = 1;
                        this.loading = false;
                    }
                } catch (e) {
                    this.loading = false;
                }
            },
            closeQuickView() {
                this.quickViewModalStatus = false;
                this.product = null;
            }
        },
    })
}


const productDetailFactory = (() => {
    const commonStore = useCommonStore();
    const type = commonStore.quickProductStatus ? 'product-quick2' : 'product-detail';
    //check if quick product store is open
    return createProductStore(type);
});

export const useProductDetailStore = () => {
    const commonStore = useCommonStore();
    //const { modalStatus } = storeToRefs(commonStore); // Ensure reactivity

    const detailStore = createProductStore('product-detail')();
    const quickStore = createProductStore('product-quick2')();

    const store = computed(() => commonStore.quickProductStatus ? quickStore : detailStore);

    return store.value;
};

//export const useProductDetailStore = productDetailFactory();

export const useProductQuickStore = createProductStore('product-quick');
