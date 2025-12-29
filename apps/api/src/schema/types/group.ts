import { builder } from "../builder.js";
import { prisma } from "../../lib/prisma.js";
import { User } from "./user.js";
import { logActivity } from "../../lib/logging.js";

// Enums
const GroupCategory = builder.enumType("GroupCategory", {
  values: [
    "TRIP",
    "HOME",
    "COUPLE",
    "FRIENDS",
    "WORK",
    "FAMILY",
    "STUDENT",
    "OFFICE",
    "CLUB",
    "DINING",
    "HOBBY",
    "OTHER",
  ] as const,
});

const MemberRole = builder.enumType("MemberRole", {
  values: ["ADMIN", "MEMBER"] as const,
});

// Trip status enum for ephemeral groups
const TripStatus = builder.enumType("TripStatus", {
  values: ["UPCOMING", "ACTIVE", "ENDED", "ARCHIVED"] as const,
});

// Group type
const Group = builder.objectRef<{
  id: string;
  name: string;
  icon: string;
  category:
    | "TRIP"
    | "HOME"
    | "COUPLE"
    | "FRIENDS"
    | "WORK"
    | "FAMILY"
    | "STUDENT"
    | "OFFICE"
    | "CLUB"
    | "DINING"
    | "HOBBY"
    | "OTHER";
  simplifyDebts: boolean;
  createdAt: Date;
  // Ephemeral fields
  isEphemeral: boolean;
  startDate: Date | null;
  endDate: Date | null;
  allowPreTripExpenses: boolean;
  isArchived: boolean;
  archivedAt: Date | null;
}>("Group");

builder.objectType(Group, {
  fields: (t) => ({
    id: t.exposeID("id"),
    name: t.exposeString("name"),
    icon: t.exposeString("icon"),
    category: t.expose("category", { type: GroupCategory }),
    simplifyDebts: t.exposeBoolean("simplifyDebts"),
    createdAt: t.expose("createdAt", { type: "DateTime" }),
    // Ephemeral/Trip mode fields
    isEphemeral: t.exposeBoolean("isEphemeral"),
    startDate: t.expose("startDate", { type: "DateTime", nullable: true }),
    endDate: t.expose("endDate", { type: "DateTime", nullable: true }),
    allowPreTripExpenses: t.exposeBoolean("allowPreTripExpenses"),
    isArchived: t.exposeBoolean("isArchived"),
    archivedAt: t.expose("archivedAt", { type: "DateTime", nullable: true }),
    // Computed trip status
    tripStatus: t.field({
      type: TripStatus,
      nullable: true,
      resolve: (group) => {
        if (!group.isEphemeral) return null;
        if (group.isArchived) return "ARCHIVED";

        const now = new Date();
        if (group.startDate && now < group.startDate) return "UPCOMING";
        if (group.endDate && now > group.endDate) return "ENDED";
        return "ACTIVE";
      },
    }),
    // Days remaining (for active trips)
    daysRemaining: t.int({
      nullable: true,
      resolve: (group) => {
        if (!group.isEphemeral || !group.endDate || group.isArchived)
          return null;

        const now = new Date();
        if (now > group.endDate) return 0;

        const diffTime = group.endDate.getTime() - now.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      },
    }),
    members: t.field({
      type: [GroupMember],
      resolve: async (group, _args, ctx) => {
        // Use DataLoader for batched loading
        return ctx.loaders.membersByGroupId.load(group.id);
      },
    }),
    expenseCount: t.int({
      resolve: async (group, _args, ctx) => {
        // Use DataLoader for batched loading
        return ctx.loaders.expenseCountByGroupId.load(group.id);
      },
    }),

    // User's net balance in this group (positive = owed to them, negative = they owe)
    userBalance: t.int({
      nullable: true,
      resolve: async (group, _args, ctx) => {
        if (!ctx.userId) return null;

        const [expenses, settlements] = await Promise.all([
          prisma.expense.findMany({
            where: { groupId: group.id },
            include: { shares: true },
          }),
          prisma.settlement.findMany({
            where: { groupId: group.id },
          }),
        ]);

        let balance = 0;

        // Calculate from expenses
        for (const e of expenses) {
          if (e.paidById === ctx.userId) {
            // User paid - add amount they're owed
            for (const s of e.shares) {
              if (s.userId !== ctx.userId) {
                balance += s.amount;
              }
            }
          } else {
            // Someone else paid - subtract user's share
            const userShare = e.shares.find((s) => s.userId === ctx.userId);
            if (userShare) {
              balance -= userShare.amount;
            }
          }
        }

        // Adjust for settlements
        for (const s of settlements) {
          if (s.payerId === ctx.userId) {
            balance += s.amount; // User paid a debt
          } else if (s.receiverId === ctx.userId) {
            balance -= s.amount; // User received a payment
          }
        }

        return balance;
      },
    }),
  }),
});

