import { builder } from "../builder.js";
import { prisma } from "../../lib/prisma.js";
import { User } from "./user.js";
import type { Comment as PrismaComment } from "@prisma/client";

const Comment = builder.objectRef<PrismaComment>("Comment");

builder.objectType(Comment, {
  fields: (t) => ({
    id: t.exposeString("id"),
    text: t.exposeString("text"),
    userId: t.exposeString("userId"),
    expenseId: t.exposeString("expenseId"),
    createdAt: t.field({
      type: "DateTime",
      resolve: (root) => root.createdAt,
    }),
    user: t.field({
      type: User,
      resolve: async (comment) =>
        prisma.user.findUniqueOrThrow({ where: { id: comment.userId } }),
    }),
  }),
});

builder.mutationField("createComment", (t) =>
  t.field({
    type: Comment,
    args: {
      expenseId: t.arg.string({ required: true }),
      text: t.arg.string({ required: true }),
    },
    resolve: async (_root, args, ctx) => {
      if (!ctx.userId) throw new Error("Not authenticated");

      return prisma.comment.create({
        data: {
          text: args.text,
          expenseId: args.expenseId,
          userId: ctx.userId,
        },
      });
    },
  })
);

builder.mutationField("deleteComment", (t) =>
  t.field({
    type: "Boolean",
    args: {
      id: t.arg.string({ required: true }),
    },
    resolve: async (_root: any, args: any, ctx: any) => {
      if (!ctx.userId) throw new Error("Not authenticated");

      const comment = await prisma.comment.findUnique({
        where: { id: args.id },
      });
      if (!comment) throw new Error("Comment not found");

      if (comment.userId !== ctx.userId) {
        // Allow group admins to delete too
        const expense = await prisma.expense.findUnique({
          where: { id: comment.expenseId },
          include: { group: { include: { members: true } } },
        });

        const member = expense?.group.members.find(
          (m: any) => m.userId === ctx.userId
        );
        if (member?.role !== "ADMIN") {
          throw new Error("Not authorized");
        }
      }

      await prisma.comment.delete({ where: { id: args.id } });
      return true;
    },
  })
);

export { Comment };
