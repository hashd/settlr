import { builder } from "../builder.js";
import { prisma } from "../../lib/prisma.js";
import { User } from "./user.js";
import { Group } from "./group.js";
import { logActivity } from "../../lib/logging.js";

// Invite status enum
const InviteStatus = builder.enumType("InviteStatus", {
  values: ["PENDING", "ACCEPTED", "DECLINED", "EXPIRED"] as const,
});

// GroupInvite type
const GroupInvite = builder.objectRef<{
  id: string;
  groupId: string;
  email: string;
  inviterId: string;
  status: string;
  createdAt: Date;
  expiresAt: Date;
  pseudoUserId?: string | null;
}>("GroupInvite");

builder.objectType(GroupInvite, {
  fields: (t) => ({
    id: t.exposeID("id"),
    email: t.exposeString("email"),
    status: t.exposeString("status"),
    createdAt: t.expose("createdAt", { type: "DateTime" }),
    expiresAt: t.expose("expiresAt", { type: "DateTime" }),
    pseudoUserId: t.exposeString("pseudoUserId", { nullable: true }),
    group: t.field({
      type: Group,
      nullable: true,
      resolve: (invite) =>
        prisma.group.findUnique({ where: { id: invite.groupId } }),
    }),
    inviter: t.field({
      type: User,
      nullable: true,
      resolve: (invite) =>
        prisma.user.findUnique({ where: { id: invite.inviterId } }),
    }),
  }),
});

// Queries
builder.queryField("myInvites", (t) =>
  t.field({
    type: [GroupInvite],
    resolve: async (_root, _args, ctx) => {
      if (!ctx.userId) throw new Error("Not authenticated");

      const user = await prisma.user.findUnique({ where: { id: ctx.userId } });
      if (!user) throw new Error("User not found");

      return prisma.groupInvite.findMany({
        where: {
          email: user.email,
          status: "PENDING",
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: "desc" },
      });
    },
  })
);

builder.queryField("groupInvites", (t) =>
  t.field({
    type: [GroupInvite],
    args: {
      groupId: t.arg.string({ required: true }),
    },
    resolve: async (_root, args, ctx) => {
      if (!ctx.userId) throw new Error("Not authenticated");

      // Check if user is admin of the group
      const membership = await prisma.groupMember.findUnique({
        where: {
          userId_groupId: { userId: ctx.userId, groupId: args.groupId },
        },
      });

      if (!membership || membership.role !== "ADMIN") {
        throw new Error("Only admins can view invites");
      }

      return prisma.groupInvite.findMany({
        where: { groupId: args.groupId },
        orderBy: { createdAt: "desc" },
      });
    },
  })
);

// Mutations
builder.mutationField("inviteToGroup", (t) =>
  t.field({
    type: GroupInvite,
    args: {
      groupId: t.arg.string({ required: true }),
      email: t.arg.string({ required: true }),
    },
    resolve: async (_root, args, ctx) => {
      if (!ctx.userId) throw new Error("Not authenticated");

      // Check if user is a member of the group
      const membership = await prisma.groupMember.findUnique({
        where: {
          userId_groupId: { userId: ctx.userId, groupId: args.groupId },
        },
      });

      if (!membership) throw new Error("Not a member of this group");

      // Check if email is already a member
      const existingUser = await prisma.user.findUnique({
        where: { email: args.email.toLowerCase() },
      });

      if (existingUser) {
        const existingMembership = await prisma.groupMember.findUnique({
          where: {
            userId_groupId: { userId: existingUser.id, groupId: args.groupId },
          },
        });

        if (existingMembership) {
          throw new Error("User is already a member of this group");
        }
      }

      // Check for existing pending invite
      const existingInvite = await prisma.groupInvite.findUnique({
        where: {
          groupId_email: {
            groupId: args.groupId,
            email: args.email.toLowerCase(),
          },
        },
      });

      if (existingInvite && existingInvite.status === "PENDING") {
        throw new Error("Invite already sent to this email");
      }

      // Create or update invite
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

      const invite = await prisma.groupInvite.upsert({
        where: {
          groupId_email: {
            groupId: args.groupId,
            email: args.email.toLowerCase(),
          },
        },
        create: {
          groupId: args.groupId,
          email: args.email.toLowerCase(),
          inviterId: ctx.userId,
          expiresAt,
        },
        update: {
          status: "PENDING",
          inviterId: ctx.userId,
          expiresAt,
        },
      });

      await logActivity({
        groupId: args.groupId,
        actorId: ctx.userId,
        type: "INVITE_SEND",
        description: `invited ${args.email}`,
      });

      return invite;
    },
  })
);

