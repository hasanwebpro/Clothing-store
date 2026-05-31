/**
 * CartContext — global cart state.
 *
 * DESIGN PATTERN: Observer
 * CartContext is the Subject. Components subscribed via useCart() are Observers.
 * When dispatch() is called (ADD_ITEM, REMOVE_ITEM, etc.), ALL observers
 * (Navbar badge, CartDrawer, CartPage, CheckoutPage) re-render automatically.
 *
 * SDA Note: This is how React implements the Observer pattern natively.
 * There is no need for a separate event bus — Context IS the event bus.
 */
import { createContext, useContext, useReducer, useEffect } from 'react';
import { cartApi } from '../api/cart.api';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

function cartReducer(state, action) {
  switch (action.type) {
    case 'SET_CART':
      return { ...state, ...action.payload, isLoading: false };

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'ADD_ITEM': {
      const existing = state.items.find(i => i.variant === action.payload.variant);
      if (existing) {
        return {
          ...state,
          items: state.items.map(i =>
            i.variant === action.payload.variant
              ? { ...i, quantity: i.quantity + action.payload.quantity }
              : i,
          ),
        };
      }
      return { ...state, items: [...state.items, action.payload] };
    }

    case 'UPDATE_ITEM':
      return {
        ...state,
        items: action.payload.quantity === 0
          ? state.items.filter(i => i.id !== action.payload.id)
          : state.items.map(i =>
              i.id === action.payload.id ? { ...i, quantity: action.payload.quantity } : i,
            ),
      };

    case 'REMOVE_ITEM':
      return { ...state, items: state.items.filter(i => i.id !== action.payload) };

    case 'APPLY_COUPON':
      return { ...state, coupon_code: action.payload.code, totals: action.payload.totals };

    case 'REMOVE_COUPON':
      return { ...state, coupon_code: null };

    case 'CLEAR_CART':
      return { ...initialState, isLoading: false };

    default:
      return state;
  }
}

const initialState = {
  items: [],
  coupon_code: null,
  isLoading: false,
  totals: { subtotal: 0, discount_amount: 0, total: 0 },
};

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);
  const { isAuthenticated } = useAuth();

  // Fetch cart from server when user logs in
  useEffect(() => {
    if (isAuthenticated) {
      fetchCart();
    } else {
      dispatch({ type: 'CLEAR_CART' });
    }
  }, [isAuthenticated]);

  const fetchCart = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const { data } = await cartApi.getCart();
      dispatch({ type: 'SET_CART', payload: data });
    } catch (_) {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const addItem = async (variantId, quantity = 1) => {
    const { data } = await cartApi.addItem(variantId, quantity);
    dispatch({ type: 'SET_CART', payload: data });
  };

  const updateItem = async (itemId, quantity) => {
    const { data } = await cartApi.updateItem(itemId, quantity);
    dispatch({ type: 'SET_CART', payload: data });
  };

  const removeItem = async (itemId) => {
    const { data } = await cartApi.removeItem(itemId);
    dispatch({ type: 'SET_CART', payload: data });
  };

  const applyCoupon = async (code) => {
    const { data } = await cartApi.applyCoupon(code);
    dispatch({ type: 'APPLY_COUPON', payload: { code, totals: data.totals } });
    return data;
  };

  const removeCoupon = async () => {
    await cartApi.removeCoupon();
    dispatch({ type: 'REMOVE_COUPON' });
  };

  const clearCart = () => dispatch({ type: 'CLEAR_CART' });

  const itemCount = state.items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{
      ...state,
      cart: state,
      itemCount,
      fetchCart,
      refreshCart: fetchCart,
      clearCart,
      addItem,
      updateItem,
      removeItem,
      applyCoupon,
      removeCoupon,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
};
