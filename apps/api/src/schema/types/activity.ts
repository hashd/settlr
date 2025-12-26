import { builder } from "../builder.js";
import { prisma } from "../../lib/prisma.js";
import { User } from "./user.js";
import { Group } from "./group.js";

// Activity Type Enum
const ActivityType = builder.enumType("ActivityType", {
  values: [
    "EXPENSE_CREATE",
    "EXPENSE_UPDATE",
    "EXPENSE_DELETE",
    "SETTLEMENT_CREATE",
    "SETTLEMENT_DELETE",
    "MEMBER_ADD",
    "MEMBER_REMOVE",
    "MEMBER_LEAVE",
    "GROUP_UPDATE",
    "INVITE_SEND",
    "INVITE_ACCEPT",
    "INVITE_DECLINE",
    "INVITE_CANCEL",
  ] as const,
});

// Activity Object
const Activity = builder.objectRef<{
  id: string;
  groupId: string;
  actorId: string;
  type: any; // Using any to avoid complex enum implementation details with Pothos
  description: string;
  metadata: any;
  createdAt: Date;
}>("Activity");

builder.objectType(Activity, {
  fields: (t) => ({
    id: t.exposeID("id"),
    description: t.exposeString("description"),
    type: t.expose("type", { type: ActivityType }),
    metadata: t.expose("metadata", { type: "JSON", nullable: true }),
    createdAt: t.expose("createdAt", { type: "DateTime" }),
    actor: t.field({
      type: User,
      resolve: async (activity) => {
        const user = await prisma.user.findUnique({
          where: { id: activity.actorId },
        });
        if (!user) throw new Error("Actor not found");
        return user;
      },
    }),
    group: t.field({
      type: Group,
      resolve: async (activity) => {
        const group = await prisma.group.findUnique({
          where: { id: activity.groupId },
        });
        if (!group) throw new Error("Group not found");
        return group;
      },
    }),
  }),
});

// Queries
builder.queryField("groupActivities", (t) =>
  t.field({
    type: [Activity],
    args: {
      groupId: t.arg.string({ required: true }),
      limit: t.arg.int({ defaultValue: 20 }),
    },
    resolve: async (_root, args, ctx) => {
      if (!ctx.userId) throw new Error("Not authenticated");

      // Verify membership
      const membership = await prisma.groupMember.findUnique({
        where: {
          userId_groupId: { userId: ctx.userId, groupId: args.groupId },
        },
      });

      if (!membership) throw new Error("Not a member of this group");

      return prisma.activity.findMany({
        where: { groupId: args.groupId },
        orderBy: { createdAt: "desc" },
        take: args.limit ?? 20,
      });
    },
  })
);

builder.queryField("recentActivities", (t) =>
  t.field({
    type: [Activity],
    args: {
      limit: t.arg.int({ defaultValue: 10 }),
    },
    resolve: async (_root, args, ctx) => {
      if (!ctx.userId) throw new Error("Not authenticated");

      return prisma.activity.findMany({
        where: {
          group: {
            members: {
              some: { userId: ctx.userId },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: args.limit ?? 10,
      });
    },
  })
);

export { Activity };
