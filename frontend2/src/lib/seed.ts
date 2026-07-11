import { db } from '@/lib/db';

async function seed() {
  console.log('Seeding database...');

  // Portfolio Holdings
  const holdings = [
    { symbol: 'TCS', name: 'Tata Consultancy Services', sector: 'IT', quantity: 10, avgPrice: 3850, currentPrice: 4120, investedAmount: 38500, currentValue: 41200, pnl: 2700, pnlPercent: 7.0, weight: 22.3 },
    { symbol: 'RELIANCE', name: 'Reliance Industries', sector: 'Energy', quantity: 5, avgPrice: 2480, currentPrice: 2650, investedAmount: 12400, currentValue: 13250, pnl: 850, pnlPercent: 6.9, weight: 7.2 },
    { symbol: 'INFY', name: 'Infosys Ltd', sector: 'IT', quantity: 15, avgPrice: 1520, currentPrice: 1680, investedAmount: 22800, currentValue: 25200, pnl: 2400, pnlPercent: 10.5, weight: 13.6 },
    { symbol: 'HDFCBANK', name: 'HDFC Bank', sector: 'Banking', quantity: 8, avgPrice: 1620, currentPrice: 1710, investedAmount: 12960, currentValue: 13680, pnl: 720, pnlPercent: 5.6, weight: 7.4 },
    { symbol: 'ITC', name: 'ITC Limited', sector: 'FMCG', quantity: 50, avgPrice: 445, currentPrice: 478, investedAmount: 22250, currentValue: 23900, pnl: 1650, pnlPercent: 7.4, weight: 12.9 },
    { symbol: 'BAJFINANCE', name: 'Bajaj Finance', sector: 'Finance', quantity: 4, avgPrice: 7200, currentPrice: 7450, investedAmount: 28800, currentValue: 29800, pnl: 1000, pnlPercent: 3.5, weight: 16.1 },
    { symbol: 'MARUTI', name: 'Maruti Suzuki', sector: 'Auto', quantity: 3, avgPrice: 10800, currentPrice: 11500, investedAmount: 32400, currentValue: 34500, pnl: 2100, pnlPercent: 6.5, weight: 18.6 },
    { symbol: 'WIPRO', name: 'Wipro Ltd', sector: 'IT', quantity: 30, avgPrice: 470, currentPrice: 495, investedAmount: 14100, currentValue: 14850, pnl: 750, pnlPercent: 5.3, weight: 8.0 },
  ];

  for (const h of holdings) {
    await db.portfolioHolding.upsert({
      where: { id: `hold_${h.symbol}` },
      update: h,
      create: { id: `hold_${h.symbol}`, ...h },
    });
  }

  // Trades
  const trades = [
    { id: 'trade_1', symbol: 'TCS', direction: 'BUY', entryPrice: 3850, quantity: 10, stopLoss: 3700, takeProfit: 4200, status: 'OPEN', confidence: 78, riskLevel: 'LOW', reasoning: 'Strong breakout above 3800 resistance with volume confirmation', entryDate: new Date('2025-01-10') },
    { id: 'trade_2', symbol: 'INFY', direction: 'BUY', entryPrice: 1520, quantity: 15, stopLoss: 1450, takeProfit: 1700, status: 'OPEN', confidence: 82, riskLevel: 'LOW', reasoning: 'Cup and handle pattern completed, positive sector momentum', entryDate: new Date('2025-01-08') },
    { id: 'trade_3', symbol: 'RELIANCE', direction: 'BUY', entryPrice: 2480, quantity: 5, stopLoss: 2380, takeProfit: 2700, status: 'OPEN', confidence: 71, riskLevel: 'MEDIUM', reasoning: 'Support bounce at 50 DMA, institutional buying observed', entryDate: new Date('2025-01-05') },
    { id: 'trade_4', symbol: 'HDFCBANK', direction: 'BUY', entryPrice: 1620, quantity: 8, exitPrice: 1780, pnl: 1280, stopLoss: 1560, takeProfit: 1800, status: 'CLOSED', confidence: 85, riskLevel: 'LOW', reasoning: 'Golden cross on daily, strong volume', entryDate: new Date('2024-12-20'), exitDate: new Date('2025-01-15') },
    { id: 'trade_5', symbol: 'TATAMOTORS', direction: 'BUY', entryPrice: 920, quantity: 20, exitPrice: 870, pnl: -1000, stopLoss: 890, takeProfit: 1000, status: 'CLOSED', confidence: 65, riskLevel: 'HIGH', reasoning: 'Momentum trade on EV sector news', entryDate: new Date('2024-12-15'), exitDate: new Date('2024-12-28') },
    { id: 'trade_6', symbol: 'BAJFINANCE', direction: 'BUY', entryPrice: 7200, quantity: 4, stopLoss: 6900, takeProfit: 7800, status: 'OPEN', confidence: 74, riskLevel: 'MEDIUM', reasoning: 'Ascending triangle breakout, strong NBFC sector', entryDate: new Date('2025-01-12') },
    { id: 'trade_7', symbol: 'ITC', direction: 'BUY', entryPrice: 445, quantity: 50, stopLoss: 425, takeProfit: 490, status: 'OPEN', confidence: 80, riskLevel: 'LOW', reasoning: 'Dividend yield play, FMCG recovery', entryDate: new Date('2025-01-03') },
    { id: 'trade_8', symbol: 'MARUTI', direction: 'BUY', entryPrice: 10800, quantity: 3, stopLoss: 10300, takeProfit: 12000, status: 'OPEN', confidence: 76, riskLevel: 'MEDIUM', reasoning: 'Auto sector recovery, strong Q3 expected', entryDate: new Date('2025-01-14') },
  ];

  for (const t of trades) {
    await db.trade.upsert({
      where: { id: t.id },
      update: t as any,
      create: t as any,
    });
  }

  // Market Memories
  const memories = [
    { id: 'mem_INFOSYS', symbol: 'INFOSYS', tradeCount: 12, winRate: 83.3, avgHoldingDays: 18, avgGain: 8.5, avgLoss: -3.2, commonMistake: 'Exited too early on winning trades', suggestion: 'Consider trailing stop-loss instead of fixed exits', patterns: JSON.stringify(['Consistent performer in IT sector', 'Best entries near 50 DMA support', 'Seasonal strength in Q4']) },
    { id: 'mem_TCS', symbol: 'TCS', tradeCount: 8, winRate: 75.0, avgHoldingDays: 22, avgGain: 6.2, avgLoss: -2.8, commonMistake: 'Entering during high volatility periods', suggestion: 'Wait for RSI to cool below 60 before entry', patterns: JSON.stringify(['Strong correlation with INFY', 'Earnings season creates opportunity', 'Support at 3800 level is strong']) },
    { id: 'mem_RELIANCE', symbol: 'RELIANCE', tradeCount: 5, winRate: 60.0, avgHoldingDays: 15, avgGain: 5.0, avgLoss: -4.1, commonMistake: 'Over-trading this stock', suggestion: 'Reduce frequency, increase conviction trades only', patterns: JSON.stringify(['Telecom segment driving growth', 'Energy sector cyclicality']) },
  ];

  for (const m of memories) {
    await db.marketMemory.upsert({
      where: { id: m.id },
      update: m as any,
      create: m as any,
    });
  }

  // Journal Entries
  const journalEntries = [
    { tradeId: 'trade_4', entryType: 'REVIEW', content: 'HDFC Bank trade worked perfectly. Entry at golden cross, exit near target. Followed the plan completely.', mood: 'CONFIDENT', followedPlan: true },
    { tradeId: 'trade_5', entryType: 'REVIEW', content: 'Tata Motors loss was due to FOMO entry on news. Should have waited for confirmation candle. Did not follow the plan - entered immediately on headline.', mood: 'FOMO', followedPlan: false },
    { tradeId: 'trade_4', entryType: 'LESSON', content: 'When golden cross forms with volume > 2x average, confidence is usually high. Trust the setup more.', mood: 'CALM', followedPlan: true },
    { tradeId: 'trade_5', entryType: 'LESSON', content: 'Never enter on news alone. Always wait for price confirmation. News-driven entries have lower win rate.', mood: 'ANXIOUS', followedPlan: false },
  ];

  for (const j of journalEntries) {
    await db.journalEntry.create({ data: j as any });
  }

  console.log('Seeding complete!');
}

seed().catch(console.error);