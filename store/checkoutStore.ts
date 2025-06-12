import {defineStore} from "pinia";
import {useCommonStore} from "~/store/commonStore";
import {useCartStore} from "~/store/cartStore";
import {useAuthStore} from "~/store/authStore";
import {toast} from "vue3-toastify";
import {checkCoupon, getGiftCardInfo, postOrder} from "~/apis";
import type {CartItemDetail, DeliveryLocation, Address} from "~/types";
import {handlePayment} from "~/utils/functions/handlePayment";
import {appConfig} from "~/configs/app.config";
import {apiClient} from "~/libs/apiClient";
import {networkError} from "~/utils/networkError";

interface PaymentMethod {
    label: string,
    value: string
}

interface Coupon {
    discount: null | number,
    shipping_charge_discount: null | number
}

interface CheckoutState {
    loading: boolean,
    loginOpened: boolean,
    codeOpened: boolean,
    accountOpened: boolean,
    addressOpened: boolean,
    deliveredTo: 'inside_dhaka' | 'outside_dhaka' | 'store_pickup' | 'pickup_location',
    selectedAddressId: null | number,
    selectedAreaId: null | number,
    selectedPayment: string,
    giftCardNumber: string,
    giftCard: null | {
        balance: number,
    },
    gift_amount: number,
    rewardPoint: number,
    appliedRewardPoint: number,
    redeemedAmount: number,
    paymentMethods: Array<PaymentMethod>,
    points: number,
    deliveryCharge: number,
    couponCode: string,
    couponApplied: null | Coupon,
    processingOrder: boolean,
    processingPayment: boolean,
    addressData: any,
    deliveryLocations: Array<{
        value: string,
        title: string,
    }>
}

