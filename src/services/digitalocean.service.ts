import axios from 'axios';

export class DigitalOceanService {
  private apiKey: string;
  private baseUrl = 'https://api.digitalocean.com/v2';

  constructor() {
    this.apiKey = process.env.DO_API_TOKEN || '';
    
    if (!this.apiKey) {
      console.error('CRITICAL ERROR: DigitalOcean API key not found! Droplet creation will fail.');
    }
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };
  }

  // List all droplets
  async listDroplets() {
    try {
      const response = await axios.get(`${this.baseUrl}/droplets`, {
        headers: this.getHeaders()
      });
      return response.data.droplets;
    } catch (error) {
      console.error('Error listing droplets:', error);
      throw new Error(`Failed to list droplets: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Delete a droplet
  async deleteDroplet(id: number) {
    try {
      await axios.delete(`${this.baseUrl}/droplets/${id}`, {
        headers: this.getHeaders()
      });
      return { success: true };
    } catch (error) {
      console.error('Error deleting droplet:', error);
      throw new Error(`Failed to delete droplet: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Get droplet details by ID
  async getDroplet(id: number) {
    try {
      const response = await axios.get(`${this.baseUrl}/droplets/${id}`, {
        headers: this.getHeaders()
      });
      return response.data.droplet;
    } catch (error) {
      console.error('Error fetching droplet:', error);
      throw new Error(`Failed to fetch droplet: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Clone a droplet using DigitalOcean's API
  async cloneDroplet(snapshotId: number, newName: string, region: string, size: string) {
    try {
      // Get SSH keys from environment variable
      const sshKeyIds = process.env.SSH_KEY_IDS ? 
        process.env.SSH_KEY_IDS.split(',').map(id => parseInt(id.trim())) : [];
      
      // Create a new droplet from the snapshot
      const dropletData = {
        name: newName,
        region: region,
        size: size,
        image: snapshotId,
        ssh_keys: sshKeyIds,
        tags: ['cloned', 'temporary']
      };
      
      // Make the API call
      const response = await axios.post(`${this.baseUrl}/droplets`, dropletData, {
        headers: this.getHeaders()
      });
      
      return response.data.droplet;
    } catch (error) {
      console.error('Error cloning droplet:', error);
      throw error;
    }
  }

  // Check if droplet is active and ready
  async isDropletReady(id: number) {
    try {
      const droplet = await this.getDroplet(id);
      return droplet.status === 'active';
    } catch (error) {
      console.error('Error checking droplet status:', error);
      return false;
    }
  }

  // Reboot a droplet
  async rebootDroplet(id: number) {
    try {
      await axios.post(`${this.baseUrl}/droplets/${id}/actions`, 
        { type: 'reboot' },
        { headers: this.getHeaders() }
      );
      return { success: true };
    } catch (error) {
      console.error('Error rebooting droplet:', error);
      throw new Error(`Failed to reboot droplet: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Add user data script method
  private getUserDataScript() {
    return `#!/bin/bash
# Redirect all output to log file
exec > /root/startup.log 2>&1

echo "==============================================="
echo "Starting droplet setup script at $(date)"
echo "==============================================="

# Update package list
echo "Step 1: Updating package lists"
apt-get update

# Install Docker using the convenience script (more reliable)
echo "Step 2: Installing Docker"
apt-get install -y curl
curl -fsSL https://get.docker.com -o get-docker.sh
chmod +x get-docker.sh
sh ./get-docker.sh

# Verify Docker installation
echo "Step 3: Verifying Docker installation"
docker --version

# Start and enable Docker
echo "Step 4: Ensuring Docker is running"
systemctl start docker
systemctl enable docker

# Run application container
echo "Step 5: Running application container"
docker run -d -p 5004:80 --restart always --name app1 nginx:latest
echo "Container status:"
docker ps -a

# Configure firewall
echo "Step 6: Configuring firewall"
apt-get install -y ufw
ufw allow ssh
ufw allow 5004/tcp
echo "y" | ufw enable
ufw status

echo "==============================================="
echo "Setup completed at $(date)"
echo "==============================================="
`;
  }
}