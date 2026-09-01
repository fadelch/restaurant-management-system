"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  CartCustomization,
  CartItem,
  FoodItem,
} from "@/types";
import { showMessage } from "@/components/MessageProvider";
import { normalizeOptionalIngredients } from "@/lib/foodOptions";
import { getCurrentSession } from "@/server/authActions";
import { addUsdAmounts, multiplyUsd } from "@/lib/currency";

export type { CartCustomization, CartItem } from "@/types";

type CartContextType = {
  cartItems: CartItem[];
  cartCount: number;
  cartTotal: number;
  addToCart: (
    food: FoodItem,
    customization?: Partial<CartCustomization>,
  ) => Promise<boolean>;
  increaseCartItem: (cartKey: string) => void;
  updateCartItemCustomization: (
    cartKey: string,
    customization: Partial<CartCustomization>,
  ) => void;
  removeFromCart: (cartKey: string) => void;
  decreaseCartItem: (cartKey: string) => void;
  clearCart: () => void;
  reorderItems: (
    items: {
      food: FoodItem;
      quantity: number;
      extraCheese?: boolean;
      removedIngredients?: string[];
      addedIngredients?: unknown;
      customizationNote?: string | null;
    }[],
  ) => boolean;
};

const CartContext = createContext<CartContextType | null>(null);

function normalizeCustomization(
  customization: Partial<CartCustomization> = {},
): CartCustomization {
  return {
    extraCheese: Boolean(customization.extraCheese),
    removedIngredients: [
      ...new Set(customization.removedIngredients || []),
    ].sort(),
    addedIngredients: normalizeOptionalIngredients(
      customization.addedIngredients,
    ).sort((first, second) => first.name.localeCompare(second.name)),
    customizationNote:
      customization.customizationNote?.trim().slice(0, 300) || "",
  };
}

function cartKey(foodId: string, customization: CartCustomization) {
  return [
    foodId,
    customization.extraCheese ? "cheese" : "regular",
    customization.removedIngredients.join("|"),
    customization.addedIngredients.map((option) => option.name).join("|"),
    customization.customizationNote,
  ].join("::");
}

function buildCartItem(
  food: FoodItem,
  quantity: number,
  customization?: Partial<CartCustomization>,
): CartItem {
  const normalized = normalizeCustomization(customization);
  return {
    ...food,
    cartKey: cartKey(food.id, normalized),
    cartQty: quantity,
    unitPrice: addUsdAmounts([
      food.price,
      normalized.extraCheese ? food.extraCheesePrice || 0 : 0,
      ...normalized.addedIngredients.map((option) => option.price),
    ]),
    customization: normalized,
  };
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const savedCart = localStorage.getItem("cartItems");
    if (!savedCart) return;
    try {
      const parsed = JSON.parse(savedCart) as Array<
        Partial<CartItem> & FoodItem
      >;
      setCartItems(
        parsed
          .filter((item) => item.id && item.cartQty && item.cartQty > 0)
          .map((item) =>
            buildCartItem(item, item.cartQty || 1, item.customization),
          ),
      );
    } catch {
      localStorage.removeItem("cartItems");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("cartItems", JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = async (
    food: FoodItem,
    customization?: Partial<CartCustomization>,
  ) => {
    const session = await getCurrentSession();
    if (!session) {
      showMessage("Please log in before adding food to your cart.");
      const nextPath =
        window.location.pathname === "/"
          ? "/#menu"
          : `${window.location.pathname}${window.location.hash}`;
      router.push(`/login?next=${encodeURIComponent(nextPath)}`);
      return false;
    }

    if (food.qty <= 0) {
      showMessage("This item is out of stock.");
      return false;
    }

    const totalFoodQuantity = cartItems
      .filter((item) => item.id === food.id)
      .reduce((total, item) => total + item.cartQty, 0);
    if (totalFoodQuantity >= food.qty) {
      showMessage(`Only ${food.qty} item(s) available in stock.`);
      return false;
    }

    const nextItem = buildCartItem(food, 1, customization);
    setCartItems((current) => {
      const existing = current.find(
        (item) => item.cartKey === nextItem.cartKey,
      );
      if (existing) {
        return current.map((item) =>
          item.cartKey === nextItem.cartKey
            ? { ...item, cartQty: item.cartQty + 1 }
            : item,
        );
      }
      return [...current, nextItem];
    });
    return true;
  };

  const increaseCartItem = (key: string) => {
    setCartItems((current) => {
      const selected = current.find((item) => item.cartKey === key);
      if (!selected) return current;
      const totalFoodQuantity = current
        .filter((item) => item.id === selected.id)
        .reduce((total, item) => total + item.cartQty, 0);
      if (totalFoodQuantity >= selected.qty) {
        showMessage(`Only ${selected.qty} item(s) available in stock.`);
        return current;
      }
      return current.map((item) =>
        item.cartKey === key ? { ...item, cartQty: item.cartQty + 1 } : item,
      );
    });
  };

  const decreaseCartItem = (key: string) => {
    setCartItems((current) =>
      current
        .map((item) =>
          item.cartKey === key ? { ...item, cartQty: item.cartQty - 1 } : item,
        )
        .filter((item) => item.cartQty > 0),
    );
  };

  const removeFromCart = (key: string) => {
    setCartItems((current) => current.filter((item) => item.cartKey !== key));
  };

  const updateCartItemCustomization = (
    key: string,
    customization: Partial<CartCustomization>,
  ) => {
    setCartItems((current) => {
      const selected = current.find((item) => item.cartKey === key);
      if (!selected) return current;
      const updated = buildCartItem(selected, selected.cartQty, customization);
      const duplicate = current.find(
        (item) => item.cartKey === updated.cartKey && item.cartKey !== key,
      );
      if (duplicate) {
        return current
          .filter((item) => item.cartKey !== key)
          .map((item) =>
            item.cartKey === duplicate.cartKey
              ? { ...item, cartQty: item.cartQty + selected.cartQty }
              : item,
          );
      }
      return current.map((item) => (item.cartKey === key ? updated : item));
    });
  };

  const clearCart = () => {
    setCartItems([]);
    localStorage.removeItem("cartItems");
  };

  const reorderItems: CartContextType["reorderItems"] = (items) => {
    const availableItems = items
      .filter((item) => item.food.qty > 0 && item.quantity > 0)
      .map((item) =>
        buildCartItem(item.food, Math.min(item.quantity, item.food.qty), {
          extraCheese: item.extraCheese,
          removedIngredients: item.removedIngredients,
          addedIngredients: normalizeOptionalIngredients(item.addedIngredients),
          customizationNote: item.customizationNote || "",
        }),
      );
    if (!availableItems.length) {
      showMessage("None of the foods in this order are currently available.");
      return false;
    }
    setCartItems(availableItems);
    showMessage("Available order items were added to your cart.");
    return true;
  };

  const cartCount = useMemo(
    () => cartItems.reduce((total, item) => total + item.cartQty, 0),
    [cartItems],
  );
  const cartTotal = useMemo(
    () =>
      addUsdAmounts(
        cartItems.map((item) => multiplyUsd(item.unitPrice, item.cartQty)),
      ),
    [cartItems],
  );

  return (
    <CartContext.Provider
      value={{
        cartItems,
        cartCount,
        cartTotal,
        addToCart,
        increaseCartItem,
        updateCartItemCustomization,
        removeFromCart,
        decreaseCartItem,
        clearCart,
        reorderItems,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
