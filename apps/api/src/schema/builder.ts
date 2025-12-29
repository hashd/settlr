import SchemaBuilder from "@pothos/core";
import type { Loaders } from "../lib/loaders.js";

// Context type for GraphQL resolvers
export interface GraphQLContext {
  userId?: string;
  userEmail?: string;
  loaders: Loaders;
}

export const builder = new SchemaBuilder<{
  Context: GraphQLContext;
  Scalars: {
    DateTime: {
      Input: Date;
      Output: Date;
    };
    JSON: {
      Input: unknown;
      Output: unknown;
    };
  };
}>({});

// DateTime scalar
builder.scalarType("DateTime", {
  serialize: (value) => value.toISOString(),
  parseValue: (value) => new Date(value as string),
});

// JSON scalar
builder.scalarType("JSON", {
  serialize: (n) => n,
  parseValue: (n) => n,
});

// Initialize Query and Mutation types
builder.queryType({});
builder.mutationType({});
