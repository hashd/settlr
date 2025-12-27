import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";

const SUPABASE_JWT_SECRET =
  process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL;

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

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  // 1. Try RS256 with JWKS (The latest standard)
  if (SUPABASE_URL) {
    try {
      const client = jwksClient({
        jwksUri: `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`,
      });

      function getKey(header: any, callback: any) {
        client.getSigningKey(header.kid, function (err, key) {
          if (err) {
            callback(err, null);
            return;
          }
          const signingKey = key?.getPublicKey();
          callback(null, signingKey);
        });
      }

      const decoded = await new Promise<JWTPayload | null>((resolve) => {
        jwt.verify(token, getKey, { algorithms: ["ES256"] }, (err, decoded) => {
          if (err) {
            resolve(null);
          } else {
            resolve(decoded as JWTPayload);
          }
        });
      });

      if (decoded) return decoded;
    } catch (error) {
      // Silent fail to fall back to Secret
    }
  }

  // 2. Fallback to Legacy ES256 with Secret
  if (!SUPABASE_JWT_SECRET) {
    console.warn("SUPABASE_JWT_SECRET not set, skipping legacy verification");
    return null;
  }

  try {
    // Supabase JWT secrets can be used directly or may need base64 decoding
    // Try both approaches
    let decoded: JWTPayload | null = null;

    // First try with the secret as-is
    try {
      decoded = jwt.verify(token, SUPABASE_JWT_SECRET, {
        algorithms: ["ES256"],
      }) as JWTPayload;
    } catch {
      // If that fails, try base64 decoding the secret
      try {
        const decodedSecret = Buffer.from(SUPABASE_JWT_SECRET, "base64");
        decoded = jwt.verify(token, decodedSecret, {
          algorithms: ["ES256"],
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
        return null;
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
