/* global process */
import { action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { defaultProofPaymentFolderId, uploadImageToAppsScript } from "./driveUpload";

function bytesToBase64(bytes) {
  let binary = "";
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return btoa(binary);
}

function sanitizeFileName(fileName) {
  return fileName.replace(/[^\w.-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || `image-${Date.now()}`;
}

async function copyUrlToDrive({ sourceUrl, fileName, folderId }) {
  const sourceResponse = await fetch(sourceUrl);

  if (!sourceResponse.ok) {
    throw new Error(`Unable to read source image: ${sourceResponse.status}`);
  }

  const mimeType = sourceResponse.headers.get("content-type") || "image/png";
  const bytes = new Uint8Array(await sourceResponse.arrayBuffer());

  return await uploadImageToAppsScript({
    fileBase64: bytesToBase64(bytes),
    fileName: sanitizeFileName(fileName),
    mimeType,
    folderId,
  });
}

export const productsNeedingMigration = internalQuery({
  args: {
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const products = await ctx.db.query("addproduct").collect();
    const needingMigration = products.filter((product) => product.imageStorageId && !product.imageUrl).slice(0, args.limit);

    return await Promise.all(
      needingMigration.map(async (product) => ({
        id: product._id,
        name: product.name,
        sourceUrl: await ctx.storage.getUrl(product.imageStorageId),
      })),
    );
  },
});

export const ordersNeedingMigration = internalQuery({
  args: {
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const orders = await ctx.db.query("orders").collect();
    const needingMigration = orders.filter((order) => order.proofOfPaymentStorageId && !order.proofOfPaymentUrl).slice(0, args.limit);

    return await Promise.all(
      needingMigration.map(async (order) => ({
        id: order._id,
        name: `${order.firstName}-${order.lastName}-${order.createdAt}`,
        sourceUrl: await ctx.storage.getUrl(order.proofOfPaymentStorageId),
      })),
    );
  },
});

export const setProductImageUrl = internalMutation({
  args: {
    id: v.id("addproduct"),
    imageUrl: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { imageUrl: args.imageUrl });
  },
});

export const setOrderProofUrl = internalMutation({
  args: {
    id: v.id("orders"),
    proofOfPaymentUrl: v.string(),
    proofOfPaymentPath: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      proofOfPaymentUrl: args.proofOfPaymentUrl,
      proofOfPaymentPath: args.proofOfPaymentPath,
    });
  },
});

export const migrateStorageImagesToDrive = action({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(args.limit ?? 20, 50));
    const products = await ctx.runQuery(internal.migrateImages.productsNeedingMigration, { limit });
    const orders = await ctx.runQuery(internal.migrateImages.ordersNeedingMigration, { limit });
    const result = {
      products: { migrated: 0, failed: 0 },
      orders: { migrated: 0, failed: 0 },
      failures: [],
    };

    for (const product of products) {
      try {
        if (!product.sourceUrl) throw new Error("Product source image URL is unavailable.");

        const uploaded = await copyUrlToDrive({
          sourceUrl: product.sourceUrl,
          fileName: `product-${product.name}-${product.id}.png`,
        });

        await ctx.runMutation(internal.migrateImages.setProductImageUrl, {
          id: product.id,
          imageUrl: uploaded.url,
        });
        result.products.migrated += 1;
      } catch (error) {
        result.products.failed += 1;
        result.failures.push({
          type: "product",
          id: product.id,
          message: error instanceof Error ? error.message : "Unknown migration error.",
        });
      }
    }

    for (const order of orders) {
      try {
        if (!order.sourceUrl) throw new Error("Order proof source image URL is unavailable.");

        const uploaded = await copyUrlToDrive({
          sourceUrl: order.sourceUrl,
          fileName: `proof-${order.name}-${order.id}.png`,
          folderId: process.env.GOOGLE_DRIVE_PROOF_FOLDER_ID || defaultProofPaymentFolderId,
        });

        await ctx.runMutation(internal.migrateImages.setOrderProofUrl, {
          id: order.id,
          proofOfPaymentUrl: uploaded.url,
          proofOfPaymentPath: uploaded.url,
        });
        result.orders.migrated += 1;
      } catch (error) {
        result.orders.failed += 1;
        result.failures.push({
          type: "order",
          id: order.id,
          message: error instanceof Error ? error.message : "Unknown migration error.",
        });
      }
    }

    return result;
  },
});
