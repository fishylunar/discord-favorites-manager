import React, { useState, useEffect } from 'react';
import { ChannelInfo, formatChannelDisplay } from '../favorites-manager';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { RefreshCw, Hash, MessageCircle, Users } from 'lucide-react';

const { ipcRenderer } = window.require('electron');

interface ChannelInfoDisplayProps {
  channelId: string;
  token: string;
  fallbackName?: string;
}

const ChannelInfoDisplay: React.FC<ChannelInfoDisplayProps> = ({
  channelId,
  token,
  fallbackName,
}) => {
  const [channelInfo, setChannelInfo] = useState<ChannelInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChannelInfo = async () => {
    if (!token || !channelId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const info = await ipcRenderer.invoke('get-channel-info', token, channelId);
      setChannelInfo(info);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch channel info');
      console.error('Failed to fetch channel info:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChannelInfo();
  }, [channelId, token]);

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-6 rounded-full" />
        <div className="space-y-1">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-2 w-14" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2">
        <Avatar className="h-6 w-6">
          <AvatarFallback className="bg-destructive/20 text-destructive border border-destructive/30">
            !
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-destructive truncate">
            {fallbackName || 'Unknown Channel'}
          </p>
          <p className="text-xs text-muted-foreground truncate">Error loading</p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchChannelInfo}
                className="h-6 w-6 p-0 hover:bg-accent"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-popover text-popover-foreground border border-border shadow-lg">
              <p>Retry</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  if (!channelInfo) {
    return (
      <div className="flex items-center gap-2">
        <Avatar className="h-6 w-6">
          <AvatarFallback className="bg-muted text-muted-foreground">
            <Hash className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-medium text-foreground">
            {fallbackName || 'Unknown Channel'}
          </p>
          <p className="text-xs text-muted-foreground">Channel not found</p>
        </div>
      </div>
    );
  }

  const displayInfo = formatChannelDisplay(channelInfo);

  const getChannelIcon = () => {
    if (channelInfo.type === 1) return <MessageCircle className="h-4 w-4" />;
    if (channelInfo.type === 3) return <Users className="h-4 w-4" />;
    return <Hash className="h-4 w-4" />;
  };

  return (
    <div className="flex items-center gap-2">
      <Avatar className="h-6 w-6">
        {displayInfo.avatarUrl ? (
          <AvatarImage 
            src={displayInfo.avatarUrl} 
            alt={displayInfo.name}
          />
        ) : (
          <AvatarFallback className="bg-primary text-primary-foreground">
            {getChannelIcon()}
          </AvatarFallback>
        )}
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {displayInfo.name}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {displayInfo.subtitle}
        </p>
      </div>
    </div>
  );
};

export default ChannelInfoDisplay;
