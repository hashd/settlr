import DataLoader from "dataloader";
import { prisma } from "./prisma.js";

// Types for loaded data
type GroupMemberWithUser = {
  id: string;
  userId: string;
  groupId: string;
  role: "ADMIN" | "MEMBER";
  joinedAt: Date;
  user: {
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
    isPseudo: boolean;
    createdAt: Date;
  };
};

type ExpenseShareWithUser = {
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
};

type ExpensePayerWithUser = {
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
};

type CommentWithUser = {
  id: string;
  text: string;
  expenseId: string;
  userId: string;
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
};

/**
 * Create all DataLoaders for a request
 * DataLoaders batch and cache DB calls within a single request
 */
export function createLoaders() {
  return {
    // Batch load group members by groupId
    membersByGroupId: new DataLoader<string, GroupMemberWithUser[]>(
      async (groupIds) => {
        const members = await prisma.groupMember.findMany({
          where: { groupId: { in: [...groupIds] } },
          include: { user: true },
        });

        // Group by groupId
        const memberMap = new Map<string, GroupMemberWithUser[]>();
        for (const member of members) {
          const list = memberMap.get(member.groupId) || [];
          list.push(member as GroupMemberWithUser);
          memberMap.set(member.groupId, list);
        }

        return groupIds.map((id) => memberMap.get(id) || []);
      }
    ),

    // Batch load expense count by groupId
    expenseCountByGroupId: new DataLoader<string, number>(async (groupIds) => {
      const counts = await prisma.expense.groupBy({
        by: ["groupId"],
        where: { groupId: { in: [...groupIds] } },
        _count: { id: true },
      });

      const countMap = new Map<string, number>();
      for (const c of counts) {
        countMap.set(c.groupId, c._count.id);
      }

      return groupIds.map((id) => countMap.get(id) || 0);
    }),

    // Batch load expense shares by expenseId
    sharesByExpenseId: new DataLoader<string, ExpenseShareWithUser[]>(
      async (expenseIds) => {
        const shares = await prisma.expenseShare.findMany({
          where: { expenseId: { in: [...expenseIds] } },
          include: { user: true },
        });

        const shareMap = new Map<string, ExpenseShareWithUser[]>();
        for (const share of shares) {
          const list = shareMap.get(share.expenseId) || [];
          list.push(share as ExpenseShareWithUser);
          shareMap.set(share.expenseId, list);
        }

        return expenseIds.map((id) => shareMap.get(id) || []);
      }
    ),

    // Batch load expense payers by expenseId
    payersByExpenseId: new DataLoader<string, ExpensePayerWithUser[]>(
      async (expenseIds) => {
        const payers = await prisma.expensePayer.findMany({
          where: { expenseId: { in: [...expenseIds] } },
          include: { user: true },
        });

        const payerMap = new Map<string, ExpensePayerWithUser[]>();
        for (const payer of payers) {
          const list = payerMap.get(payer.expenseId) || [];
          list.push(payer as ExpensePayerWithUser);
          payerMap.set(payer.expenseId, list);
        }

        return expenseIds.map((id) => payerMap.get(id) || []);
      }
    ),

    // Batch load comments by expenseId
    commentsByExpenseId: new DataLoader<string, CommentWithUser[]>(
      async (expenseIds) => {
        const comments = await prisma.comment.findMany({
          where: { expenseId: { in: [...expenseIds] } },
          include: { user: true },
          orderBy: { createdAt: "asc" },
        });

        const commentMap = new Map<string, CommentWithUser[]>();
        for (const comment of comments) {
          const list = commentMap.get(comment.expenseId) || [];
          list.push(comment as CommentWithUser);
          commentMap.set(comment.expenseId, list);
        }

        return expenseIds.map((id) => commentMap.get(id) || []);
      }
    ),
  };
}

export type Loaders = ReturnType<typeof createLoaders>;
