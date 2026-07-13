import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { uploadImageToAppsScript } from "./driveUpload";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("addproduct").order("desc").collect();

    return await Promise.all(
      products.map(async (product) => ({
        ...product,
        imageUrl: product.imageUrl || (product.imageStorageId ? await ctx.storage.getUrl(product.imageStorageId) : null),
      })),
    );
  },
});

export const add = mutation({
  args: {
    name: v.string(),
    category: v.string(),
    stock: v.number(),
    price: v.number(),
    imageUrl: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("addproduct", {
      ...args,
      stockUpdatedAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("addproduct"),
    name: v.string(),
    category: v.string(),
    stock: v.number(),
    price: v.number(),
    imageUrl: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const { id, ...product } = args;
    await ctx.db.patch(id, {
      ...product,
      stockUpdatedAt: Date.now(),
    });
  },
});

export const generateImageUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const uploadProductImage = action({
  args: {
    fileBase64: v.string(),
    fileName: v.string(),
    mimeType: v.string(),
  },
  handler: async (_ctx, args) => {
    return await uploadImageToAppsScript(args);
  },
});

export const remove = mutation({
  args: {
    id: v.id("addproduct"),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.id);

    if (product) {
      await ctx.db.insert("archives", {
        source: "addproduct",
        label: product.name,
        deletedAt: Date.now(),
        data: product,
      });
    }

    await ctx.db.delete(args.id);
  },
});

export const checkout = mutation({
  args: {
    items: v.array(
      v.object({
        productId: v.id("addproduct"),
        quantity: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const products = [];

    for (const item of args.items) {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new Error("Checkout quantities must be whole numbers greater than zero.");
      }

      const product = await ctx.db.get(item.productId);

      if (!product) {
        throw new Error("One of the selected products no longer exists.");
      }

      if (product.stock < item.quantity) {
        throw new Error(`${product.name} does not have enough stock.`);
      }

      products.push({ item, product });
    }

    const saleDate = Date.now();

    for (const { item, product } of products) {
      await ctx.db.patch(item.productId, {
        stock: product.stock - item.quantity,
        stockUpdatedAt: saleDate,
      });

      await ctx.db.insert("historysale", {
        date: saleDate,
        productName: product.name,
        eachPrice: product.price,
        totalQty: item.quantity,
        totalPrice: product.price * item.quantity,
      });
    }
  },
});
