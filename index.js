const { Client, Events, EmbedBuilder, GatewayIntentBits } = require('discord.js');
const config = require('./config.json');
const path = require('path');
const fs = require('fs');


const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});


const prefix = '.';

client.once(Events.ClientReady, async () => {
    console.log(`${client.user.tag} is online!`);

    try {
        await client.user.setPresence({
            activities: [
                {
                    name: config.activity_game,              
                    type: config.activity_type  
                }
            ],
            status: config.bot_status      
        });
    } catch (error) {
        console.error('Error setting presence:', error);
    }

    const guild = client.guilds.cache.get(config.guildId);
    if (!guild) {
        console.error('Guild not found.');
        return;
    }
});


client.on('messageCreate', async (message) => {
    if (!message.content.startsWith(`${prefix}sendproduct`) || message.author.bot) return;
    const member = message.guild.members.cache.get(message.author.id);
    if (!member.roles.cache.has(config.owner_role)) {
        return message.reply("You don't have the required role to use this command.");
    }

    const args = message.content.split(' ');
    const user = message.mentions.users.first();
    const productType = args[2]?.toLowerCase();
    const amount = parseInt(args[3]);

    if (!user || !productType || isNaN(amount) || amount < 1) {
        return message.reply("Please use the correct format: `.sendproduct @user <product> <amount>`");
    }

    let file;
    if (productType === 'nitro') {
        file = 'data/nitro.txt';
    } else if (productType === '1mtokens') {
        file = 'data/1mtokens.txt';
    } else if (productType === '3mtokens') {
        file = 'data/3mtokens.txt';
    } else {
        return message.reply("Invalid product type. Available types: nitro, 1mtokens, 3mtokens.");
    }

    if (!fs.existsSync(file)) {
        return message.reply(`The stock file for ${productType} is missing.`);
    }

    let productFilePath;

    try {
        const data = fs.readFileSync(file, 'utf-8').split('\n').filter(line => line.trim());
        if (amount > data.length) {
            return message.reply('Not enough stock available.');
        }

        const products = data.slice(0, amount).map(item => item.trim());

        const productFileName = `${user.username}-x${amount}-${productType}(s).txt`;
        productFilePath = path.join(__dirname, 'data', productFileName);
        fs.writeFileSync(productFilePath, `${products.join('\n')}`, 'utf-8');

        const thankYouMessage = `
<:verified:1300099738171080736> **__Thanks you for ordering!__** <:verified:1300099738171080736>

**Here's your Product!**
<a:bd_bell:1300097955222786068> Don't forget to vouch for your warranty!
<a:bd_bell:1300097955222786068> Always recheck and save your links.
<a:bd_bell:1300097955222786068> Strictly No Claim warranty after receiving the Product.

**Vouch Here:** https://discord.com/channels/1299509207749627965/1299861769832890378 <a:heart_black:1300098729377796197>

**+rep <seller> <product> <payment method>**
__*Example: +rep @giannaros_0001 x14 Server Boosts PP*__`;

        await user.send(thankYouMessage);
        await user.send({ files: [productFilePath] });
        fs.writeFileSync(file, data.slice(amount).join('\n'));

        await message.reply(`Sent ${amount} product(s) to ${user.tag}.`);
    } catch (error) {
        console.error(error);
        message.reply('An error occurred while processing the command.');
    } finally {
        if (productFilePath && fs.existsSync(productFilePath)) {
            fs.unlinkSync(productFilePath);
        }
    }
});


client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.content === `${prefix}stock`) {
        const member = message.guild.members.cache.get(message.author.id);
        
        if (!member.roles.cache.has(config.owner_role)) {
            return message.reply("❌ You don't have the required role to use this command.");
        }

        try {
            const files = {
                nitro: 'data/nitro.txt',
                '1mtokens': 'data/1mtokens.txt',
                '3mtokens': 'data/3mtokens.txt'
            };

            const stockCounts = {};
            for (const [key, filePath] of Object.entries(files)) {
                if (fs.existsSync(filePath)) {
                    const data = fs.readFileSync(filePath, 'utf-8');
                    stockCounts[key] = data.split('\n').filter(line => line.trim()).length;
                } else {
                    stockCounts[key] = 0;
                }
            }

            const embed = new EmbedBuilder()
                .setColor(0x0099ff)
                .setTitle('📦 Current Stock')
                .setDescription(`- **Nitro Boost:** \`${stockCounts.nitro}\`\n- **1M Tokens:** \`${stockCounts['1mtokens']}\`\n- **3M Tokens:** \`${stockCounts['3mtokens']}\``)
                .setFooter({ text: 'Stock information' });

            await message.reply({ embeds: [embed] });

            await message.delete();
        } catch (error) {
            console.error(error);
            await message.reply('❌ An error occurred while checking the stock.');
        }
    }
});


client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.content.startsWith(`${prefix}restock`)) {
        const member = message.guild.members.cache.get(message.author.id);
        
        if (!member.roles.cache.has(config.owner_role)) {
            return message.channel.send("You don't have the required role to use this command.");
        }

        const args = message.content.split(' ').slice(1);
        if (args.length < 2) {
            return message.channel.send('Please specify a product and account data. Usage: `.restock <product> <reward>`');
        }

        const [product, ...accountData] = args;
        const accountInfo = accountData.join(' ');

        const files = {
            nitro: 'data/nitro.txt',
            '1mtokens': 'data/1mtokens.txt',
            '3mtokens': 'data/3mtokens.txt'
        };

        if (!files[product]) {
            return message.channel.send('Invalid product. Please use `nitro`, `1mtokens`, or `3mtokens`.');
        }

        try {
            fs.appendFileSync(files[product], `${accountInfo}\n`, 'utf-8');
            await message.channel.send(`Successfully restocked **${product}** with the account: \`${accountInfo}\``);
        } catch (error) {
            console.error(error);
            return message.channel.send('An error occurred while restocking the product.');
        }

        try {
            await message.delete();
        } catch (error) {
            console.error('Failed to delete message:', error);
        }
    }
});

client.login(config.token);