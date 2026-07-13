import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    role: v.union(v.literal("admin"), v.literal("user")),
    username: v.string(),
    password: v.string(),
  }).index("by_username", ["username"]),
  addproduct: defineTable({
    name: v.string(),
    category: v.string(),
    stock: v.number(),
    price: v.number(),
    imageUrl: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
    stockUpdatedAt: v.optional(v.number()),
  }),
  profit: defineTable({
    totalProfit: v.number(),
  }),
  historysale: defineTable({
    date: v.number(),
    productName: v.string(),
    eachPrice: v.number(),
    totalQty: v.number(),
    totalPrice: v.number(),
    sourceOrderId: v.optional(v.id("orders")),
    sourceOrderItemId: v.optional(v.string()),
  }),
  orders: defineTable({
    firstName: v.string(),
    lastName: v.string(),
    phoneNumber: v.string(),
    proofOfPaymentPath: v.string(),
    proofOfPaymentUrl: v.optional(v.string()),
    proofOfPaymentStorageId: v.optional(v.id("_storage")),
    items: v.array(
      v.object({
        id: v.string(),
        title: v.string(),
        price: v.number(),
        quantity: v.number(),
        subtotal: v.number(),
      }),
    ),
    totalAmount: v.number(),
    requiredPayment: v.number(),
    pickupBalance: v.number(),
    status: v.string(),
    createdAt: v.number(),
    historyRecordedAt: v.optional(v.number()),
  }).index("by_createdAt", ["createdAt"]),
  archives: defineTable({
    source: v.string(),
    label: v.string(),
    deletedAt: v.number(),
    data: v.any(),
  }),
});
