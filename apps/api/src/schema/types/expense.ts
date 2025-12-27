import { builder } from "../builder.js";
import { prisma } from "../../lib/prisma.js";
import { User } from "./user.js";
import { Group } from "./group.js";
import { Comment } from "./comment.js";
import { logActivity } from "../../lib/logging.js";
import { MailService } from "../../lib/mail.js";

// Enums
const SplitType = builder.enumType("SplitType", {
  values: ["EQUAL", "EXACT", "PERCENTAGE", "SHARES"] as const,
});

const ExpenseCategory = builder.enumType("ExpenseCategory", {
  values: [
    "FOOD",
    "TRANSPORT",
    "ACCOMMODATION",
    "ENTERTAINMENT",
    "SHOPPING",
    "UTILITIES",
    "GROCERIES",
    "OTHER",
  ] as const,
});

// Expense type (with optional included relations)
type ExpenseShape = {
  id: string;
  groupId: string;
  paidById: string | null;
  description: string;
  amount: number;
  currency: string;
  category:
    | "FOOD"
    | "TRANSPORT"
    | "ACCOMMODATION"
    | "ENTERTAINMENT"
    | "SHOPPING"
    | "UTILITIES"
    | "GROCERIES"
    | "OTHER";
  date: Date;
  notes: string | null;
  receiptUrl: string | null;
  splitType: "EQUAL" | "EXACT" | "PERCENTAGE" | "SHARES";
  createdAt: Date;
  paidBy?: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    isPseudo: boolean;
    createdAt: Date;
  } | null;
  shares?: Array<{
    id: string;
    expenseId: string;
    userId: string;
    amount: number;
    user: {
      id: string;
      email: string;
      name: string;
      avatarUrl: string | null;
      isPseudo: boolean;
      createdAt: Date;
    };
  }>;
  comments?: Array<{
    id: string;
    expenseId: string;
    userId: string;
    text: string;
    createdAt: Date;
    updatedAt: Date;
    user: {
      id: string;
      email: string;
      name: string;
      avatarUrl: string | null;
      isPseudo: boolean;
      createdAt: Date;
    };
  }>;
};

const Expense = builder.objectRef<ExpenseShape>("Expense");

builder.objectType(Expense, {
  fields: (t) => ({
    id: t.exposeID("id"),
    description: t.exposeString("description"),
    amount: t.exposeInt("amount"),
    currency: t.exposeString("currency"),
    category: t.expose("category", { type: ExpenseCategory }),
    date: t.expose("date", { type: "DateTime" }),
    notes: t.exposeString("notes", { nullable: true }),
    receiptUrl: t.exposeString("receiptUrl", { nullable: true }),
    splitType: t.expose("splitType", { type: SplitType }),
    createdAt: t.expose("createdAt", { type: "DateTime" }),
    formattedAmount: t.string({
      resolve: (expense) =>
        `₹${(expense.amount / 100).toLocaleString("en-IN")}`,
    }),
    // Legacy: single payer (for backwards compat)
    paidBy: t.field({
      type: User,
      nullable: true,
      resolve: async (expense) => {
        // Use pre-fetched paidBy if available
        if (expense.paidBy) return expense.paidBy;
        if (!expense.paidById) return null;
        return prisma.user.findUnique({ where: { id: expense.paidById } });
      },
    }),
    // Multiple payers support
    payers: t.field({
      type: [ExpensePayer],
      resolve: async (expense) => {
        return prisma.expensePayer.findMany({
          where: { expenseId: expense.id },
          include: { user: true },
        });
      },
    }),
    group: t.field({
      type: Group,
      resolve: async (expense) => {
        return prisma.group.findUnique({ where: { id: expense.groupId } });
      },
    }),
    shares: t.field({
      type: [ExpenseShare],
      resolve: async (expense) => {
        // Use pre-fetched shares if available
        if (expense.shares) return expense.shares;
        return prisma.expenseShare.findMany({
          where: { expenseId: expense.id },
          include: { user: true },
        });
      },
    }),
    comments: t.field({
      type: [Comment],
      resolve: async (expense) => {
        // Use pre-fetched comments if available
        if (expense.comments) return expense.comments;
        return prisma.comment.findMany({
          where: { expenseId: expense.id },
          orderBy: { createdAt: "asc" },
          include: { user: true },
        });
      },
    }),
  }),
});

