import { Request } from 'express';

export interface RequestWithToken extends Request {
  user?: {
    sub: number;
    email: string;
    role: string;
    type: string;
    service?: string;
  };
  serviceToken?: string;
}
