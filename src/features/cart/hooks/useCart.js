import { useCallback, useState } from 'react';
import { getCart, insertCartItem, deleteCartItem } from '../services/cartService';

export default function useCart() {
  const [cartItems, setCartItems] = useState([]);
  const clearCart = useCallback(() => setCartItems([]), []);
  const loadCart = useCallback(async (userId) => {
    const items = await getCart(userId);
    if (items !== undefined) setCartItems(items);
  }, []);

  const addToCart = async (userId, listing) => {
    if (cartItems.some((item) => item.listing_id === listing.id)) return { alreadyInCart: true };
    const { data, error } = await insertCartItem(userId, listing.id);
    if (error) return { error: error.message };
    setCartItems((current) => [...current, { ...data, listing }]);
    return { added: true };
  };
  const removeFromCart = async (userId, item) => {
    const error = await deleteCartItem(userId, item.id);
    if (!error) setCartItems((current) => current.filter((cartItem) => cartItem.id !== item.id));
    return error;
  };
  return { cartItems, loadCart, clearCart, addToCart, removeFromCart };
}
