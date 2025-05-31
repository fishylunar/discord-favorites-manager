import { PreloadedUserSettings, PreloadedUserSettings_FavoriteChannelType } from 'discord-protos';

export const getSettings = async (token: string): Promise<PreloadedUserSettings> => {
    const res = await fetch('https://discord.com/api/v9/users/@me/settings-proto/1', {
        method: 'GET',
        headers: constructDiscordRequestHeaders(token),
    });

    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Discord API error (${res.status}): ${errorText}`);
    }

    const resJson = await res.json();
    
    if (!resJson.settings) {
        throw new Error('No settings found in Discord response');
    }

    const encodedSettings = resJson.settings;
    const settings = await PreloadedUserSettings.fromBase64(encodedSettings);
    return settings;
}

const constructDiscordRequestHeaders = (token: string): Record<string, string> => {
    return {
        'Authorization': token,
        "Accept": '*/*',
        "priority": "u=1, i",
        'Accept-Language': 'en-US',
        'Content-Type': 'application/json',
        'referer': 'https://discord.com/channels/@me',
        "origin": "https://discord.com",
        "sec-ch-ua": "\"Not.A/Brand\";v=\"24\", \"Chromium\";v=\"134\"",
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": "\"Windows\"",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) discord/1.0.9193 Chrome/134.0.6998.205 Electron/35.3.0 Safari/537.36",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "x-debug-options": "bugReporterDisabled",
        "x-discord-locale": "en-US",
        "x-discord-timezone": "Europe/Berlin",
    };
}

export const updateSettings = async (token: string, settings: PreloadedUserSettings): Promise<void> => {
    const encodedSettings = PreloadedUserSettings.toBase64(settings);
    await fetch('https://discord.com/api/v9/users/@me/settings-proto/1', {
        method: 'PATCH',
        headers: constructDiscordRequestHeaders(token),
        body: JSON.stringify({ settings: encodedSettings }),
    });
}

export enum FavouriteChannelType {
    DM_CHAT = 1, // Direct Message Chat or Server Channel
    SECTION = 2, // Section
}

export function modifyFavourites(
    settings: PreloadedUserSettings,
    id: string, // userChannelID, or server channel ID, or catagory ID
    catagoryName: string = '', // only works for sections
    type: FavouriteChannelType, // 1 = DM Chat or Server Channel, 2 = catagory
    position: number = 0,
    parentId: bigint = 0n // catagory id // 0n for no parrent.
): PreloadedUserSettings {
    settings.favorites!.favoriteChannels[id] = {
        nickname: catagoryName,
        type: type as unknown as PreloadedUserSettings_FavoriteChannelType, 
        position,
        parentId
    };

    return settings;
}

// Channel info types
export interface DiscordUser {
    id: string;
    username: string;
    avatar: string | null;
    discriminator: string;
    public_flags: number;
    flags: number;
    banner: string | null;
    accent_color: number | null;
    global_name: string | null;
    avatar_decoration_data: any;
    collectibles: any;
    banner_color: string | null;
    clan: any;
    primary_guild: any;
}

export interface ChannelInfo {
    id: string;
    type: number;
    last_message_id?: string;
    flags: number;
    // Server channel specific
    guild_id?: string;
    name?: string;
    parent_id?: string;
    rate_limit_per_user?: number;
    topic?: string | null;
    position?: number;
    permission_overwrites?: any[];
    nsfw?: boolean;
    icon_emoji?: {
        id: string | null;
        name: string;
    };
    theme_color?: string | null;
    // DM channel specific
    recipients?: DiscordUser[];
    last_pin_timestamp?: string;
}

export const getChannelInfo = async (token: string, channelId: string): Promise<ChannelInfo> => {
    const res = await fetch(`https://discord.com/api/v9/channels/${channelId}`, {
        method: 'GET',
        headers: constructDiscordRequestHeaders(token),
    });

    if (!res.ok) {
        throw new Error(`Failed to fetch channel info: ${res.status} ${res.statusText}`);
    }

    return await res.json();
};