// GroupMember type
const GroupMember = builder.objectRef<{
  id: string;
  userId: string;
  groupId: string;
  role: "ADMIN" | "MEMBER";
  joinedAt: Date;
  user?: {
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
    isPseudo: boolean;
    createdAt: Date;
  };
}>("GroupMember");

builder.objectType(GroupMember, {
  fields: (t) => ({
    id: t.exposeID("id"),
    role: t.expose("role", { type: MemberRole }),
    joinedAt: t.expose("joinedAt", { type: "DateTime" }),
    user: t.field({
      type: User,
      resolve: async (member) => {
        if (member.user) return member.user;
        return prisma.user.findUnique({ where: { id: member.userId } });
      },
    }),
  }),
});

// Queries
builder.queryField("groups", (t) =>
  t.field({
    type: [Group],
    resolve: async (_root, _args, ctx) => {
      if (!ctx.userId) return [];
      return prisma.group.findMany({
        where: {
          members: {
            some: { userId: ctx.userId },
          },
        },
        orderBy: { updatedAt: "desc" },
      }) as any;
    },
  })
);

builder.queryField("group", (t) =>
  t.field({
    type: Group,
    nullable: true,
    args: {
      id: t.arg.string({ required: true }),
    },
    resolve: async (_root, args) => {
      return prisma.group.findUnique({
        where: { id: args.id },
      }) as any;
    },
  })
);

// Balance type for group balances
const Balance = builder.objectRef<{
  owerId: string;
  oweeId: string;
  amount: number;
  ower?: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    isPseudo: boolean;
    createdAt: Date;
  };
  owee?: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    isPseudo: boolean;
    createdAt: Date;
  };
}>("Balance");

builder.objectType(Balance, {
  fields: (t) => ({
    amount: t.exposeInt("amount"),
    formattedAmount: t.string({
      resolve: (balance) =>
        `₹${(balance.amount / 100).toLocaleString("en-IN")}`,
    }),
    ower: t.field({
      type: User,
      resolve: async (balance) => {
        if (balance.ower) return balance.ower;
        return prisma.user.findUnique({ where: { id: balance.owerId } });
      },
    }),
    owee: t.field({
      type: User,
      resolve: async (balance) => {
        if (balance.owee) return balance.owee;
        return prisma.user.findUnique({ where: { id: balance.oweeId } });
      },
    }),
  }),
});

