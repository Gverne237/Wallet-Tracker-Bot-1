### Try the Bot

You can try the live version of the Wallet Tracker Bot here deployed by me: [Track Your BSC Wallet Bot](https://t.me/track_your_bsc_wallet_bot).

# Wallet Tracker Telegram Bot

A powerful Telegram bot that tracks blockchain wallet activities in real time, including swaps, transfers, and NFT transactions. Stay updated on your wallet's movements directly through Telegram notifications.

## Features
- **Wallet Tracking:** Monitor Ethereum-based wallet addresses for transaction activity.
- **Swap Notifications:** Receive alerts when tokens are swapped on decentralized exchanges.
- **Transfer Alerts:** Track both ERC-20 token and native token transfers.
- **NFT Tracking:** Get notified when NFTs (ERC-721/1155) are transferred to or from the wallet.
- **Multi-Chain Support:** (Extendable to other blockchain networks such as Ethereum,Polygon,Base,Binance Smart Chain).

## Prerequisites

Before you can run the bot, you'll need:

- **Node.js**
- **Telegram Bot Token**: Create a bot via [BotFather](https://core.telegram.org/bots#botfather) on Telegram.
- **Blockchain Rpc Url**

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/wallet-tracker-bot.git
cd wallet-tracker-bot
```

### 2. Install Dependencies

For **Node.js**:
```bash
npm install
```



### 3. Configure Environment Variables

Create a `.env` file in the root directory with the following variables:

```
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
```

- `TELEGRAM_BOT_TOKEN`: The token from [BotFather](https://core.telegram.org/bots#botfather).

### 4. Run the Bot

For **Node.js**:
```bash
node wallettrack.js
```


### 5. Interact with the Bot

1. Add the bot to your Telegram chat or group.
2. Use the `/start` command to initialize the bot.
3. Register a wallet address
4. Start receiving notifications for swaps, transfers, and NFT activities.

## Example Bot Commands
- `/start`: Initializes the bot.
- `/add <wallet_address> <nametag>`: Start tracking the given wallet address.
- `/delete <wallet_address>`: Stop tracking the given wallet.
- `/list`: List all wallet addresses currently being tracked
- `/gasprice`: Gives the current gas price of current network
- `/bnbprice`: Gives the price of native token of current network (Live implementation tracks BNB price, you can change the address of the native token)



## Technologies Used

- **Node.js**
- **Telegram Bot API**
- **BlockChain**

## Contribution

Contributions are welcome! Here's how you can contribute:

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/new-feature`.
3. Commit your changes: `git commit -m 'Add some feature'`.
4. Push to the branch: `git push origin feature/new-feature`.
5. Open a pull request.

