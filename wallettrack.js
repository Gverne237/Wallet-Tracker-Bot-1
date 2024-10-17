const { Web3 } = require('web3');
const { IpcProvider } = require('web3-providers-ipc');
const { token_abi, uniswap_abi, uniswap_pair_abi } = require('./abi');
const ethers = require('ethers');
const TelegramBot = require('node-telegram-bot-api')
require('dotenv').config()
const fs = require('fs')
const path = require('path')

const token = process.env.bsctoken
const bot = new TelegramBot(token, { polling: true }) //Enter your telegram bot token generated from botFather


//Enter your rpc url (Please run your own rpc node as there will be many requests)
// const w3 = new Web3('') //Enter http or ws url
const w3 = new Web3(new IpcProvider('')); //Enter ipc url

const wallets = JSON.parse(fs.readFileSync(path.join(__dirname, 'wallets.json'), 'utf-8'));
const wallets_obj = JSON.parse(fs.readFileSync(path.join(__dirname, 'wallets_obj.json'), 'utf-8'));
const wallets_and_ids = JSON.parse(fs.readFileSync(path.join(__dirname, 'wallets_and_ids.json'), 'utf-8'))
const spam_coins = ["0x72f8A4EEcAf292D73fc7A1f3A8E5d3133a5B5F84", "0x42932B3Bc3646131f1D8523c138f5eea6ce771c2", "0x455524c4A479B8D4C43600048102A3234B747630", "0x2E35Da702f7e343AC08cDcE82b904e4EF525AE80"]
for (let i = 0; i < spam_coins.length; i++) {
    spam_coins[i] = (spam_coins[i]).toLowerCase()
}


const uniswap_contract = new w3.eth.Contract(uniswap_abi, '0x10ED43C718714eb63d5aA57B78B54704E256024E')
const eth_pair_contract = new w3.eth.Contract(uniswap_pair_abi, '0x16b9a82891338f9bA80E2D6970FddA79D1eb0daE')
const format_units = (number, decimal) => {
    const format_number = ethers.formatUnits(number, decimal);
    return format_number;
};

const paths = [['0x55d398326f99059fF775485246999027B3197955', '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'], ['0x55d398326f99059fF775485246999027B3197955']]

const getquantindollar = async (address, decimal, amount) => {
    let price
    for (const path of paths) {
        try {
            const new_path = [...path]
            new_path.push(address)
            const amtout = await uniswap_contract.methods.getAmountsOut(10000000000000000n, new_path).call()
            const format_amtout = parseFloat(format_units(amtout[amtout.length - 1], decimal))
            price = ((0.01 / format_amtout) * amount)
        }
        catch {
        }
    }
    return price
}

