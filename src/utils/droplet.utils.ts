export function formatDropletData(droplet: any): any {
    return {
        id: droplet.id,
        name: droplet.name,
        status: droplet.status,
        createdAt: droplet.created_at,
        region: droplet.region.slug,
        size: droplet.size.slug,
        image: droplet.image.slug,
    };
}

export function isDropletActive(droplet: any): boolean {
    return droplet.status === 'active';
}

export function isDropletFailed(droplet: any): boolean {
    return droplet.status === 'failed';
}