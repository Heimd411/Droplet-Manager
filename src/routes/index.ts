import { Express } from 'express';
import { DropletController } from '../controllers/droplet.controller';
import { AdminController } from '../controllers/admin.controller';

export const setRoutes = (app: Express) => {
  const dropletController = new DropletController();
  const adminController = new AdminController();

  // Health check route
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });
  
  // ADMIN ROUTES - Place these BEFORE the appName route
  app.get('/admin', adminController.renderDashboard);
  app.get('/admin/api/droplets', adminController.listAllDroplets);
  app.delete('/admin/api/droplets/:id', adminController.deleteDroplet);
  app.post('/admin/api/droplets/:id/reboot', adminController.rebootDroplet);
  // Add this route for refreshing TTL
  app.post('/admin/api/droplets/:id/refresh-ttl', adminController.refreshDropletTTL);
  
  // Add this after your existing admin routes:

  // Debug endpoint for viewing active sessions (protected with admin key)
  app.get('/debug/sessions', (req, res, next) => {
    const adminKey = req.query.key;
    if (adminKey === process.env.ADMIN_KEY) {
      next();
    } else {
      res.status(403).json({ error: 'Unauthorized' });
    }
  }, dropletController.debugSessions);
  
  // Status check route
  app.get('/status/:sessionId', (req, res) => dropletController.checkDropletStatus(req as any, res));
  
  // Add the switch route
  app.get('/switch/:appName', dropletController.switchApp);
  
  // APPLICATION ROUTES - Place this generic route LAST
  app.get('/:appName', dropletController.handleAppRequest);
};