export const getAvatarUrl = (userId: string, avatarHash: string | null, size: number = 100): string => {
    if (!avatarHash) {
        // Default Discord avatar
        const defaultAvatarIndex = parseInt(userId.slice(-1)) % 5;
        return `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex}.png?size=${size}`;
    }
    
    const extension = avatarHash.startsWith('a_') ? 'gif' : 'webp';
    return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${extension}?size=${size}`;
};

export const formatChannelDisplay = (channelInfo: ChannelInfo): { name: string; subtitle: string; avatarUrl?: string } => {
    if (channelInfo.type === 1) { // DM Channel
        if (channelInfo.recipients && channelInfo.recipients.length > 0) {
            const user = channelInfo.recipients[0];
            const displayName = user.global_name || user.username;
            const subtitle = user.global_name ? `(${user.username})` : `#${user.discriminator !== '0' ? user.discriminator : user.username}`;
            const avatarUrl = getAvatarUrl(user.id, user.avatar);
            
            return {
                name: displayName,
                subtitle: subtitle,
                avatarUrl: avatarUrl
            };
        }
        return { name: 'Unknown DM', subtitle: 'Direct Message' };
    } else if (channelInfo.type === 0) { // Text Channel
        const channelName = channelInfo.name || 'Unknown Channel';
        return {
            name: `#${channelName}`,
            subtitle: 'Server Channel'
        };
    } else if (channelInfo.type === 3) { // Group DM
        return {
            name: 'Group Chat',
            subtitle: `${channelInfo.recipients?.length || 0} members`
        };
    }
    
    return { name: 'Unknown Channel', subtitle: `Type ${channelInfo.type}` };
};

// Content from favorites-manager.ts starts here
export interface FavoriteChannel {
    id: string;
    nickname: string;
    type: 'channel' | 'section';
    position: number;
}

export interface FavoriteSection extends FavoriteChannel {
    type: 'section';
    channels: FavoriteChannelItem[];
}

export interface FavoriteChannelItem extends FavoriteChannel {
    type: 'channel';
}

export type FavoriteItem = FavoriteSection | FavoriteChannelItem;

export interface FavoritesStructure {
    items: FavoriteItem[];
}

export class FavoritesManager {
    /**
     * Convert raw Discord favorites to structured format
     */
    static fromDiscordFavorites(settings: PreloadedUserSettings): FavoritesStructure {
        const favoriteChannels = settings.favorites?.favoriteChannels || {};
        
        // Separate sections and root-level channels
        const sections = new Map<string, FavoriteSection>();
        const rootChannels: FavoriteChannelItem[] = [];

        // First pass: create all sections and root channels
        for (const [id, data] of Object.entries(favoriteChannels)) {
            if (data.type === 2) { // Section
                sections.set(id, {
                    id,
                    nickname: data.nickname || '',
                    type: 'section',
                    position: data.position || 0,
                    channels: []
                });
            } else if (data.type === 1 && (!data.parentId || data.parentId === 0n)) { // Root level channel
                rootChannels.push({
                    id,
                    nickname: data.nickname || '',
                    type: 'channel',
                    position: data.position || 0
                });
            }
        }

        // Second pass: assign channels to sections
        for (const [id, data] of Object.entries(favoriteChannels)) {
            if (data.type === 1 && data.parentId && data.parentId !== 0n) { // Channel with parent section
                const parentId = data.parentId.toString();
                const section = sections.get(parentId);
                
                if (section) {
                    section.channels.push({
                        id,
                        nickname: data.nickname || '',
                        type: 'channel',
                        position: data.position || 0
                    });
                }
            }
        }

        // Sort channels within each section by position
        sections.forEach(section => {
            section.channels.sort((a, b) => a.position - b.position);
        });

        // Combine sections and root channels into a single array
        const items: FavoriteItem[] = [
            ...Array.from(sections.values()),
            ...rootChannels
        ];

        // Sort all root-level items by position
        items.sort((a, b) => a.position - b.position);

        return { items };
    }

    /**
     * Normalize positions to be sequential starting from 0
     * This ensures there are no duplicate positions or gaps
     */
    static normalizePositions(structure: FavoritesStructure): FavoritesStructure {
        const newItems = [...structure.items];
        
        // Sort all root-level items by their current position
        newItems.sort((a, b) => a.position - b.position);
        
        // Renumber root-level items sequentially
        newItems.forEach((item, index) => {
            item.position = index;
            
            // If it's a section, also renumber its channels
            if (item.type === 'section') {
                const section = item as FavoriteSection;
                // Sort channels by their current position
                section.channels.sort((a, b) => a.position - b.position);
                // Renumber channels sequentially within the section
                section.channels.forEach((channel, channelIndex) => {
                    channel.position = channelIndex;
                });
            }
        });
        
        return { items: newItems };
    }

