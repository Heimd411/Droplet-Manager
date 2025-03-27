import { DigitalOceanService } from './digitalocean.service';
import { sessionStore } from './session-store';
import APP_DROPLET_MAP, { AppConfig, AppDropletMap } from '../config/app-config';

// Keep them but in a more concise form:
console.log(`Available applications: ${Object.keys(APP_DROPLET_MAP).join(', ')}`);

export class DropletService {
  private doService: DigitalOceanService;
  
  constructor() {
    this.doService = new DigitalOceanService();
    
    // Set up periodic check for expired droplets
    setInterval(() => this.cleanupExpiredDroplets(), 60000); // Check every minute
  }
  
  // SESSION MANAGEMENT METHODS
  
  /**
   * Get all active sessions
   */
  getActiveSessions(): Map<string, any> {
    return sessionStore.getSessions();
  }
  
  /**
   * Get droplet for a specific session
   */
  getDropletForSession(sessionId: string): any {
    return sessionStore.getSession(sessionId);
  }
  
  /**
   * Get session by droplet ID
   */
  getSessionByDropletId(dropletId: number): { sessionId: string; sessionData: any } | null {
    return sessionStore.getSessionByDropletId(dropletId);
  }
  
  /**
   * Associate IP with session
   */
  associateIPWithSession(ipAddress: string, sessionId: string): void {
    sessionStore.associateIP(ipAddress, sessionId);
  }
  
  /**
   * Get session by IP address
   */
  getSessionByIP(ipAddress: string): string | undefined {
    return sessionStore.getSessionByIP(ipAddress);
  }
  
  /**
   * Refresh TTL for a droplet
   */
  refreshDropletTTL(sessionId: string): boolean {
    try {
      // Get the droplet for this session
      const droplet = sessionStore.getSession(sessionId);
      if (!droplet) {
        return false;
      }
      
      // Update expiration time - 1 hour from now
      const newExpiration = new Date(Date.now() + 3600000);
      
      return sessionStore.updateSession(sessionId, { expiresAt: newExpiration });
    } catch (error) {
      console.error('Error refreshing droplet TTL:', error);
      return false;
    }
  }
  
  /**
   * Remove session by droplet ID
   */
  removeDropletById(dropletId: number): boolean {
    return sessionStore.deleteSessionByDropletId(dropletId);
  }
  
  /**
   * Remove a droplet from the session tracking
   */
  removeDropletForSession(sessionId: string): void {
    // Get the session to find its IP
    const session = sessionStore.getSession(sessionId);
    if (session && session.userIp) {
      sessionStore.removeIPMapping(session.userIp);
    }
    
    sessionStore.deleteSession(sessionId);
  }
  
  /**
   * Get droplet for an IP address
   */
  getDropletForIP(ipAddress: string): any {
    const sessionId = this.getSessionForIP(ipAddress);
    if (sessionId) {
      return this.getDropletForSession(sessionId);
    }
    return null;
  }
  
  /**
   * Check if IP already has a droplet
   */
  hasActiveDropletForIP(ipAddress: string): boolean {
    const sessionId = this.getSessionForIP(ipAddress);
    return sessionId !== null;
  }
  
  /**
   * Get session ID for an IP
   */
  getSessionForIP(ipAddress: string): string | null {
    return sessionStore.getSessionByIP(ipAddress) || null;
  }
  
  /**
   * Get session info for a droplet ID
   */
  getSessionInfoForDroplet(dropletId: number): { sessionId: string, ip: string, appName: string } | null {
    const sessionInfo = sessionStore.getSessionByDropletId(dropletId);
    if (sessionInfo) {
      return {
        sessionId: sessionInfo.sessionId,
        ip: sessionInfo.sessionData.userIp || 'unknown',
        appName: sessionInfo.sessionData.appName || 'unknown'
      };
    }
    return null;
  }
  
  // DROPLET MANAGEMENT METHODS
  