builder.mutationField("respondToInvite", (t) =>
  t.field({
    type: GroupInvite,
    args: {
      inviteId: t.arg.string({ required: true }),
      accept: t.arg.boolean({ required: true }),
    },
    resolve: async (_root, args, ctx) => {
      if (!ctx.userId) throw new Error("Not authenticated");

      const user = await prisma.user.findUnique({ where: { id: ctx.userId } });
      if (!user) throw new Error("User not found");

      const invite = await prisma.groupInvite.findUnique({
        where: { id: args.inviteId },
      });

      if (!invite) throw new Error("Invite not found");
      if (invite.email !== user.email)
        throw new Error("This invite is not for you");
      if (invite.status !== "PENDING")
        throw new Error("Invite already responded to");
      if (invite.expiresAt < new Date()) throw new Error("Invite has expired");

      if (args.accept) {
        // Check for pseudo-user claim
        if (invite.pseudoUserId) {
          const pseudoUser = await prisma.user.findUnique({
            where: { id: invite.pseudoUserId },
          });
          if (pseudoUser && pseudoUser.isPseudo) {
            // Merge expenses paid by pseudo user
            await prisma.expense.updateMany({
              where: { paidById: pseudoUser.id, groupId: invite.groupId },
              data: { paidById: ctx.userId },
            });

            // Merge shares
            const shares = await prisma.expenseShare.findMany({
              where: { userId: pseudoUser.id },
            });
            for (const share of shares) {
              const existingShare = await prisma.expenseShare.findUnique({
                where: {
                  expenseId_userId: {
                    expenseId: share.expenseId,
                    userId: ctx.userId,
                  },
                },
              });
              if (!existingShare) {
                await prisma.expenseShare.update({
                  where: { id: share.id },
                  data: { userId: ctx.userId },
                });
              } else {
                await prisma.expenseShare.update({
                  where: { id: existingShare.id },
                  data: { amount: existingShare.amount + share.amount },
                });
                await prisma.expenseShare.delete({ where: { id: share.id } });
              }
            }

            // Merge settlements
            await prisma.settlement.updateMany({
              where: { payerId: pseudoUser.id },
              data: { payerId: ctx.userId },
            });
            await prisma.settlement.updateMany({
              where: { receiverId: pseudoUser.id },
              data: { receiverId: ctx.userId },
            });

            await prisma.groupMember.deleteMany({
              where: { userId: pseudoUser.id },
            });
            await prisma.user.delete({ where: { id: pseudoUser.id } });
          }
        }

        const existingMember = await prisma.groupMember.findUnique({
          where: {
            userId_groupId: { userId: ctx.userId, groupId: invite.groupId },
          },
        });
        if (!existingMember) {
          await prisma.groupMember.create({
            data: {
              userId: ctx.userId,
              groupId: invite.groupId,
              role: "MEMBER",
            },
          });
        }
      }

      const updatedInvite = await prisma.groupInvite.update({
        where: { id: args.inviteId },
        data: { status: args.accept ? "ACCEPTED" : "DECLINED" },
      });

      await logActivity({
        groupId: invite.groupId,
        actorId: ctx.userId,
        type: args.accept ? "INVITE_ACCEPT" : "INVITE_DECLINE",
        description: args.accept ? "joined via invite" : "declined invite",
      });

      return updatedInvite;
    },
  })
);

