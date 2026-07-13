import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("archives").order("desc").collect();
  },
});

export const restore = mutation({
  args: {
    id: v.id("archives"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const remove = mutation({
  args: {
    id: v.id("archives"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
