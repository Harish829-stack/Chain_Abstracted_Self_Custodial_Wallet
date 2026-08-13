import jwksRsa from "jwks-rsa";
import jwt from "jsonwebtoken";
import type { FastifyRequest, FastifyReply } from "fastify";

// Lazily created so this module can be imported before dotenv runs
let jwksClient: jwksRsa.JwksClient | null = null;

function getJwksClient(): jwksRsa.JwksClient {
  if (!jwksClient) {
    const uri = process.env.JWKS_ENDPOINT;
    if (!uri) throw new Error("JWKS_ENDPOINT env var is not set");
    jwksClient = jwksRsa({
      jwksUri: uri,
      cache: true,
      cacheMaxAge: 60 * 60 * 1000, // 1 hour
    });
  }
  return jwksClient;
}

function getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) {
  getJwksClient().getSigningKey(header.kid, (err, key) => {
    if (err || !key) return callback(err ?? new Error("No signing key found"));
    callback(null, key.getPublicKey());
  });
}

export interface JwtPayload extends jwt.JwtPayload {
  sub: string;
  email?: string;
  environment_id?: string;
}

/**
 * Fastify preHandler that validates the Dynamic-issued JWT.
 * Sets request.jwtPayload on success.
 */
export async function verifyJwt(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return reply.status(401).send({ error: "Missing or malformed Authorization header" });
  }

  const token = authHeader.slice(7);

  return new Promise<void>((resolve) => {
    jwt.verify(token, getKey, { algorithms: ["RS256"] }, (err, decoded) => {
      if (err || !decoded) {
        reply.status(401).send({ error: "Invalid or expired token" });
        return resolve();
      }
      (request as FastifyRequest & { jwtPayload: JwtPayload }).jwtPayload =
        decoded as JwtPayload;
      resolve();
    });
  });
}
