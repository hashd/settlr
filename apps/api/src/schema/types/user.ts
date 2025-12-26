import { builder } from "../builder.js";
import { prisma } from "../../lib/prisma.js";

// User object type
const User = builder.objectRef<{
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  isPseudo: boolean;
  createdAt: Date;
}>("User");

builder.objectType(User, {
  fields: (t) => ({
    id: t.exposeID("id"),
    email: t.exposeString("email"),
    name: t.exposeString("name"),
    avatarUrl: t.exposeString("avatarUrl", { nullable: true }),
    isPseudo: t.exposeBoolean("isPseudo"),
    createdAt: t.expose("createdAt", { type: "DateTime" }),
  }),
});

// Queries
builder.queryField("me", (t) =>
  t.field({
    type: User,
    nullable: true,
    resolve: async (_root, _args, ctx) => {
      if (!ctx.userId) return null;
      return prisma.user.findUnique({
        where: { id: ctx.userId },
      });
    },
  })
);

builder.queryField("user", (t) =>
  t.field({
    type: User,
    nullable: true,
    args: {
      id: t.arg.string({ required: true }),
    },
    resolve: async (_root, args) => {
      return prisma.user.findUnique({
        where: { id: args.id },
      });
    },
  })
);

// Dashboard types
const CategorySpending = builder.objectRef<{
  category: string;
  amount: number;
}>("CategorySpending");
builder.objectType(CategorySpending, {
  fields: (t) => ({
    category: t.exposeString("category"),
    amount: t.exposeInt("amount"),
  }),
});

const UserBalance = builder.objectRef<{
  userId: string;
  name: string;
  amount: number;
}>("UserBalance");
builder.objectType(UserBalance, {
  fields: (t) => ({
    userId: t.exposeID("userId"),
    name: t.exposeString("name"),
    amount: t.exposeInt("amount"),
  }),
});

const Dashboard = builder.objectRef<{
  totalOwed: number;
  totalOwe: number;
  netBalance: number;
  groupCount: number;
  monthlySpending: number;
  categoryDistribution: { category: string; amount: number }[];
  topOwedTo: { userId: string; name: string; amount: number }[];
  topOwedBy: { userId: string; name: string; amount: number }[];
}>("Dashboard");

builder.objectType(Dashboard, {
  fields: (t) => ({
    totalOwed: t.exposeInt("totalOwed"),
    totalOwe: t.exposeInt("totalOwe"),
    netBalance: t.exposeInt("netBalance"),
    groupCount: t.exposeInt("groupCount"),
    monthlySpending: t.exposeInt("monthlySpending"),
    categoryDistribution: t.expose("categoryDistribution", {
      type: [CategorySpending],
    }),
    topOwedTo: t.expose("topOwedTo", { type: [UserBalance] }),
    topOwedBy: t.expose("topOwedBy", { type: [UserBalance] }),
    formattedOwed: t.string({
      resolve: (d) => `₹${(d.totalOwed / 100).toLocaleString("en-IN")}`,
    }),
    formattedOwe: t.string({
      resolve: (d) => `₹${(d.totalOwe / 100).toLocaleString("en-IN")}`,
    }),
    formattedNet: t.string({
      resolve: (d) =>
        `${d.netBalance >= 0 ? "+" : ""}₹${(
          Math.abs(d.netBalance) / 100
        ).toLocaleString("en-IN")}`,
    }),
    formattedMonthly: t.string({
      resolve: (d) => `₹${(d.monthlySpending / 100).toLocaleString("en-IN")}`,
    }),
  }),
});

builder.queryField("dashboard", (t) =>
  t.field({
    type: Dashboard,
    nullable: true,
    resolve: async (_root, _args, ctx) => {
      if (!ctx.userId) return null;

      // Get all groups user is a member of
      const memberships = await prisma.groupMember.findMany({
        where: { userId: ctx.userId },
        include: { group: true },
      });

      const groupIds = memberships.map((m: any) => m.groupId);

      const [allExpenses, allSettlements] = await Promise.all([
        prisma.expense.findMany({
          where: { groupId: { in: groupIds } },
          include: { shares: { include: { user: true } }, paidBy: true },
        }),
        prisma.settlement.findMany({
          where: { groupId: { in: groupIds } },
          include: { payer: true, receiver: true },
        }),
      ]);

      // Calculate aggregated balances per user
      const userNetBalances: Record<string, { name: string; amount: number }> =
        {};
      const categoryTotals: Record<string, number> = {};
      let monthlySpending = 0;
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      for (const expense of allExpenses) {
        const isRecent = new Date(expense.date) >= thirtyDaysAgo;

        // Track category distribution (global)
        categoryTotals[expense.category] =
          (categoryTotals[expense.category] || 0) + expense.amount;

        if (expense.paidById === ctx.userId) {
          // User paid - others owe user
          for (const share of expense.shares) {
            if (share.userId !== ctx.userId) {
              userNetBalances[share.userId] = userNetBalances[share.userId] || {
                name: share.user.name,
                amount: 0,
              };
              userNetBalances[share.userId].amount += share.amount;
            }
          }
          if (isRecent) {
            // Calculate how much user actually spent (their share + what they paid for others)
            // But usually "spending" means their share.
            const userShare = expense.shares.find(
              (s: any) => s.userId === ctx.userId
            );
            monthlySpending += userShare?.amount || 0;
          }
        } else {
          // Someone else paid - user owes them
          const userShare = expense.shares.find(
            (s: any) => s.userId === ctx.userId
          );
          if (userShare) {
            userNetBalances[expense.paidById] = userNetBalances[
              expense.paidById
            ] || {
              name: expense.paidBy.name,
              amount: 0,
            };
            userNetBalances[expense.paidById].amount -= userShare.amount;
            if (isRecent) {
              monthlySpending += userShare.amount;
            }
          }
        }
      }

      // Adjust for settlements
      for (const s of allSettlements as any) {
        if (s.payerId === ctx.userId) {
          // User paid a debt
          userNetBalances[s.receiverId] = userNetBalances[s.receiverId] || {
            name: s.receiver.name,
            amount: 0,
          };
          userNetBalances[s.receiverId].amount += s.amount;
        } else if (s.receiverId === ctx.userId) {
          // User received a payment
          userNetBalances[s.payerId] = userNetBalances[s.payerId] || {
            name: s.payer.name,
            amount: 0,
          };
          userNetBalances[s.payerId].amount -= s.amount;
        }
      }

      let totalOwed = 0;
      let totalOwe = 0;
      const topOwedTo: { userId: string; name: string; amount: number }[] = [];
      const topOwedBy: { userId: string; name: string; amount: number }[] = [];

      for (const [id, data] of Object.entries(userNetBalances)) {
        if (data.amount > 0) {
          totalOwed += data.amount;
          topOwedBy.push({ userId: id, name: data.name, amount: data.amount });
        } else if (data.amount < 0) {
          totalOwe += Math.abs(data.amount);
          topOwedTo.push({
            userId: id,
            name: data.name,
            amount: Math.abs(data.amount),
          });
        }
      }

      return {
        totalOwed,
        totalOwe,
        netBalance: totalOwed - totalOwe,
        groupCount: groupIds.length,
        monthlySpending,
        categoryDistribution: Object.entries(categoryTotals)
          .map(([category, amount]) => ({ category, amount }))
          .sort((a, b) => b.amount - a.amount),
        topOwedTo: topOwedTo.sort((a, b) => b.amount - a.amount).slice(0, 5),
        topOwedBy: topOwedBy.sort((a, b) => b.amount - a.amount).slice(0, 5),
      };
    },
  })
);

export { User };