const getethindollar = async (amount) => {
    try {
        const reserves = await eth_pair_contract.methods.getReserves().call()
        const usdt = reserves[0] / 10n ** 18n
        const weth = reserves[1] / 10n ** 18n
        const price = parseInt(usdt) / parseInt(weth)
        return price * amount

    }
    catch {
    }
}




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
                        const othertxninfo = await w3.eth.getTransaction(txn)
                        const value = othertxninfo.value
                        const logs = txn_info.logs;
                        const input = othertxninfo.input

                        for (const address of wallets) {
                            let message = '';

                            if (value > 0) {
                                if (txn_info.from === address) {
                                    let format_value = parseFloat(format_units(value, 18))
                                    const to_url = `https://bscscan.com/address/${txn_info.to}`
                                    const to_message = `${txn_info.to.slice(0, 4)}...${txn_info.to.slice(-4,)}`
                                    const to_format_mess = `<a href='${to_url}'>${to_message}</a>`
                                    let ethprice = await getethindollar(format_value)
                                    const sent_mess = `\nSent : ${format_value.toFixed(8)} BNB (~$ ${ethprice.toLocaleString('en-US', { maximumFractionDigits: 0 })}) To : ${to_format_mess}`;
                                    message += sent_mess;

                                }
                                else if (txn_info.to === address) {
                                    let format_value = parseFloat(format_units(value, 18))
                                    const to_url = `https://bscscan.com/address/${txn_info.from}`
                                    const to_message = `${txn_info.from.slice(0, 4)}...${txn_info.from.slice(-4,)}`
                                    const to_format_mess = `<a href='${to_url}'>${to_message}</a>`
                                    let ethprice = await getethindollar(format_value)
                                    const sent_mess = `\nReceived : ${format_value.toFixed(8)} BNB (~$ ${ethprice.toLocaleString('en-US', { maximumFractionDigits: 0 })}) From : ${to_format_mess}`;
                                    message += sent_mess;
                                }
                            }
                            for (const log of logs) {
                                const topic = log.topics[0];
                                if (topic === "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef") {
                                    const from = `0x${log.topics[1].slice(26)}`;
                                    const to = `0x${log.topics[2].slice(26)}`;
                                    if (address === from || address === to) {
                                        const coin_add = log.address;
                                        const token_contract = new w3.eth.Contract(token_abi, coin_add);
                                        const symbol = await token_contract.methods.symbol().call();
                                        if (log.topics.length === 3) {
                                            const decimal = await token_contract.methods.decimals().call();
                                            const amount = BigInt(log.data, 16);
                                            if (amount > 0) {
                                                const format_amount = parseFloat(format_units(amount, decimal));
                                                const amtindollar = await getquantindollar(log.address, decimal, format_amount)
                                                let amtindollar_mess = ''
                                                if (amtindollar !== undefined) {
                                                    amtindollar_mess = ` (~$ ${amtindollar.toLocaleString('en-US', {
                                                        maximumFractionDigits: amtindollar >= 1000 ? 0 : 3
                                                    })})`
                                                }
                                                let status = true

                                                if (spam_coins.includes(coin_add)) {
                                                    status = false
                                                }
                                                else if (symbol.toLowerCase().includes('usdt') || symbol.toLowerCase().replace(/\s/g, '') === 'bsc-usd' || symbol.toLowerCase().replace(/\s/g, '') === 'busdt' || symbol.toLowerCase().includes('uѕdт')) {

                                                    if (coin_add !== "0x55d398326f99059ff775485246999027b3197955") {
                                                        status = false
                                                        spam_coins.push(coin_add)
                                                    }
                                                }
                                                if (status) {
                                                    const symbol_url = `https://bscscan.com/token/${log.address}`
                                                    const symbol_mess = `<a href='${symbol_url}'>${symbol}</a>`
                                                    if (address === from) {
                                                        const to_url = `https://bscscan.com/address/${to}`
                                                        const to_message = `${to.slice(0, 4)}...${to.slice(-4,)}`
                                                        const to_format_mess = `<a href='${to_url}'>${to_message}</a>`
                                                        const sent_mess = `\nSent : ${format_amount.toLocaleString('en-US', { maximumFractionDigits: format_amount >= 1000 ? 0 : 3 })} ${symbol_mess}${amtindollar_mess} To : ${to_format_mess}`;
                                                        message += sent_mess;
                                                    } else if (address === to) {
                                                        const from_url = `https://bscscan.com/address/${from}`
                                                        const from_message = `${from.slice(0, 4)}...${from.slice(-4,)}`
                                                        const from_format_mess = `<a href='${from_url}'>${from_message}</a>`
                                                        const recv_message = `\nReceived : ${format_amount.toLocaleString('en-US', { maximumFractionDigits: format_amount > 1000 ? 0 : 3 })} ${symbol_mess}${amtindollar_mess} From : ${from_format_mess}`;
                                                        message += recv_message;
                                                    }
                                                }
                                            }
                                        }

                                        else {
                                            const symbol_url = `https://bscscan.com/token/${log.address}`
                                            const symbol_mess = `<a href='${symbol_url}'>${symbol}</a>`
                                            if (address === from) {
                                                const to_url = `https://bscscan.com/address/${to}`
                                                const to_message = `${to.slice(0, 4)}...${to.slice(-4,)}`
                                                const to_format_mess = `<a href='${to_url}'>${to_message}</a>`
                                                const sent_mess = `\nSent : 1 ${symbol_mess} NFT To : ${to_format_mess}`
                                                message += sent_mess;
                                            } else if (address === to) {
                                                const from_url = `https://bscscan.com/address/${from}`
                                                const from_message = `${from.slice(0, 4)}...${from.slice(-4,)}`
                                                const from_format_mess = `<a href='${from_url}'>${from_message}</a>`
                                                let recv_message = ''
                                                if (from === '0x0000000000000000000000000000000000000000') {
                                                    recv_message = `\nMinted : 1 ${symbol_mess} NFT`
                                                }
                                                else {
                                                    recv_message = `\nReceived : 1 ${symbol_mess} NFT From : ${from_format_mess}`
                                                }
                                                message += recv_message;
                                            }
                                        }




                                    }
                                }
                            }
                            if (input.startsWith('0x60406080') || input.startsWith('0x60806040')) {
                                if (txn_info.from === address) {
                                    const contract_address_created = txn_info.contractAddress
                                    const contract_url = `https://bscscan.com/address/${contract_address_created}`
                                    const contract_message = `${contract_address_created.slice(0, 4)}...${contract_address_created.slice(-4,)}`
                                    const contract_format_message = `<a href='${contract_url}'>${contract_message}</a>`
                                    const contract_sent_message = `\nCreated Contract : ${contract_format_message}`;
                                    message += contract_sent_message

                                }
                            }

                            if (message) {
                                const owner_url = `https://bscscan.com/address/${address}`
                                const txn_url = `https://bscscan.com/tx/${txn}`
                                const txn_message = `<a href='${txn_url}'>Txn hash</a>`
                                const temp_address_chatid = wallets_and_ids[address]
                                const chatid_keys = Object.keys(wallets_and_ids[address])
                                for (const chatid of chatid_keys) {
                                    const owner_mess = `<a href='${owner_url}'>${temp_address_chatid[chatid]}</a>`
                                    const tg_message = `${owner_mess} · BSC${message}\n${txn_message}`
                                    bot.sendMessage(parseInt(chatid), tg_message, { disable_web_page_preview: true, parse_mode: 'HTML' })
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
    bot.sendMessage(message.chat.id, `Hello ${message.chat.first_name}\nThis bot can track activities of wallet addresses on binance smart chain\nBelow are the steps on how to use this bot\n\nIf you want to add wallet then type\n/add <wallet address> <nametag>\nFor example:-\n/add 0xE9AE3261a475a27Bb1028f140bc2a7c843318afD HashQuark\nIf you want to delete address from being tracked then type\ndelete <wallet address>\nType /list to get list of wallets being tracked\nType /bnbprice to get the current BNB price\nType /gasprice to get the current base gasprice in gwei.`)
})

bot.onText(/\/add (.+)/, (message) => {
    const mess = message.text.split(' ')
    const address = mess[1].toLowerCase()
    const nametag = (mess.slice(2,)).join(' ')
    const chatid = message.chat.id
    if (nametag.length > 0){
    if (address.startsWith('0x') && address.length === 42) {
        if (wallets.includes(address)) {
            if (wallets_and_ids[address][chatid]) {
                bot.sendMessage(chatid, "Wallet is already added for tracking")
            }
            else {
                wallets_and_ids[address][chatid] = nametag
                if (!wallets_obj[chatid]) {
                    wallets_obj[chatid] = {}
                }
                wallets_obj[chatid][address] = nametag
                fs.writeFileSync(path.join(__dirname, 'wallets_obj.json'), JSON.stringify(wallets_obj))
                fs.writeFileSync(path.join(__dirname, 'wallets_and_ids.json'), JSON.stringify(wallets_and_ids))

                bot.sendMessage(chatid, "Wallet has been successfully added for tracking")
            }
        }
        else {
            wallets.push(address)
            wallets_and_ids[address] = {}
            wallets_and_ids[address][chatid] = nametag
            if (!wallets_obj[chatid]) {
                wallets_obj[chatid] = {}
            }
            wallets_obj[chatid][address] = nametag
            fs.writeFileSync(path.join(__dirname, 'wallets.json'), JSON.stringify(wallets))
            fs.writeFileSync(path.join(__dirname, 'wallets_obj.json'), JSON.stringify(wallets_obj))
            fs.writeFileSync(path.join(__dirname, 'wallets_and_ids.json'), JSON.stringify(wallets_and_ids))
            bot.sendMessage(chatid, "Wallet has been successfully added for tracking")
        }
    }
    else {
        bot.sendMessage(chatid, "Invalid Address")
    }
}
else{
    bot.sendMessage(chatid,"Please enter a valid nametag for the address")
}

})

bot.onText(/\/delete (.+)/, (message) => {
    try {
        const address = ((message.text.split(' '))[1]).toLowerCase()
        const index = wallets.indexOf(address)
        const chatid = message.chat.id
        if (address.startsWith('0x') && address.length === 42) {
            if (index > -1) {
                if (wallets_obj[chatid][address] !== undefined) {
                    delete wallets_and_ids[address][chatid]
                    delete wallets_obj[chatid][address]
                    if (Object.keys(wallets_and_ids[address]).length === 0) {
                        wallets.splice(index, 1)
                        delete wallets_and_ids[address]

                    }
                    fs.writeFileSync(path.join(__dirname, 'wallets.json'), JSON.stringify(wallets))
                    fs.writeFileSync(path.join(__dirname, 'wallets_obj.json'), JSON.stringify(wallets_obj))
                    fs.writeFileSync(path.join(__dirname, 'wallets_and_ids.json'), JSON.stringify(wallets_and_ids))
                    bot.sendMessage(chatid, "Wallet has been successfully remove from tracking")
                }
                else {
                    bot.sendMessage(chatid, "No wallet found")

                }
            }
            else {
                bot.sendMessage(chatid, "No wallet found")
            }
        }
        else {
            bot.sendMessage(chatid, "Invalid Address")
        }
    }
    catch (error) {
        console.log(error)
    }

})


bot.onText(/\/list/, (tgmess) => {
    const chatid = tgmess.chat.id
    let temp_wallets_obj = wallets_obj[chatid]
    if (Object.keys(temp_wallets_obj).length > 0) {
        let message = ''
        const keys = Object.keys(temp_wallets_obj)
        for (const key of keys) {
            const url = `https://bscscan.com/address/${key}`
            const format_key = `${key.slice(0, 4)}...${key.slice(-4,)}`
            const format_message = `<a href='${url}'>${format_key}</a>`
            message += `\n${format_message} | ${temp_wallets_obj[key]}`
        }
        if (message) {
            bot.sendMessage(chatid, `List of wallets\n${message}`, { disable_web_page_preview: true, parse_mode: 'HTML' })
        }
    }
    else {
        bot.sendMessage(chatid, "No wallet added")
    }
})


bot.onText(/\/gasprice/, async (message) => {
    const basegasprice = await w3.eth.getGasPrice()
    bot.sendMessage(message.chat.id, `Current base gasprice: ${Web3.utils.fromWei(basegasprice, 'gwei')} gwei\n\n<a href='https://t.me/track_your_bsc_wallet_bot'>Wallet Tracker BSC</a>`, { disable_web_page_preview: true, parse_mode: 'HTML' })
})


bot.onText(/\/bnbprice/, async (message) => {
    const price = await getethindollar(1)
    bot.sendMessage(message.chat.id, `Current BNB price: $ ${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}\n\n<a href='https://t.me/track_your_bsc_wallet_bot'>Wallet Tracker BSC</a>`, { disable_web_page_preview: true, parse_mode: 'HTML' })

})