  /**
   * Create a new droplet for a user
   */
  async createDropletForUser(appName: string, sessionId: string, ipAddress: string): Promise<any> {
    try {
      // Get app configuration
      const appConfig = APP_DROPLET_MAP[appName];
      if (!appConfig) {
        throw new Error(`Application ${appName} not found`);
      }
      
      // Create droplet name
      const dropletName = `${appName}-${sessionId}-${Date.now()}`;
      
      // Create the droplet
      const newDroplet = await this.doService.cloneDroplet(
        appConfig.dropletId, 
        dropletName, 
        appConfig.region, 
        appConfig.size
      );
      
      if (!newDroplet || !newDroplet.id) {
        throw new Error('Failed to create droplet: Invalid response from API');
      }
      
      // Set expiration time - 1 hour from now
      const expiresAt = new Date(Date.now() + 3600000);
      
      // Create droplet info object
      const dropletInfo = {
        id: newDroplet.id,
        appName,
        created: new Date(),
        expiresAt,
        port: appConfig.port,
        ip: newDroplet.networks?.v4?.find((n: any) => n.type === 'public')?.ip_address,
        userIp: ipAddress
      };
      
      // Store in session and IP maps
      sessionStore.setSession(sessionId, dropletInfo);
      this.associateIPWithSession(ipAddress, sessionId);
      
      return newDroplet;
    } catch (error) {
      console.error('Error creating droplet:', error);
      throw error;
    }
  }
  
  /**
   * Clean up expired droplets
   */
  async cleanupExpiredDroplets(): Promise<void> {
    try {
      const now = new Date();
      const sessions = sessionStore.getSessions();
      
      for (const [sessionId, droplet] of sessions) {
        if (droplet.expiresAt && new Date(droplet.expiresAt) < now) {
          try {
            // Delete from DigitalOcean
            await this.doService.deleteDroplet(droplet.id);
            
            // Remove from session store
            sessionStore.deleteSession(sessionId);
          } catch (error) {
            console.error(`Error deleting expired droplet ${droplet.id}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Error in cleanupExpiredDroplets:', error);
    }
  }
  
  /**
   * Get app source ID
   */
  getDropletSourceId(appName: string): number | null {
    const config = APP_DROPLET_MAP[appName];
    return config?.dropletId || null;
  }
  
  /**
   * Get app port
   */
  getAppPort(appName: string): number | null {
    return APP_DROPLET_MAP[appName]?.port || 80; // Default to 80 if not specified
  }
  
  /**
   * List all droplets
   */
  async listDroplets() {
    return await this.doService.listDroplets();
  }
  
  /**
   * Delete a droplet
   */
  async deleteDroplet(dropletId: number) {
    return await this.doService.deleteDroplet(dropletId);
  }
  
  /**
   * Wait for a droplet to be ready
   */
  async waitForDropletReady(dropletId: number, maxAttempts = 30, interval = 5000) {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      if (await this.doService.isDropletReady(dropletId)) {
        return await this.doService.getDroplet(dropletId);
      }
      
      await new Promise(resolve => setTimeout(resolve, interval));
      attempts++;
    }
    
    throw new Error('Droplet creation timed out');
  }
  
  /**
   * Check if a droplet still exists
   */
  async checkDropletExists(dropletId: number): Promise<boolean> {
    try {
      await this.doService.getDroplet(dropletId);
      return true;
    } catch (error) {
      // If we get a 404, the droplet doesn't exist
      if (error instanceof Error && error.message.includes('404')) {
        return false;
      }
      // For other errors, re-throw
      throw error;
    }
  }
  
  /**
   * Reboot a droplet
   */
  async rebootDroplet(dropletId: number) {
    return await this.doService.rebootDroplet(dropletId);
  }
  
  /**
   * Check if droplet is ready
   */
  async isDropletReady(dropletId: number): Promise<boolean> {
    try {
      return await this.doService.isDropletReady(dropletId);
    } catch (error) {
      console.error(`Error checking if droplet ${dropletId} is ready:`, error);
      // Assume it's ready if we can't check (to prevent users getting stuck)
      return true;
    }
  }
  
  /**
   * Get the latest data for a droplet
   */
  async getLatestDropletData(dropletId: number): Promise<any> {
    return await this.doService.getDroplet(dropletId);
  }
}