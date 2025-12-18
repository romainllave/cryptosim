const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1447912035861135512/mKUgVixg4qB9Tygy8yUqWalHe3Kt40bEDs2pf0xZmxElxNxydWzxhH84u6_yUdvQSlEG';
const TRADE_WEBHOOK_URL = 'https://discord.com/api/webhooks/1448979753620082698/ZN57Aqn6NXN7ToKyBQ-TrGHqiZcipENJrHNol6aLWIbJlzZMyOcaq5JNXsfDTp2k-I8d';

export interface TradeAlertReport {
    symbol: string;
    type: 'BUY' | 'SELL';
    price: number;
    amount: number;
    total: number;
    profit?: number;
    profitPercent?: number;
}

export interface AnalysisReport {
    symbol: string;
    probability: number;
    action: 'BUY' | 'SELL' | 'HOLD';
    price?: number;
    balance: number;
}

export interface OpportunityAlert {
    symbol: string;
    probability: number;
    action: 'BUY' | 'SELL';
    price: number;
}

export async function sendOpportunityAlert(alert: OpportunityAlert): Promise<void> {
    const isBuy = alert.action === 'BUY';
    const color = isBuy ? 0x00ff00 : 0xff9900;
    const emoji = isBuy ? '🚀' : '⚠️';

    const embed = {
        title: `${emoji} OPPORTUNITÉ ${alert.action}: ${alert.symbol}`,
        color,
        description: `**Confiance Stratégie: ${alert.probability.toFixed(1)}%**\n${isBuy ? 'Conditions optimales pour un achat.' : 'Conditions suggérant une vente.'}`,
        fields: [
            { name: '💰 Prix', value: `$${alert.price.toFixed(2)}`, inline: true },
            { name: '🎯 Signal', value: alert.action, inline: true }
        ],
        footer: { text: 'Bot 2.0 - Analyse Temps Réel' },
        timestamp: new Date().toISOString()
    };

    try {
        await fetch(DISCORD_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: '🚨 Opportunity Alert', embeds: [embed] })
        });
    } catch (error) {
        console.error('Discord error:', error);
    }
}

export async function sendTradeAlert(alert: TradeAlertReport): Promise<void> {
    const isBuy = alert.type === 'BUY';
    const color = isBuy ? 0x00ff00 : 0xff0000;
    const title = isBuy ? `🟢 BUY: ${alert.symbol}` : `🔴 SELL: ${alert.symbol}`;

    const fields = [
        { name: 'Prix', value: `$${alert.price.toFixed(2)}`, inline: true },
        { name: 'Montant', value: `${alert.amount.toFixed(4)}`, inline: true },
        { name: 'Valeur', value: `$${alert.total.toFixed(2)}`, inline: true },
    ];

    if (!isBuy && alert.profit !== undefined) {
        fields.push({
            name: 'Profit/Loss',
            value: `**$${alert.profit.toFixed(2)}** (${alert.profitPercent?.toFixed(2)}%)`,
            inline: false
        });
    }

    const embed = {
        title,
        color,
        fields,
        footer: { text: 'Bot 2.0 - Trade Exécuté' },
        timestamp: new Date().toISOString()
    };

    try {
        await fetch(TRADE_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: '🤖 Trade Bot', embeds: [embed] })
        });
    } catch (error) {
        console.error('Discord error:', error);
    }
}

export async function sendDiscordReport(report: AnalysisReport): Promise<void> {
    const actionEmoji = report.action === 'BUY' ? '🟢' : report.action === 'SELL' ? '🔴' : '⚪';
    const actionColor = report.action === 'BUY' ? 0x00ff00 : report.action === 'SELL' ? 0xff0000 : 0x808080;

    const embed = {
        title: `📊 Monitoring - ${report.symbol}/USDT`,
        color: actionColor,
        description: `**Probabilité Globale: ${report.probability.toFixed(1)}%**`,
        fields: [
            {
                name: `${actionEmoji} Décision`,
                value: `**${report.action}** ${report.price ? `@ $${report.price.toFixed(2)}` : ''}`,
                inline: true
            },
            {
                name: '💰 Solde Portefeuille',
                value: `$${report.balance.toFixed(2)}`,
                inline: true
            }
        ],
        footer: { text: 'Bot 2.0 - Rapport d\'Analyse' },
        timestamp: new Date().toISOString()
    };

    try {
        await fetch(DISCORD_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: '🤖 Monitoring Bot', embeds: [embed] })
        });
    } catch (error) {
        console.error('Discord error:', error);
    }
}
