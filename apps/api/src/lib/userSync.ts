import { prisma } from "./prisma.js";

interface UserData {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
}

/**
 * Syncs a Supabase user to our database
 * Creates or updates the user record
 */
export async function syncUser(userData: UserData) {
  const { id, email, name, avatarUrl } = userData;

  const user = await prisma.user.upsert({
    where: { id },
    update: {
      email,
      name: name || email.split("@")[0],
      avatarUrl,
    },
    create: {
      id,
      email,
      name: name || email.split("@")[0],
      avatarUrl,
    },
  });

  return user;
}
