// Define the interface here

// Define the types
export interface AppConfig {
  dropletId: number;
  port: number;
  region: string;
  size: string;
}

export interface AppDropletMap {
  [key: string]: AppConfig;
}

// Define the configuration
const APP_DROPLET_MAP: AppDropletMap = {
  'app1': {
    dropletId: 181789519, // Replace with your app1 snapshot ID
    port: 5004,
    region: 'ams3',
    size: 's-1vcpu-512mb-10gb'
  },
  'app2': {
    dropletId: 987654321, // Replace with your app2 snapshot ID
    port: 5005,
    region: 'ams3',
    size: 's-1vcpu-512mb-10gb'
  },
  // Add more apps as needed
};

export default APP_DROPLET_MAP;