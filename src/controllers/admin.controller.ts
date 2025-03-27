import { Request, Response } from 'express';
import { DropletService } from '../services/droplet.service';

export class AdminController {
  private dropletService: DropletService;
  
  constructor() {
    this.dropletService = new DropletService();
  }
  
  // Render admin dashboard
  renderDashboard = async (req: Request, res: Response) => {
    try {
      // Simple authentication (in production, use proper auth)
      const authKey = req.query.key;
      if (authKey !== process.env.ADMIN_KEY) {
        return res.status(401).send('Unauthorized');
      }
      
      // Render admin panel with double quotes for JavaScript strings (not template literals)
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Droplet Manager - Admin Panel</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 0;
              padding: 20px;
              background-color: #f5f5f5;
            }
            h1, h2 { color: #333; }
            .container { 
              max-width: 1200px; 
              margin: 0 auto;
              background-color: white;
              padding: 20px;
              border-radius: 5px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .card {
              border: 1px solid #ddd;
              border-radius: 4px;
              padding: 15px;
              margin-bottom: 15px;
              background-color: white;
            }
            .actions {
              margin-top: 10px;
            }
            button {
              background-color: #4CAF50;
              border: none;
              color: white;
              padding: 8px 16px;
              text-align: center;
              text-decoration: none;
              display: inline-block;
              font-size: 14px;
              margin: 4px 2px;
              cursor: pointer;
              border-radius: 4px;
            }
            button.delete {
              background-color: #f44336;
            }
            button.restart {
              background-color: #2196F3;
            }
            button.refresh-ttl {
              background-color: #FF9800;
            }
            .loading {
              display: none;
              margin-top: 20px;
            }
            .stats {
              display: flex;
              justify-content: space-between;
              margin-bottom: 20px;
            }
            .stat-card {
              flex: 1;
              background-color: #e9f7ef;
              border: 1px solid #ddd;
              border-radius: 4px;
              padding: 15px;
              margin: 0 10px;
              text-align: center;
            }
            .refresh {
              background-color: #555;
              margin-bottom: 15px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Droplet Manager - Admin Panel</h1>
            
            <div class="stats">
              <div class="stat-card">
                <h3>Active Droplets</h3>
                <div id="activeCount">0</div>
              </div>
              <div class="stat-card">
                <h3>Total Memory Usage</h3>
                <div id="memoryUsage">0 GB</div>
              </div>
              <div class="stat-card">
                <h3>Estimated Cost</h3>
                <div id="costEstimate">$0.00/hour</div>
              </div>
            </div>
            
            <button class="refresh" onclick="loadDroplets()">Refresh Droplets</button>
            
            <h2>Active Droplets</h2>
            <div id="droplets-container"></div>
            
            <div id="loading" class="loading">Loading...</div>
          </div>
          
          <script>
            // Using string concatenation for the auth key to avoid escape issues
            const authKey = "${authKey}";
            
            // Load droplets on page load
            document.addEventListener('DOMContentLoaded', function() {
              loadDroplets();
            });
            
            function loadDroplets() {
              const container = document.getElementById('droplets-container');
              const loading = document.getElementById('loading');
              
              container.innerHTML = '';
              loading.style.display = 'block';
              
              fetch('/admin/api/droplets?key=' + authKey)
                .then(response => {
                  if (!response.ok) {
                    throw new Error('HTTP error! Status: ' + response.status);
                  }
                  return response.json();
                })
                .then(data => {
                  loading.style.display = 'none';
                  renderDroplets(data);
                })
                .catch(error => {
                  loading.style.display = 'none';
                  container.innerHTML = '<p>Error loading droplets: ' + error.message + '</p>';
                  console.error('Error:', error);
                });
            }
            
            function getStatusColor(status) {
              if (status === 'active') return 'green';
              if (status === 'new') return 'blue';
              return 'orange';
            }
            
            function deleteDroplet(id) {
              if (confirm('Are you sure you want to delete this droplet? This cannot be undone.')) {
                fetch('/admin/api/droplets/' + id + '?key=' + authKey, {
                  method: 'DELETE'
                })
                .then(response => response.json())
                .then(data => {
                  if (data.success) {
                    alert('Droplet deleted successfully');
                    loadDroplets();
                  } else {
                    alert('Error: ' + data.error);
                  }
                })
                .catch(error => {
                  alert('Error: ' + error.message);
                  console.error('Error:', error);
                });
              }
            }
            
            function restartDroplet(id) {
              if (confirm('Are you sure you want to restart this droplet?')) {
                fetch('/admin/api/droplets/' + id + '/reboot?key=' + authKey, {
                  method: 'POST'
                })
                .then(response => response.json())
                .then(data => {
                  if (data.success) {
                    alert('Droplet restart initiated');
                    loadDroplets();
                  } else {
                    alert('Error: ' + data.error);
                  }
                })
                .catch(error => {
                  alert('Error: ' + error.message);
                  console.error('Error:', error);
                });
              }
            }
            
            function refreshTTL(id) {
              if (confirm('Are you sure you want to refresh the TTL for this droplet?')) {
                fetch('/admin/api/droplets/' + id + '/refresh-ttl?key=' + authKey, {
                  method: 'POST'
                })
                .then(response => response.json())
                .then(data => {
                  if (data.success) {
                    alert('TTL refreshed successfully');
                    loadDroplets();
                  } else {
                    alert('Error: ' + data.error);
                  }
                })
                .catch(error => {
                  alert('Error: ' + error.message);
                  console.error('Error:', error);
                });
              }
            }
            
            function estimateMemory(droplets) {
              let total = 0;
              droplets.forEach(droplet => {
                const size = droplet.size_slug;
                if (size.includes('1gb')) total += 1;
                else if (size.includes('2gb')) total += 2;
                else if (size.includes('4gb')) total += 4;
                else if (size.includes('8gb')) total += 8;
                else total += 1; // Default
              });
              return total;
            }
            
            function estimateCost(droplets) {
              let hourly = 0;
              droplets.forEach(droplet => {
                const size = droplet.size_slug;
                if (size.includes('s-1vcpu-1gb')) hourly += 0.007;
                else if (size.includes('s-1vcpu-2gb')) hourly += 0.015;
                else if (size.includes('s-2vcpu-4gb')) hourly += 0.03;
                else hourly += 0.007; // Default
              });
              return hourly.toFixed(3);
            }

            function renderDroplets(data) {
              const container = document.getElementById('droplets-container');
              container.innerHTML = '';
              
              if (data.length === 0) {
                container.innerHTML = '<p>No active droplets found.</p>';
                return;
              }
              
              // Update stats
              document.getElementById('activeCount').innerText = data.length;
              document.getElementById('memoryUsage').innerText = estimateMemory(data) + ' GB';
              document.getElementById('costEstimate').innerText = '$' + estimateCost(data) + '/hour';
              
              // Render droplets
              data.forEach(droplet => {
                const card = document.createElement('div');
                card.className = 'card';
                
                // Format expiration date
                let expiresText = 'Unknown';
                if (droplet.expiresAt) {
                  try {
                    expiresText = new Date(droplet.expiresAt).toLocaleString();
                  } catch (e) {
                    expiresText = 'Invalid Date';
                  }
                }
                
                // Build HTML
                card.innerHTML = 
                  '<h3>' + droplet.name + '</h3>' +
                  '<p><strong>ID:</strong> ' + droplet.id + '</p>' +
                  '<p><strong>Droplet IP:</strong> ' + 
                    (droplet.networks?.v4 ? 
                      droplet.networks.v4.find(n => n.type === 'public')?.ip_address || 'Pending...' 
                      : 'Pending...') + '</p>' +
                  '<p><strong>User IP:</strong> ' + (droplet.userIp || 'Unknown') + '</p>' +
                  '<p><strong>App:</strong> ' + (droplet.appName || 'Unknown') + '</p>' +
                  '<p><strong>Status:</strong> <span style="color: ' + getStatusColor(droplet.status) + 
                    '">' + droplet.status + '</span></p>' +
                  '<p><strong>Created:</strong> ' + new Date(droplet.created_at).toLocaleString() + '</p>' +
                  '<p><strong>Expires:</strong> ' + expiresText + '</p>' +
                  '<p><strong>Size:</strong> ' + droplet.size_slug + '</p>' +
                  '<p><strong>Region:</strong> ' + droplet.region.name + '</p>' +
                  '<div class="actions">' +
                  '  <button onclick="refreshTTL(' + droplet.id + ')" class="refresh-ttl">Refresh TTL</button>' +
                  '  <button onclick="restartDroplet(' + droplet.id + ')" class="restart">Restart</button>' +
                  '  <button onclick="deleteDroplet(' + droplet.id + ')" class="delete">Delete</button>' +
                  '</div>';
                
                container.appendChild(card);
              });
            }
          </script>
        </body>
        </html>
      `);
    } catch (error: any) {
      console.error('Error rendering admin dashboard:', error);
      return res.status(500).json({ error: error.message || String(error) });
    }
  }
  
  // API - List all droplets
  listAllDroplets = async (req: Request, res: Response) => {
    try {
      // Simple authentication
      const authKey = req.query.key;
      if (authKey !== process.env.ADMIN_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      // Get droplets from DO API
      const apiDroplets = await this.dropletService.listDroplets();
      
      // Get all active sessions with their droplet info
      const activeSessions = this.dropletService.getActiveSessions();
      
      // Map of droplet ID (as string) to session info
      const dropletIdToSession = new Map();
      
      // Store ID mappings
      for (const [sessionId, droplet] of activeSessions) {
        if (droplet && droplet.id) {
          const idAsNumber = typeof droplet.id === 'string' ? parseInt(droplet.id, 10) : droplet.id;
          const idAsString = String(droplet.id);
          
          dropletIdToSession.set(idAsNumber, {
            sessionId,
            appName: droplet.appName,
            userIp: droplet.userIp,
            expiresAt: droplet.expiresAt
          });
          
          dropletIdToSession.set(idAsString, {
            sessionId, 
            appName: droplet.appName,
            userIp: droplet.userIp,
            expiresAt: droplet.expiresAt
          });
        }
      }
      
      // Enhance the droplets with session info
      const enhancedDroplets = apiDroplets.map(droplet => {
        const dropletIdNum = typeof droplet.id === 'string' ? parseInt(droplet.id, 10) : droplet.id;
        const dropletIdStr = String(droplet.id);
        
        // Check both string and numeric formats
        const sessionInfo = dropletIdToSession.get(dropletIdNum) || 
                           dropletIdToSession.get(dropletIdStr);
        
        if (sessionInfo) {
          return {
            ...droplet,
            userIp: this.normalizeIp(sessionInfo.userIp),
            appName: sessionInfo.appName || 'unknown',
            expiresAt: sessionInfo.expiresAt || null
          };
        } else {
          // Try to find session ID from droplet name
          let matchedSession: { 
            sessionId: string; 
            appName: any; 
            userIp: any; 
            expiresAt: any; 
          } | null = null;
          
          if (droplet.name) {
            const nameParts = droplet.name.split('-');
            if (nameParts.length >= 2) {
              // Try to match with a UUID pattern
              const uuidRegex = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
              const match = droplet.name.match(uuidRegex);
              
              if (match && match[1]) {
                const potentialSessionId = match[1];
                if (activeSessions.has(potentialSessionId)) {
                  const sessionDroplet = activeSessions.get(potentialSessionId);
                  matchedSession = { 
                    sessionId: potentialSessionId,
                    appName: sessionDroplet.appName,
                    userIp: sessionDroplet.userIp,
                    expiresAt: sessionDroplet.expiresAt
                  };
                }
              }
            }
          }
          
          if (matchedSession) {
            return {
              ...droplet,
              userIp: this.normalizeIp(matchedSession.userIp),
              appName: matchedSession.appName || 'unknown',
              expiresAt: matchedSession.expiresAt || null
            };
          }
          
          // Try parsing app name from droplet name as fallback
          let appName = 'unknown';
          if (droplet.name && droplet.name.includes('-')) {
            appName = droplet.name.split('-')[0];
          }
          
          return {
            ...droplet,
            userIp: 'unknown',
            appName: appName,
            expiresAt: null
          };
        }
      });
      
      return res.status(200).json(enhancedDroplets);
    } catch (error: any) {
      console.error('Error listing droplets:', error);
      return res.status(500).json({ error: error.message || String(error) });
    }
  }
  
  /**
   * Helper method to normalize IP addresses
   */
  private normalizeIp(ip: string): string {
    if (!ip) return 'unknown';
    if (ip.startsWith('::ffff:')) {
      return ip.substring(7);
    }
    return ip;
  }
  
  // API - Delete a droplet
  deleteDroplet = async (req: Request, res: Response) => {
    try {
      // Simple authentication
      const authKey = req.query.key;
      if (authKey !== process.env.ADMIN_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const dropletId = parseInt(req.params.id, 10);
      await this.dropletService.deleteDroplet(dropletId);
      
      // Also remove from active droplets map if exists
      this.dropletService.removeDropletById(dropletId);
      
      return res.status(200).json({ success: true });
    } catch (error: any) {
      console.error('Error deleting droplet:', error);
      return res.status(500).json({ error: error.message || String(error) });
    }
  }
  
  // API - Reboot a droplet
  rebootDroplet = async (req: Request, res: Response) => {
    try {
      // Simple authentication
      const authKey = req.query.key;
      if (authKey !== process.env.ADMIN_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const dropletId = parseInt(req.params.id, 10);
      await this.dropletService.rebootDroplet(dropletId);
      return res.status(200).json({ success: true });
    } catch (error: any) {
      console.error('Error rebooting droplet:', error);
      return res.status(500).json({ error: error.message || String(error) });
    }
  }

  // API - Refresh droplet TTL
  refreshDropletTTL = async (req: Request, res: Response) => {
    try {
      const authKey = req.query.key;
      if (authKey !== process.env.ADMIN_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const dropletId = parseInt(req.params.id, 10);
      if (isNaN(dropletId)) {
        return res.status(400).json({ error: 'Invalid droplet ID' });
      }
      
      // Use the new method to find session by droplet ID
      const sessionInfo = this.dropletService.getSessionByDropletId(dropletId);
      if (!sessionInfo) {
        return res.status(404).json({ error: 'No session found for this droplet' });
      }
      
      // Refresh the TTL for the found session
      const refreshed = this.dropletService.refreshDropletTTL(sessionInfo.sessionId);

      if (refreshed) {
        return res.status(200).json({ success: true });
      } else {
        return res.status(500).json({ error: 'Failed to refresh TTL' });
      }
    } catch (error: any) {
      console.error('Error refreshing droplet TTL:', error);
      return res.status(500).json({ error: error.message || String(error) });
    }
  };

  // Add this method to help with droplet ID to session ID mapping
  storeDropletIdMapping(dropletId: number, sessionId: string) {
    if (!global.dropletIdToSessionMap) {
      global.dropletIdToSessionMap = new Map();
    }
    global.dropletIdToSessionMap.set(dropletId, sessionId);
    global.dropletIdToSessionMap.set(String(dropletId), sessionId);
  }
}