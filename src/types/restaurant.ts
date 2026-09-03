export type RestaurantIdentity = {
  name: string;
  logoUrl: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  mapUrl: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  timeZone: string;
  metaDescription: string;
};

export type RestaurantOrderingConfig = {
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  cashPaymentEnabled: boolean;
  deliveryRulesApproved: boolean;
  pickupInstructions: string | null;
  pickupMinimumOrderUsd: string | null;
};

export type RestaurantLaunchConfig = {
  identity: RestaurantIdentity;
  ordering: RestaurantOrderingConfig;
  approvals: {
    hoursApproved: boolean;
    policiesApproved: boolean;
    assetRightsApproved: boolean;
  };
};

export type RestaurantHoursRow = {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
};

export type RestaurantStatus = {
  isOpen: boolean;
  message: string;
};

export type RestaurantPublicProfile = {
  identity: RestaurantIdentity;
  hours: RestaurantHoursRow[];
  status: RestaurantStatus;
};