// ExpenseShare type
const ExpenseShare = builder.objectRef<{
  id: string;
  expenseId: string;
  userId: string;
  amount: number;
  user?: {
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
    isPseudo: boolean;
    createdAt: Date;
  };
}>("ExpenseShare");

builder.objectType(ExpenseShare, {
  fields: (t) => ({
    id: t.exposeID("id"),
    amount: t.exposeInt("amount"),
    formattedAmount: t.string({
      resolve: (share) => `₹${(share.amount / 100).toLocaleString("en-IN")}`,
    }),
    user: t.field({
      type: User,
      resolve: async (share) => {
        if (share.user) return share.user;
        return prisma.user.findUnique({ where: { id: share.userId } });
      },
    }),
  }),
});

// NEW: ExpensePayer type (for multiple payers)
const ExpensePayer = builder.objectRef<{
  id: string;
  expenseId: string;
  userId: string;
  amount: number;
  user?: {
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
    isPseudo: boolean;
    createdAt: Date;
  };
}>("ExpensePayer");

builder.objectType(ExpensePayer, {
  fields: (t) => ({
    id: t.exposeID("id"),
    amount: t.exposeInt("amount"),
    formattedAmount: t.string({
      resolve: (payer) => `₹${(payer.amount / 100).toLocaleString("en-IN")}`,
    }),
    user: t.field({
      type: User,
      resolve: async (payer) => {
        if (payer.user) return payer.user;
        return prisma.user.findUnique({ where: { id: payer.userId } });
      },
    }),
  }),
});
// Settlement types
const SettlementType = builder.enumType("SettlementType", {
  values: ["PAYMENT", "ADJUSTMENT"] as const,
});

// Settlement type
const Settlement = builder.objectRef<{
  id: string;
  groupId: string;
  payerId: string;
  receiverId: string;
  amount: number;
  currency: string;
  notes: string | null;
  type: "PAYMENT" | "ADJUSTMENT";
  createdAt: Date;
}>("Settlement");

builder.objectType(Settlement, {
  fields: (t) => ({
    id: t.exposeID("id"),
    amount: t.exposeInt("amount"),
    currency: t.exposeString("currency"),
    notes: t.exposeString("notes", { nullable: true }),
    type: t.expose("type", { type: SettlementType }),
    createdAt: t.expose("createdAt", { type: "DateTime" }),
    formattedAmount: t.string({
      resolve: (settlement) =>
        `₹${(settlement.amount / 100).toLocaleString("en-IN")}`,
    }),
    payer: t.field({
      type: User,
      resolve: async (settlement) => {
        return prisma.user.findUnique({ where: { id: settlement.payerId } });
      },
    }),
    receiver: t.field({
      type: User,
      resolve: async (settlement) => {
        return prisma.user.findUnique({ where: { id: settlement.receiverId } });
      },
    }),
  }),
});

// Input types
const ExpenseShareInput = builder.inputType("ExpenseShareInput", {
  fields: (t) => ({
    userId: t.string({ required: true }),
    amount: t.int({ required: true }),
  }),
});

// NEW: Input for multiple payers
const ExpensePayerInput = builder.inputType("ExpensePayerInput", {
  fields: (t) => ({
    userId: t.string({ required: true }),
    amount: t.int({ required: true }),
  }),
});

// Queries
builder.queryField("expenses", (t) =>
  t.field({
    type: [Expense],
    args: {
      groupId: t.arg.string({ required: true }),
    },
    resolve: async (_root, args) => {
      return prisma.expense.findMany({
        where: { groupId: args.groupId },
        orderBy: { date: "desc" },
        include: {
          paidBy: true,
          shares: { include: { user: true } },
          comments: { orderBy: { createdAt: "asc" }, include: { user: true } },
        },
      });
    },
  })
);