builder.mutationField("cancelInvite", (t) =>
  t.field({
    type: "Boolean",
    args: {
      inviteId: t.arg.string({ required: true }),
    },
    resolve: async (_root, args, ctx) => {
      if (!ctx.userId) throw new Error("Not authenticated");

      const invite = await prisma.groupInvite.findUnique({
        where: { id: args.inviteId },
      });

      if (!invite) throw new Error("Invite not found");

      // Check if user is admin of the group
      const membership = await prisma.groupMember.findUnique({
        where: {
          userId_groupId: { userId: ctx.userId, groupId: invite.groupId },
        },
      });

      if (!membership || membership.role !== "ADMIN") {
        throw new Error("Only admins can cancel invites");
      }

      await prisma.groupInvite.delete({ where: { id: args.inviteId } });

      await logActivity({
        groupId: invite.groupId,
        actorId: ctx.userId,
        type: "INVITE_CANCEL",
        description: `cancelled invite for ${invite.email}`,
      });

      return true;
    },
  })
);

// Pseudo-user mutations
builder.mutationField("createPseudoUser", (t) =>
  t.field({
    type: User,
    args: {
      groupId: t.arg.string({ required: true }),
      name: t.arg.string({ required: true }),
    },
    resolve: async (_root, args, ctx) => {
      if (!ctx.userId) throw new Error("Not authenticated");

      // Check if user is a member of the group
      const membership = await prisma.groupMember.findUnique({
        where: {
          userId_groupId: { userId: ctx.userId, groupId: args.groupId },
        },
      });

      if (!membership) throw new Error("Not a member of this group");

      // Create pseudo-user with a placeholder email
      const pseudoEmail = `pseudo_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}@settlr.local`;

      const pseudoUser = await prisma.user.create({
        data: {
          email: pseudoEmail,
          name: args.name,
          isPseudo: true,
          createdById: ctx.userId,
        },
      });

      // Add to group
      await prisma.groupMember.create({
        data: {
          userId: pseudoUser.id,
          groupId: args.groupId,
          role: "MEMBER",
        },
      });

      return pseudoUser;
    },
  })
);

builder.mutationField("claimPseudoUser", (t) =>
  t.field({
    type: GroupInvite,
    args: {
      pseudoUserId: t.arg.string({ required: true }),
      email: t.arg.string({ required: true }),
      groupId: t.arg.string({ required: true }),
    },
    resolve: async (_root, args, ctx) => {
      if (!ctx.userId) throw new Error("Not authenticated");

      // Verify pseudo-user exists
      const pseudoUser = await prisma.user.findUnique({
        where: { id: args.pseudoUserId },
      });

      if (!pseudoUser || !pseudoUser.isPseudo) {
        throw new Error("Pseudo-user not found");
      }

      // Check if current user is admin of the group
      const membership = await prisma.groupMember.findUnique({
        where: {
          userId_groupId: { userId: ctx.userId, groupId: args.groupId },
        },
      });

      if (!membership || membership.role !== "ADMIN") {
        throw new Error("Only admins can claim pseudo-users");
      }

      // Create an invite for the email
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 days for claims

      // Store the pseudo-user ID in the invite for later linking
      const invite = await prisma.groupInvite.upsert({
        where: {
          groupId_email: {
            groupId: args.groupId,
            email: args.email.toLowerCase(),
          },
        },
        create: {
          groupId: args.groupId,
          email: args.email.toLowerCase(),
          inviterId: ctx.userId,
          expiresAt,
          pseudoUserId: args.pseudoUserId,
        },
        update: {
          status: "PENDING",
          inviterId: ctx.userId,
          expiresAt,
          pseudoUserId: args.pseudoUserId,
        },
      });

      await logActivity({
        groupId: args.groupId,
        actorId: ctx.userId,
        type: "INVITE_SEND",
        description: `invited ${args.email} to claim ${pseudoUser.name}`,
      });

      // We do NOT update the pseudo-user email anymore because it might conflict with an existing real user.
      // The linking happens via pseudoUserId on the invite.

      return invite;
    },
  })
);

export { GroupInvite };
