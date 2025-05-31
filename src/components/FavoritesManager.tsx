import React, { useState, useEffect } from 'react';
import { FavoritesStructure, FavoriteItem, FavoriteSection, FavoriteChannelItem } from '../favorites-manager';
import ChannelInfoDisplay from './ChannelInfoDisplay';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import {
  Plus,
  Save,
  MoreVertical,
  Trash2,
  Edit3,
  ArrowUp,
  ArrowDown,
  Copy,
  Hash,
  Folder,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';

interface FavoritesManagerProps {
  favoritesStructure: FavoritesStructure;
  onSave: (structure: FavoritesStructure) => void;
  loading: boolean;
  token: string;
}

interface AddItemDialogState {
  open: boolean;
  type: 'section' | 'channel';
  parentSectionId?: string;
}

const FavoritesManager: React.FC<FavoritesManagerProps> = ({
  favoritesStructure,
  onSave,
  loading,
  token,
}) => {
  const [localStructure, setLocalStructure] = useState(favoritesStructure);
  const [hasChanges, setHasChanges] = useState(false);
  const [editingItem, setEditingItem] = useState<{ id: string; nickname: string } | null>(null);
  const [addDialog, setAddDialog] = useState<AddItemDialogState>({ open: false, type: 'section' });
  const [newItemName, setNewItemName] = useState('');
  const [newItemId, setNewItemId] = useState('');

  // Sync local structure with prop changes
  useEffect(() => {
    setLocalStructure(favoritesStructure);
    setHasChanges(false);
  }, [favoritesStructure]);

  const updateStructure = (newStructure: FavoritesStructure) => {
    setLocalStructure(newStructure);
    setHasChanges(true);
  };

  const handleSave = () => {
    onSave(localStructure);
    setHasChanges(false);
  };

  const handleFixPositionOrder = () => {
    const { FavoritesManager } = require('../favorites-manager');
    const correctedStructure = FavoritesManager.createCorrectedStructure(localStructure);
    updateStructure(correctedStructure);
  };

  const needsPositionFix = () => {
    let foundSection = false;
    for (const item of localStructure.items) {
      if (item.type === 'section') {
        foundSection = true;
      } else if (foundSection && item.type === 'channel') {
        return true;
      }
    }
    return false;
  };

  const handleAddItem = () => {
    const { FavoritesManager } = require('../favorites-manager');
    let newStructure;

    if (addDialog.type === 'section') {
      if (!newItemName.trim()) { // Section Name is required
        return;
      }
      const id = `${Date.now()}`; // ID is auto-generated for sections
      newStructure = FavoritesManager.addSection(localStructure, id, newItemName.trim());
    } else { // type === 'channel'
      if (!newItemId.trim()) { // Channel ID is required
        return;
      }
      // Channel nickname is optional, defaults to "" if newItemName is empty
      const nickname = newItemName.trim();
      newStructure = FavoritesManager.addChannel(
        localStructure,
        newItemId.trim(),
        nickname,
        addDialog.parentSectionId
      );
    }

    updateStructure(newStructure);
    setAddDialog({ open: false, type: 'section' });
    setNewItemName('');
    setNewItemId('');
  };

  const handleDeleteItem = (id: string) => {
    const { FavoritesManager } = require('../favorites-manager');
    const newStructure = FavoritesManager.removeItem(localStructure, id);
    updateStructure(newStructure);
  };

  const handleEditNickname = (id: string, nickname: string) => {
    const { FavoritesManager } = require('../favorites-manager');
    const newStructure = FavoritesManager.updateNickname(localStructure, id, nickname);
    updateStructure(newStructure);
    setEditingItem(null);
  };

  const handleMoveItem = (id: string, direction: 'up' | 'down') => {
    const { FavoritesManager } = require('../favorites-manager');
    const items = localStructure.items;
    const currentIndex = items.findIndex(item => item.id === id);
    
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= items.length) return;
    
    const newStructure = FavoritesManager.moveItem(localStructure, id, newIndex);
    updateStructure(newStructure);
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
  };

  const canMoveUp = (item: FavoriteItem, index: number, sectionId?: string) => {
    if (sectionId) {
      const section = localStructure.items.find(s => s.id === sectionId) as FavoriteSection;
      return section && index > 0;
    }
    return index > 0;
  };

  const canMoveDown = (item: FavoriteItem, index: number, maxIndex: number, sectionId?: string) => {
    if (sectionId) {
      const section = localStructure.items.find(s => s.id === sectionId) as FavoriteSection;
      return section && index < section.channels.length - 1;
    }
    return index < maxIndex;
  };

  const handleMoveChannelInSection = (sectionId: string, channelId: string, direction: 'up' | 'down') => {
    const section = localStructure.items.find(s => s.id === sectionId) as FavoriteSection;
    if (!section) return;

    const currentIndex = section.channels.findIndex(ch => ch.id === channelId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= section.channels.length) return;

    const newChannels = [...section.channels];
    [newChannels[currentIndex], newChannels[newIndex]] = [newChannels[newIndex], newChannels[currentIndex]];

    const newStructure = {
      ...localStructure,
      items: localStructure.items.map(item => 
        item.id === sectionId 
          ? { ...section, channels: newChannels }
          : item
      )
    };
    
    updateStructure(newStructure);
  };

  const renderChannel = (channel: FavoriteChannelItem, index: number, sectionId?: string) => (
    <Card key={channel.id} className="group hover:shadow-md transition-shadow border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <ChannelInfoDisplay
              channelId={channel.id}
              token={token}
              fallbackName={channel.nickname || channel.id}
            />
            {channel.nickname && (
              <Badge variant="secondary" className="mt-2 text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                Custom: {channel.nickname}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {sectionId ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleMoveChannelInSection(sectionId, channel.id, 'up')}
                  disabled={!canMoveUp(channel, index, sectionId)}
                  className="h-8 w-8 p-0"
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleMoveChannelInSection(sectionId, channel.id, 'down')}
                  disabled={!canMoveDown(channel, index, localStructure.items.length - 1, sectionId)}
                  className="h-8 w-8 p-0"
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleMoveItem(channel.id, 'up')}
                  disabled={!canMoveUp(channel, index)}
                  className="h-8 w-8 p-0"
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleMoveItem(channel.id, 'down')}
                  disabled={!canMoveDown(channel, index, localStructure.items.length - 1)}
                  className="h-8 w-8 p-0"
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover text-popover-foreground border border-border shadow-lg">
                <DropdownMenuItem onClick={() => setEditingItem({ id: channel.id, nickname: channel.nickname })}>
                  <Edit3 className="mr-2 h-4 w-4" />
                  Edit Nickname
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleCopyId(channel.id)}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy ID
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => handleDeleteItem(channel.id)}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderSection = (section: FavoriteSection, index: number) => (
    <Card key={section.id} className="group border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Folder className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div>
              <CardTitle className="text-lg text-slate-900 dark:text-slate-100">{section.nickname || section.id}</CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                {section.channels.length} channel{section.channels.length !== 1 ? 's' : ''}
              </CardDescription>
            </div>
          </div>
          
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAddDialog({ open: true, type: 'channel', parentSectionId: section.id })}
              className="h-8 w-8 p-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleMoveItem(section.id, 'up')}
              disabled={!canMoveUp(section, index)}
              className="h-8 w-8 p-0"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleMoveItem(section.id, 'down')}
              disabled={!canMoveDown(section, index, localStructure.items.length - 1)}
              className="h-8 w-8 p-0"
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover text-popover-foreground border border-border shadow-lg">
                <DropdownMenuItem onClick={() => setEditingItem({ id: section.id, nickname: section.nickname })}>
                  <Edit3 className="mr-2 h-4 w-4" />
                  Edit Name
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleCopyId(section.id)}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy ID
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => handleDeleteItem(section.id)}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove Section
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      
      {section.channels.length > 0 && (
        <CardContent className="pt-0">
          <div className="space-y-3">
            {section.channels.map((channel, channelIndex) => 
              renderChannel(channel, channelIndex, section.id)
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Manage Favorites</h2>
          <p className="text-muted-foreground">
            Organize your Discord channels and sections
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Dialog 
            open={addDialog.open} 
            onOpenChange={(open) => setAddDialog(prev => ({ ...prev, open }))}
          >
            <DialogTrigger asChild>
              <Button 
                variant="outline"
                onClick={() => setAddDialog({ open: true, type: 'section' })}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Section
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-background text-foreground border border-border shadow-lg">
              <DialogHeader>
                <DialogTitle>
                  Add New {addDialog.type === 'section' ? 'Section' : 'Channel'}
                </DialogTitle>
                <DialogDescription>
                  {addDialog.type === 'section' 
                    ? 'Create a new section to organize your channels'
                    : 'Add a channel to your favorites'
                  }
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">
                    {addDialog.type === 'section' ? 'Section Name *' : 'Channel Name (optional)'}
                  </Label>
                  <Input
                    id="name"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder={addDialog.type === 'section' ? 'Enter section name...' : 'Enter display name...'}
                  />
                </div>
                
                {addDialog.type === 'channel' && (
                  <div>
                    <Label htmlFor="channelId">Channel ID *</Label>
                    <Input
                      id="channelId"
                      value={newItemId}
                      onChange={(e) => setNewItemId(e.target.value)}
                      placeholder="Enter Discord channel ID..."
                    />
                  </div>
                )}
              </div>
              
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setAddDialog({ open: false, type: 'section' });
                    setNewItemName('');
                    setNewItemId('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddItem}
                  disabled={
                    addDialog.type === 'section'
                      ? !newItemName.trim()
                      : !newItemId.trim()
                  }
                >
                  Add {addDialog.type === 'section' ? 'Section' : 'Channel'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Dialog 
            open={addDialog.open && addDialog.type === 'channel' && !addDialog.parentSectionId} 
            onOpenChange={(open) => setAddDialog(prev => ({ ...prev, open }))}
          >
            <DialogTrigger asChild>
              <Button 
                variant="outline"
                onClick={() => setAddDialog({ open: true, type: 'channel' })}
              >
                <Hash className="mr-2 h-4 w-4" />
                Add Channel
              </Button>
            </DialogTrigger>
          </Dialog>
          
          {needsPositionFix() && (
            <Button variant="outline" onClick={handleFixPositionOrder}>
              <AlertCircle className="mr-2 h-4 w-4" />
              Fix Order
            </Button>
          )}
          
          <Button 
            onClick={handleSave}
            disabled={!hasChanges || loading}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {hasChanges && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            You have unsaved changes. Don't forget to save them!
          </AlertDescription>
        </Alert>
      )}

      {/* Favorites List */}
      <div className="space-y-4">
        {localStructure.items.length === 0 ? (
          <Card className="p-8 text-center border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <div className="text-muted-foreground">
              <Folder className="h-12 w-12 mx-auto mb-4 opacity-50 text-slate-400 dark:text-slate-500" />
              <h3 className="text-lg font-medium mb-2 text-slate-700 dark:text-slate-300">No favorites yet</h3>
              <p className="text-slate-600 dark:text-slate-400">Add sections and channels to organize your Discord favorites.</p>
            </div>
          </Card>
        ) : (
          localStructure.items.map((item, index) => 
            item.type === 'section' 
              ? renderSection(item as FavoriteSection, index)
              : renderChannel(item as FavoriteChannelItem, index)
          )
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog 
        open={!!editingItem}
        onOpenChange={(open) => !open && setEditingItem(null)}
      >
        <DialogContent className="bg-background text-foreground border border-border shadow-lg">
          <DialogHeader>
            <DialogTitle>Edit Nickname</DialogTitle>
            <DialogDescription>
              Change the display name for this item.
            </DialogDescription>
          </DialogHeader>
          
          <div>
            <Label htmlFor="editName">Nickname</Label>
            <Input
              id="editName"
              value={editingItem?.nickname || ''}
              onChange={(e) => setEditingItem(prev => 
                prev ? { ...prev, nickname: e.target.value } : null
              )}
              placeholder="Enter nickname..."
            />
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingItem(null)}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => editingItem && handleEditNickname(editingItem.id, editingItem.nickname)}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FavoritesManager;
