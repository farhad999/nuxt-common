import {getOffers, getSetting} from "~/apis";
import {defineStore} from "pinia";
import type {Branch, Offer, Setting} from "~/types";
import {getBranches} from '~/apis'
import {useProductDetailStore} from "~/store/productDetailStore";

interface CommonState {
    settings: null | Setting,
    offers: Array<Offer>,
    sidebarStatus: boolean,
    branchModalStatus: boolean,
    selectedBranchId: null | number,
    showPopupSearch: boolean,
    branches: Branch[],
    quickProductStatus: boolean,
    searchDropdownStatus: boolean,
}

export const useCommonStore = defineStore('common', {
    state: () => {
        const state: CommonState = {
            settings: null, /*{
                location_id: 1,
                inside_dhaka: 0,
                outside_dhaka: 0,
                inside_dhaka_per_kg: 0,
                outside_dhaka_per_kg: 0,
                minimum_order_total: 0,
                cart_hold_time: 30,
                advance_payment: false,
                advance_amount: 0,
                allow_overselling: false,
                reward_point: null,
            }*/
            offers: [],
            sidebarStatus: false,
            branchModalStatus: false,
            selectedBranchId: null,
            // selectedProduct: null,
            showPopupSearch: false,
            branches: [],
            quickProductStatus: false,
            searchDropdownStatus: false,
        }
        return state;
    },
    getters: {
        getOfferBySlug(state) {
            return (slug: string) => {
                return state.offers.find((item) => {
                    return item.slug === slug
                })
            }
        },
        selectedBranch(state) {
            let branch = null;
            if (state.branches.length) {
                branch = state.branches.find(item => item.id == Number(state.selectedBranchId));
            }
            return branch;
        }
    },
    actions: {
        async getOffers() {
            try {
                this.offers = await getOffers();
            } catch (e) {
                console.log('error', e);
            }
        },
        async getSettings() {
            let {data, error, status} = await getSetting();
            //console.log({data, error})

            if (error.value) {
                throw createError({
                    statusCode: 500,
                    statusMessage: 'Failed to load application settings',
                    data: {error: error.value.message},
                });
            }

            if (status.value == 'success') {
                this.settings = data.value;
            }
        },
        async getBranches() {
            const {data, error} = await getBranches();
            if (data.value) {
                this.branches = data.value;
            }
        },
        toggleSidebar(value?: boolean) {
            if (value === undefined) {
                this.sidebarStatus = !this.sidebarStatus
                return;
            }
            this.sidebarStatus = value
        },
        toggleBranchStatus(value?: boolean) {
            if (value === undefined) {
                this.branchModalStatus = !this.branchModalStatus;
                return;
            }
            this.branchModalStatus = value;
        },
        setBranchSelection(value: number) {
            this.selectedBranchId = value;
            this.branchModalStatus = false;
        },
        togglePopupSearch() {
            this.showPopupSearch = !this.showPopupSearch;
        },
        async openQuickViewModal(slug: string) {
            this.quickProductStatus = true;
            await useProductDetailStore().getProduct(slug)
        },
        closeQuickViewModal() {
            this.quickProductStatus = false;
        },
        toggleSearchDropdown(value?: boolean) {
            if (value === undefined) {
                this.searchDropdownStatus = !this.searchDropdownStatus;
                return;
            }
            this.searchDropdownStatus = value;
        },
    },
})