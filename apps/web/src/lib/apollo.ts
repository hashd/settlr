import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  from,
} from "@apollo/client/core";
import { setContext } from "@apollo/client/link/context";
import { onError } from "@apollo/client/link/error";
import { RetryLink } from "@apollo/client/link/retry";
import { useAuthStore } from "@/stores/auth";
import { useToastStore } from "@/stores/toast";

const httpLink = createHttpLink({
  uri: import.meta.env.VITE_API_URL || "/graphql",
});

const authLink = setContext(async (_, { headers }) => {
  // Get token from auth store
  const authStore = useAuthStore();
  const token = await authStore.getToken();

  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    },
  };
});

// Retry link with exponential backoff for network errors
const retryLink = new RetryLink({
  delay: {
    initial: 300,
    max: 5000,
    jitter: true,
  },
  attempts: {
    max: 3,
    retryIf: (error) => {
      // Retry on network errors
      return !!error;
    },
  },
});

// Error link for global error handling
const errorLink = onError(({ graphQLErrors, networkError }) => {
  const toast = useToastStore();

  if (graphQLErrors) {
    graphQLErrors.forEach(({ message }) => {
      // Show toast for user-facing errors
      if (!message.includes("Not authenticated")) {
        toast.error(message);
      }
    });
  }

  if (networkError) {
    // Check if it's a network connectivity issue
    if (!navigator.onLine) {
      toast.warning("You're offline. Changes will sync when back online.");
    } else {
      toast.error("Connection error. Please try again.");
    }
  }
});

export const apolloClient = new ApolloClient({
  link: from([errorLink, retryLink, authLink, httpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      // Entity types - ensure proper normalization by ID
      Group: {
        keyFields: ["id"],
        fields: {
          members: { merge: false }, // Replace on update
          userBalance: { merge: true },
        },
      },
      Expense: {
        keyFields: ["id"],
        fields: {
          shares: { merge: false },
          payers: { merge: false },
          comments: { merge: false },
        },
      },
      User: {
        keyFields: ["id"],
      },
      // Query-level policies
      Query: {
        fields: {
          groups: {
            merge: (_, incoming) => incoming, // Always use fresh list
          },
          expenses: {
            keyArgs: ["groupId"], // Cache per group
            merge: (_, incoming) => incoming,
          },
          groupBalances: {
            keyArgs: ["groupId"],
            merge: (_, incoming) => incoming,
          },
          groupActivities: {
            keyArgs: ["groupId"],
            merge: (_, incoming) => incoming,
          },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: "cache-and-network",
      nextFetchPolicy: "cache-first", // After initial fetch, use cache
    },
  },
});
