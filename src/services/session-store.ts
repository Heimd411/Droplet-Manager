import * as fs from 'fs';
import * as path from 'path';

export class SessionStore {
  private filePath: string;
  private sessions: Map<string, any>;
  private ipMap: Map<string, string>;
  
  constructor() {
    // Create data directory if it doesn't exist
    const dataDir = path.join(__dirname, '../../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    this.filePath = path.join(dataDir, 'sessions.json');
    this.sessions = new Map();
    this.ipMap = new Map();
    
    // Load existing data if available
    this.load();
    
    // Set up periodic saving
    setInterval(() => this.save(), 60000); // Save every minute
  }
  
  /**
   * Load sessions from file
   */
  private load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
        
        // Restore sessions
        if (data.sessions) {
          this.sessions = new Map(Object.entries(data.sessions));
        }
        
        // Restore IP mappings
        if (data.ipMap) {
          this.ipMap = new Map(Object.entries(data.ipMap));
        }
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  }
  
  /**
   * Save sessions to file
   */
  save() {
    try {
      // Convert Maps to plain objects for JSON serialization
      const data = {
        sessions: Object.fromEntries(this.sessions),
        ipMap: Object.fromEntries(this.ipMap)
      };
      
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error saving sessions:', error);
    }
  }
  
  /**
   * Get all sessions
   */
  getSessions(): Map<string, any> {
    return this.sessions;
  }
  
  /**
   * Get IP mappings
   */
  getIpMap(): Map<string, string> {
    return this.ipMap;
  }
  
  /**
   * Get session by ID
   */
  getSession(sessionId: string): any {
    return this.sessions.get(sessionId);
  }
  
  /**
   * Get session by droplet ID
   */
  getSessionByDropletId(dropletId: number): { sessionId: string; sessionData: any } | null {
    for (const [sessionId, data] of this.sessions.entries()) {
      if (data && data.id === dropletId) {
        return { sessionId, sessionData: data };
      }
    }
    return null;
  }
  
  /**
   * Set session
   */
  setSession(sessionId: string, data: any) {
    this.sessions.set(sessionId, data);
    this.save(); // Save immediately on session creation
  }
  
  /**
   * Update session
   */
  updateSession(sessionId: string, data: any): boolean {
    if (this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, { ...this.sessions.get(sessionId), ...data });
      this.save(); // Save immediately on update
      return true;
    }
    return false;
  }
  
  /**
   * Delete session
   */
  deleteSession(sessionId: string) {
    this.sessions.delete(sessionId);
    this.save(); // Save immediately on deletion
  }
  
  /**
   * Associate IP with session
   */
  associateIP(ip: string, sessionId: string) {
    this.ipMap.set(ip, sessionId);
  }
  
  /**
   * Get session by IP
   */
  getSessionByIP(ip: string): string | undefined {
    return this.ipMap.get(ip);
  }
  
  /**
   * Remove IP mapping
   */
  removeIPMapping(ip: string) {
    this.ipMap.delete(ip);
  }
  
  /**
   * Delete session by droplet ID
   */
  deleteSessionByDropletId(dropletId: number): boolean {
    const session = this.getSessionByDropletId(dropletId);
    if (session) {
      this.deleteSession(session.sessionId);
      return true;
    }
    return false;
  }
}

// Create singleton instance
export const sessionStore = new SessionStore();