export const useCheckoutStore = defineStore('checkout', {
    state: () => {
        const state: CheckoutState = {
            loading: false,
            loginOpened: false,
            codeOpened: false,
            accountOpened: false,
            addressOpened: false,
            deliveredTo: 'inside_dhaka',
            selectedAddressId: null,
            selectedAreaId: null,
            selectedPayment: 'cod',
            giftCardNumber: '',
            giftCard: null,
            gift_amount: 0,
            rewardPoint: 0,
            appliedRewardPoint: 0,
            redeemedAmount: 0,
            paymentMethods: [
                {
                    label: 'Cash On Delivery',
                    value: 'cod',
                },
                {
                    label: 'Bkash',
                    value: 'bkash',
                },
                {
                    label: 'Pay via SSLCommerz',
                    value: 'ssl',
                },
            ],
            points: 0,
            deliveryCharge: 0,
            couponCode: '',
            couponApplied: null,
            processingOrder: false,
            processingPayment: false,
            addressData: {},
            deliveryLocations: [
                {
                  'value': 'store_pickup',
                  'title': 'Store Pickup'
                },
                {
                    value: 'home_delivery',
                    title: 'Home Delivery'
                },
                {
                    value: 'pickup_location',
                    title: 'Pickup Location'
                },
                /*{
                    value: 'inside_dhaka',
                    title: 'Inside Dhaka'
                },
                {
                    value: 'outside_dhaka',
                    title: 'Outside Dhaka',
                }*/
            ],

        }
        return state;
    },
    getters: {
        shippingCharge(state) {
            const commonStore = useCommonStore();
            const {settings} = commonStore;

            if (!settings) {
                return 0;
            }

            //check if shipping Location is enabled
            if (appConfig.enableShippingLocation) {
                return 0;
            }

            if (state.deliveredTo === 'inside_dhaka') {
                return settings.inside_dhaka || 0;
            } else if (state.deliveredTo === 'outside_dhaka') {
                return settings.outside_dhaka || 0;
            } else {
                return 0;
            }
        },
        extraShippingCharge(state) {
            const {settings} = useCommonStore();

            if (!settings) {
                return 0;
            }

            //check for extra weight greater than 1kg
            let extraWeight = useCartStore().totalShippingWeight - 1000;
            if (extraWeight < 0) {
                return 0;
            }

            if (state.deliveredTo === 'inside_dhaka') {
                return (extraWeight * settings.inside_dhaka_per_kg) / 1000;
            } else if (state.deliveredTo === 'outside_dhaka') {
                return (
                    (extraWeight * settings.outside_dhaka_per_kg) / 1000
                );
            } else {
                return 0;
            }
        },
        totalAmount() {
            const {totalPrice} = useCartStore();
            return totalPrice + this.shippingCharge + this.extraShippingCharge
        }
    },
    actions: {
        isActiveAddress(address: Address) {
            return this.selectedAddressId === address.id;
        },
        async applyRewardPoint(rewardPoint: number) {

            const {settings} = useCommonStore();
            const {user} = useAuthStore();

            if (!settings) {
                toast.error("Setting not found");
                return;
            }

            const rewardPointSetting = settings.reward_point;
            let userRp = user ? user.total_rp : 0;

            if (rewardPoint > userRp) {
                return toast.error("You don't have enough Reward Point")
            }

            if (!rewardPointSetting) {
                return;
            }

            if (rewardPointSetting.min_redeem_point && rewardPointSetting.min_redeem_point > rewardPoint) {
                return toast.error(`Your reward point has to be greater than ${rewardPointSetting.min_redeem_point}`);
            }

            if (rewardPointSetting.max_redeem_point && rewardPointSetting.max_redeem_point < rewardPoint) {
                return toast.error(`Your reward point has to be less than ${rewardPointSetting.min_redeem_point}`)
            }

            this.appliedRewardPoint = rewardPoint

            this.redeemedAmount = rewardPointSetting.amount_for_unit_rp * rewardPoint

        },
        async placeOrder() {

            this.loading = true;

            let payloadData = {};

            /*if (!isAddressFormValidated && !selectedAddress.value) {
              loading.value = false;
              //message.value = 'Please select an address';
              return null;
            }*/

            if (appConfig.enableCustomDeliveryLocation) {
                if (!this.selectedAreaId && this.deliveredTo === 'pickup_location') {
                    this.loading = false;
                    toast.error('Please select an Pickup point');
                    return;
                }
            }

            if (this.giftCard) {
                //check if balance is valid
                if (Number(this.gift_amount) > Number(this.giftCard.balance)) {
                    //then show toast
                    toast.error('Gift Card Amount must be less than or equal to Gift Card Balance');
                    return;
                }

                payloadData = {
                    gc_payment_amount: 220,
                    gc_card_no: '123456',
                    has_gift_card: true,
                };
            }

            this.processingOrder = true;

            //check if user is logged in

            if (!useAuthStore().isLoggedIn) {
                payloadData = {
                    ...payloadData,
                    is_guest: true
                }
            }

            payloadData = {
                ...payloadData,
                address_id: this.selectedAddressId,
                items: useCartStore().cartItems.map((item) => ({
                    product_id: item.id,
                    variation_id: item.variation_id,
                    quantity: item.quantity,
                })),
                delivered_to: this.deliveredTo,
                shipping_note: '',
                source: 'website',
                payment_method: this.selectedPayment,
                rp_redeemed: this.appliedRewardPoint,
                coupon_code: this.couponCode,
                address: this.addressData,
                pickup_location_id: this.selectedAreaId
            };

            //await postOrder(payloadData)

            try {

                const data = await postOrder(payloadData);

                if (!data) {
                    return;
                }

                if (data.status === 'Error') {
                    //this.message = data.message;
                    this.loading = false;
                    let msg = '';

                    if (Array.isArray(data.message)) {
                        msg = data.message[0].message;
                    } else {
                        msg = data.message;
                    }

                    this.processingOrder = false;

                } else {

                    /*this.$gtm.push({
                      content_type: 'Product',
                      currency: 'BDT',
                      value: this.totalAmount,
                      content_name: this.cartItems.map((item) => {
                        return item.name
                      }),
                      content_ids: this.cartItems.map((item) => {
                        return item.id
                      }),
                      event: 'Purchase',
                    })*/

                    toast.success('Your order has been placed successfully');

                    useCartStore().removeAll();

                    // handle ssl payment
                    // eslint-disable-next-line no-lonely-if

                    if (this.selectedPayment !== 'cod') {

                        this.processingPayment = true;

                        let paymentData = await handlePayment(this.selectedPayment, data.orderId);

                        if (!paymentData) {
                            toast.error('Something went wrong while processing payment. Please try again');
                            return;
                        }

                        //order successful

                        if (paymentData.status == 'error') {
                            toast.success('Your order has been placed but payment was unsuccessful. You can pay later from your orders page');
                            this.loading = false;
                            await useRouter().push('/account/orders');
                        }

                        this.processingPayment = false;

                    } else {
                        this.loading = false;
                        await useRouter().push('/order-success');
                    }
                }
            } catch
                (err: any) {

                this.loading = false;
                this.processingOrder = false;

                //message = err.message;

                toast.error(err.message);
            }
        },
        async applyCoupon() {

            const payloadData = {
                address_id: this.selectedAddressId,
                items: useCartStore().cartItems.map((item: CartItemDetail) => ({
                    product_id: item.id,
                    variation_id: item.variation_id,
                    quantity: item.quantity,
                })),
                delivered_to: this.deliveredTo,
                shipping_note: '',
                source: 'website',
                payment_method: this.selectedPayment,
                coupon_code: this.couponCode,
            };

            try {
                let {status, message, ...rest} = await checkCoupon(payloadData);

                if (status === 'Success') {
                    toast.success(message);
                    this.couponApplied = rest;
                } else {
                    toast.error(message);
                }

            } catch (e) {
                toast.error('something went wrong');
                console.log(e);
            }

        },
        checkGiftCard() {

            getGiftCardInfo(this.giftCardNumber)
                .then((data) => {
                    let {status} = data;

                    if (status === 'Success') {
                        this.giftCard = data.data;
                        this.gift_amount = 0;
                    } else {
                        this.giftCard = null;
                    }
                })
                .catch((er) => console.log(er));
        },
        setSelectedAddress(val: number) {
            this.selectedAddressId = val;
        },
        setDeliveredTo(deliveredTo: DeliveryLocation) {
            this.deliveredTo = deliveredTo;
        }
    }
})