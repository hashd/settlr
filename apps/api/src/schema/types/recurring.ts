import { builder } from "../builder.js";
import { prisma } from "../../lib/prisma.js";
import { Group } from "./group.js";

// Enums
const RecurrenceFrequency = builder.enumType("RecurrenceFrequency", {
  values: ["WEEKLY", "BIWEEKLY", "MONTHLY", "YEARLY"] as const,
});

const ExpenseCategory = builder.enumType("ExpenseCategoryRecurring", {
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

const SplitType = builder.enumType("SplitTypeRecurring", {
  values: ["EQUAL", "EXACT", "PERCENTAGE", "SHARES"] as const,
});

// RecurringExpense type
const RecurringExpense = builder.objectRef<{
  id: string;
  groupId: string;
  createdById: string;
  description: string;
  amount: number;
  currency: string;
  category: string;
  splitType: string;
  frequency: "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "YEARLY";
  dayOfMonth: number | null;
  dayOfWeek: number | null;
  nextDueDate: Date;
  participantIds: string[];
  isActive: boolean;
  createdAt: Date;
}>("RecurringExpense");

builder.objectType(RecurringExpense, {
  fields: (t) => ({
    id: t.exposeID("id"),
    description: t.exposeString("description"),
    amount: t.exposeInt("amount"),
    currency: t.exposeString("currency"),
    category: t.exposeString("category"),
    splitType: t.exposeString("splitType"),
    frequency: t.expose("frequency", { type: RecurrenceFrequency }),
    dayOfMonth: t.exposeInt("dayOfMonth", { nullable: true }),
    dayOfWeek: t.exposeInt("dayOfWeek", { nullable: true }),
    nextDueDate: t.expose("nextDueDate", { type: "DateTime" }),
    participantIds: t.exposeStringList("participantIds"),
    isActive: t.exposeBoolean("isActive"),
    createdAt: t.expose("createdAt", { type: "DateTime" }),
    formattedAmount: t.string({
      resolve: (re) => `₹${(re.amount / 100).toLocaleString("en-IN")}`,
    }),
    group: t.field({
      type: Group,
      resolve: async (re) => {
        return prisma.group.findUnique({ where: { id: re.groupId } });
      },
    }),
  }),
});

// Queries
builder.queryField("recurringExpenses", (t) =>
  t.field({
    type: [RecurringExpense],
    args: {
      groupId: t.arg.string({ required: true }),
    },
    resolve: async (_root, args, ctx) => {
      if (!ctx.userId) throw new Error("Unauthorized");
      return prisma.recurringExpense.findMany({
        where: { groupId: args.groupId, isActive: true },
        orderBy: { nextDueDate: "asc" },
      });
    },
  })
);

// Mutations
builder.mutationField("createRecurringExpense", (t) =>
  t.field({
    type: RecurringExpense,
    args: {
      groupId: t.arg.string({ required: true }),
      description: t.arg.string({ required: true }),
      amount: t.arg.int({ required: true }),
      category: t.arg.string({ required: false }),
      splitType: t.arg.string({ required: false }),
      frequency: t.arg.string({ required: true }),
      dayOfMonth: t.arg.int({ required: false }),
      dayOfWeek: t.arg.int({ required: false }),
      participantIds: t.arg.stringList({ required: true }),
    },
    resolve: async (_root, args, ctx) => {
      if (!ctx.userId) throw new Error("Unauthorized");

      // Calculate next due date
      const now = new Date();
      let nextDueDate = new Date();

      if (args.frequency === "MONTHLY" && args.dayOfMonth) {
        nextDueDate.setDate(args.dayOfMonth);
        if (nextDueDate <= now) {
          nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        }
      } else if (args.frequency === "WEEKLY" && args.dayOfWeek !== null) {
        const daysUntil = (args.dayOfWeek - now.getDay() + 7) % 7 || 7;
        nextDueDate.setDate(now.getDate() + daysUntil);
      } else if (args.frequency === "BIWEEKLY") {
        nextDueDate.setDate(now.getDate() + 14);
      } else if (args.frequency === "YEARLY") {
        nextDueDate.setFullYear(now.getFullYear() + 1);
      } else {
        nextDueDate.setDate(now.getDate() + 7); // Default to 1 week
      }

      return prisma.recurringExpense.create({
        data: {
          groupId: args.groupId,
          createdById: ctx.userId,
          description: args.description,
          amount: args.amount,
          category: (args.category as any) || "OTHER",
          splitType: (args.splitType as any) || "EQUAL",
          frequency: args.frequency as any,
          dayOfMonth: args.dayOfMonth,
          dayOfWeek: args.dayOfWeek,
          nextDueDate,
          participantIds: args.participantIds,
        },
      });
    },
  })
);

builder.mutationField("deleteRecurringExpense", (t) =>
  t.field({
    type: "Boolean",
    args: {
      id: t.arg.string({ required: true }),
    },
    resolve: async (_root, args, ctx) => {
      if (!ctx.userId) throw new Error("Unauthorized");
      await prisma.recurringExpense.update({
        where: { id: args.id },
        data: { isActive: false },
      });
      return true;
    },
  })
);

builder.mutationField("processRecurringExpense", (t) =>
  t.field({
    type: "Boolean",
    args: {
      id: t.arg.string({ required: true }),
    },
    resolve: async (_root, args, ctx) => {
      if (!ctx.userId) throw new Error("Unauthorized");

      const recurring = await prisma.recurringExpense.findUnique({
        where: { id: args.id },
      });

      if (!recurring) throw new Error("Not found");

      // Create the expense
      const amtPerPerson = Math.floor(
        recurring.amount / recurring.participantIds.length
      );

      const expense = await prisma.expense.create({
        data: {
          groupId: recurring.groupId,
          paidById: ctx.userId,
          description: recurring.description,
          amount: recurring.amount,
          currency: recurring.currency,
          category: recurring.category as any,
          splitType: recurring.splitType as any,
          shares: {
            create: recurring.participantIds.map((userId) => ({
              userId,
              amount: amtPerPerson,
            })),
          },
        },
      });

      // Update next due date
      const nextDue = new Date(recurring.nextDueDate);
      switch (recurring.frequency) {
        case "WEEKLY":
          nextDue.setDate(nextDue.getDate() + 7);
          break;
        case "BIWEEKLY":
          nextDue.setDate(nextDue.getDate() + 14);
          break;
        case "MONTHLY":
          nextDue.setMonth(nextDue.getMonth() + 1);
          break;
        case "YEARLY":
          nextDue.setFullYear(nextDue.getFullYear() + 1);
          break;
      }

      await prisma.recurringExpense.update({
        where: { id: args.id },
        data: { nextDueDate: nextDue },
      });

      return true;
    },
  })
);

export { RecurringExpense, RecurrenceFrequency };
