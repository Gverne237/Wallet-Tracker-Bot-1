const { Web3 } = require('web3');
const { IpcProvider } = require('web3-providers-ipc');
const { token_abi, uniswap_abi, uniswap_pair_abi } = require('./abi');
const ethers = require('ethers');
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const token = process.env.cronostoken;
const bot = new TelegramBot(token, { polling: true }); // Token del bot Telegram generato con BotFather

// Enter your RPC URL for Cronos network
const w3 = new Web3(new IpcProvider('')); // Inserisci il tuo URL RPC o IPC

const wallets = JSON.parse(fs.readFileSync(path.join(__dirname, 'wallets.json'), 'utf-8'));
const wallets_obj = JSON.parse(fs.readFileSync(path.join(__dirname, 'wallets_obj.json'), 'utf-8'));
const wallets_and_ids = JSON.parse(fs.readFileSync(path.join(__dirname, 'wallets_and_ids.json'), 'utf-8'));
const spam_coins = ["0x72f8A4EEcAf292D73fc7A1f3A8E5d3133a5B5F84", "0x42932B3Bc3646131f1D8523c138f5eea6ce771c2", "0x455524c4A479B8D4C43600048102A3234B747630", "0x2E35Da702f7e343AC08cDcE82b904e4EF525AE80"];
for (let i = 0; i < spam_coins.length; i++) {
    spam_coins[i] = (spam_coins[i]).toLowerCase();
}

const uniswap_contract = new w3.eth.Contract(uniswap_abi, '0x10ED43C718714eb63d5aA57B78B54704E256024E'); // Aggiorna con l'indirizzo dello scambio su Cronos
const cro_pair_contract = new w3.eth.Contract(uniswap_pair_abi, '0x16b9a82891338f9bA80E2D6970FddA79D1eb0daE'); // Aggiorna con l'indirizzo della coppia CRO/USDT

const format_units = (number, decimal) => {
    const format_number = ethers.formatUnits(number, decimal);
    return format_number;
};

const paths = [['0x55d398326f99059fF775485246999027B3197955', '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'], ['0x55d398326f99059fF775485246999027B3197955']];

const getquantindollar = async (address, decimal, amount) => {
    let price;
    for (const path of paths) {
        try {
            const new_path = [...path];
            new_path.push(address);
            const amtout = await uniswap_contract.methods.getAmountsOut(10000000000000000n, new_path).call();
            const format_amtout = parseFloat(format_units(amtout[amtout.length - 1], decimal));
            price = ((0.01 / format_amtout) * amount);
        } catch {
            // Handle errors
        }
    }
    return price;
};

const getcroindollar = async (amount) => {
    try {
        const reserves = await cro_pair_contract.methods.getReserves().call();
        const usdt = reserves[0] / 10n ** 18n;
        const wcro = reserves[1] / 10n ** 18n;
        const price = parseInt(usdt) / parseInt(wcro);
        return price * amount;
    } catch {
        // Handle errors
    }
};

w3.eth.subscribe('newBlockHeaders')
    .then(subscription => {
        subscription.on('data', async (data) => {
            const blockNumber = data.number;
            try {
                const block = await w3.eth.getBlock(blockNumber);
                const blockTxn = block.transactions;
                for (const txn of blockTxn) {
                    try {
                        const txn_info = await w3.eth.getTransactionReceipt(txn);
                        const othertxninfo = await w3.eth.getTransaction(txn);
                        const value = othertxninfo.value;
                        const logs = txn_info.logs;
                        const input = othertxninfo.input;

                        for (const address of wallets) {
                            let message = '';

                            if (value > 0) {
                                if (txn_info.from === address) {
                                    let format_value = parseFloat(format_units(value, 18));
                                    const to_url = `https://cronoscan.com/address/${txn_info.to}`;
                                    const to_message = `${txn_info.to.slice(0, 4)}...${txn_info.to.slice(-4,)}`;
                                    const to_format_mess = `<a href='${to_url}'>${to_message}</a>`;
                                    let croprice = await getcroindollar(format_value);
                                    const sent_mess = `\nSent : ${format_value.toFixed(8)} CRO (~$ ${croprice.toLocaleString('en-US', { maximumFractionDigits: 0 })}) To : ${to_format_mess}`;
                                    message += sent_mess;
                                } else if (txn_info.to === address) {
                                    let format_value = parseFloat(format_units(value, 18));
                                    const to_url = `https://cronoscan.com/address/${txn_info.from}`;
                                    const to_message = `${txn_info.from.slice(0, 4)}...${txn_info.from.slice(-4,)}`;
                                    const to_format_mess = `<a href='${to_url}'>${to_message}</a>`;
                                    let croprice = await getcroindollar(format_value);
                                    const sent_mess = `\nReceived : ${format_value.toFixed(8)} CRO (~$ ${croprice.toLocaleString('en-US', { maximumFractionDigits: 0 })}) From : ${to_format_mess}`;
                                    message += sent_mess;
                                }
                            }

                            // Additional logic remains unchanged
                            if (message) {
                                const owner_url = `https://cronoscan.com/address/${address}`;
                                const txn_url = `https://cronoscan.com/tx/${txn}`;
                                const txn_message = `<a href='${txn_url}'>Txn hash</a>`;
                                const temp_address_chatid = wallets_and_ids[address];
                                const chatid_keys = Object.keys(wallets_and_ids[address]);
                                for (const chatid of chatid_keys) {
                                    const owner_mess = `<a href='${owner_url}'>${temp_address_chatid[chatid]}</a>`;
                                    const tg_message = `${owner_mess} · Cronos${message}\n${txn_message}`;
                                    bot.sendMessage(parseInt(chatid), tg_message, { disable_web_page_preview: true, parse_mode: 'HTML' });
                                }
                            }
                        }
                    } catch (err) {
                        console.error(err);
                    }
                }
            } catch (err) {
                console.error(err);
            }
        });
    })
    .catch(err => console.error(err));

bot.onText(/\/start/, (message) => {
    bot.sendMessage(message.chat.id, `Hello ${message.chat.first_name}\nThis bot can track activities of wallet addresses on Cronos network.\nBelow are the steps on how to use this bot:\n\nIf you want to add a wallet, type:\n/add <wallet address> <nametag>\nFor example:\n/add 0xE9AE3261a475a27Bb1028f140bc2a7c843318afD MyWallet\nIf you want to delete an address from being tracked, type:\n/delete <wallet address>\nType /list to get the list of wallets being tracked.\nType /croprice to get the current CRO price.\nType /gasprice to get the current base gas price in gwei.`);
});

bot.onText(/\/croprice/, async (message) => {
    const price = await getcroindollar(1);
    bot.sendMessage(message.chat.id, `Current CRO price: $ ${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`);
});

bot.onText(/\/gasprice/, async (message) => {
    const basegasprice = await w3.eth.getGasPrice();
    bot.sendMessage(message.chat.id, `Current base gas price: ${Web3.utils.fromWei(basegasprice, 'gwei')} gwei`);
});

