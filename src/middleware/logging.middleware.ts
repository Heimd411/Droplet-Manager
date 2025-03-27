import { Request, Response, NextFunction } from 'express';

export function loggingMiddleware(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    console.log(`Request Method: ${req.method}, Request URL: ${req.url}`);

    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`Response Status: ${res.statusCode}, Duration: ${duration}ms`);
    });

    next();
}