// Calculate simplified debts for a group
builder.queryField("groupBalances", (t) =>
  t.field({
    type: [Balance],
    args: {
      groupId: t.arg.string({ required: true }),
    },
    resolve: async (_root, args) => {
      // Fetch the group to check simplifyDebts setting
      const group = await prisma.group.findUnique({
        where: { id: args.groupId },
        select: { simplifyDebts: true },
      });

      const expenses = await prisma.expense.findMany({
        where: { groupId: args.groupId },
        include: { shares: true },
      });

      const settlements = await prisma.settlement.findMany({
        where: { groupId: args.groupId },
      });

      // Calculate Net Balances
      const userBalances: Record<string, number> = {};

      const add = (id: string, amt: number) => {
        userBalances[id] = (userBalances[id] || 0) + amt;
      };

      // Process expenses
      for (const e of expenses) {
        if (e.paidById) {
          add(e.paidById, e.amount);
        }
        for (const s of e.shares) {
          add(s.userId, -s.amount);
        }
      }

      // Process settlements
      for (const s of settlements) {
        add(s.payerId, s.amount);
        add(s.receiverId, -s.amount);
      }

      // If simplifyDebts is enabled (default true), use greedy algorithm
      if (group?.simplifyDebts !== false) {
        const debtors: { id: string; amount: number }[] = [];
        const creditors: { id: string; amount: number }[] = [];

        for (const [id, amt] of Object.entries(userBalances)) {
          if (amt < -1) debtors.push({ id, amount: amt });
          if (amt > 1) creditors.push({ id, amount: amt });
        }

        // Greedy matching for minimum transactions
        debtors.sort((a, b) => a.amount - b.amount);
        creditors.sort((a, b) => b.amount - a.amount);

        const balances: { owerId: string; oweeId: string; amount: number }[] =
          [];
        let i = 0;
        let j = 0;

        while (i < debtors.length && j < creditors.length) {
          const debtor = debtors[i];
          const creditor = creditors[j];

          const amount = Math.min(Math.abs(debtor.amount), creditor.amount);

          if (amount > 0) {
            balances.push({
              owerId: debtor.id,
              oweeId: creditor.id,
              amount: Math.round(amount),
            });
          }

          debtor.amount += amount;
          creditor.amount -= amount;

          if (Math.abs(debtor.amount) < 1) i++;
          if (creditor.amount < 1) j++;
        }

        return balances;
      }

      // If simplifyDebts is disabled, calculate direct pairwise balances
      // This tracks who owes whom directly from each expense
      const pairwiseBalances: Record<string, Record<string, number>> = {};

      const addPairwise = (from: string, to: string, amt: number) => {
        if (!pairwiseBalances[from]) pairwiseBalances[from] = {};
        pairwiseBalances[from][to] = (pairwiseBalances[from][to] || 0) + amt;
      };

      // Re-process for pairwise
      for (const e of expenses) {
        if (!e.paidById) continue;
        for (const s of e.shares) {
          if (s.userId !== e.paidById) {
            addPairwise(s.userId, e.paidById, s.amount);
          }
        }
      }

      // Adjust for settlements
      for (const s of settlements) {
        addPairwise(s.receiverId, s.payerId, s.amount);
      }

      // Consolidate and return
      const balances: { owerId: string; oweeId: string; amount: number }[] = [];
      const processed = new Set<string>();

      for (const [from, toMap] of Object.entries(pairwiseBalances)) {
        for (const [to, amt] of Object.entries(toMap)) {
          const key = [from, to].sort().join("-");
          if (processed.has(key)) continue;
          processed.add(key);

          const reverse = pairwiseBalances[to]?.[from] || 0;
          const net = amt - reverse;

          if (net > 1) {
            balances.push({
              owerId: from,
              oweeId: to,
              amount: Math.round(net),
            });
          } else if (net < -1) {
            balances.push({
              owerId: to,
              oweeId: from,
              amount: Math.round(Math.abs(net)),
            });
          }
        }
      }

      return balances;
    },
  })
);

// Mutations

