/**
 * Symbol resolution: turns natural language ("should I buy tata motors?",
 * "analyse RELIANCE", "how is nifty today") into a tradable Yahoo Finance
 * symbol. A curated NSE/index alias map answers instantly for the widely
 * traded Indian names; Yahoo's search API resolves everything else
 * (small caps, BSE-only listings, global stocks like Apple/Tesla).
 */

import { searchSymbols } from '@/lib/market-data';

export interface ResolvedStock {
  yahooSymbol: string;
  displaySymbol: string;
  name: string;
  source: 'alias' | 'search';
}

// Curated map: alias (lowercase) -> [yahooSymbol, display name]
// Aliases include company names, brand names and NSE tickers.
const ALIASES: Record<string, [string, string]> = {
  // Indices
  'nifty': ['^NSEI', 'NIFTY 50'],
  'nifty 50': ['^NSEI', 'NIFTY 50'],
  'nifty50': ['^NSEI', 'NIFTY 50'],
  'sensex': ['^BSESN', 'BSE SENSEX'],
  'bank nifty': ['^NSEBANK', 'NIFTY BANK'],
  'banknifty': ['^NSEBANK', 'NIFTY BANK'],
  'nifty bank': ['^NSEBANK', 'NIFTY BANK'],

  // Large caps
  'reliance': ['RELIANCE.NS', 'Reliance Industries'],
  'reliance industries': ['RELIANCE.NS', 'Reliance Industries'],
  'ril': ['RELIANCE.NS', 'Reliance Industries'],
  'tcs': ['TCS.NS', 'Tata Consultancy Services'],
  'tata consultancy': ['TCS.NS', 'Tata Consultancy Services'],
  'hdfc bank': ['HDFCBANK.NS', 'HDFC Bank'],
  'hdfcbank': ['HDFCBANK.NS', 'HDFC Bank'],
  'hdfc': ['HDFCBANK.NS', 'HDFC Bank'],
  'icici bank': ['ICICIBANK.NS', 'ICICI Bank'],
  'icicibank': ['ICICIBANK.NS', 'ICICI Bank'],
  'icici': ['ICICIBANK.NS', 'ICICI Bank'],
  'infosys': ['INFY.NS', 'Infosys'],
  'infy': ['INFY.NS', 'Infosys'],
  'sbi': ['SBIN.NS', 'State Bank of India'],
  'sbin': ['SBIN.NS', 'State Bank of India'],
  'state bank': ['SBIN.NS', 'State Bank of India'],
  'state bank of india': ['SBIN.NS', 'State Bank of India'],
  'airtel': ['BHARTIARTL.NS', 'Bharti Airtel'],
  'bharti airtel': ['BHARTIARTL.NS', 'Bharti Airtel'],
  'bhartiartl': ['BHARTIARTL.NS', 'Bharti Airtel'],
  'itc': ['ITC.NS', 'ITC'],
  'larsen': ['LT.NS', 'Larsen & Toubro'],
  'larsen and toubro': ['LT.NS', 'Larsen & Toubro'],
  'l&t': ['LT.NS', 'Larsen & Toubro'],
  'lt': ['LT.NS', 'Larsen & Toubro'],
  'kotak': ['KOTAKBANK.NS', 'Kotak Mahindra Bank'],
  'kotak bank': ['KOTAKBANK.NS', 'Kotak Mahindra Bank'],
  'kotak mahindra': ['KOTAKBANK.NS', 'Kotak Mahindra Bank'],
  'kotakbank': ['KOTAKBANK.NS', 'Kotak Mahindra Bank'],
  'hul': ['HINDUNILVR.NS', 'Hindustan Unilever'],
  'hindustan unilever': ['HINDUNILVR.NS', 'Hindustan Unilever'],
  'hindunilvr': ['HINDUNILVR.NS', 'Hindustan Unilever'],
  'axis bank': ['AXISBANK.NS', 'Axis Bank'],
  'axisbank': ['AXISBANK.NS', 'Axis Bank'],
  'axis': ['AXISBANK.NS', 'Axis Bank'],
  'bajaj finance': ['BAJFINANCE.NS', 'Bajaj Finance'],
  'bajfinance': ['BAJFINANCE.NS', 'Bajaj Finance'],
  'bajaj finserv': ['BAJAJFINSV.NS', 'Bajaj Finserv'],
  'bajajfinsv': ['BAJAJFINSV.NS', 'Bajaj Finserv'],
  'maruti': ['MARUTI.NS', 'Maruti Suzuki'],
  'maruti suzuki': ['MARUTI.NS', 'Maruti Suzuki'],
  'sun pharma': ['SUNPHARMA.NS', 'Sun Pharmaceutical'],
  'sunpharma': ['SUNPHARMA.NS', 'Sun Pharmaceutical'],
  'titan': ['TITAN.NS', 'Titan Company'],
  'ultratech': ['ULTRACEMCO.NS', 'UltraTech Cement'],
  'ultratech cement': ['ULTRACEMCO.NS', 'UltraTech Cement'],
  'ultracemco': ['ULTRACEMCO.NS', 'UltraTech Cement'],
  'asian paints': ['ASIANPAINT.NS', 'Asian Paints'],
  'asianpaint': ['ASIANPAINT.NS', 'Asian Paints'],
  'ntpc': ['NTPC.NS', 'NTPC'],
  'power grid': ['POWERGRID.NS', 'Power Grid Corporation'],
  'powergrid': ['POWERGRID.NS', 'Power Grid Corporation'],
  'tata motors': ['TATAMOTORS.NS', 'Tata Motors'],
  'tatamotors': ['TATAMOTORS.NS', 'Tata Motors'],
  'tata steel': ['TATASTEEL.NS', 'Tata Steel'],
  'tatasteel': ['TATASTEEL.NS', 'Tata Steel'],
  'tata power': ['TATAPOWER.NS', 'Tata Power'],
  'tatapower': ['TATAPOWER.NS', 'Tata Power'],
  'tata consumer': ['TATACONSUM.NS', 'Tata Consumer Products'],
  'tataconsum': ['TATACONSUM.NS', 'Tata Consumer Products'],
  'tata elxsi': ['TATAELXSI.NS', 'Tata Elxsi'],
  'tata chemicals': ['TATACHEM.NS', 'Tata Chemicals'],
  'wipro': ['WIPRO.NS', 'Wipro'],
  'hcl': ['HCLTECH.NS', 'HCL Technologies'],
  'hcl tech': ['HCLTECH.NS', 'HCL Technologies'],
  'hcltech': ['HCLTECH.NS', 'HCL Technologies'],
  'tech mahindra': ['TECHM.NS', 'Tech Mahindra'],
  'techm': ['TECHM.NS', 'Tech Mahindra'],
  'adani enterprises': ['ADANIENT.NS', 'Adani Enterprises'],
  'adanient': ['ADANIENT.NS', 'Adani Enterprises'],
  'adani': ['ADANIENT.NS', 'Adani Enterprises'],
  'adani ports': ['ADANIPORTS.NS', 'Adani Ports & SEZ'],
  'adaniports': ['ADANIPORTS.NS', 'Adani Ports & SEZ'],
  'adani green': ['ADANIGREEN.NS', 'Adani Green Energy'],
  'adanigreen': ['ADANIGREEN.NS', 'Adani Green Energy'],
  'adani power': ['ADANIPOWER.NS', 'Adani Power'],
  'adanipower': ['ADANIPOWER.NS', 'Adani Power'],
  'jsw steel': ['JSWSTEEL.NS', 'JSW Steel'],
  'jswsteel': ['JSWSTEEL.NS', 'JSW Steel'],
  'coal india': ['COALINDIA.NS', 'Coal India'],
  'coalindia': ['COALINDIA.NS', 'Coal India'],
  'ongc': ['ONGC.NS', 'Oil & Natural Gas Corporation'],
  'ioc': ['IOC.NS', 'Indian Oil Corporation'],
  'indian oil': ['IOC.NS', 'Indian Oil Corporation'],
  'bpcl': ['BPCL.NS', 'Bharat Petroleum'],
  'hindalco': ['HINDALCO.NS', 'Hindalco Industries'],
  'vedanta': ['VEDL.NS', 'Vedanta'],
  'vedl': ['VEDL.NS', 'Vedanta'],
  'grasim': ['GRASIM.NS', 'Grasim Industries'],
  'cipla': ['CIPLA.NS', 'Cipla'],
  'dr reddy': ['DRREDDY.NS', "Dr. Reddy's Laboratories"],
  'dr reddys': ['DRREDDY.NS', "Dr. Reddy's Laboratories"],
  'drreddy': ['DRREDDY.NS', "Dr. Reddy's Laboratories"],
  'divis lab': ['DIVISLAB.NS', "Divi's Laboratories"],
  'divislab': ['DIVISLAB.NS', "Divi's Laboratories"],
  'divis': ['DIVISLAB.NS', "Divi's Laboratories"],
  'apollo hospitals': ['APOLLOHOSP.NS', 'Apollo Hospitals'],
  'apollohosp': ['APOLLOHOSP.NS', 'Apollo Hospitals'],
  'bajaj auto': ['BAJAJ-AUTO.NS', 'Bajaj Auto'],
  'eicher': ['EICHERMOT.NS', 'Eicher Motors'],
  'eicher motors': ['EICHERMOT.NS', 'Eicher Motors'],
  'eichermot': ['EICHERMOT.NS', 'Eicher Motors'],
  'royal enfield': ['EICHERMOT.NS', 'Eicher Motors'],
  'hero': ['HEROMOTOCO.NS', 'Hero MotoCorp'],
  'hero motocorp': ['HEROMOTOCO.NS', 'Hero MotoCorp'],
  'heromotoco': ['HEROMOTOCO.NS', 'Hero MotoCorp'],
  'mahindra': ['M&M.NS', 'Mahindra & Mahindra'],
  'm&m': ['M&M.NS', 'Mahindra & Mahindra'],
  'mahindra and mahindra': ['M&M.NS', 'Mahindra & Mahindra'],
  'tvs': ['TVSMOTOR.NS', 'TVS Motor Company'],
  'tvs motor': ['TVSMOTOR.NS', 'TVS Motor Company'],
  'tvsmotor': ['TVSMOTOR.NS', 'TVS Motor Company'],
  'britannia': ['BRITANNIA.NS', 'Britannia Industries'],
  'nestle': ['NESTLEIND.NS', 'Nestle India'],
  'nestle india': ['NESTLEIND.NS', 'Nestle India'],
  'nestleind': ['NESTLEIND.NS', 'Nestle India'],
  'dabur': ['DABUR.NS', 'Dabur India'],
  'marico': ['MARICO.NS', 'Marico'],
  'godrej consumer': ['GODREJCP.NS', 'Godrej Consumer Products'],
  'godrejcp': ['GODREJCP.NS', 'Godrej Consumer Products'],
  'colgate': ['COLPAL.NS', 'Colgate-Palmolive India'],
  'colpal': ['COLPAL.NS', 'Colgate-Palmolive India'],
  'pidilite': ['PIDILITIND.NS', 'Pidilite Industries'],
  'pidilitind': ['PIDILITIND.NS', 'Pidilite Industries'],
  'berger paints': ['BERGEPAINT.NS', 'Berger Paints'],
  'bergepaint': ['BERGEPAINT.NS', 'Berger Paints'],
  'havells': ['HAVELLS.NS', 'Havells India'],
  'voltas': ['VOLTAS.NS', 'Voltas'],
  'siemens': ['SIEMENS.NS', 'Siemens India'],
  'abb': ['ABB.NS', 'ABB India'],
  'bhel': ['BHEL.NS', 'Bharat Heavy Electricals'],
  'bel': ['BEL.NS', 'Bharat Electronics'],
  'bharat electronics': ['BEL.NS', 'Bharat Electronics'],
  'hal': ['HAL.NS', 'Hindustan Aeronautics'],
  'hindustan aeronautics': ['HAL.NS', 'Hindustan Aeronautics'],
  'irctc': ['IRCTC.NS', 'IRCTC'],
  'indigo': ['INDIGO.NS', 'InterGlobe Aviation (IndiGo)'],
  'interglobe': ['INDIGO.NS', 'InterGlobe Aviation (IndiGo)'],
  'dlf': ['DLF.NS', 'DLF'],
  'godrej properties': ['GODREJPROP.NS', 'Godrej Properties'],
  'godrejprop': ['GODREJPROP.NS', 'Godrej Properties'],
  'lodha': ['LODHA.NS', 'Macrotech Developers (Lodha)'],
  'macrotech': ['LODHA.NS', 'Macrotech Developers (Lodha)'],
  'zomato': ['ETERNAL.NS', 'Eternal (Zomato)'],
  'eternal': ['ETERNAL.NS', 'Eternal (Zomato)'],
  'swiggy': ['SWIGGY.NS', 'Swiggy'],
  'paytm': ['PAYTM.NS', 'One97 Communications (Paytm)'],
  'one97': ['PAYTM.NS', 'One97 Communications (Paytm)'],
  'nykaa': ['NYKAA.NS', 'FSN E-Commerce (Nykaa)'],
  'policybazaar': ['POLICYBZR.NS', 'PB Fintech (Policybazaar)'],
  'pb fintech': ['POLICYBZR.NS', 'PB Fintech (Policybazaar)'],
  'dmart': ['DMART.NS', 'Avenue Supermarts (DMart)'],
  'avenue supermarts': ['DMART.NS', 'Avenue Supermarts (DMart)'],
  'trent': ['TRENT.NS', 'Trent'],
  'jubilant food': ['JUBLFOOD.NS', 'Jubilant FoodWorks'],
  'jubilant foodworks': ['JUBLFOOD.NS', 'Jubilant FoodWorks'],
  'jublfood': ['JUBLFOOD.NS', 'Jubilant FoodWorks'],
  'dominos': ['JUBLFOOD.NS', 'Jubilant FoodWorks'],
  'pvr': ['PVRINOX.NS', 'PVR INOX'],
  'pvr inox': ['PVRINOX.NS', 'PVR INOX'],
  'pvrinox': ['PVRINOX.NS', 'PVR INOX'],
  'indian hotels': ['INDHOTEL.NS', 'Indian Hotels Company'],
  'indhotel': ['INDHOTEL.NS', 'Indian Hotels Company'],
  'taj hotels': ['INDHOTEL.NS', 'Indian Hotels Company'],
  'lic': ['LICI.NS', 'Life Insurance Corporation of India'],
  'lici': ['LICI.NS', 'Life Insurance Corporation of India'],
  'sbi life': ['SBILIFE.NS', 'SBI Life Insurance'],
  'sbilife': ['SBILIFE.NS', 'SBI Life Insurance'],
  'hdfc life': ['HDFCLIFE.NS', 'HDFC Life Insurance'],
  'hdfclife': ['HDFCLIFE.NS', 'HDFC Life Insurance'],
  'icici prudential': ['ICICIPRULI.NS', 'ICICI Prudential Life'],
  'icici lombard': ['ICICIGI.NS', 'ICICI Lombard General Insurance'],
  'muthoot': ['MUTHOOTFIN.NS', 'Muthoot Finance'],
  'muthoot finance': ['MUTHOOTFIN.NS', 'Muthoot Finance'],
  'pnb': ['PNB.NS', 'Punjab National Bank'],
  'punjab national bank': ['PNB.NS', 'Punjab National Bank'],
  'bank of baroda': ['BANKBARODA.NS', 'Bank of Baroda'],
  'bankbaroda': ['BANKBARODA.NS', 'Bank of Baroda'],
  'canara bank': ['CANBK.NS', 'Canara Bank'],
  'canbk': ['CANBK.NS', 'Canara Bank'],
  'union bank': ['UNIONBANK.NS', 'Union Bank of India'],
  'idfc first': ['IDFCFIRSTB.NS', 'IDFC First Bank'],
  'idfc first bank': ['IDFCFIRSTB.NS', 'IDFC First Bank'],
  'federal bank': ['FEDERALBNK.NS', 'Federal Bank'],
  'federalbnk': ['FEDERALBNK.NS', 'Federal Bank'],
  'indusind': ['INDUSINDBK.NS', 'IndusInd Bank'],
  'indusind bank': ['INDUSINDBK.NS', 'IndusInd Bank'],
  'indusindbk': ['INDUSINDBK.NS', 'IndusInd Bank'],
  'yes bank': ['YESBANK.NS', 'Yes Bank'],
  'yesbank': ['YESBANK.NS', 'Yes Bank'],
  'au bank': ['AUBANK.NS', 'AU Small Finance Bank'],
  'au small finance': ['AUBANK.NS', 'AU Small Finance Bank'],
  'bandhan bank': ['BANDHANBNK.NS', 'Bandhan Bank'],
  'rec': ['RECLTD.NS', 'REC Limited'],
  'recltd': ['RECLTD.NS', 'REC Limited'],
  'pfc': ['PFC.NS', 'Power Finance Corporation'],
  'power finance': ['PFC.NS', 'Power Finance Corporation'],
  'irfc': ['IRFC.NS', 'Indian Railway Finance Corporation'],
  'rvnl': ['RVNL.NS', 'Rail Vikas Nigam'],
  'rail vikas': ['RVNL.NS', 'Rail Vikas Nigam'],
  'ircon': ['IRCON.NS', 'IRCON International'],
  'nhpc': ['NHPC.NS', 'NHPC'],
  'sjvn': ['SJVN.NS', 'SJVN'],
  'torrent power': ['TORNTPOWER.NS', 'Torrent Power'],
  'jsw energy': ['JSWENERGY.NS', 'JSW Energy'],
  'suzlon': ['SUZLON.NS', 'Suzlon Energy'],
  'inox wind': ['INOXWIND.NS', 'Inox Wind'],
  'upl': ['UPL.NS', 'UPL'],
  'pi industries': ['PIIND.NS', 'PI Industries'],
  'srf': ['SRF.NS', 'SRF'],
  'deepak nitrite': ['DEEPAKNTR.NS', 'Deepak Nitrite'],
  'gail': ['GAIL.NS', 'GAIL India'],
  'petronet': ['PETRONET.NS', 'Petronet LNG'],
  'igl': ['IGL.NS', 'Indraprastha Gas'],
  'lupin': ['LUPIN.NS', 'Lupin'],
  'aurobindo': ['AUROPHARMA.NS', 'Aurobindo Pharma'],
  'aurobindo pharma': ['AUROPHARMA.NS', 'Aurobindo Pharma'],
  'alkem': ['ALKEM.NS', 'Alkem Laboratories'],
  'torrent pharma': ['TORNTPHARM.NS', 'Torrent Pharmaceuticals'],
  'zydus': ['ZYDUSLIFE.NS', 'Zydus Lifesciences'],
  'zydus life': ['ZYDUSLIFE.NS', 'Zydus Lifesciences'],
  'biocon': ['BIOCON.NS', 'Biocon'],
  'glenmark': ['GLENMARK.NS', 'Glenmark Pharmaceuticals'],
  'mankind': ['MANKIND.NS', 'Mankind Pharma'],
  'mankind pharma': ['MANKIND.NS', 'Mankind Pharma'],
  'max healthcare': ['MAXHEALTH.NS', 'Max Healthcare'],
  'fortis': ['FORTIS.NS', 'Fortis Healthcare'],
  'lal path labs': ['LALPATHLAB.NS', 'Dr Lal PathLabs'],
  'lalpathlab': ['LALPATHLAB.NS', 'Dr Lal PathLabs'],
  'naukri': ['NAUKRI.NS', 'Info Edge (Naukri)'],
  'info edge': ['NAUKRI.NS', 'Info Edge (Naukri)'],
  'ltimindtree': ['LTIM.NS', 'LTIMindtree'],
  'ltim': ['LTIM.NS', 'LTIMindtree'],
  'mphasis': ['MPHASIS.NS', 'Mphasis'],
  'coforge': ['COFORGE.NS', 'Coforge'],
  'persistent': ['PERSISTENT.NS', 'Persistent Systems'],
  'persistent systems': ['PERSISTENT.NS', 'Persistent Systems'],
  'oracle financial': ['OFSS.NS', 'Oracle Financial Services'],
  'ofss': ['OFSS.NS', 'Oracle Financial Services'],
  'kpit': ['KPITTECH.NS', 'KPIT Technologies'],
  'kpit tech': ['KPITTECH.NS', 'KPIT Technologies'],
  'cyient': ['CYIENT.NS', 'Cyient'],
  'ashok leyland': ['ASHOKLEY.NS', 'Ashok Leyland'],
  'ashokley': ['ASHOKLEY.NS', 'Ashok Leyland'],
  'escorts': ['ESCORTS.NS', 'Escorts Kubota'],
  'mrf': ['MRF.NS', 'MRF'],
  'apollo tyres': ['APOLLOTYRE.NS', 'Apollo Tyres'],
  'apollotyre': ['APOLLOTYRE.NS', 'Apollo Tyres'],
  'ceat': ['CEATLTD.NS', 'CEAT'],
  'motherson': ['MOTHERSON.NS', 'Samvardhana Motherson'],
  'bosch': ['BOSCHLTD.NS', 'Bosch India'],
  'exide': ['EXIDEIND.NS', 'Exide Industries'],
  'bharat forge': ['BHARATFORG.NS', 'Bharat Forge'],
  'bharatforg': ['BHARATFORG.NS', 'Bharat Forge'],
  'cummins': ['CUMMINSIND.NS', 'Cummins India'],
  'thermax': ['THERMAX.NS', 'Thermax'],
  'astral': ['ASTRAL.NS', 'Astral'],
  'supreme industries': ['SUPREMEIND.NS', 'Supreme Industries'],
  'dixon': ['DIXON.NS', 'Dixon Technologies'],
  'dixon technologies': ['DIXON.NS', 'Dixon Technologies'],
  'amber': ['AMBER.NS', 'Amber Enterprises'],
  'polycab': ['POLYCAB.NS', 'Polycab India'],
  'kei': ['KEI.NS', 'KEI Industries'],
  'rr kabel': ['RRKABEL.NS', 'RR Kabel'],
  'crompton': ['CROMPTON.NS', 'Crompton Greaves Consumer'],
  'whirlpool': ['WHIRLPOOL.NS', 'Whirlpool India'],
  'blue star': ['BLUESTARCO.NS', 'Blue Star'],
  'bluestarco': ['BLUESTARCO.NS', 'Blue Star'],
  'symphony': ['SYMPHONY.NS', 'Symphony'],
  'kalyan jewellers': ['KALYANKJIL.NS', 'Kalyan Jewellers'],
  'kalyan': ['KALYANKJIL.NS', 'Kalyan Jewellers'],
  'varun beverages': ['VBL.NS', 'Varun Beverages'],
  'vbl': ['VBL.NS', 'Varun Beverages'],
  'united breweries': ['UBL.NS', 'United Breweries'],
  'united spirits': ['UNITDSPR.NS', 'United Spirits'],
  'radico': ['RADICO.NS', 'Radico Khaitan'],
  'bata': ['BATAINDIA.NS', 'Bata India'],
  'bata india': ['BATAINDIA.NS', 'Bata India'],
  'relaxo': ['RELAXO.NS', 'Relaxo Footwears'],
  'page industries': ['PAGEIND.NS', 'Page Industries (Jockey)'],
  'pageind': ['PAGEIND.NS', 'Page Industries (Jockey)'],
  'jockey': ['PAGEIND.NS', 'Page Industries (Jockey)'],
  'sail': ['SAIL.NS', 'Steel Authority of India'],
  'nmdc': ['NMDC.NS', 'NMDC'],
  'jindal steel': ['JINDALSTEL.NS', 'Jindal Steel & Power'],
  'jindalstel': ['JINDALSTEL.NS', 'Jindal Steel & Power'],
  'apl apollo': ['APLAPOLLO.NS', 'APL Apollo Tubes'],
  'concor': ['CONCOR.NS', 'Container Corporation of India'],
  'blue dart': ['BLUEDART.NS', 'Blue Dart Express'],
  'delhivery': ['DELHIVERY.NS', 'Delhivery'],
  'mazagon dock': ['MAZDOCK.NS', 'Mazagon Dock Shipbuilders'],
  'mazdock': ['MAZDOCK.NS', 'Mazagon Dock Shipbuilders'],
  'cochin shipyard': ['COCHINSHIP.NS', 'Cochin Shipyard'],
  'cochinship': ['COCHINSHIP.NS', 'Cochin Shipyard'],
  'garden reach': ['GRSE.NS', 'Garden Reach Shipbuilders'],
  'grse': ['GRSE.NS', 'Garden Reach Shipbuilders'],
  'bharat dynamics': ['BDL.NS', 'Bharat Dynamics'],
  'bdl': ['BDL.NS', 'Bharat Dynamics'],
  'data patterns': ['DATAPATTNS.NS', 'Data Patterns'],
  'idea': ['IDEA.NS', 'Vodafone Idea'],
  'vodafone idea': ['IDEA.NS', 'Vodafone Idea'],
  'vi': ['IDEA.NS', 'Vodafone Idea'],
  'jio financial': ['JIOFIN.NS', 'Jio Financial Services'],
  'jiofin': ['JIOFIN.NS', 'Jio Financial Services'],
  'jio': ['JIOFIN.NS', 'Jio Financial Services'],
  'ola electric': ['OLAELEC.NS', 'Ola Electric Mobility'],
  'ola': ['OLAELEC.NS', 'Ola Electric Mobility'],
  'hyundai': ['HYUNDAI.NS', 'Hyundai Motor India'],
  'hyundai motor': ['HYUNDAI.NS', 'Hyundai Motor India'],
  'bse': ['BSE.NS', 'BSE Limited'],
  'cdsl': ['CDSL.NS', 'Central Depository Services'],
  'angel one': ['ANGELONE.NS', 'Angel One'],
  'angelone': ['ANGELONE.NS', 'Angel One'],
  'zerodha': ['CDSL.NS', 'Central Depository Services'], // Zerodha is unlisted; nearest proxy

  // Popular global names (work out of the box too)
  'apple': ['AAPL', 'Apple Inc.'],
  'aapl': ['AAPL', 'Apple Inc.'],
  'microsoft': ['MSFT', 'Microsoft'],
  'msft': ['MSFT', 'Microsoft'],
  'google': ['GOOGL', 'Alphabet (Google)'],
  'alphabet': ['GOOGL', 'Alphabet (Google)'],
  'googl': ['GOOGL', 'Alphabet (Google)'],
  'amazon': ['AMZN', 'Amazon'],
  'amzn': ['AMZN', 'Amazon'],
  'tesla': ['TSLA', 'Tesla'],
  'tsla': ['TSLA', 'Tesla'],
  'nvidia': ['NVDA', 'NVIDIA'],
  'nvda': ['NVDA', 'NVIDIA'],
  'meta': ['META', 'Meta Platforms'],
  'facebook': ['META', 'Meta Platforms'],
  'netflix': ['NFLX', 'Netflix'],
  'nflx': ['NFLX', 'Netflix'],
};

