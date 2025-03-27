// Add this import at the top of your file
import { sessionStore } from '../services/session-store';
// Update your import to include the ParamsDictionary
import { Request, Response } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { DropletService } from '../services/droplet.service';
import { v4 as uuidv4 } from 'uuid';
import session from 'express-session';

// Define a more comprehensive SessionRequest interface
interface SessionRequest extends Request {
  session: session.Session & {
    id: string;
  };
}

export class DropletController {
  private dropletService: DropletService;
  
  constructor() {
    this.dropletService = new DropletService();
  }

  // Update the createDroplet method to properly store the user's IP:
  async createDroplet(req: SessionRequest, res: Response) {
    try {
      const { appName } = req.params;
      const sessionId = req.session.id;
      
      // Get the actual user IP address (considering proxies)
      const userIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      // Convert to string and handle array (x-forwarded-for can be comma-separated)
      const ipAddress = Array.isArray(userIp) ? userIp[0] : String(userIp);
      
      console.log(`Request from IP: ${ipAddress} to create ${appName} with session ${sessionId}`);
      
      // Check if this IP already has an active droplet
      if (this.dropletService.hasActiveDropletForIP(ipAddress)) {
        // Get the existing droplet for this IP
        const existingDroplet = this.dropletService.getDropletForIP(ipAddress);
        
        return res.status(200).json({
          message: 'Using existing droplet',
          droplet: existingDroplet
        });
      }
      
      // Create a new droplet for this user with their IP address
      const droplet = await this.dropletService.createDropletForUser(appName, sessionId, ipAddress);
      
      // Associate this IP with the session
      this.dropletService.associateIPWithSession(ipAddress, sessionId);
      
      return res.status(201).json({
        message: 'Droplet is being created',
        droplet
      });
    } catch (error: any) {
      console.error('Error creating droplet:', error);
      return res.status(500).json({
        error: error.message || String(error)
      });
    }
  }

  // Delete a droplet
  deleteDroplet = async (req: Request, res: Response) => {
    try {
      const dropletId = parseInt(req.params.id, 10); // Convert string to number
      await this.dropletService.deleteDroplet(dropletId);
      return res.status(200).json({ success: true });
    } catch (error: any) { // Explicitly type error as any 
      console.error('Error deleting droplet:', error);
      return res.status(500).json({ error: error.message || String(error) });
    }
  }
  
  // List all droplets
  listDroplets = async (req: Request, res: Response) => {
    try {
      const droplets = await this.dropletService.listDroplets();
      return res.status(200).json(droplets);
    } catch (error: any) { // Explicitly type error as any
      console.error('Error listing droplets:', error);
      return res.status(500).json({ error: error.message || String(error) });
    }
  }
  
  // Update the handleAppRequest method to check for IP-based sessions:

