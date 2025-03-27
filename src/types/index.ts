export interface Droplet {
    id: string;
    name: string;
    region: string;
    size: string;
    image: string;
    status: string;
    created_at: string;
}

export interface UserRequest {
    userId: string;
    appId: string;
}

export interface CloneResponse {
    newDropletId: string;
    newDropletName: string;
    status: string;
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}