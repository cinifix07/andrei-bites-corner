const demoCategories = [
  { id: 1, label: 'Burgers' },
  { id: 2, label: 'Pizza' },
  { id: 3, label: 'Drinks' },
  { id: 4, label: 'Desserts' },
]

const demoItems = [
  { id: 1, product_name: 'Andrei Signature Burger', category_id: 1, description: 'A juicy signature burger stacked with fresh vegetables and our house sauce.', price: 179, created_at: '2026-07-11T10:00:00Z' },
  { id: 2, product_name: 'Loaded Pepperoni Pizza', category_id: 2, description: 'Oven-baked pizza loaded with pepperoni and melted cheese.', price: 299, created_at: '2026-07-10T10:00:00Z' },
  { id: 3, product_name: 'Iced House Tea', category_id: 3, description: 'Cold brewed tea with citrus and a light honey finish.', price: 79, created_at: '2026-07-09T10:00:00Z' },
  { id: 4, product_name: 'Chocolate Dream Cake', category_id: 4, description: 'Rich chocolate cake with a smooth, decadent finish.', price: 149, created_at: '2026-07-08T10:00:00Z' },
]

export async function fetchMenuItemsFromSupabaseTable() {
  return { items: demoItems, error: null }
}

export async function fetchMenuCategoriesFromSupabaseTable() {
  return { categories: demoCategories, error: null }
}
