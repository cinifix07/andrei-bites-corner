import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const seedAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", "andrei"))
      .unique();

    const adminUser = {
      name: "Andrei",
      role: "admin",
      username: "andrei",
      password: "andrei@123",
    };

    if (existingUser) {
      await ctx.db.patch(existingUser._id, adminUser);
      return existingUser._id;
    }

    return await ctx.db.insert("users", adminUser);
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});

export const authenticateAdmin = query({
  args: {
    username: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .unique();

    if (!user || user.password !== args.password || user.role !== "admin") {
      return null;
    }

    return {
      id: user._id,
      name: user.name,
      role: user.role,
      username: user.username,
    };
  },
});

export const authenticate = query({
  args: {
    username: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .unique();

    if (!user || user.password !== args.password) {
      return null;
    }

    return {
      id: user._id,
      name: user.name,
      role: user.role,
      username: user.username,
    };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    role: v.union(v.literal("admin"), v.literal("user")),
    username: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("users", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("users"),
    name: v.string(),
    role: v.union(v.literal("admin"), v.literal("user")),
    username: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const { id, ...user } = args;
    await ctx.db.patch(id, user);
  },
});

export const remove = mutation({
  args: {
    id: v.id("users"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
