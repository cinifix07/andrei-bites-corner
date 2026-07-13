import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const emptyDashboardStats = {
  netProfit: 0,
  profitPercentage: 0,
  dailyRevenue: 0,
  weeklyRevenue: 0,
  monthlyRevenueTotal: 0,
  totalRevenue: 0,
  totalInvestment: 0,
  dailyRevenueBuckets: [0, 0, 0, 0, 0, 0, 0],
  monthlyRevenue: Array.from({ length: 12 }, () => 0),
  yearlyRevenue: Array.from({ length: 5 }, () => 0),
  yearlyLabels: [],
};

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1).getTime();
}

function startOfYear(date) {
  return new Date(date.getFullYear(), 0, 1).getTime();
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("historysale").order("desc").collect();
  },
});

export const dashboardStats = query({
  args: {},
  handler: async (ctx) => {
    const sales = await ctx.db.query("historysale").collect();
    const profitRecords = await ctx.db.query("profit").collect();
    const now = new Date();
    const todayStart = startOfDay(now);
    const tomorrowStart = todayStart + 24 * 60 * 60 * 1000;
    const weekStart = todayStart - 6 * 24 * 60 * 60 * 1000;
    const monthStart = startOfMonth(now);
    const currentYear = now.getFullYear();
    const yearStart = startOfYear(now);
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalPrice, 0);
    const totalProfit = profitRecords.reduce((sum, record) => sum + record.totalProfit, 0);
    const dailyRevenue = sales
      .filter((sale) => sale.date >= todayStart && sale.date < tomorrowStart)
      .reduce((sum, sale) => sum + sale.totalPrice, 0);
    const weeklyRevenue = sales
      .filter((sale) => sale.date >= weekStart && sale.date < tomorrowStart)
      .reduce((sum, sale) => sum + sale.totalPrice, 0);
    const monthlyRevenueTotal = sales
      .filter((sale) => sale.date >= monthStart && sale.date < tomorrowStart)
      .reduce((sum, sale) => sum + sale.totalPrice, 0);
    const dailyRevenueBuckets = Array.from({ length: 7 }, (_, index) => {
      const bucketStart = weekStart + index * 24 * 60 * 60 * 1000;
      const bucketEnd = bucketStart + 24 * 60 * 60 * 1000;

      return sales
        .filter((sale) => sale.date >= bucketStart && sale.date < bucketEnd)
        .reduce((sum, sale) => sum + sale.totalPrice, 0);
    });
    const monthlyRevenue = Array.from({ length: 12 }, (_, monthIndex) => {
      const bucketStart = new Date(currentYear, monthIndex, 1).getTime();
      const bucketEnd = new Date(currentYear, monthIndex + 1, 1).getTime();

      return sales
        .filter((sale) => sale.date >= bucketStart && sale.date < bucketEnd)
        .reduce((sum, sale) => sum + sale.totalPrice, 0);
    });
    const yearlyLabels = Array.from({ length: 5 }, (_, index) => String(currentYear - 4 + index));
    const yearlyRevenue = yearlyLabels.map((yearLabel) => {
      const year = Number(yearLabel);
      const bucketStart = new Date(year, 0, 1).getTime();
      const bucketEnd = new Date(year + 1, 0, 1).getTime();

      return sales
        .filter((sale) => sale.date >= bucketStart && sale.date < bucketEnd)
        .reduce((sum, sale) => sum + sale.totalPrice, 0);
    });
    const yearlyRevenueTotal = sales
      .filter((sale) => sale.date >= yearStart && sale.date < new Date(currentYear + 1, 0, 1).getTime())
      .reduce((sum, sale) => sum + sale.totalPrice, 0);
    const netProfit = totalProfit;
    const profitPercentage = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : netProfit > 0 ? 100 : 0;

    return {
      ...emptyDashboardStats,
      netProfit,
      profitPercentage,
      dailyRevenue,
      weeklyRevenue,
      monthlyRevenueTotal,
      totalRevenue,
      totalInvestment: totalProfit,
      yearlyRevenueTotal,
      dailyRevenueBuckets,
      monthlyRevenue,
      yearlyRevenue,
      yearlyLabels,
    };
  },
});

export const update = mutation({
  args: {
    id: v.id("historysale"),
    date: v.number(),
    productName: v.string(),
    eachPrice: v.number(),
    totalQty: v.number(),
  },
  handler: async (ctx, args) => {
    const { id, eachPrice, totalQty, ...sale } = args;
    await ctx.db.patch(id, {
      ...sale,
      eachPrice,
      totalQty,
      totalPrice: eachPrice * totalQty,
    });
  },
});

export const remove = mutation({
  args: {
    id: v.id("historysale"),
  },
  handler: async (ctx, args) => {
    const sale = await ctx.db.get(args.id);

    if (sale) {
      await ctx.db.insert("archives", {
        source: "historysale",
        label: sale.productName,
        deletedAt: Date.now(),
        data: sale,
      });
    }

    await ctx.db.delete(args.id);
  },
});