    /**
     * Convert structured format back to Discord favorites
     */
    static toDiscordFavorites(structure: FavoritesStructure, settings: PreloadedUserSettings): PreloadedUserSettings {
        if (!settings.favorites) {
            settings.favorites = { favoriteChannels: {}, muted: false };
        }

        // Clear existing favorites
        settings.favorites.favoriteChannels = {};

        // Normalize positions to ensure they're sequential and clean
        const normalizedStructure = this.normalizePositions(structure);

        // Process each item in order, using normalized positions
        for (const item of normalizedStructure.items) {
            if (item.type === 'section') {
                const section = item as FavoriteSection;
                
                // Add section with its normalized position
                settings.favorites.favoriteChannels[section.id] = {
                    nickname: section.nickname,
                    type: 2 as unknown as PreloadedUserSettings_FavoriteChannelType,
                    position: section.position,
                    parentId: 0n
                };

                // Add channels within section, using their normalized internal positions
                for (const channel of section.channels) {
                    settings.favorites.favoriteChannels[channel.id] = {
                        nickname: channel.nickname,
                        type: 1 as unknown as PreloadedUserSettings_FavoriteChannelType,
                        position: channel.position,
                        parentId: BigInt(section.id)
                    };
                }
            } else {
                // Root level channel with its normalized position
                settings.favorites.favoriteChannels[item.id] = {
                    nickname: item.nickname,
                    type: 1 as unknown as PreloadedUserSettings_FavoriteChannelType,
                    position: item.position,
                    parentId: 0n
                };
            }
        }

        return settings;
    }

    /**
     * Add a new section
     */
    static addSection(structure: FavoritesStructure, id: string, nickname: string = '', position?: number): FavoritesStructure {
        const newSection: FavoriteSection = {
            id,
            nickname,
            type: 'section',
            position: position ?? structure.items.length,
            channels: []
        };

        const newItems = [...structure.items, newSection];
        return this.normalizePositions({ items: newItems });
    }

    /**
     * Add a new channel
     */
    static addChannel(structure: FavoritesStructure, id: string, nickname: string = '', sectionId?: string, position?: number): FavoritesStructure {
        const newChannel: FavoriteChannelItem = {
            id,
            nickname,
            type: 'channel',
            position: position ?? 0
        };

        const newItems = [...structure.items];

        if (sectionId) {
            // Add to section
            const sectionIndex = newItems.findIndex(item => item.id === sectionId && item.type === 'section');
            if (sectionIndex !== -1) {
                const section = { ...newItems[sectionIndex] } as FavoriteSection;
                const newChannels = [...section.channels];
                
                if (position !== undefined) {
                    const clampedPosition = Math.max(0, Math.min(position, newChannels.length));
                    newChannels.splice(clampedPosition, 0, newChannel);
                } else {
                    newChannels.push(newChannel);
                }
                
                const newSection = { ...section, channels: newChannels };
                newItems[sectionIndex] = newSection;
            }
        } else {
            // Add as root level item
            if (position !== undefined) {
                const clampedPosition = Math.max(0, Math.min(position, newItems.length));
                newItems.splice(clampedPosition, 0, newChannel);
            } else {
                newItems.push(newChannel);
            }
        }

        return this.normalizePositions({ items: newItems });
    }

    /**
     * Remove an item (section or channel)
     */
    static removeItem(structure: FavoritesStructure, id: string): FavoritesStructure {
        const newItems = structure.items.filter(item => {
            if (item.id === id) return false;
            if (item.type === 'section') {
                const section = item as FavoriteSection;
                section.channels = section.channels.filter(channel => channel.id !== id);
            }
            return true;
        });

        return this.normalizePositions({ items: newItems });
    }

    /**
     * Update item nickname
     */
    static updateNickname(structure: FavoritesStructure, id: string, nickname: string): FavoritesStructure {
        const newItems = structure.items.map(item => {
            if (item.id === id) {
                return { ...item, nickname };
            }
            if (item.type === 'section') {
                const section = item as FavoriteSection;
                const updatedChannels = section.channels.map(channel => 
                    channel.id === id ? { ...channel, nickname } : channel
                );
                return { ...section, channels: updatedChannels };
            }
            return item;
        });

        return { items: newItems };
    }

