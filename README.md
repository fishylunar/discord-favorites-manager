# Discord Favorites Manager

A GUI application for managing Discord's hidden favorites feature that Discord soft-removed from their client.

![Discord Favorites Manager](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)
![License](https://img.shields.io/badge/License-MIT-green)
![Electron](https://img.shields.io/badge/Built%20with-Electron-9feaf9)

## Why This Exists

Discord used to have a "Favorites" feature that allowed users to organize their most important channels and DMs into a dedicated favorites section. However, **Discord soft-removed this feature** from their client interface, making it impossible to manage your favorites through the normal Discord app.

The favorites data still exists in your Discord settings, but there's no way to:
- ✅ Add new channels to favorites
- ✅ Remove channels from favorites  
- ✅ Organize favorites into sections
- ✅ Reorder your favorite channels
- ✅ Edit channel nicknames in favorites

**Discord Favorites Manager** brings back full control over your favorites by directly interfacing with Discord's API to manage this hidden feature.

## Features

### 🎯 Complete Favorites Management
- **Add Channels**: Add any Discord channel or DM to your favorites
- **Create Sections**: Organize favorites into custom sections 
- **Drag & Drop Reordering**: Easily reorder channels and sections
- **Custom Nicknames**: Give your favorite channels custom display names
- **Import/Export**: Backup and restore your favorites configuration

### 🔒 Secure & Private
- **Local Token Storage**: Encrypted token storage on your machine
- **No Data Collection**: Everything runs locally, no external servers
- **Open Source**: Full transparency - inspect the code yourself

### 🎨 Modern Interface
- **Dark/Light Theme**: Automatically matches your system preference
- **Responsive Design**: Clean, modern interface built with React
- **Real-time Updates**: See channel info and avatars in real-time
- **Cross-Platform**: Works on Windows, macOS, and Linux

## Installation

### Download Pre-built Releases
1. Go to the [Releases](https://github.com/fishylunar/discord-favorites-manager/releases) page
2. Download the appropriate version for your platform:
   - **Windows**: `.exe` installer or portable version
   - **macOS**: You will have to build from src yourself here as i couldnt be bothered to transfer back-and-forth to my macbook XD
   - **Linux**: `.AppImage`, `.deb`, `.rpm`, or `.tar.gz`

### Build from Source
```bash
# Clone the repository
git clone https://github.com/fishylunar/discord-favorites-manager.git
cd discord-favorites-manager

# Install dependencies
npm install

# Build the application
npm run build

# Run in development mode
npm run electron-dev

# Build distributables
npm run dist
```

## How to Get Your Discord Token

⚠️ **Security Warning**: Never share your Discord token with anyone! This application stores your token locally and encrypted.

1. **Open Discord in your web browser** (not the desktop app)
2. **Open Developer Tools** by pressing `F12` or `Ctrl+Shift+I` (`Cmd+Option+I` on Mac)
3. **Go to the Network tab** and refresh the page (`F5` or `Ctrl+R`)
4. **Look for any request** in the network tab
5. **Click on a request** and find the **"Authorization"** header in the request headers
6. **Copy the token value** (it should be a long string of characters, 70+ characters)

The token will look something like: `OTAzNDU2Nzg5MDEyMUwUSexc4.GhIjKl.MnOpQrStUvWxYzAbCdEfGhIjKlMnOpQrStUvWx`

## Usage

1. **Launch the application**
2. **Enter your Discord token** in the login screen
3. **Check "Remember token"** if you want to auto-login next time (recommended)
4. **Click "Connect to Discord"**

Once connected, you can:

### Adding Favorites
- **Add Section**: Click "Add Section" to create a new category
- **Add Channel**: Click "Add Channel" to add any Discord channel or DM
- **Channel IDs**: Right-click any channel in Discord and select "Copy ID" (requires Developer Mode enabled)

### Managing Favorites
- **Reorder**: Use the up/down arrow buttons to reorder items
- **Edit Names**: Click the three-dot menu and select "Edit Name/Nickname"
- **Move to Section**: Drag channels into sections or use the move buttons
- **Delete**: Remove unwanted favorites using the three-dot menu

### Backup & Restore
- **Export**: Save your favorites configuration to a JSON file
- **Import**: Restore favorites from a previously exported file

## Technical Details

### Built With
- **Frontend**: React + TypeScript
- **UI Framework**: Tailwind CSS + shadcn (no surprises here)
- **Desktop App**: Electron (im sorry)
- **API**: Direct Discord REST API
- **Security**: CryptoJS for local token encryption

### How It Works
1. **Authenticates** with Discord using your token
2. **Fetches** your current user settings (including hidden favorites data)
3. **Provides a GUI** to modify the favorites structure
4. **Sends updates** back to Discord's settings API
5. **Syncs changes** across all your Discord clients

### Data Storage
- **Token Storage**: Encrypted locally using machine-specific keys
- **No Cloud Storage**: All data stays on your machine
- **Discord Sync**: Changes sync through Discord's own infrastructure

## Security & Privacy

### What We Access
- **Your Discord Token**: Required to authenticate with Discord's API
- **User Settings**: Only the favorites section of your Discord settings
- **Channel Information**: Public channel data for display purposes

### What We Don't Access
- **Messages**: Never read or access your messages
- **Private Data**: No access to DMs content or private information
- **External Services**: No data sent to third-party services

### Token Security
- **Local Encryption**: Tokens are encrypted using machine-specific keys
- **No Transmission**: Tokens never leave your machine except for Discord API calls
- **Easy Removal**: Delete stored tokens anytime with the "Forget Token" button

## Troubleshooting

### Common Issues

**"Invalid token format"**
- Ensure you copied the complete token (70+ characters)
- Make sure you're copying from the Authorization header, not somewhere else

**"Failed to connect to Discord"**
- Check your internet connection
- Verify the token is still valid (tokens can expire)
- Try refreshing your Discord session and getting a new token

**"Channel not found"**
- The channel ID might be incorrect
- You might not have access to that channel anymore
- Try copying the channel ID again

**Application won't start**
- Try running as administrator (Windows) or with sudo (Linux)
- Check if your antivirus is blocking the application
- Download the latest release from GitHub

### Getting Help
If you encounter issues:
1. Check the [Issues](https://github.com/fishylunar/discord-favorites-manager/issues) page
2. Search for existing solutions
3. Create a new issue with detailed information about your problem

## Contributing

Contributions are welcome! Please feel free to:
- 🐛 Report bugs
- 💡 Suggest new features  
- 📝 Improve documentation
- 🔧 Submit pull requests

### Development Setup
```bash
git clone https://github.com/fishylunar/discord-favorites-manager.git
cd discord-favorites-manager
npm install
npm run dev  # Start webpack dev server
npm run electron-dev  # Run Electron with hot reload
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer

This application is not affiliated with Discord Inc. Use at your own risk. The Discord Favorites feature was removed by Discord and this tool accesses it through unofficial means. While we make every effort to ensure safety, always backup your Discord settings before making changes.

## Credits

Made with ❤️ by [fishylunar](https://github.com/fishylunar) // xwxfox

Special thanks to https://github.com/discord-userdoccers/discord-protos - Without them it wouldnt have been possible.

---

⭐ **Found this helpful?** Star the repository to show your support!