import { prisma } from "./prisma.js";
import { ActivityType } from "@prisma/client";

interface LogActivityParams {
  groupId: string;
  actorId: string;
  type: ActivityType;
  description: string;
  metadata?: any;
}

export async function logActivity(params: LogActivityParams) {
  try {
    await prisma.activity.create({
      data: {
        groupId: params.groupId,
        actorId: params.actorId,
        type: params.type,
        description: params.description,
        metadata: params.metadata || {},
      },
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
    // We intentionally swallow the error so we don't block the main action
  }
}
