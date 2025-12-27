import { builder } from "./builder.js";
import "./types/user.js";
import "./types/group.js";
import "./types/expense.js";
import "./types/invite.js";
import "./types/activity.js";
import "./types/comment.js";
import "./types/recurring.js";

export const schema = builder.toSchema();
export type { GraphQLContext } from "./builder.js";
