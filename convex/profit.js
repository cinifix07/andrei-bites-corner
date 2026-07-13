import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("profit").order("desc").collect();
  },
});

export const add = mutation({
  args: {
    totalProfit: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("profit", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("profit"),
    totalProfit: v.number(),
  },
  handler: async (ctx, args) => {
    const { id, ...record } = args;
    await ctx.db.patch(id, record);
  },
});

export const remove = mutation({
  args: {
    id: v.id("profit"),
  },
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.id);

    if (record) {
      await ctx.db.insert("archives", {
        source: "profit",
        label: `Profit ${record.totalProfit}`,
        deletedAt: Date.now(),
        data: record,
      });
    }

    await ctx.db.delete(args.id);
  },
});