    /**
     * Move item to new position
     */
    static moveItem(structure: FavoritesStructure, id: string, newPosition: number, newSectionId?: string): FavoritesStructure {
        let item: FavoriteItem | undefined;
        let newItems = [...structure.items];
        
        // Remove the item from its current location
        for (let i = 0; i < newItems.length; i++) {
            if (newItems[i].id === id) {
                item = newItems[i];
                newItems.splice(i, 1);
                break;
            }
            if (newItems[i].type === 'section') {
                const section = newItems[i] as FavoriteSection;
                const channelIndex = section.channels.findIndex(c => c.id === id);
                if (channelIndex !== -1) {
                    item = section.channels[channelIndex];
                    const newSection = { ...section };
                    newSection.channels = [...section.channels];
                    newSection.channels.splice(channelIndex, 1);
                    newItems[i] = newSection;
                    break;
                }
            }
        }

        if (!item) return structure;

        if (newSectionId) {
            // Move to section
            const sectionIndex = newItems.findIndex(i => i.id === newSectionId && i.type === 'section');
            if (sectionIndex !== -1) {
                const section = { ...newItems[sectionIndex] } as FavoriteSection;
                const channelItem = { ...item } as FavoriteChannelItem;
                channelItem.type = 'channel';
                
                // Create new channels array and insert at position
                const newChannels = [...section.channels];
                const clampedPosition = Math.max(0, Math.min(newPosition, newChannels.length));
                newChannels.splice(clampedPosition, 0, channelItem);
                
                // Update the section with new channels
                const newSection = { ...section, channels: newChannels };
                newItems[sectionIndex] = newSection;
            }
        } else {
            // Move to root level - clamp newPosition to valid range
            const clampedPosition = Math.max(0, Math.min(newPosition, newItems.length));
            newItems.splice(clampedPosition, 0, item);
        }

        // Update positions to match the new array order (don't sort)
        newItems.forEach((item, index) => {
            item.position = index;
            
            // If it's a section, also renumber its channels
            if (item.type === 'section') {
                const section = item as FavoriteSection;
                section.channels.forEach((channel, channelIndex) => {
                    channel.position = channelIndex;
                });
            }
        });
        
        return { items: newItems };
    }

    /**
     * Get all channels (flattened)
     */
    static getAllChannels(structure: FavoritesStructure): FavoriteChannelItem[] {
        const channels: FavoriteChannelItem[] = [];
        
        for (const item of structure.items) {
            if (item.type === 'channel') {
                channels.push(item);
            } else if (item.type === 'section') {
                channels.push(...(item as FavoriteSection).channels);
            }
        }
        
        return channels;
    }

    /**
     * Get all sections
     */
    static getSections(structure: FavoritesStructure): FavoriteSection[] {
        return structure.items.filter(item => item.type === 'section') as FavoriteSection[];
    }

    /**
     * Find item by ID
     */
    static findItem(structure: FavoritesStructure, id: string): FavoriteItem | undefined {
        for (const item of structure.items) {
            if (item.id === id) return item;
            if (item.type === 'section') {
                const channel = (item as FavoriteSection).channels.find(c => c.id === id);
                if (channel) return channel;
            }
        }
        return undefined;
    }

    /**
     * Reorder items to match a specific sequence of IDs
     * This is useful when Discord's stored positions don't match the visual layout
     */
    static reorderToMatch(structure: FavoritesStructure, orderedIds: string[]): FavoritesStructure {
        const itemsMap = new Map<string, FavoriteItem>();
        
        // Build a map of all root-level items
        for (const item of structure.items) {
            itemsMap.set(item.id, item);
        }
        
        // Create new ordered array based on provided IDs
        const orderedItems: FavoriteItem[] = [];
        
        // Add items in the specified order
        for (const id of orderedIds) {
            const item = itemsMap.get(id);
            if (item) {
                orderedItems.push(item);
                itemsMap.delete(id); // Remove from map so we don't add it twice
            }
        }
        
        // Add any remaining items that weren't in the ordered list
        for (const item of itemsMap.values()) {
            orderedItems.push(item);
        }
        
        // Update positions to match array order (don't use normalizePositions which sorts)
        orderedItems.forEach((item, index) => {
            item.position = index;
            
            // If it's a section, also renumber its channels
            if (item.type === 'section') {
                const section = item as FavoriteSection;
                section.channels.forEach((channel, channelIndex) => {
                    channel.position = channelIndex;
                });
            }
        });
        
        return { items: orderedItems };
    }

    /**
     * Create a corrected structure based on the known visual layout
     * This specifically fixes the position ordering for the user's Discord favorites
     */
    static createCorrectedStructure(structure: FavoritesStructure): FavoritesStructure {
        // Expected order based on visual layout:
        // Channels first: 1369424259906015297, 1080844786866597908
        // Then sections: 1080282931093569536, 1016166879363858432, 1016167090412847104, 1010913279981125632, 1010913357353451520
        // Note: 907811617478176788 is an orphaned channel (references deleted section) so it's not included
        const expectedOrder = [
            '1369424259906015297', // Channel
            '1080844786866597908', // Channel  
            '1080282931093569536', // Section "gaysex" (empty)
            '1016166879363858432', // Section "furs!"
            '1016167090412847104', // Section "irl moros"
            '1010913279981125632', // Section "fox den moment"
            '1010913357353451520'  // Section "stroked.meee"
        ];
        
        return this.reorderToMatch(structure, expectedOrder);
    }
}
// Content from favorites-manager.ts ends here