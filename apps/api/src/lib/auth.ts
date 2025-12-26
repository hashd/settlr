import jwt from "jsonwebtoken";

const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

interface JWTPayload {
  sub: string; // User ID
  email?: string;
  user_metadata?: {
    name?: string;
    avatar_url?: string;
  };
  aud: string;
  exp: number;
}

export function verifyToken(token: string): JWTPayload | null {
  if (!SUPABASE_JWT_SECRET) {
    console.warn("SUPABASE_JWT_SECRET not set, skipping verification");
    return null;
  }

  try {
    // Supabase JWT secrets can be used directly or may need base64 decoding
    // Try both approaches
    let decoded: JWTPayload | null = null;

    // First try with the secret as-is
    try {
      decoded = jwt.verify(token, SUPABASE_JWT_SECRET, {
        algorithms: ["HS256"],
      }) as JWTPayload;
    } catch {
      // If that fails, try base64 decoding the secret
      try {
        const decodedSecret = Buffer.from(SUPABASE_JWT_SECRET, "base64");
        decoded = jwt.verify(token, decodedSecret, {
          algorithms: ["HS256"],
        }) as JWTPayload;
      } catch {
        // If both fail, decode without verification for debugging
        const unverified = jwt.decode(token) as JWTPayload;
        console.log(
          "Token decoded (unverified):",
          unverified?.sub,
          unverified?.email
        );

        // For development, accept the unverified token
        if (process.env.NODE_ENV !== "production" && unverified) {
          console.warn("⚠️  Using unverified token in development mode");
          return unverified;
        }
        throw new Error("JWT verification failed with both secret formats");
      }
    }

    return decoded;
  } catch (error) {
    console.error("JWT verification failed:", error);
    return null;
  }
}

export function extractToken(authHeader: string | null): string | null {
  if (!authHeader) return null;

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return null;
  }

  return parts[1];
}