  handleAppRequest = async (req: Request, res: Response) => {
    try {
      const { appName } = req.params;
      const sessionId = (req as any).session?.id || uuidv4();
      
      // Enhanced IP extraction and logging
      const userIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
      const ipAddress = Array.isArray(userIp) ? userIp[0] : String(userIp).split(',')[0].trim();

      console.log(`Request for app: ${appName} from IP: ${ipAddress} with session: ${sessionId}`);
      
      // IMPORTANT CHANGE: First check if this IP already has any active session
      const existingSessionId = this.dropletService.getSessionForIP(ipAddress);
      
      if (existingSessionId) {
        const existingDroplet = this.dropletService.getDropletForSession(existingSessionId);
        
        if (existingDroplet) {
          // If user is requesting the same app they already have
          if (existingDroplet.appName === appName) {
            
            // Refresh the TTL and redirect to existing instance
            this.dropletService.refreshDropletTTL(existingSessionId);
            const redirectUrl = `http://${existingDroplet.ip}:${existingDroplet.port}`;
            return res.redirect(redirectUrl);
          } else {
            // User is requesting a different app - show the confirmation page
            
            return res.status(200).send(`
              <!DOCTYPE html>
              <html>
                <head>
                  <title>Switch Application?</title>
                  <style>
                    body {
                      font-family: Arial, sans-serif;
                      max-width: 600px;
                      margin: 0 auto;
                      padding: 20px;
                      text-align: center;
                    }
                    .container {
                      background-color: white;
                      padding: 20px;
                      border-radius: 8px;
                      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    }
                    h1 { color: #d32f2f; }
                    .warning { color: #d32f2f; font-weight: bold; }
                    .buttons {
                      margin-top: 20px;
                      display: flex;
                      justify-content: center;
                      gap: 10px;
                    }
                    .btn {
                      padding: 10px 20px;
                      border: none;
                      border-radius: 4px;
                      cursor: pointer;
                      font-size: 16px;
                    }
                    .btn-continue {
                      background-color: #d32f2f;
                      color: white;
                    }
                    .btn-cancel {
                      background-color: #e0e0e0;
                      color: #333;
                    }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <h1>Warning: Application Switch</h1>
                    <p>You currently have <strong>${existingDroplet.appName}</strong> running.</p>
                    <p class="warning">Starting a new challenge will terminate any other challenge you have running. Continue?</p>
                    
                    <div class="buttons">
                      <form action="/switch/${appName}" method="GET">
                        <input type="hidden" name="oldSession" value="${existingSessionId}">
                        <button type="submit" class="btn btn-continue">Yes, Continue</button>
                      </form>
                      <a href="http://${existingDroplet.ip}:${existingDroplet.port}">
                        <button type="button" class="btn btn-cancel">No, Return to ${existingDroplet.appName}</button>
                      </a>
                    </div>
                  </div>
                </body>
              </html>
            `);
          }
        }
      }
      
      // Normal flow if no existing IP session is found
      // Check if this user already has a droplet for their current session ID
      const droplet = this.dropletService.getDropletForSession(sessionId);
      
      if (!droplet) {

        // IMPORTANT: Create the droplet BEFORE showing the waiting page
        // Don't use .then() here - we want to wait for this to complete or fail synchronously
        try {
          await this.dropletService.createDropletForUser(appName, sessionId, ipAddress);
        } catch (dropletError: any) { // Add ": any" to fix the TypeScript error
          // Continue to show waiting page even if there's an error, as it will retry
        }
        
        // Now show the waiting page with spinner
        return res.status(202).send(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Preparing your environment...</title>
              <style>
                body {
                  font-family: Arial, sans-serif;
                  max-width: 800px;
                  margin: 0 auto;
                  padding: 20px;
                }
                #status {
                  margin-top: 20px;
                  padding: 10px;
                  background-color: #f8f9fa;
                  border-radius: 4px;
                }
                .spinner {
                  display: inline-block;
                  width: 20px;
                  height: 20px;
                  border: 3px solid rgba(0,0,0,.3);
                  border-radius: 50%;
                  border-top-color: #007bff;
                  animation: spin 1s ease-in-out infinite;
                  margin-right: 10px;
                }
                @keyframes spin {
                  to { transform: rotate(360deg); }
                }
                .notice {
                  margin-top: 30px;
                  padding: 15px;
                  background-color: #ffeedd;
                  border-left: 4px solid #ff9800;
                  text-align: left;
                  border-radius: 4px;
                }
                .notice h3 {
                  margin-top: 0;
                  color: #e65100;
                }
              </style>
              <script>
                // Wait for DOM to load before accessing elements
                document.addEventListener('DOMContentLoaded', function() {
                  const statusElement = document.getElementById('status');
                  
                  function checkStatus() {
                    if (!statusElement) {
                      console.error('Status element not found in DOM');
                      return;
                    }
                    
                    fetch('/status/${sessionId}')
                      .then(response => {
                        if (!response.ok && response.status !== 404) {
                          setTimeout(checkStatus, 5000);
                          return null;
                        }
                        return response.json();
                      })
                      .then(data => {
                        if (!data) return;

                        if (data.ready) {
                          statusElement.textContent = 'Your droplet is ready! Redirecting you shortly...';
                          
                          const delayMs = data.delayRedirect || 5000;
                          let countdown = Math.floor(delayMs / 1000);
                          statusElement.textContent = 'Your droplet is ready! Redirecting in ' + countdown + ' seconds...';
                          
                          const countdownInterval = setInterval(() => {
                            countdown--;
                            statusElement.textContent = 'Your droplet is ready! Redirecting in ' + countdown + ' seconds...';
                            
                            if (countdown <= 0) {
                              clearInterval(countdownInterval);
                              window.location.href = 'http://' + data.ip + ':' + data.port;
                            }
                          }, 1000);
                        } else if (data.error) {
                          statusElement.textContent = data.message || 'Error checking status. Retrying...';
                          setTimeout(checkStatus, 5000);
                        } else {
                          statusElement.textContent = 'Still preparing your environment. Please wait...';
                          setTimeout(checkStatus, 5000);
                        }
                      })
                      .catch(error => {
                        console.error('Error checking status:', error);
                        if (statusElement) {
                          statusElement.textContent = 'Error checking droplet status. Retrying in 5 seconds...';
                        }
                        setTimeout(checkStatus, 5000);
                      });
                  }
                  
                  setTimeout(checkStatus, 2000);
                });
              </script>
            </head>
            <body>
              <h1>Preparing your personal ${appName} environment...</h1>
              <p>This may take a few minutes. Please don't close this page.</p>
              <div><span class="spinner"></span> Creating and configuring your environment...</div>
              <div id="status">Initializing...</div>
              <div class="notice">
              <h3>⚠️ Important Notice</h3>
              <p>Your instance will be terminated after <strong>1 hour</strong>.</p>
              <p>To refresh the timer, visit this URL again:</p>
              <p><strong>${req.protocol}://${req.get('host')}${req.originalUrl}</strong></p>
              </div>
            </body>
          </html>
        `);
      } else {
        const redirectUrl = `http://${droplet.ip}:${droplet.port}`;
        return res.redirect(redirectUrl);
      }
    } catch (error: any) { // Explicitly type error as any
      console.error('Error handling app request:', error);
      return res.status(500).json({ error: error.message || String(error) });
    }
  }
  
