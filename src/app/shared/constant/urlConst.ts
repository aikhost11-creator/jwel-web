import { environment } from "../environment/environment";

export let urlConstant: any = {};

export function rebuildUrlConstant() {
  urlConstant = {
    SiteConfigAPI: {
      getSiteConfig: environment.APIUrl + 'siteconfig/getSiteconfig',
      getForUi:      environment.APIUrl + 'siteconfig/getForUi',
    },
    ProductAPI: {
      getProducts: environment.APIUrl + 'product/getProducts',
      getFeaturedProducts: environment.APIUrl + 'product/getFeaturedProducts',
      getProduct: environment.APIUrl + 'product/getProduct/',
      getRelated: environment.APIUrl + 'product/getRelated',
      getReviews: environment.APIUrl + 'product/getReviews/',
      addReview: environment.APIUrl + 'product/addReview/',
    },
    CustomerAPI: {
      profile:  environment.APIUrl + 'customer/profile',
    },
    CustomerAddressAPI: {
      base: environment.APIUrl + 'customer-address',
    },
    PaymentSettingsAPI: {
      getPublic: environment.APIUrl + 'payment-settings/public',
      phonePeInitiate: environment.APIUrl + 'payment-settings/phonepe/initiate',
      phonePeVerify:   environment.APIUrl + 'payment-settings/phonepe/verify/',
    },
    OrderAPI: {
      createOrder: environment.APIUrl + 'orders/createOrder',
      getByCustomer: environment.APIUrl + 'orders/getByCustomer/',
      getById: environment.APIUrl + 'orders/getById/',
    },
    AbandonCheckoutAPI: {
      upsert: environment.APIUrl + 'abandon-checkout/upsert',
    },
    LegalPagesAPI: {
      getBySlug: environment.APIUrl + 'legal/get/',
    },
    HomeBannerAPI: {
      getActiveBanners: environment.APIUrl + 'homebanner/getActiveBanners',
    },
    HomeSlotAPI: {
      getActive: environment.APIUrl + 'homeslot/getActive',
    },
    ReelsAPI: {
      getActive: environment.APIUrl + 'reels/getActive',
    },
    CategoryAPI: {
      getPublicCategories: environment.APIUrl + 'category/getPublicCategories',
    },
    PromoBannerAPI: {
      getActive: environment.APIUrl + 'promo-banner/getActive',
    },
    FaqAPI: {
      preview: environment.APIUrl + 'faq/preview',
      public: environment.APIUrl + 'faq/public',
      config: environment.APIUrl + 'faq/config',
    },
  };
}

rebuildUrlConstant();
