import { Request, Response } from 'express';
import { DropletService } from '../services/droplet.service';

export class ProxyController {
    private dropletService: DropletService;

    constructor() {
        this.dropletService = new DropletService();
    }

    // Proxy requests to the appropriate droplet
    proxyRequest = (req: Request, res: Response) => {
        try {
            const sessionId = req.cookies?.sessionId;

            if (!sessionId) {
                return res.status(401).json({ error: 'No session found' });
            }

            const droplet = this.dropletService.getDropletForSession(sessionId);

            if (!droplet) {
                return res.status(404).json({ error: 'No droplet found for your session' });
            }

            // Construct droplet URL
            const dropletUrl = `http://${droplet.ip}`;

            // In a real implementation, you would use http-proxy or similar
            // to actually proxy the request rather than redirect
            res.redirect(dropletUrl);
        } catch (error) {
            console.error('Error proxying request:', error);
            res.status(500).json({ error: String(error) });
        }
    }
}