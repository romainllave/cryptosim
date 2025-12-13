// import fetch from 'node-fetch'; // Built-in in Node 18+

const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1447912035861135512/mKUgVixg4qB9Tygy8yUqWalHe3Kt40bEDs2pf0xZmxElxNxydWzxhH84u6_yUdvQSlEG';
const TRADE_WEBHOOK_URL = 'https://discord.com/api/webhooks/1448979753620082698/ZN57Aqn6NXN7ToKyBQ-TrGHqiZcipENJrHNol6aLWIbJlzZMyOcaq5JNXsfDTp2k-I8d';

interface AnalysisReport {
    symbol: string;
    smaScore: number;
    meanRevScore: number;
    momentumScore: number;
    predictionScore?: number; // Added
    emaScore?: number;        // Added
    probability: number;
    action: 'BUY' | 'SELL' | 'HOLD';
    tradeAmount?: number;
    price?: number;
    balance: number;
}

export interface TradeAlertReport {
    symbol: string;
    type: 'BUY' | 'SELL';
    price: number;
    amount: number;
    total: number;
    profit?: number;
    profitPercent?: number;
}

export async function sendTradeAlert(alert: TradeAlertReport): Promise<void> {
    const isBuy = alert.type === 'BUY';
    const color = isBuy ? 0x00ff00 : 0xff0000; // Green for Buy, Red for Sell
    const title = isBuy ? `🟢 BUY ALETRT: ${alert.symbol}` : `🔴 SELL ALERT: ${alert.symbol}`;

    const fields = [
        { name: 'Price', value: `$${alert.price.toFixed(2)}`, inline: true },
        { name: 'Amount', value: `${alert.amount.toFixed(4)}`, inline: true },
        { name: 'Total Value', value: `$${alert.total.toFixed(2)}`, inline: true },
    ];

    if (!isBuy && alert.profit !== undefined && alert.profitPercent !== undefined) {
        const pEmoji = alert.profit >= 0 ? '🤑' : '💸';
        fields.push({
            name: `${pEmoji} Profit/Loss`,
            value: `**$${alert.profit.toFixed(2)}** (${alert.profitPercent.toFixed(2)}%)`,
            inline: false
        });
    }

    const embed = {
        title,
        color,
        fields,
        footer: { text: '🤖 CryptoSim Bot Trade' },
        timestamp: new Date().toISOString()
    };

    try {
        await fetch(TRADE_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: '🤖 Trade Bot',
                embeds: [embed]
            })
        });
        console.log('Trade alert sent to Discord');
    } catch (error) {
        console.error('Failed to send Discord trade alert:', error);
    }
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
                value: `${report.momentumScore.toFixed(1)}%`,
                inline: true
            },
            {
                name: '🔮 Prediction',
                value: report.predictionScore !== undefined ? `${report.predictionScore.toFixed(1)}%` : 'N/A',
                inline: true
            },
            {
                name: '📊 EMA',
                value: report.emaScore !== undefined ? `${report.emaScore.toFixed(1)}%` : 'N/A',
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
