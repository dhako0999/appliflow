import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

export interface AuthenticatedRequest extends Request {
    user?: {
        sub: string;
        email?: string;
    }
}

export function authenticateUser(
   req: AuthenticatedRequest,
   res: Response,
   next: NextFunction
) {

    const authHeader = req.headers.authorization;

    if(!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Missing token" });
    }

    const token = authHeader.split(" ")[1];

    try {

        const decoded = jwt.decode(token) as {
            sub: string;
            email?: string;
        };

        req.user = decoded;

        next();

    } catch {
        return res.status(401).json({ error: "Invalid token "});
    }


}