// Mutations
builder.mutationField("createExpense", (t) =>
  t.field({
    type: Expense,
    args: {
      groupId: t.arg.string({ required: true }),
      description: t.arg.string({ required: true }),
      amount: t.arg.int({ required: true }),
      paidById: t.arg.string({ required: true }),
      // payers: t.arg({ type: [ExpensePayerInput] }), // TODO: enable after migration
      category: t.arg({ type: ExpenseCategory, defaultValue: "OTHER" }),
      splitType: t.arg({ type: SplitType, defaultValue: "EQUAL" }),
      shares: t.arg({ type: [ExpenseShareInput], required: true }),
      notes: t.arg.string(),
      receiptUrl: t.arg.string(),
    },
    resolve: async (_root, args, ctx) => {
      if (!ctx.userId) throw new Error("Not authenticated");

      const expense = await prisma.expense.create({
        data: {
          groupId: args.groupId,
          description: args.description,
          amount: args.amount,
          paidById: args.paidById,
          category: args.category ?? "OTHER",
          splitType: args.splitType ?? "EQUAL",
          notes: args.notes,
          receiptUrl: args.receiptUrl,
          shares: {
            create: args.shares.map((share) => ({
              userId: share.userId,
              amount: share.amount,
            })),
          },
        },
      });

      // Log activity
      await logActivity({
        groupId: args.groupId,
        actorId: ctx.userId,
        type: "EXPENSE_CREATE",
        description: `added "${args.description}"`,
        metadata: {
          expenseId: expense.id,
          amount: args.amount,
          currency: "INR",
        },
      });

      return expense;
    },
  })
);

builder.mutationField("createSettlement", (t) =>
  t.field({
    type: Settlement,
    args: {
      groupId: t.arg.string({ required: true }),
      payerId: t.arg.string({ required: true }),
      receiverId: t.arg.string({ required: true }),
      amount: t.arg.int({ required: true }),
      notes: t.arg.string(),
    },
    resolve: async (_root, args, ctx) => {
      if (!ctx.userId) throw new Error("Not authenticated");

      const settlement = await prisma.settlement.create({
        data: {
          groupId: args.groupId,
          payerId: args.payerId,
          receiverId: args.receiverId,
          amount: args.amount,
          notes: args.notes,
          type: "PAYMENT",
        },
      });

      // Fetch names for description
      const [payer, receiver] = await Promise.all([
        prisma.user.findUnique({ where: { id: args.payerId } }),
        prisma.user.findUnique({ where: { id: args.receiverId } }),
      ]);

      await logActivity({
        groupId: args.groupId,
        actorId: ctx.userId,
        type: "SETTLEMENT_CREATE",
        description: `recorded payment to ${receiver?.name || "someone"}`,
        metadata: {
          settlementId: settlement.id,
          amount: args.amount,
          payerName: payer?.name,
          receiverName: receiver?.name,
        },
      });

      return settlement;
    },
  })
);

// Balance adjustment mutation
builder.mutationField("adjustBalance", (t) =>
  t.field({
    type: Settlement,
    args: {
      groupId: t.arg.string({ required: true }),
      fromUserId: t.arg.string({ required: true }),
      toUserId: t.arg.string({ required: true }),
      amount: t.arg.int({ required: true }),
      notes: t.arg.string({ required: true }),
    },
    resolve: async (_root, args, ctx) => {
      if (!ctx.userId) throw new Error("Not authenticated");

      const adjustment = await prisma.settlement.create({
        data: {
          groupId: args.groupId,
          payerId: args.fromUserId,
          receiverId: args.toUserId,
          amount: args.amount,
          notes: args.notes,
          type: "ADJUSTMENT",
        },
      });

      // Fetch names for description
      const [fromUser, toUser] = await Promise.all([
        prisma.user.findUnique({ where: { id: args.fromUserId } }),
        prisma.user.findUnique({ where: { id: args.toUserId } }),
      ]);

      await logActivity({
        groupId: args.groupId,
        actorId: ctx.userId,
        type: "SETTLEMENT_CREATE",
        description: `adjusted balance: ${fromUser?.name} → ${toUser?.name}`,
        metadata: {
          settlementId: adjustment.id,
          amount: args.amount,
          type: "ADJUSTMENT",
          fromUserName: fromUser?.name,
          toUserName: toUser?.name,
        },
      });

      return adjustment;
    },
  })
);