builder.queryField("exportGroupData", (t) =>
  t.string({
    args: {
      groupId: t.arg.string({ required: true }),
    },
    resolve: async (_root, args, ctx) => {
      if (!ctx.userId) throw new Error("Not authenticated");

      const membership = await prisma.groupMember.findUnique({
        where: {
          userId_groupId: { userId: ctx.userId, groupId: args.groupId },
        },
      });
      if (!membership) throw new Error("Not a member");

      // 1. Fetch Expenses
      const expenses = await prisma.expense.findMany({
        where: { groupId: args.groupId },
        include: { paidBy: true, shares: { include: { user: true } } },
        orderBy: { date: "desc" },
      });

      // 2. Fetch Settlements
      const settlements = await prisma.settlement.findMany({
        where: { groupId: args.groupId },
        include: { payer: true, receiver: true },
        orderBy: { createdAt: "desc" },
      });

      // 3. Calculate Balances
      // Re-fetch all for accurate calculation if needed, or use fetched expenses
      // The fetched expenses already have shares.

      const netBalances: Record<string, Record<string, number>> = {};
      const userNames: Record<string, string> = {}; // Cache names

      // Helper to init
      const initBalance = (id1: string, id2: string) => {
        if (!netBalances[id1]) netBalances[id1] = {};
        if (!netBalances[id1][id2]) netBalances[id1][id2] = 0;
      };

      // Process expenses
      for (const expense of expenses) {
        if (!expense.paidById || !expense.paidBy) continue;
        const payerId = expense.paidById;
        userNames[payerId] = expense.paidBy.name;

        for (const share of expense.shares) {
          userNames[share.userId] = share.user.name;
          if (share.userId === payerId) continue;

          initBalance(share.userId, payerId);
          netBalances[share.userId][payerId] += share.amount;
        }
      }

      // Process settlements
      for (const settlement of settlements) {
        initBalance(settlement.payerId, settlement.receiverId);
        netBalances[settlement.payerId][settlement.receiverId] -=
          settlement.amount;
      }

      // Format CSV
      const rows: string[] = [];

      // Section: Expenses & Settlements (Chronological-ish or separate?)
      // Let's separate for clarity

      rows.push("--- EXPENSES ---");
      rows.push("Date,Description,Amount,Category,Paid By,Split Details,Notes");

      expenses.forEach((e: any) => {
        const date = e.date.toISOString().split("T")[0];
        const amount = (e.amount / 100).toFixed(2);
        const payer = e.paidBy.name;
        const note = e.notes || "";
        const shares = e.shares
          .map((s: any) => `${s.user.name}: ${(s.amount / 100).toFixed(2)}`)
          .join("; ");

        rows.push(
          [
            date,
            `"${e.description.replace(/"/g, '""')}"`,
            amount,
            e.category,
            `"${payer}"`,
            `"${shares}"`,
            `"${note.replace(/"/g, '""')}"`,
          ].join(",")
        );
      });

      rows.push("");
      rows.push("--- SETTLEMENTS ---");
      rows.push("Date,From,To,Amount");

      settlements.forEach((s: any) => {
        const date = s.createdAt.toISOString().split("T")[0];
        const amount = (s.amount / 100).toFixed(2);
        rows.push(`${date},"${s.payer.name}","${s.receiver.name}",${amount}`);
      });

      rows.push("");
      rows.push("--- CURRENT BALANCES ---");
      rows.push("Explanataion");

      for (const owerId in netBalances) {
        for (const oweeId in netBalances[owerId]) {
          const amount = netBalances[owerId][oweeId];
          if (amount > 50) {
            // filter small dust
            const val = (amount / 100).toFixed(2);
            const owerName = userNames[owerId] || "Unknown";
            const oweeName = userNames[oweeId] || "Unknown";
            rows.push(`"${owerName}" owes "${oweeName}" ₹${val}`);
          }
        }
      }

      return rows.join("\n");
    },
  })
);

