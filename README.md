# Droplet Manager

Droplet Manager is a web application designed to manage DigitalOcean droplets efficiently. It allows users to create temporary, isolated environments for various applications with automatic provisioning and cleanup.

## Features

- **Automated Droplet Provisioning**: Automatically creates DigitalOcean droplets based on pre-configured application templates
- **Session Management**: Tracks user sessions and ensures each user has only one active droplet at a time
- **IP-Based User Tracking**: Prevents duplicate environments by tracking user IP addresses
- **Automatic Cleanup**: Terminates droplets after 1 hour of inactivity to save resources
- **TTL Refresh**: Users can refresh their session TTL by revisiting the application URL
- **Admin Dashboard**: Monitor and manage all active droplets through an intuitive admin interface
- **Session Persistence**: Sessions are stored on disk to survive application restarts

## Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- Docker and Docker Compose
- A DigitalOcean account with an API token
- At least one pre-configured droplet snapshot for each application you want to offer

### Installation

1. Clone the repository:
```bash
git clone <repository-url> cd droplet-manager
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:

Copy the `.env.example` to `.env` and fill in the required values:
<pre>
DO_API_TOKEN=your_digitalocean_api_token 
PORT=3000 
ADMIN_KEY=your_admin_dashboard_access_key 
SSH_KEY_IDS=comma_separated_list_of_ssh_key_ids
</pre>

4. Configure your applications:

Update the `src/config/app-config.ts` file with your application configurations:

```typescript
export default {
  app1: {
    dropletId: 123456789,  // Your snapshot ID for app1
    region: 'nyc1',        // Region to deploy in
    size: 's-1vcpu-1gb',   // Droplet size
    port: 80               // Port your application runs on
  },
  app2: {
    dropletId: 987654321,  // Your snapshot ID for app2
    region: 'nyc1',
    size: 's-1vcpu-1gb',
    port: 3000
  }
};
```

5. Build the Docker image:
```bash
docker-compose build
```

6. Start the application:
```bash
docker-compose up -d
```

## Usage
### Starting Applications  
Access available applications at: http://your-server-ip:port/app/app-name  
Example: http://146.190.18.49:3000/app/app1  
Each user (identified by IP address) can only have one active application at a time.  

### Session Management
- Sessions expire after 1 hour of inactivity  
- To refresh the session timeout, simply revisit the application URL  
- If you try to start a different application while one is already running, you'll be asked to confirm the switch  

### Admin Dashboard
Access the admin dashboard at: http://your-server-ip:port/admin?key=your-admin-key  

The dashboard allows you to:  

- View all active droplets  
- Monitor resource usage  
- Refresh TTL for specific droplets  
- Reboot or delete droplets  
- See user IPs and expiration times  
- Architecture  

The Droplet Manager consists of:  

- Express.js Server: Handles HTTP requests and serves the web interface  
- DigitalOcean API Integration: Creates and manages droplets  
- Session Store: Maintains persistent session data across server restarts  
- Admin Interface: Provides monitoring and management capabilities  

## License
This project is licensed under the MIT License. See the LICENSE file for details.
