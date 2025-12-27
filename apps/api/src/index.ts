import { createYoga } from "graphql-yoga";
import { createServer } from "node:http";
import { schema, type GraphQLContext } from "./schema/index.js";
import { extractToken, verifyToken } from "./lib/auth.js";
import { syncUser } from "./lib/userSync.js";

const yoga = createYoga({
  schema,
  graphqlEndpoint: "/graphql",
  landingPage: false,
  graphiql: {
    title: "Settlr API",
  },
  context: async ({ request }): Promise<GraphQLContext> => {
    const authHeader = request.headers.get("authorization");
    const token = extractToken(authHeader);

    if (!token) {
      return {};
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return {};
    }

    // Sync user to our database on each authenticated request
    try {
      await syncUser({
        id: payload.sub,
        email: payload.email || "",
        name: payload.user_metadata?.name,
        avatarUrl: payload.user_metadata?.avatar_url,
      });
    } catch (error) {
      console.error("Failed to sync user:", error);
    }

    return {
      userId: payload.sub,
      userEmail: payload.email,
    };
  },
});

const server = createServer(yoga);

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`🚀 Settlr API running at http://localhost:${PORT}/graphql`);
});