builder.mutationField("createGroup", (t) =>
  t.field({
    type: Group,
    args: {
      name: t.arg.string({ required: true }),
      icon: t.arg.string({ defaultValue: "👥" }),
      category: t.arg({ type: GroupCategory, defaultValue: "OTHER" }),
      // Ephemeral group fields
      isEphemeral: t.arg.boolean({ defaultValue: false }),
      startDate: t.arg({ type: "DateTime" }),
      endDate: t.arg({ type: "DateTime" }),
      allowPreTripExpenses: t.arg.boolean({ defaultValue: true }),
    },
    resolve: async (_root, args, ctx) => {
      if (!ctx.userId) throw new Error("Not authenticated");

      // Validate dates for ephemeral groups
      if (args.isEphemeral) {
        if (args.endDate && args.startDate && args.endDate <= args.startDate) {
          throw new Error("End date must be after start date");
        }
      }

      return prisma.group.create({
        data: {
          name: args.name,
          icon: args.icon ?? "👥",
          category: args.category ?? "OTHER",
          isEphemeral: args.isEphemeral ?? false,
          startDate: args.startDate ?? null,
          endDate: args.endDate ?? null,
          allowPreTripExpenses: args.allowPreTripExpenses ?? true,
          members: {
            create: {
              userId: ctx.userId,
              role: "ADMIN",
            },
          },
        },
      }) as any;
    },
  })
);

builder.mutationField("addGroupMember", (t) =>
  t.field({
    type: GroupMember,
    args: {
      groupId: t.arg.string({ required: true }),
      email: t.arg.string({ required: true }),
    },
    resolve: async (_root, args, ctx) => {
      if (!ctx.userId) throw new Error("Not authenticated");

      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email: args.email },
      });

      if (!user) throw new Error("User not found");

      const member = await prisma.groupMember.create({
        data: {
          groupId: args.groupId,
          userId: user.id,
          role: "MEMBER",
        },
        include: { user: true },
      });

      await logActivity({
        groupId: args.groupId,
        actorId: ctx.userId,
        type: "MEMBER_ADD",
        description: `added ${user.name}`,
        metadata: { userId: user.id },
      });

      return member;
    },
  })
);

builder.mutationField("updateGroup", (t) =>
  t.field({
    type: Group,
    args: {
      id: t.arg.string({ required: true }),
      name: t.arg.string(),
      icon: t.arg.string(),
      category: t.arg({ type: GroupCategory }),
      simplifyDebts: t.arg.boolean(),
      // Ephemeral group fields
      isEphemeral: t.arg.boolean(),
      startDate: t.arg({ type: "DateTime" }),
      endDate: t.arg({ type: "DateTime" }),
      allowPreTripExpenses: t.arg.boolean(),
    },
    resolve: async (_root, args, ctx) => {
      if (!ctx.userId) throw new Error("Not authenticated");

      // Check permission: group admin
      const member = await prisma.groupMember.findUnique({
        where: {
          userId_groupId: {
            groupId: args.id,
            userId: ctx.userId,
          },
        },
      });

      if (!member || member.role !== "ADMIN") {
        throw new Error("Only admins can update the group");
      }

      // Validate dates
      if (args.endDate && args.startDate && args.endDate <= args.startDate) {
        throw new Error("End date must be after start date");
      }

      const group = await prisma.group.update({
        where: { id: args.id },
        data: {
          name: args.name ?? undefined,
          icon: args.icon ?? undefined,
          category: args.category ?? undefined,
          simplifyDebts: args.simplifyDebts ?? undefined,
          isEphemeral: args.isEphemeral ?? undefined,
          startDate: args.startDate !== undefined ? args.startDate : undefined,
          endDate: args.endDate !== undefined ? args.endDate : undefined,
          allowPreTripExpenses: args.allowPreTripExpenses ?? undefined,
        },
      });

      await logActivity({
        groupId: args.id,
        actorId: ctx.userId,
        type: "GROUP_UPDATE",
        description: "updated group details",
        metadata: {
          name: args.name,
          icon: args.icon,
          category: args.category,
          simplifyDebts: args.simplifyDebts,
        },
      });

      return group as any;
    },
  })
);

