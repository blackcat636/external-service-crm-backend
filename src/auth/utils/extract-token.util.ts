import { Request } from 'express';
import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Extract service token from Authorization header
 * @param req - Express request object
 * @returns Service token or null if not found
 */
export function extractServiceToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return null;
  }
  
  const token = authHeader.replace('Bearer ', '');
  return token || null;
}

/**
 * Extract service token from Authorization header and throw error if not found
 * @param req - Express request object
 * @returns Service token
 * @throws HttpException if token is not found
 */
export function requireServiceToken(req: Request): string {
  const token = extractServiceToken(req);
  if (!token) {
    throw new HttpException(
      'Service token is required',
      HttpStatus.UNAUTHORIZED,
    );
  }
  return token;
}
