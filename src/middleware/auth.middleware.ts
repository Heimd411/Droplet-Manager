import { Request, Response, NextFunction } from 'express';

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers['authorization'];

    if (!token) {
        return res.status(401).json({ message: 'Unauthorized access' });
    }

    // Here you would typically verify the token and check its validity
    // For example, using a library like jsonwebtoken

    // If the token is valid, proceed to the next middleware or route handler
    next();
};