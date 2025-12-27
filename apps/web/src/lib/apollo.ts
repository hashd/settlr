import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
} from "@apollo/client/core";
import { setContext } from "@apollo/client/link/context";
import { useAuthStore } from "@/stores/auth";

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

export const apolloClient = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: "cache-and-network",
    },
  },
});