builder.mutationField("deleteGroup", (t) =>
  t.field({
    type: "Boolean",
    args: {
      id: t.arg.string({ required: true }),
    },
    resolve: async (_root, args, ctx) => {
      if (!ctx.userId) throw new Error("Not authenticated");

      // Check permission: group admin
      const member = await prisma.groupMember.findUnique({
        where: {
          userId_groupId: {
            groupId: args.id,
            userId: ctx.userId,
          },
        },
      });

      if (!member || member.role !== "ADMIN") {
        throw new Error("Only admins can delete the group");
      }

      // Check for outstanding balances (simplified check: any active expense shares might prevent delete,
      // but usually users just want to nuke it. We'll allow it for now as cascading delete handles cleanup,
      // but a warning is good UI side).

      await prisma.group.delete({
        where: { id: args.id },
      });

      return true;
    },
  })
);

builder.mutationField("leaveGroup", (t) =>
  t.field({
    type: "Boolean",
    args: {
      groupId: t.arg.string({ required: true }),
    },
    resolve: async (_root, args, ctx) => {
      if (!ctx.userId) throw new Error("Not authenticated");

      // Check if member exists
      const member = await prisma.groupMember.findUnique({
        where: {
          userId_groupId: {
            groupId: args.groupId,
            userId: ctx.userId,
          },
        },
      });

      if (!member) throw new Error("Not a member of this group");

      // Prevent leaving if admin and last admin (basic check, could be more robust)
      if (member.role === "ADMIN") {
        const admins = await prisma.groupMember.count({
          where: { groupId: args.groupId, role: "ADMIN" },
        });
        if (admins <= 1) {
          throw new Error(
            "You are the only admin. Assign another admin before leaving or delete the group."
          );
        }
      }

      // TODO: Check for non-zero balance logic here if needed.
      // For now, allow leaving (debts remain recorded but 'user' relation might get weird if we don't handle it).
      // Actually, debts are on 'User', not 'GroupMember'. So deleting GroupMember is safe-ish,
      // but they effectively ghost the debts in the UI context of "members".

      await prisma.groupMember.delete({
        where: {
          userId_groupId: {
            groupId: args.groupId,
            userId: ctx.userId,
          },
        },
      });

      await logActivity({
        groupId: args.groupId,
        actorId: ctx.userId,
        type: "MEMBER_LEAVE",
        description: "left the group",
      });

      return true;
    },
  })
);

builder.mutationField("removeMember", (t) =>
  t.field({
    type: "Boolean",
    args: {
      groupId: t.arg.string({ required: true }),
      userId: t.arg.string({ required: true }),
    },
    resolve: async (_root, args, ctx) => {
      if (!ctx.userId) throw new Error("Not authenticated");

      // Check permission: requester is admin
      const requester = await prisma.groupMember.findUnique({
        where: {
          userId_groupId: {
            groupId: args.groupId,
            userId: ctx.userId,
          },
        },
      });

      if (!requester || requester.role !== "ADMIN") {
        throw new Error("Only admins can remove members");
      }

      // Cannot remove yourself (use leaveGroup)
      if (args.userId === ctx.userId) {
        throw new Error("Cannot remove yourself. Use 'Leave Group' instead.");
      }

      const removedMember = await prisma.groupMember.delete({
        where: {
          userId_groupId: {
            groupId: args.groupId,
            userId: args.userId,
          },
        },
        include: { user: true },
      });

      await logActivity({
        groupId: args.groupId,
        actorId: ctx.userId,
        type: "MEMBER_REMOVE",
        description: `removed ${(removedMember as any).user.name}`,
        metadata: { userId: args.userId },
      });

      return true;
    },
  })
);

