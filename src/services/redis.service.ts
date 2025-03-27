import { createClient } from 'redis';

export class RedisService {
  private client;
  private isConnected = false;

  constructor() {
    const redisUrl = `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`;
    
    this.client = createClient({
      url: redisUrl,
      password: process.env.REDIS_PASSWORD
    });
    
    // Connect to Redis if credentials are provided
    if (process.env.REDIS_HOST && process.env.REDIS_PORT) {
      this.connect();
    }
  }

  private async connect() {
    try {
      await this.client.connect();
      this.isConnected = true;
      console.log('Redis connected successfully');
    } catch (error) {
      console.error('Redis connection failed:', error);
      this.isConnected = false;
    }
  }

  async storeDropletInfo(sessionId: string, dropletInfo: any) {
    if (!this.isConnected) return;
    
    try {
      await this.client.set(`droplet:${sessionId}`, JSON.stringify(dropletInfo));
    } catch (error) {
      console.error('Error storing droplet info:', error);
    }
  }

  async getDropletInfo(sessionId: string) {
    if (!this.isConnected) return null;
    
    try {
      const data = await this.client.get(`droplet:${sessionId}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting droplet info:', error);
      return null;
    }
  }

  public async set(key: string, value: string, expirationInSeconds?: number): Promise<void> {
    if (!this.isConnected) return;
    
    try {
      if (expirationInSeconds) {
        await this.client.setEx(key, expirationInSeconds, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      console.error('Error setting key:', error);
    }
  }

  public async get(key: string): Promise<string | null> {
    if (!this.isConnected) return null;
    
    try {
      return await this.client.get(key);
    } catch (error) {
      console.error('Error getting key:', error);
      return null;
    }
  }

  public async delete(key: string): Promise<void> {
    if (!this.isConnected) return;
    
    try {
      await this.client.del(key);
    } catch (error) {
      console.error('Error deleting key:', error);
    }
  }

  public async quit(): Promise<void> {
    if (!this.isConnected) return;
    
    try {
      await this.client.quit();
    } catch (error) {
      console.error('Error quitting Redis:', error);
    }
  }
}