export type User = {
  id: string;
  name: string | null;
  email: string | null;
  password?: string | null;
  confirm_password?: string | null;
  isAdmin: boolean;
  isBanned?: boolean;
  createdAt: string | Date;
  orders?: { id: string }[];
};
export type FoodType = {
  id: string;
  name: string;
  createdAt?: string | Date;
};

export type FoodItem = {
  id: string;
  name: string;
  description?: string | null;
  ingredients?: string[];
  optionalIngredients?: unknown;
  extraCheesePrice?: number;
  price: number;
  qty: number;
  minStock?: number;
  image?: string | null;
  createdAt?: string | Date;
  typeId: string;
  type?: FoodType | null;
  orderItems?: (Partial<OrderItem> & { id: number })[];
  isFavorite?: boolean;
  popularity?: number;
};

export type Order = {
  id: string;
  orderNumber?: string | null;
  userId: string;
  total: number;
  subtotal?: number;
  deliveryFee?: number;
  discountAmount?: number;
  couponCode?: string | null;
  deliveryZoneId?: string | null;
  status: string;
  stockReturned?: boolean;
  customerName?: string | null;
  customerPhone?: string | null;
  fulfillmentType?: string;
  paymentMethod?: string | null;
  paymentCode?: string | null;
  paymentStatus?: string;
  refundedAmount?: number;
  customerAddress?: string | null;
  mapLocation?: string | null;
  orderNotes?: string | null;
  estimatedReadyAt?: string | Date | null;
  createdAt?: string | Date;
  user?: User | null;
  items?: OrderItem[];
  issueReports?: FoodIssueReport[];
};

export type OrderItem = {
  id: number;
  orderId: string;
  foodId: string;
  quantity: number;
  price: number;
  extraCheese?: boolean;
  removedIngredients?: string[];
  addedIngredients?: unknown;
  customizationNote?: string | null;
  order?: Order | null;
  food?: FoodItem | null;
  issueReports?: FoodIssueReport[];
};

export type FoodIssueReport = {
  id: string;
  orderId: string;
  orderItemId: number;
  userId: string;
  reason: string;
  details: string;
  quantity: number;
  status: string;
  refundAmount: number;
  createdAt: string | Date;
  updatedAt: string | Date;
  resolvedAt?: string | Date | null;
  order?: Order;
  orderItem?: OrderItem;
  user?: User;
};