builder.mutationField("updateMemberRole", (t) =>
  t.field({
    type: GroupMember,
    args: {
      groupId: t.arg.string({ required: true }),
      userId: t.arg.string({ required: true }),
      role: t.arg({ type: MemberRole, required: true }),
    },
    resolve: async (_root, args, ctx) => {
      if (!ctx.userId) throw new Error("Not authenticated");

      // Check permission: requester is admin
      const requester = await prisma.groupMember.findUnique({
        where: {
          userId_groupId: {
            groupId: args.groupId,
            userId: ctx.userId,
          },
        },
      });

      if (!requester || requester.role !== "ADMIN") {
        throw new Error("Only admins can update member roles");
      }

      // Check if trying to demote themselves
      if (args.userId === ctx.userId && args.role !== "ADMIN") {
        // Ensure there is at least one other admin
        const admins = await prisma.groupMember.count({
          where: { groupId: args.groupId, role: "ADMIN" },
        });
        if (admins <= 1) {
          throw new Error(
            "You are the only admin. Promote someone else before demoting yourself."
          );
        }
      }

      const updatedMember = await prisma.groupMember.update({
        where: {
          userId_groupId: {
            groupId: args.groupId,
            userId: args.userId,
          },
        },
        data: { role: args.role },
        include: { user: true },
      });

      await logActivity({
        groupId: args.groupId,
        actorId: ctx.userId,
        type: "GROUP_UPDATE",
        description: `changed ${(updatedMember as any).user.name}'s role to ${
          args.role
        }`,
        metadata: { userId: args.userId, role: args.role },
      });

      return updatedMember;
    },
  })
);

// Archive Group - requires all balances settled
builder.mutationField("archiveGroup", (t) =>
  t.field({
    type: Group,
    args: {
      groupId: t.arg.string({ required: true }),
    },
    resolve: async (_root, args, ctx) => {
      if (!ctx.userId) throw new Error("Not authenticated");

      // Check admin permission
      const member = await prisma.groupMember.findUnique({
        where: {
          userId_groupId: {
            groupId: args.groupId,
            userId: ctx.userId,
          },
        },
      });

      if (!member || member.role !== "ADMIN") {
        throw new Error("Only admins can archive the group");
      }

      // Check for unsettled balances
      const expenses = await prisma.expense.findMany({
        where: { groupId: args.groupId },
        include: { shares: true },
      });

      const settlements = await prisma.settlement.findMany({
        where: { groupId: args.groupId },
      });

      // Calculate net balances
      const userBalances: Record<string, number> = {};
      const add = (id: string, amt: number) => {
        userBalances[id] = (userBalances[id] || 0) + amt;
      };

      for (const e of expenses) {
        if (e.paidById) add(e.paidById, e.amount);
        for (const s of e.shares) add(s.userId, -s.amount);
      }

      for (const s of settlements) {
        add(s.payerId, s.amount);
        add(s.receiverId, -s.amount);
      }

      // Check if any balance is non-zero (using threshold of ₹1)
      const hasUnsettledBalance = Object.values(userBalances).some(
        (balance) => Math.abs(balance) > 100 // 100 paise = ₹1
      );

      if (hasUnsettledBalance) {
        throw new Error(
          "Cannot archive: There are unsettled balances. Please settle all debts first."
        );
      }

      // Archive the group
      const group = await prisma.group.update({
        where: { id: args.groupId },
        data: {
          isArchived: true,
          archivedAt: new Date(),
        },
      });

      await logActivity({
        groupId: args.groupId,
        actorId: ctx.userId,
        type: "GROUP_UPDATE",
        description: "archived the group",
      });

      return group as any;
    },
  })
);

// Unarchive Group
builder.mutationField("unarchiveGroup", (t) =>
  t.field({
    type: Group,
    args: {
      groupId: t.arg.string({ required: true }),
    },
    resolve: async (_root, args, ctx) => {
      if (!ctx.userId) throw new Error("Not authenticated");

      // Check admin permission
      const member = await prisma.groupMember.findUnique({
        where: {
          userId_groupId: {
            groupId: args.groupId,
            userId: ctx.userId,
          },
        },
      });

      if (!member || member.role !== "ADMIN") {
        throw new Error("Only admins can unarchive the group");
      }

      const group = await prisma.group.update({
        where: { id: args.groupId },
        data: {
          isArchived: false,
          archivedAt: null,
        },
      });

      await logActivity({
        groupId: args.groupId,
        actorId: ctx.userId,
        type: "GROUP_UPDATE",
        description: "unarchived the group",
      });

      return group as any;
    },
  })
);

export { Group, GroupMember, GroupCategory, MemberRole };
