// import fetch from 'node-fetch'; // Built-in in Node 18+

const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1447912035861135512/mKUgVixg4qB9Tygy8yUqWalHe3Kt40bEDs2pf0xZmxElxNxydWzxhH84u6_yUdvQSlEG';

interface AnalysisReport {
    symbol: string;
    smaScore: number;
    meanRevScore: number;
    momentumScore: number;
    probability: number;
    action: 'BUY' | 'SELL' | 'HOLD';
    tradeAmount?: number;
    price?: number;
    balance: number;
}

export async function sendDiscordReport(report: AnalysisReport): Promise<void> {
    const actionEmoji = report.action === 'BUY' ? '🟢' : report.action === 'SELL' ? '🔴' : '⚪';
    const actionColor = report.action === 'BUY' ? 0x00ff00 : report.action === 'SELL' ? 0xff0000 : 0x808080;

    const embed = {
        title: `📊 Market Analysis - ${report.symbol}/USDT`,
        color: actionColor,
        fields: [
            {
                name: '📈 SMA Trend',
                value: `${report.smaScore.toFixed(1)}%`,
                inline: true
            },
            {
                name: '📉 Mean Reversion',
                value: `${report.meanRevScore.toFixed(1)}%`,
                inline: true
            },
            {
                name: '🚀 Momentum',
                value: `${report.momentumScore.toFixed(1)}%`,
                inline: true
            },
            {
                name: '🎯 Probability',
                value: `**${report.probability.toFixed(1)}%** chance of increase`,
                inline: false
            },
            {
                name: `${actionEmoji} Action`,
                value: report.action === 'HOLD'
                    ? 'HOLD - Waiting for clearer signal'
                    : `**${report.action}** ${report.tradeAmount ? `$${report.tradeAmount.toFixed(2)}` : ''} @ $${report.price?.toFixed(2) || 'N/A'}`,
                inline: false
            },
            {
                name: '💰 Portfolio Balance',
                value: `$${report.balance.toFixed(2)}`,
                inline: true
            }
        ],
        footer: {
            text: '🤖 Trading Bot'
        },
        timestamp: new Date().toISOString()
    };

    try {
        await fetch(DISCORD_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: '🤖 Trading Bot',
                embeds: [embed]
            })
        });
        console.log('Discord notification sent');
    } catch (error) {
        console.error('Failed to send Discord notification:', error);
    }
}
