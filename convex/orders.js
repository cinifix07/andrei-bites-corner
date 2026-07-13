/* global process */
import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { defaultProofPaymentFolderId, uploadImageToAppsScript } from "./driveUpload";

function base64UrlEncode(input) {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function pemToArrayBuffer(pem) {
  const normalized = pem.replace(/\\n/g, "\n");
  const base64 = normalized
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");

  return base64ToBytes(base64).buffer;
}

function concatBytes(parts) {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;

  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }

  return output;
}

async function getGoogleAccessToken() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    throw new Error("Google Drive service account is not configured in Convex env.");
  }

  const now = Math.floor(Date.now() / 1000);
  const unsignedJwt = [
    base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" })),
    base64UrlEncode(JSON.stringify({
      iss: clientEmail,
      scope: "https://www.googleapis.com/auth/drive.file",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    })),
  ].join(".");
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(privateKey),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(unsignedJwt),
  );
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsignedJwt}.${base64UrlEncode(new Uint8Array(signature))}`,
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error("Google Drive authentication failed.");
  }

  const token = await tokenResponse.json();
  return token.access_token;
}

async function uploadToDrive({ fileBase64, fileName, mimeType }) {
  const appsScriptUploadUrl = process.env.GOOGLE_APPS_SCRIPT_UPLOAD_URL;
  const folderId = process.env.GOOGLE_DRIVE_PROOF_FOLDER_ID || defaultProofPaymentFolderId;

  if (appsScriptUploadUrl) {
    return await uploadImageToAppsScript({ fileBase64, fileName, mimeType, folderId });
  }

  const accessToken = await getGoogleAccessToken();
  const boundary = `convex-drive-${Date.now()}`;
  const encoder = new TextEncoder();
  const metadata = JSON.stringify({
    name: fileName,
    parents: [folderId],
  });
  const body = concatBytes([
    encoder.encode(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`),
    encoder.encode(`--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`),
    base64ToBytes(fileBase64),
    encoder.encode(`\r\n--${boundary}--`),
  ]);
  const driveResponse = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  );

  if (!driveResponse.ok) {
    throw new Error("Unable to upload proof of payment to Google Drive.");
  }

  const file = await driveResponse.json();
  return {
    fileId: file.id,
    path: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`,
    name: file.name,
  };
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const orders = await ctx.db.query("orders").order("desc").collect();

    return await Promise.all(
      orders.map(async (order) => ({
        ...order,
        proofOfPaymentUrl: order.proofOfPaymentUrl || (order.proofOfPaymentStorageId
          ? await ctx.storage.getUrl(order.proofOfPaymentStorageId)
          : null),
      })),
    );
  },
});

export const create = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("orders", {
      ...args,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

export const generateProofUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const accept = mutation({
  args: {
    id: v.id("orders"),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.id);

    if (!order) {
      throw new Error("Order no longer exists.");
    }

    if (!order.historyRecordedAt) {
      const saleDate = Date.now();
      const sales = await ctx.db.query("historysale").collect();

      for (const item of order.items) {
        const saleAlreadyRecorded = sales.some((sale) =>
          sale.sourceOrderId === args.id &&
          sale.sourceOrderItemId === item.id
        );

        if (!saleAlreadyRecorded) {
          await ctx.db.insert("historysale", {
            date: saleDate,
            productName: item.title,
            eachPrice: item.price,
            totalQty: item.quantity,
            totalPrice: item.subtotal,
            sourceOrderId: args.id,
            sourceOrderItemId: item.id,
          });
        }
      }
    }

    await ctx.db.patch(args.id, {
      status: "accepted",
      historyRecordedAt: order.historyRecordedAt ?? Date.now(),
    });
  },
});

export const reject = mutation({
  args: {
    id: v.id("orders"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "rejected",
    });
  },
});

export const syncAcceptedOrdersToSales = mutation({
  args: {},
  handler: async (ctx) => {
    const orders = await ctx.db.query("orders").collect();
    const sales = await ctx.db.query("historysale").collect();
    let syncedOrders = 0;
    let insertedSales = 0;

    for (const order of orders) {
      if (order.status !== "accepted" || order.historyRecordedAt) {
        continue;
      }

      const saleDate = Date.now();

      for (const item of order.items) {
        const saleAlreadyRecorded = sales.some((sale) =>
          (sale.sourceOrderId === order._id && sale.sourceOrderItemId === item.id) ||
          (
            !sale.sourceOrderId &&
            sale.date >= order.createdAt &&
            sale.productName === item.title &&
            sale.eachPrice === item.price &&
            sale.totalQty === item.quantity &&
            sale.totalPrice === item.subtotal
          )
        );

        if (!saleAlreadyRecorded) {
          await ctx.db.insert("historysale", {
            date: saleDate,
            productName: item.title,
            eachPrice: item.price,
            totalQty: item.quantity,
            totalPrice: item.subtotal,
            sourceOrderId: order._id,
            sourceOrderItemId: item.id,
          });
          insertedSales += 1;
        }
      }

      await ctx.db.patch(order._id, {
        historyRecordedAt: saleDate,
      });
      syncedOrders += 1;
    }

    return { syncedOrders, insertedSales };
  },
});

export const uploadProofOfPayment = action({
  args: {
    fileBase64: v.string(),
    fileName: v.string(),
    mimeType: v.string(),
  },
  handler: async (_ctx, args) => {
    return await uploadToDrive(args);
  },
});
