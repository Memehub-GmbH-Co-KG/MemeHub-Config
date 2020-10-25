const { Telegraf } = require('telegraf');
const commandParts = require('telegraf-command-parts');
const log = require('./log');

module.exports.build = async (bot_token, get, set) => {
    const bot = new Telegraf(bot_token);
    bot.use(commandParts());
    bot.command('config_get', config_get);
    bot.command('config_set', config_set);
    await bot.launch();

    async function config_get(ctx) {
        try {
            const args = ctx.state.command.args.split(' ').filter(x => x !== '');
            const withArgs = args.length > 0;
            const response = await get(withArgs ? args : false);
            const message = withArgs
                ? args
                    .map((a, i) => formatValue(a, response[i]))
                    .join('\n')
                : formatValue('Config', response);


            await ctx.reply(message, { parse_mode: 'MarkdownV2' });
        }
        catch (e) {
            await ctx.reply(`Error: ${e}`);
        }
    }

    async function config_set(ctx) {
        try {
            const key = ctx.state.command.splitArgs[0];
            const value = JSON.parse(ctx.state.command.args.replace(key, '').trim());
            await set({ [key]: value });
            await ctx.reply(formatValue(key, value), { parse_mode: 'MarkdownV2' });
        }
        catch (e) {
            await ctx.reply(`Error: ${e}`);
        }


    }

    function formatValue(key, value) {
        return `*${key}*\n\`\`\`json\n${JSON.stringify(value, undefined, 2)}\n\`\`\``
            .replace(/\./g, '\\.');
    }

    return {
        stop: async () => {
            await bot.stop();
        }
    }
}