  // Check droplet status endpoint
  async checkDropletStatus(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;
      
      // Get the droplet for this session
      const droplet = this.dropletService.getDropletForSession(sessionId);
      
      if (!droplet) {
        return res.status(404).json({ 
          ready: false, 
          message: 'No droplet found for this session' 
        });
      }
      
      // Check if droplet is ready
      const isReady = await this.dropletService.isDropletReady(droplet.id);
      
      if (isReady) {
        // Get the latest droplet data to ensure we have the IP address
        const latestDropletData = await this.dropletService.getLatestDropletData(droplet.id);
        
        // Extract the public IP address
        const publicIp = latestDropletData.networks?.v4?.find(n => n.type === 'public')?.ip_address;
        
        if (!publicIp) {
          return res.status(200).json({
            ready: false,
            message: 'Droplet is ready but waiting for IP address allocation'
          });
        }
        
        // Update the stored droplet with the latest IP
        droplet.ip = publicIp;
        
        // Return success with the updated IP and a longer delay
        return res.status(200).json({
          ready: true,
          ip: publicIp, // Use the latest IP
          port: droplet.port,
          delayRedirect: 15000  // Increase from 5000 to 15000 (15 seconds)
        });
      } else {
        return res.status(200).json({
          ready: false,
          message: 'Droplet is still being prepared'
        });
      }
    } catch (error: any) {
      console.error('Error checking droplet status:', error);
      return res.status(500).json({
        ready: false,
        error: error.message || String(error)
      });
    }
  }

  // Add a new method to handle app switching
  switchApp = async (req: Request, res: Response) => {
    try {
      const { appName } = req.params;
      const oldSessionId = req.query.oldSession as string;
      
      if (!oldSessionId) {
        return res.status(400).json({ error: 'Missing oldSession parameter' });
      }
      
      // Get user's IP
      const ipAddress = req.headers['x-forwarded-for'] as string || 
                       req.socket.remoteAddress || 
                       'unknown';
      
      // Delete old droplet
      const oldDroplet = this.dropletService.getDropletForSession(oldSessionId);
      if (oldDroplet) {
        await this.dropletService.deleteDroplet(oldDroplet.id);
        this.dropletService.removeDropletForSession(oldSessionId);
      }
      
      // Create new session
      const sessionId = uuidv4();
      res.cookie('sessionId', sessionId, { maxAge: 24 * 60 * 60 * 1000, httpOnly: true });
      
      // Create new droplet
      const newDroplet = await this.dropletService.createDropletForUser(appName, sessionId, ipAddress);
      
      // Return a waiting page with important notice
      return res.status(202).send(`
        <html>
          <head>
            <title>Switching applications...</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
              }
              #status {
                margin-top: 20px;
                padding: 10px;
                background-color: #f8f9fa;
                border-radius: 4px;
              }
              .spinner {
                display: inline-block;
                width: 20px;
                height: 20px;
                border: 3px solid rgba(0,0,0,.3);
                border-radius: 50%;
                border-top-color: #007bff;
                animation: spin 1s ease-in-out infinite;
                margin-right: 10px;
              }
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
              .notice {
                margin-top: 30px;
                padding: 15px;
                background-color: #ffeedd;
                border-left: 4px solid #ff9800;
                text-align: left;
                border-radius: 4px;
              }
              .notice h3 {
                margin-top: 0;
                color: #e65100;
              }
            </style>
            <script>
              function checkStatus() {
                fetch('/status/${sessionId}')
                  .then(res => res.json())
                  .then(data => {
                    if (data.ready) {
                      window.location.href = 'http://' + data.ip + ':' + data.port;
                    } else {
                      setTimeout(checkStatus, 5000);
                    }
                  });
              }
              setTimeout(checkStatus, 5000);
            </script>
          </head>
          <body>
            <h1>Switching to ${appName}...</h1>
            <p>Your previous application has been terminated.</p>
            <p>This may take a few minutes. Please don't close this page.</p>
            <div><span class="spinner"></span> Creating and configuring your environment...</div>
            
            <div class="notice">
              <h3>⚠️ Important Notice</h3>
              <p>Your instance will be terminated after <strong>1 hour</strong>.</p>
              <p>To refresh the timer, visit this URL again:</p>
              <p><strong>${req.protocol}://${req.get('host')}/app/${appName}</strong></p>
            </div>
          </body>
        </html>
      `);
    } catch (error: any) {
      console.error('Error switching apps:', error);
      return res.status(500).json({ error: error.message || String(error) });
    }
  }

  // DropletController class:

  debugSessions = async (req: Request, res: Response) => {
    try {
      // Get active sessions from the droplet service
      const activeSessions = this.dropletService.getActiveSessions();
      
      // Format the sessions for display
      const formattedSessions = Array.from(activeSessions.entries()).map(
        (entry: [string, any]) => {
          const [sessionId, droplet] = entry;
          const timeRemainingMs = droplet.expiresAt ? 
            new Date(droplet.expiresAt).getTime() - Date.now() : 0;
          
          return {
            sessionId,
            dropletId: droplet.id,
            appName: droplet.appName,
            dropletIp: droplet.ip,
            userIp: this.normalizeIp(droplet.userIp),
            port: droplet.port,
            created: droplet.created,
            expiresAt: droplet.expiresAt,
            timeRemaining: Math.floor(timeRemainingMs / 1000 / 60) + ' minutes'
          };
        }
      );
      
      // Return the formatted data
      res.status(200).json({
        activeSessionsCount: activeSessions.size,
        sessions: formattedSessions,
        ipMappings: Array.from(sessionStore.getIpMap().entries())
      });
    } catch (error) {
      console.error('Error in debugSessions:', error);
      res.status(500).json({ error: 'Failed to retrieve session information' });
    }
  }
  
  /**
   * Helper method to normalize IP addresses (convert IPv6-mapped addresses to IPv4)
   */
  private normalizeIp(ip: string): string {
    if (!ip) return 'unknown';
    if (ip.startsWith('::ffff:')) {
      return ip.substring(7);
    }
    return ip;
  }
}