// Words that appear in trading questions but are never stock names.
const STOPWORDS = new Set([
  'a', 'an', 'the', 'i', 'me', 'my', 'we', 'you', 'is', 'are', 'was', 'be', 'been', 'it', 'its',
  'do', 'does', 'did', 'can', 'could', 'shall', 'should', 'will', 'would', 'may', 'might',
  'what', 'whats', 'when', 'where', 'which', 'who', 'why', 'how', 'about', 'tell', 'give', 'show',
  'analyse', 'analyze', 'analysis', 'analyzing', 'check', 'checkout', 'review', 'evaluate', 'explain',
  'stock', 'stocks', 'share', 'shares', 'scrip', 'equity', 'company', 'ltd', 'limited',
  'price', 'prices', 'target', 'targets', 'level', 'levels', 'chart', 'charts',
  'buy', 'sell', 'hold', 'wait', 'entry', 'exit', 'stoploss', 'stop', 'loss', 'profit', 'book',
  'invest', 'investing', 'investment', 'trade', 'trading', 'trader', 'swing', 'intraday', 'position',
  'long', 'short', 'term', 'good', 'bad', 'best', 'worst', 'right', 'now', 'today', 'tomorrow',
  'week', 'month', 'year', 'view', 'views', 'outlook', 'opinion', 'idea', 'time', 'moment',
  'for', 'of', 'on', 'in', 'at', 'to', 'from', 'with', 'and', 'or', 'if', 'this', 'that', 'these',
  'please', 'pls', 'kindly', 'hey', 'hi', 'hello', 'ok', 'okay', 'so', 'very', 'much', 'more',
  'market', 'markets', 'nse', 'bse', 'india', 'indian', 'rupee', 'rupees',
  'up', 'down', 'going', 'go', 'move', 'moving', 'run', 'rally', 'fall', 'falling', 'rise', 'rising',
  'think', 'thoughts', 'feel', 'looks', 'look', 'like', 'worth', 'value', 'money',
]);

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[?!.,;:'"()\[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Resolve a stock/index from a free-text query.
 * Order: explicit ticker hint -> curated aliases (longest first) -> Yahoo search.
 */
export async function resolveStockFromQuery(
  query: string,
  symbolHint?: string
): Promise<ResolvedStock | null> {
  const q = normalize(query);
  if (!q) return null;
  const padded = ` ${q} `;

  // 1) Curated aliases in the ACTUAL query text - match longest names first
  // so "tata motors" wins over "tata". The query text is always the source
  // of truth: a client-supplied symbolHint is untrusted here because it can
  // be stale (e.g. a UI default that wasn't updated for a freshly typed
  // question) - trusting it before the query text caused every analysis to
  // silently resolve to whatever the hint last was, regardless of what was
  // actually asked.
  const aliasKeys = Object.keys(ALIASES).sort((a, b) => b.length - a.length);
  for (const alias of aliasKeys) {
    if (padded.includes(` ${alias} `)) {
      const [symbol, name] = ALIASES[alias];
      return { yahooSymbol: symbol, displaySymbol: symbol.replace(/\.(NS|BO)$/, '').replace(/^\^/, ''), name, source: 'alias' };
    }
  }

  // 2) Yahoo search on the meaningful words that remain
  const words = q.split(' ').filter(w => w.length >= 2 && !STOPWORDS.has(w));
  const candidates: string[] = [];
  if (words.length) {
    candidates.push(words.slice(0, 3).join(' ')); // phrase first ("adani total gas")
    if (words.length > 1) candidates.push(...words.slice(0, 3)); // then single words
  }

  for (const candidate of candidates) {
    try {
      const results = await searchSymbols(candidate);
      if (!results.length) continue;
      const indian = results.find(r => r.symbol.endsWith('.NS')) || results.find(r => r.symbol.endsWith('.BO'));
      const chosen = indian || results[0];
      return {
        yahooSymbol: chosen.symbol,
        displaySymbol: chosen.symbol.replace(/\.(NS|BO)$/, '').replace(/^\^/, ''),
        name: chosen.name,
        source: 'search',
      };
    } catch {
      // try the next candidate; network hiccups shouldn't kill resolution
    }
  }

  // 3) Last resort: the client-supplied hint, only once the query text
  // itself yielded nothing usable.
  if (symbolHint && symbolHint !== 'UNKNOWN') {
    const hit = ALIASES[symbolHint.toLowerCase()];
    if (hit) return { yahooSymbol: hit[0], displaySymbol: hit[0].replace(/\.(NS|BO)$/, ''), name: hit[1], source: 'alias' };
    try {
      const results = await searchSymbols(symbolHint);
      if (results.length) {
        const indian = results.find(r => r.symbol.endsWith('.NS')) || results.find(r => r.symbol.endsWith('.BO'));
        const chosen = indian || results[0];
        return {
          yahooSymbol: chosen.symbol,
          displaySymbol: chosen.symbol.replace(/\.(NS|BO)$/, '').replace(/^\^/, ''),
          name: chosen.name,
          source: 'search',
        };
      }
    } catch {
      // fall through to "not found"
    }
  }

  return null;
}

/** True when the query is about the broad market rather than one stock. */
export function isMarketLevelQuery(query: string): boolean {
  const q = normalize(query);
  return /\b(market|nifty|sensex|index|indices)\b/.test(q);
}