// Payment reminder mutation
builder.mutationField("sendPaymentReminder", (t) =>
  t.field({
    type: "Boolean",
    args: {
      groupId: t.arg.string({ required: true }),
      toUserId: t.arg.string({ required: true }),
      amount: t.arg.int({ required: true }),
    },
    resolve: async (_root, args, ctx) => {
      if (!ctx.userId) throw new Error("Not authenticated");

      const [fromUser, toUser, group] = await Promise.all([
        prisma.user.findUnique({ where: { id: ctx.userId } }),
        prisma.user.findUnique({ where: { id: args.toUserId } }),
        prisma.group.findUnique({ where: { id: args.groupId } }),
      ]);

      if (!fromUser || !toUser || !group) {
        throw new Error("User or group not found");
      }

      // Log activity for the reminder
      await logActivity({
        groupId: args.groupId,
        actorId: ctx.userId,
        type: "SETTLEMENT_CREATE", // Using existing type, could add REMINDER in schema
        description: `sent a payment reminder to ${toUser.name}`,
        metadata: {
          type: "REMINDER",
          toUserId: args.toUserId,
          toUserName: toUser.name,
          toUserEmail: toUser.email,
          amount: args.amount,
          groupName: group.name,
        },
      });

      // Send email
      await MailService.sendPaymentReminder({
        toEmail: toUser.email,
        toName: toUser.name,
        fromName: fromUser.name,
        amount: args.amount,
        groupName: group.name,
        currency: "INR", // Could fetch from group.defaultCurrency or Settlement
      });

      return true;
    },
  })
);

builder.mutationField("updateExpense", (t) =>
  t.field({
    type: Expense,
    args: {
      id: t.arg.string({ required: true }),
      description: t.arg.string(),
      amount: t.arg.int(),
      paidById: t.arg.string(),
      splitType: t.arg({ type: SplitType }),
      shares: t.arg({ type: [ExpenseShareInput] }),
      notes: t.arg.string(),
      receiptUrl: t.arg.string(),
    },
    resolve: async (_root, args, ctx) => {
      if (!ctx.userId) throw new Error("Not authenticated");

      // Get the expense
      const expense = await prisma.expense.findUnique({
        where: { id: args.id },
        include: { group: { include: { members: true } } },
      });

      if (!expense) throw new Error("Expense not found");

      // Check permission: must be payer or group admin
      const isAdmin = expense.group.members.some(
        (m: any) => m.userId === ctx.userId && m.role === "ADMIN"
      );
      const isPayer = expense.paidById === ctx.userId;

      if (!isAdmin && !isPayer) {
        throw new Error("Only the payer or group admin can edit this expense");
      }

      // If shares are provided, delete old and create new
      if (args.shares) {
        await prisma.expenseShare.deleteMany({
          where: { expenseId: args.id },
        });
      }

      const updatedExpense = await prisma.expense.update({
        where: { id: args.id },
        data: {
          description: args.description ?? undefined,
          amount: args.amount ?? undefined,
          paidById: args.paidById ?? undefined,
          splitType: args.splitType ?? undefined,
          notes: args.notes ?? undefined,
          receiptUrl: args.receiptUrl ?? undefined,
          ...(args.shares && {
            shares: {
              create: args.shares.map((share) => ({
                userId: share.userId,
                amount: share.amount,
              })),
            },
          }),
        },
      });

      await logActivity({
        groupId: expense.groupId,
        actorId: ctx.userId,
        type: "EXPENSE_UPDATE",
        description: `updated "${updatedExpense.description}"`,
        metadata: {
          expenseId: updatedExpense.id,
          amount: updatedExpense.amount,
        },
      });

      return updatedExpense;
    },
  })
);

builder.mutationField("deleteExpense", (t) =>
  t.field({
    type: "Boolean",
    args: {
      id: t.arg.string({ required: true }),
    },
    resolve: async (_root, args, ctx) => {
      if (!ctx.userId) throw new Error("Not authenticated");

      // Get the expense
      const expense = await prisma.expense.findUnique({
        where: { id: args.id },
        include: { group: { include: { members: true } } },
      });

      if (!expense) throw new Error("Expense not found");

      // Check permission: must be payer or group admin
      const isAdmin = expense.group.members.some(
        (m: any) => m.userId === ctx.userId && m.role === "ADMIN"
      );
      const isPayer = expense.paidById === ctx.userId;

      if (!isAdmin && !isPayer) {
        throw new Error(
          "Only the payer or group admin can delete this expense"
        );
      }

      // Delete expense (shares cascade automatically)
      await prisma.expense.delete({
        where: { id: args.id },
      });

      await logActivity({
        groupId: expense.groupId,
        actorId: ctx.userId,
        type: "EXPENSE_DELETE",
        description: `deleted "${expense.description}"`,
        metadata: {
          expenseId: expense.id,
          amount: expense.amount,
        },
      });

      return true;
    },
  })
);

export { Expense, ExpenseShare, Settlement, SplitType };
