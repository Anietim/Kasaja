import { useState, useEffect } from 'react'

export interface CartItem {
  id: string
  product_id: string
  title: string
  price: number
  image: string
  quantity: number
  store_id: string
  store_name: string
  owner_id?: string
}

const CART_KEY = 'kasaja_cart'

function readCart(): CartItem[] {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) ?? '[]') as CartItem[]
  } catch {
    return []
  }
}

function writeCart(items: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(items))
}

// Simple event bus for cart updates across components
const listeners = new Set<() => void>()
function notify() { listeners.forEach(fn => fn()) }

export function useCart() {
  const [items, setItems] = useState<CartItem[]>(readCart)

  useEffect(() => {
    const refresh = () => setItems(readCart())
    listeners.add(refresh)
    return () => { listeners.delete(refresh) }
  }, [])

  const add = (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => {
    const cart = readCart()
    const idx = cart.findIndex(c => c.product_id === item.product_id)
    if (idx >= 0) {
      cart[idx].quantity += item.quantity ?? 1
    } else {
      cart.push({ ...item, quantity: item.quantity ?? 1 })
    }
    writeCart(cart)
    notify()
  }

  const remove = (product_id: string) => {
    writeCart(readCart().filter(c => c.product_id !== product_id))
    notify()
  }

  const updateQty = (product_id: string, qty: number) => {
    if (qty <= 0) { remove(product_id); return }
    const cart = readCart()
    const idx = cart.findIndex(c => c.product_id === product_id)
    if (idx >= 0) { cart[idx].quantity = qty; writeCart(cart); notify() }
  }

  const clear = () => { writeCart([]); notify() }

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const count = items.reduce((sum, i) => sum + i.quantity, 0)

  return { items, add, remove, updateQty, clear, total, count }
}

/* ───── Cart panel open/close (shared across the app) ───── */
let panelOpen = false
const panelListeners = new Set<(o: boolean) => void>()
export function openCart() { panelOpen = true; panelListeners.forEach(f => f(true)) }
export function closeCart() { panelOpen = false; panelListeners.forEach(f => f(false)) }
export function useCartPanel() {
  const [open, setOpen] = useState(panelOpen)
  useEffect(() => {
    panelListeners.add(setOpen)
    setOpen(panelOpen)
    return () => { panelListeners.delete(setOpen) }
  }, [])
  return { open, openCart, closeCart }
}
