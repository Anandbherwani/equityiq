import type {
  AnalystNote,
  BacktestResponse,
  MacroResponse,
  MorningBriefResponse,
  PortfolioConstructionResponse,
  RecommendationHistoryResponse,
  RecommendationItem,
  DataCoverageReport,
  RecommendationValidationResponse,
  SymbolResponse,
  Top10Response,
  IpoIntelligenceResponse,
  SmeAlphaResponse,
  ThemeIntelligenceResponse,
  SheetAuditResponse,
  WatchlistEntry,
} from "./types";

// Reference prices for demo stocks — enables upside computation in cards/lists
const DEMO_PRICES: Record<string, number> = {
  // Immediate opportunities
  RELIANCE: 2855, ICICIBANK: 1285, HDFCBANK: 1755, MARUTI: 12850,
  TCS: 4120, TITAN: 3460, INFY: 1895, BAJFINANCE: 7150,
  SUNPHARMA: 1680, LTIM: 5420,
  // Government beneficiaries
  LT: 3720, BEL: 288, HAL: 4280, RVNL: 635, IRFC: 225,
  // Legacy immediate list (kept for demoSymbol lookups)
  SBIN: 848, BHARTIARTL: 1585, ITC: 468, AXISBANK: 1225,
  // 3-Month opportunities
  DIXON: 14800, POLICYBAZAAR: 1520, ZOMATO: 245, DELHIVERY: 395, NYKAA: 175,
  // 12-Month compounders
  PIDILITIND: 2980, ASTRAL: 2045, DRREDDY: 6850, ABBINDIA: 29500, NESTLEIND: 2450,
  // Monopoly businesses
  IEX: 185, CDSL: 1380, MCX: 6150, CAMS: 4680, IRCTC: 740,
  // Turnarounds
  TATAMOTORS: 875, VEDL: 435, HINDALCO: 685, SAIL: 125, JSWSTEEL: 925,
};

function makeNote(
  investment_thesis: string,
  bull_case: string,
  bear_case: string,
  catalysts: string,
  risks: string,
  valuation_summary: string,
  peer_comparison: string,
  theme_exposure: string,
  confidence: number,
  confidence_rationale: string,
  timeline: string
): AnalystNote {
  return { investment_thesis, bull_case, bear_case, catalysts, risks,
           valuation_summary, peer_comparison, theme_exposure,
           confidence, confidence_rationale, timeline };
}

function demoItemFull(
  rank: number, symbol: string, name: string, sector: string,
  score: number, note: AnalystNote, horizon = "3m"
): RecommendationItem {
  const price = DEMO_PRICES[symbol] ?? null;
  const upsidePct = score <= 35 ? 3 : Math.min(30, (score - 35) * 0.55 + 3);
  const targetPrice = price ? Math.round(price * (1 + upsidePct / 100) * 100) / 100 : null;
  return {
    rank, symbol, company_name: name, sector,
    conviction_total: score,
    bull_case: note.bull_case,
    bear_case: note.bear_case,
    catalyst: note.catalysts,
    target_horizon: horizon,
    evidence: "",
    confidence: note.confidence,
    current_price: price,
    target_price: targetPrice,
    analyst_note: note,
  };
}

function demoItem(rank: number, symbol: string, name: string, sector: string, score: number): RecommendationItem {
  const conf = Math.min(92, Math.round(40 + score * 0.55));
  const note = makeNote(
    `${name} is a quality Indian business ranked highly by our conviction engine on fundamental strength and sector positioning.`,
    "• Strong quality vs sector peers and improving return ratios\n• Order momentum and positive sector rank support near-term upside\n• Management execution track record above industry median over 5 years",
    "• Earnings miss or guidance cut could compress valuation multiples sharply\n• Macro rotation away from the sector could drive institutional selling pressure",
    "• Near-term earnings catalyst — quarterly results due within 6 weeks\n• Order-book update or management guidance revision expected soon",
    "• Monitor promoter pledge levels and institutional ownership changes\n• Data completeness for this symbol is moderate — verify before sizing",
    "• Trading near sector median P/E with relative valuation score supportive of upside\n• Fair value estimate implies 10-15% upside over a 3-month research horizon",
    "• ROE above sector median and growth trajectory in line with category leaders\n• Balance sheet strength above average for the peer group in this sector",
    "• Aligned with domestic capex recovery and consumption demand themes in India\n• Policy tailwinds from government spending in relevant sector support the thesis",
    conf,
    "Model confidence blends opportunity rank, data quality score and conviction engine output.",
    "3-month research horizon — revisit after next earnings release and sector data update."
  );
  return demoItemFull(rank, symbol, name, sector, score, note);
}

// ── Per-stock analyst notes ──────────────────────────────────────────────────

const NOTE_RELIANCE = makeNote(
  "Reliance Industries commands a dominant position across energy, retail and digital verticals with unmatched scale and capital allocation discipline. The Jio-Financial and Retail IPO pipeline unlocks significant value for shareholders over the next 12 months.",
  "• Oil-to-chemicals margin expansion as new-energy projects ramp up production capacity\n• Jio Platforms monetising 450M subscribers through UPI, lending and streaming services\n• Retail footprint surpassing 18,000 stores with 20%+ same-store sales growth trajectory",
  "• Telecom ARPU headwinds if Jio delays tariff hikes amid competitive pressure from Airtel\n• High capex cycle keeping free cash flow tight for at least two more years until JFS IPO",
  "• Reliance Retail IPO filing expected to be announced within the next 6 months from Board\n• New energy gigafactory commissioning — first solar modules ship in Q3 FY27 as planned\n• Jio Financial Services credit card and lending product rolling out nationally by Q2 FY27",
  "• Regulatory risk in telecom sector; TRAI spectrum allocation delays could affect Jio capex\n• Global crude oil price volatility affecting refining margins and O2C segment EBITDA directly",
  "• Trading at 20x FY27E earnings vs 5-year average of 22x — mild discount to historical range\n• EV/EBITDA of 11x vs sector median 13x supports 15-18% upside to consensus fair value",
  "• ROE of 9.8% vs PSU oil peers at 14%; ROCE of 12% above the sector median for diversified\n• Revenue diversification gives a valuation premium over pure-play refiners such as BPCL",
  "• Core beneficiary of India's energy transition, digital consumption and retail formalisation themes\n• Retail and financial services provide a defensive revenue stream offsetting O2C oil price risk",
  88, "High data quality (86%), strong balance sheet and clear near-term catalysts on all three verticals.",
  "3-month catalyst window — Retail IPO announcement and Jio Financial product launches are primary triggers."
);

const NOTE_ICICIBANK = makeNote(
  "ICICI Bank has emerged as the highest-quality private sector lender in India, combining best-in-class return on assets with disciplined underwriting across retail and corporate segments. The iMobile Pay digital platform (10M+ active users) reinforces a durable competitive moat.",
  "• Credit growth accelerating — retail and SME loan book expanding at 18% YoY with low slippages\n• NIM expansion expected as high-cost deposits reprice lower in the RBI interest rate cut cycle\n• Provisions normalising — credit cost guidance of sub-50bps for FY27 supports earnings upgrade",
  "• Slippage risk in unsecured retail segment if consumer stress rises before rate cuts materialise\n• Valuation premium vs PSU banks may compress if RBI delays the easing cycle beyond Q2 FY27",
  "• Q1 FY27 earnings expected to show 20%+ PAT growth — confirms NIM recovery is on track fully\n• RBI MPC rate cut of 50bps expected by end of FY27 — immediate NIM and sentiment benefit\n• iMobile cross-sell driving insurance and mutual fund fee income accretion above peer group",
  "• Unsecured retail loan quality — credit cards and personal loans warrant close quarterly monitoring\n• NIMs could compress if deposit cost repricing lags asset yield normalisation for 2+ quarters",
  "• P/B of 3.5x on FY27E book vs 5-year average of 3.2x — modest premium but ROA expansion justifies\n• ROA expanding to 2.3% supports re-rating to 4x book over 12 months as credit cycle normalises",
  "• ROA 2.2% vs HDFC Bank 1.9% and Axis Bank 1.8% — best-in-class among all large private banks\n• Gross NPA of 1.96% lowest among large private banks — superior credit quality vs all listed peers",
  "• Beneficiary of India's financialisation of savings and rapid digital lending adoption themes\n• SME franchise positioned well for credit-cycle recovery as RBI rate easing accelerates in FY27",
  85, "Excellent data quality (91%), proven management track record and clear rate-cycle tailwinds confirmed.",
  "3-month horizon aligned with Q1 FY27 results and RBI rate cut committee meeting outcomes in August."
);

const NOTE_HDFCBANK = makeNote(
  "HDFC Bank is recalibrating post-merger with HDFC Ltd, with CD ratio normalisation and deposit mobilisation firmly on track. The franchise quality remains unmatched and the bank is well-positioned to outperform as credit-deposit dynamics stabilise through FY27.",
  "• CD ratio improving from 110% toward target 85-90% as deposit franchise mobilisation accelerates\n• Cost-to-income improving as merger integration synergies and branch rationalisation take effect\n• Branch network of 9,000+ outlets ensures deposit market share gain vs all competing private banks",
  "• Margin compression risk if deposit repricing runs ahead of loan yield recovery for 2+ quarters\n• Integration complexity from the HDFC merger still weighing on loan growth metrics vs private peers",
  "• CD ratio milestones — target 90% by Q3 FY27 update expected on Q1 FY27 earnings call in July\n• NIM recovery confirmation in Q1 FY27 results expected by mid-July 2026 — key inflection signal\n• FPI headroom opening post-CD ratio normalisation could trigger index weight increase and inflows",
  "• Loan growth may lag peers for 2-4 more quarters while the deposit franchise rebuilds momentum\n• Any NPA surprise in the inherited HDFC home-loan book could reset the re-rating valuation thesis",
  "• P/B of 2.8x on FY27E — below 5-year average of 3.5x — clear re-rating story for patient investors\n• Earnings CAGR of 16-18% over FY27-29 supports gradual normalisation toward 3.2x book value",
  "• Franchise quality superior to any Indian bank by branch reach, CASA ratio and brand recognition\n• Lower ROA vs ICICI Bank (1.9% vs 2.2%) reflects merger dilution that should converge by FY28",
  "• Core holding in India's premium banking franchise — benefits from domestic wealth management growth\n• Merger creates diversified balance sheet spanning mortgages, corporate lending and retail segments",
  82, "Strong data quality (88%), clear re-rating catalyst tied to CD ratio trajectory and NIM recovery.",
  "3-month horizon — CD ratio data and Q1 FY27 NIM trajectory are the primary watch points for this thesis."
);

const NOTE_MARUTI = makeNote(
  "Maruti Suzuki retains 42% market share in Indian passenger vehicles and is entering a multi-year product upgrade cycle across CNG, SUV and EV segments. The upcoming E Vitara EV launch is a significant catalyst for premium segment re-rating and margin expansion.",
  "• New SUV pipeline accelerating — Fronx, Jimny and E Vitara gaining strong consumer traction\n• CNG vehicles remain price-performance leaders as compressed natural gas pricing stays competitive\n• Royalty renegotiation with Suzuki Motor could unlock 100-150bps operating margin improvement",
  "• EV transition risk if Tata Motors and MG accelerate EV penetration faster than current modelling\n• Input cost pressure from steel, aluminium and semiconductor pricing remains elevated vs FY25 levels",
  "• E Vitara EV launch in Q2 FY27 targeting 5,000+ bookings — first electric SUV platform for Maruti\n• Q1 FY27 volume data showing rural recovery — 10%+ wholesale growth is base case expectation\n• Royalty renegotiation outcome expected by end of calendar 2026 — material margin uplift if successful",
  "• Technology disruption risk if Tata Nexon EV or Hyundai Creta EV gains share faster than modelled\n• Rural market recovery is patchier than urban rebound — Q1 wholesale data warrants close monitoring",
  "• P/E of 25x FY27E vs 5-year average of 28x — trading at slight discount to long-run historical range\n• EV/EBITDA of 17x implies 12-15% upside to fair value at normalised 20x multiple on FY27 EBITDA",
  "• 42% market share vs M&M 18% and Hyundai 15% — structural dominance in the Indian mass market\n• ROE of 19% above sector median of 15%; ROCE of 22% best in class among all listed Indian OEMs",
  "• Domestic consumption recovery and rural credit improvement themes benefit Maruti most directly\n• CNG push aligns with clean fuel policy — government subsidy regime for CNG infrastructure supportive",
  80, "High data quality (84%), strong distribution franchise and clear EV launch catalyst for next quarter.",
  "3-month window — E Vitara launch and monthly wholesale volume data are the primary near-term catalysts."
);

const NOTE_TCS = makeNote(
  "TCS is the most consistent large-cap IT compounder in India with sector-leading margins and client stickiness. GenAI spend from Fortune 500 clients is accelerating discretionary IT budgets — a multi-quarter tailwind driving revenue growth recovery from H2 FY27 onward.",
  "• GenAI wave driving new deal TCV growth — TCS AI.Cloud vertical winning large enterprise contracts\n• BFSI vertical recovery expected — US banks restarting deferred core modernisation programmes\n• Margin expansion as offshore mix increases and GenAI automation displaces low-value routine work",
  "• Revenue growth recovery may take longer if US BFSI clients defer IT spend further into FY28\n• INR appreciation risk — each 1% move impacts TCS EBIT margin by approximately 40-50bps directly",
  "• Q1 FY27 deal TCV above $10B would confirm the AI spending recovery thesis for the sector broadly\n• BFSI client budget unlock expected in September quarter — the key revenue acceleration trigger\n• Dividend yield of 2.5% provides income support while waiting for the growth re-acceleration phase",
  "• US recession risk could force further budget cuts at large financial services clients in the US\n• Visa policy uncertainty affecting onsite delivery cost structure and margins if H1-B rules tighten",
  "• P/E of 22x FY27E vs 5-year average of 25x — discount reflects near-term growth uncertainty fully\n• At 10% revenue CAGR to FY29, fair value is Rs 4,800 — approximately 15% upside from current level",
  "• EBIT margin of 24.5% vs Infosys 21% and HCL Tech 19% — best-in-class profitability in Indian IT\n• Client retention above 95% and deal win rate consistently high — operationally superior to peers",
  "• Beneficiary of global enterprise GenAI adoption wave — TCS leads peers on enterprise AI integration\n• BFSI and retail verticals provide a defensive base revenue stream even in weak discretionary IT cycles",
  79, "High data quality (89%), sector-leading margins and clear H2 FY27 revenue recovery trigger visible.",
  "3-month view — deal TCV trend and BFSI vertical recovery timeline are the key near-term data points."
);

const NOTE_TITAN = makeNote(
  "Titan Company has built India's strongest consumer brand across jewellery, watches and eyewear with pricing power that category peers cannot replicate. The Tanishq conversion from unorganised market captures multi-year structural growth as India's gold demand formalises rapidly.",
  "• Wedding jewellery demand structurally strong — India's eligible marriage cohort growing 5% annually\n• Watches segment revival — premium watch demand from Gen Z consumers accelerating above 15% YoY\n• CaratLane digital-first strategy targeting Rs 5,000 Cr revenue by FY29 at high EBITDA margin",
  "• Gold price volatility compressing jewellery volumes if prices breach Rs 90,000 per 10g barrier\n• Competition from Kalyan Jewellers and Senco gaining tier-2 city market share against Tanishq brand",
  "• Wedding season (Oct-Dec) demand data — early bookings signal 18-22% YoY volume growth expected\n• CaratLane reaching EBITDA breakeven ahead of FY27 target — positive operating leverage inflection\n• International jewellery expansion — US and Singapore markets approaching Rs 1,000 Cr annual revenue",
  "• Import duty hike on gold could slow discretionary jewellery purchases by 8-10% in the near term\n• Consumer slowdown in premium segment if urban household income growth disappoints for 2 quarters",
  "• P/E of 55x FY27E reflects a well-deserved brand premium for a 15-18% earnings CAGR compounder\n• EV/EBITDA of 35x vs global luxury/jewellery peers at 25x — India growth premium is clearly justified",
  "• Tanishq 7% market share vs unorganised sector 60% of market — massive formalisation tailwind ahead\n• EBITDA margin 11% vs Kalyan Jewellers 4.5% — premium positioning creates a durable margin moat",
  "• Premiumisation of Indian consumption and shift from unorganised gold retail to organised branded stores\n• Women's empowerment and growing working-women segment driving personal jewellery purchases higher",
  77, "Excellent data quality (87%), brand moat is proven and India's formalisation of jewellery retail intact.",
  "3-month view — festive season preview bookings (Onam, Navratri) are the primary near-term catalyst."
);

const NOTE_INFY = makeNote(
  "Infosys has re-accelerated its deal-win engine with a focus on large transformation contracts. The Cobalt AI platform provides differentiated positioning in GenAI-led deals while margins are bottoming out after the wage hike cycle and should recover through FY27.",
  "• Large deal wins accelerating — Cobalt AI platform securing Fortune 100 client contracts in FY27\n• Margin trajectory improving as attrition normalises and the fresher-heavy pyramid gets fully built\n• Dividend yield of 3.1% and active buyback program support total shareholder return above IT peers",
  "• Management guidance credibility risk after multiple downward revisions during the FY25-26 downcycle\n• Telecom and hi-tech verticals still soft — may not recover to growth territory before FY28 at best",
  "• Q1 FY27 earnings with potential FY27 guidance upgrade if deal TCV holds above $4B for the quarter\n• Cobalt AI platform go-live with a major BFSI client — demonstrates GenAI capability differentiation\n• INR weakness improves reported margins by 80-100bps through H2 FY27 if current levels hold",
  "• BFSI decision cycles still extended — US regional bank exposure to slower spending remains a concern\n• Attrition could re-accelerate if fresher wage hike rates fail to match market compensation in FY27",
  "• P/E of 20x FY27E vs TCS at 22x — justified discount on near-term growth differential is now narrow\n• Free cash flow yield of 5.5% at current price makes dividend sustainability robust and well-covered",
  "• Trailing TCS on revenue growth but margins converging — catch-up trade with approximately 12% upside\n• Large deal TCV for FY26 close to TCS levels at $18B — deal engine is competitive again post-reset",
  "• GenAI integration services and cloud transformation programmes are the core growth verticals for Infosys\n• Europe clients in manufacturing and utilities digitisation provide valuable geography diversification",
  78, "Good data quality (83%), improving deal momentum and margin recovery thesis tracking as expected.",
  "3-month window — FY27 guidance upgrade on Q1 call in July is the primary near-term re-rating catalyst."
);

const NOTE_BAJFINANCE = makeNote(
  "Bajaj Finance is India's premier consumer lending franchise with category-leading cross-sell capabilities across its 90M+ customer base. Expansion into housing finance, gold loans and digital channels provides durable volume growth headroom through the rate cut cycle.",
  "• AUM growth re-accelerating to 25-28% after deliberate credit tightening implemented in FY25\n• Housing finance subsidiary (BHFL) IPO expected — a major unlocking of embedded franchise value\n• Digital EMI card network reaching 50M cards — driving low-cost customer acquisition at scale",
  "• Unsecured consumer segment stress if job market weakens in tier-2 and tier-3 cities this cycle\n• Competition from Jio Financial Services and Paytm may compress consumer lending yields over time",
  "• BHFL IPO filing expected by Q3 FY27 — a significant value unlock catalyst for BAF shareholders\n• Rate cut cycle supporting NIM expansion as short-duration liabilities reprice meaningfully lower\n• AUM growth guidance upgrade on Q1 FY27 call if credit stress remains contained through Q1 data",
  "• Unsecured retail credit quality — defaults in 2-wheeler and consumer durable loans worth watching\n• NBFC regulatory tightening on digital lending could restrict new product launches and growth pace",
  "• P/B of 4.8x FY27E vs 5-year average of 7x — significant discount post the growth reset in FY25\n• ROE of 22% supports a re-rating to 5.5x book value as AUM growth re-accelerates through FY27",
  "• Cross-sell ratio of 4.2 products per customer is 2x SBI Cards and 3x Cholamandalam Finance peers\n• Cost of funds at 7.5% vs sector median 8.2% — AAA credit rating provides a sustained cost advantage",
  "• India formalisation of credit and financial inclusion themes directly benefit Bajaj Finance franchise\n• Rural consumption recovery via EMI-financed durables is a high-beta growth lever for the business",
  76, "Strong data quality (82%), franchise quality high but close monitoring of credit cycle data needed.",
  "3-month view — BHFL IPO filing timeline and Q1 AUM growth data are the primary near-term watch points."
);

const NOTE_SUNPHARMA = makeNote(
  "Sun Pharma is India's largest pharmaceutical company with a specialty portfolio pivot underway in the US market. Ilumya and Cequa specialty sales growth, combined with 10+ branded drugs in the dermatology pipeline, provide a durable above-market earnings growth trajectory.",
  "• US specialty revenue growing at 30%+ — Ilumya and Cequa gaining market share vs all US competitors\n• India branded formulations growing 10% on volume-led prescription expansion across therapy areas\n• Global specialty segment margins above 40% — driving meaningful operating leverage on fixed costs",
  "• US generics pricing erosion continues at 8-10% annually — base generic portfolio headwind remains\n• USFDA warning letter risk at one key facility could disrupt the US supply chain for several months",
  "• Leqselvi (deuruxolitinib) FDA decision expected September 2026 — major multi-billion dollar opportunity\n• US specialty revenue run rate reaching Rs 2,000 Cr per quarter would trigger a meaningful re-rating\n• India IPM market share acceleration — new launches in cardiology and diabetes gaining prescriptions",
  "• USFDA inspection risk at Halol and Mohali plants — any 483 observations could delay approved launches\n• Currency headwind if INR appreciates vs USD, given that 45% of revenues come from export markets",
  "• P/E of 28x FY27E vs 5-year average of 32x — modest discount to history supports entry at current levels\n• Specialty segment NPV of $3B not fully captured in stock price — analyst consensus target is Rs 1,900",
  "• Specialty pivot more advanced than Cipla or Dr Reddy's in terms of US market positioning and revenue\n• R&D spend at 8% of sales vs sector median 5% — highest investment into the specialty pipeline among peers",
  "• Healthcare quality and chronic disease management themes align directly with Sun Pharma's product focus\n• India API self-sufficiency policy theme is supportive — Sun has the largest backward integration in APIs",
  74, "Strong data quality (80%), specialty growth trend confirmed but USFDA regulatory overhang persists.",
  "3-month view aligned with Leqselvi FDA advisory committee decision and US specialty revenue trajectory."
);

const NOTE_LTIM = makeNote(
  "LTIMindtree is a mid-cap IT company with above-market growth rates driven by its Microsoft ecosystem partnership and manufacturing vertical expertise. Post-merger synergies are fully realised and the company is now entering an organic growth acceleration phase through FY27.",
  "• Microsoft partnership driving Azure and M365 migration deals in BFSI and manufacturing verticals\n• Headcount addition accelerating — net adds of 3,000+ planned in FY27 signals revenue ramp conviction\n• Client mining success: $50M+ accounts now at 14, up from 8 pre-merger — cross-sell strategy working",
  "• Revenue concentration risk — top 5 clients contributing 32% of revenue creates quarterly earnings lumpiness\n• Margin below Tier-1 IT peers at 15% EBIT — pricing pressure in time-and-material deals persists",
  "• Large deal TCV above $400M would signal meaningful share gain vs TCS and Infosys in manufacturing\n• Q1 FY27 attrition below 12% would confirm talent cost normalisation and support margin recovery path\n• Microsoft partner recognition — incremental deal flow from certification in Azure and M365 practice areas",
  "• Key client concentration — any spending cut from top 3 clients impacts quarterly revenue growth sharply\n• Mid-cap IT valuation premium may compress if Tier-1 IT re-rates faster on stronger GenAI deal wins",
  "• P/E of 25x FY27E vs Tier-1 IT at 22-25x — trading at par despite a demonstrably higher growth profile\n• Revenue CAGR of 15% to FY29 supports re-rating toward 28x as delivery consistency improves over time",
  "• Growth rate of 14% YoY vs TCS 8% and Infosys 11% — highest growth among the large-cap IT peer group\n• Lower EBIT margin vs Tier-1 but improving trajectory — target 16.5% by FY28 as operating scale plays out",
  "• Manufacturing digital transformation and Industry 4.0 automation themes are the core growth drivers\n• Microsoft cloud ecosystem expansion — LTIM uniquely positioned as a certified Azure migration leader",
  72, "Good data quality (79%), growth above peers confirmed but margin recovery execution still needs proving.",
  "3-month view — large deal TCV announcement and Q1 attrition data are the primary near-term signal points."
);

/** Tab-11-style list row for symbol API / stock detail (not string list names). */
function demoSymbolListEntry(
  item: RecommendationItem,
  listName: string
): SymbolResponse["lists"][number] {
  return {
    list_name: listName,
    rank: item.rank,
    conviction_total: item.conviction_total,
    bull_case: item.bull_case,
    bear_case: item.bear_case,
    catalyst: item.catalyst,
    target_horizon: item.target_horizon,
    evidence: item.evidence,
  };
}

// ── Additional list notes (compact) ─────────────────────────────────────────

const NOTE_DIXON = makeNote(
  "Dixon Technologies is India's largest EMS company, uniquely positioned to capture the China+1 shift as global electronics brands seek Indian manufacturing. PLI scheme tailwinds and new client additions drive a multi-year revenue compounding story with improving margins.",
  "• Apple EMS expansion — Dixon entering Apple accessories via strategic Foxconn sub-contracting\n• PLI scheme payments accelerating — Rs 800 Cr+ incentive income expected over FY27-29 period\n• New verticals: refrigerators and ACs onboarded, increasing total addressable market by 40%",
  "• Margin dilution risk as new lower-margin TV and EMS clients are onboarded at below-average rates\n• Component import dependency — any supply disruption from China impacts delivery schedules",
  "• Apple accessories contract win would double the serviceable addressable market overnight for Dixon\n• PLI tranche disbursement Q2 FY27 triggers earnings upgrade cycle across major brokerage firms\n• Samsung mobile and LG appliance new client wins expected to be announced in Q3 FY27 roadshow",
  "• EMS margins are thin at 2-4% — any revenue miss creates significant earnings per share sensitivity\n• Currency risk as component costs are USD-denominated while most revenues are priced in INR",
  "• EV/EBITDA of 45x FY27E reflects growth premium — justified if revenue CAGR sustains at 35% pace\n• Fair value Rs 17,500 by FY28 on 40x EV/EBITDA implies an 18% upside from current Rs 14,800 level",
  "• Only pure-play EMS listed company in India — no direct listed comp; Kaynes trades at a premium\n• Revenue at Rs 18,000 Cr vs Amber Enterprise Rs 4,200 Cr — scale advantage in client negotiations",
  "• PLI-linked manufacturing and Make-in-India electronics themes are the core growth drivers for Dixon\n• China+1 supply chain diversification by global electronics majors creates a secular demand tailwind",
  81, "Strong data quality (82%), PLI tailwinds confirmed and Apple contract pipeline is the key near catalyst.",
  "3-month view — Apple EMS contract announcement and PLI disbursement are the primary near-term catalysts."
);

const NOTE_POLICYBAZAAR = makeNote(
  "PB Fintech (Policybazaar) dominates India's online insurance marketplace with 93% market share and is approaching its first year of meaningful profitability. Insurance underpenetration in India at 3.7% vs the global average of 8-10% provides decades of structural growth runway.",
  "• Insurance online channel growing at 35% vs industry 15% — consistent market share gains quarter-on-quarter\n• Profitability achieved — Q4 FY26 PBT positive; FY27E marks first full profitable year for the business\n• Credit (Paisabazaar) cross-sell growing fast — lending distribution adds high-margin fee income stream",
  "• Online insurance regulatory risk — IRDAI web-aggregator guidelines could restrict fee structures\n• Sales force attrition in insurance advisory still elevated at 30%+ annually — acquisition cost rising",
  "• Q1 FY27 earnings showing full PAT positive quarter — the inflection point for institutional investor sentiment\n• IRDAI sandbox approval for new health insurance products adds a new premium category for Policybazaar\n• Offline agency expansion adding 5,000+ agents by FY28 — widens addressable customer acquisition base",
  "• LIC and SBI Life launching competing digital portals introduce meaningful price competition in term insurance\n• Health insurance claim ratios rising — could force premium increases that temporarily reduce new demand",
  "• EV/Sales of 6x FY27E — premium for an insurance marketplace with first-mover advantage is well justified\n• Path to PAT margin of 8-10% by FY29 supports price-to-earnings re-rating as profits scale meaningfully",
  "• No direct listed comparable in India insurance tech — niche market leader with high barriers to replication\n• Penetration gap vs global insurance marketplace peers highlights the massive remaining India opportunity",
  "• Financial inclusion and India insurance penetration growth are decade-long secular themes for Policybazaar\n• Digital-first distribution across insurance, credit and investment creates one integrated financial ecosystem",
  75, "Good data quality (79%), first profitable year in sight and structural growth runway is multi-decade long.",
  "3-month view — Q1 FY27 PAT positive confirmation and IRDAI product approvals are the key near catalysts."
);

const NOTE_ZOMATO = makeNote(
  "Zomato is consolidating the Indian quick commerce market through Blinkit while food delivery sustains 20%+ GOV growth. The company turned profitable in FY26 and is scaling toward Rs 2,000 Cr+ PAT in FY28, making it a high-growth profitable internet platform play.",
  "• Blinkit dark store expansion — targeting 2,000 stores by end FY27 from current 1,200 base stores\n• Food delivery take-rate expansion — Zomato Gold and premium tiers driving per-order economics higher\n• Hyperpure B2B food supply business approaching Rs 5,000 Cr GMV — a new high-margin vertical emerging",
  "• Quick commerce competitive intensity from Swiggy Instamart and Zepto may compress Blinkit margins\n• Restaurant partner fee disputes could drive exclusivity arrangements favoring Swiggy in some cities",
  "• Blinkit city expansion — entry into 20 new tier-2 cities planned for Q3 FY27 as next growth phase\n• Zomato Gold membership crossing 5M drives higher order frequency and improved per-customer economics\n• International expansion pilot results in UAE and Singapore expected — new geography diversification",
  "• Regulatory risk — NRAI restaurant association lobbying for platform fee caps from DPIIT and CCPA\n• Cash burn at Blinkit remains elevated; any capex increase for dark stores delays the PAT timeline",
  "• EV/GOV of 3.2x FY27E — reasonable for a profitable quick commerce leader growing at 35% annually\n• Target price Rs 290 on 4x FY28E GOV — 18% upside; food delivery profitability remains underappreciated",
  "• Blinkit market share at 42% vs Swiggy Instamart 28% and Zepto 18% — widening gap each quarter\n• Zomato PAT margin 4% vs Swiggy still loss-making — profitability is a meaningful competitive differentiator",
  "• Quick commerce and food tech platforms benefit from India's urbanisation and convenience premium trend\n• Tier-2 city expansion and digital payments adoption create a sustained new user acquisition flywheel",
  79, "Good data quality (80%), Blinkit market share widening and food delivery profitability confirmed in FY26.",
  "3-month view — Blinkit store count and Q1 FY27 GOV growth data are the primary near-term watch points."
);

const NOTE_DELHIVERY = makeNote(
  "Delhivery is India's largest express parcel delivery network approaching EBITDA breakeven as volume scale absorbs fixed infrastructure costs. The company's ORION tech routing engine creates unit economics that improve exponentially with scale and volume density.",
  "• Volume recovery as e-commerce GMV growth returns to 25%+ in FY27 — direct and immediate revenue benefit\n• EBITDA breakeven in FY27E expected — first year of sustainable positive operating profit for the business\n• Enterprise B2B freight gaining traction at 40% YoY growth — a higher-margin business than express parcel",
  "• Intense price competition from BlueDart, Ekart and Xpressbees compressing express parcel delivery yields\n• Working capital pressure as large e-commerce clients negotiate longer payment cycles post IPO listing",
  "• Q1 FY27 EBITDA positive quarter — inflection from cash burn to cash generation is the key sentiment driver\n• Meesho and Amazon volume scale-up — both platforms adding Delhivery as a preferred logistics partner\n• B2B freight network expansion adding 50+ new hubs in tier-2 cities planned by end of FY27 financial year",
  "• Competition from Meesho's internal logistics arm may reduce third-party delivery volumes over 2-3 years\n• Fuel price spikes increase last-mile delivery costs and squeeze variable cost margin assumptions for FY27",
  "• EV/Revenue of 4x FY27E — justified for the only profitable large-scale express logistics player in India\n• Path to 8-10% EBITDA margin by FY29 implies 2x stock upside if volume growth sustains at 20%+ pace",
  "• Network density: 25,000+ pin codes served vs BlueDart 35,000 but Delhivery is growing faster in tier-3\n• ORION routing engine reduces cost per shipment by 12% vs manual planning — structural cost advantage",
  "• E-commerce logistics infrastructure is built on India's digital commerce and rural internet penetration growth\n• Quick commerce expansion in tier-2 cities creates incremental demand for hyperlocal hub-and-spoke delivery",
  68, "Moderate data quality (76%), EBITDA inflection is the key milestone; execution on cost normalisation tracked.",
  "3-month view — EBITDA positive confirmation and Meesho volume data are the primary near-term catalyst points."
);

const NOTE_NYKAA = makeNote(
  "Nykaa is India's dominant beauty and personal care marketplace with sticky customer relationships and superior brand curation. The e-commerce beauty segment grows at 35%+ and Nykaa's 200+ offline doors strengthen the omnichannel experience for its premium consumer base.",
  "• Beauty category structural growth — India beauty market at 15% CAGR driven by Gen Z consumers\n• Own brands (Kay Beauty, Nykd) now 12% of GMV — significantly higher margin than marketplace take-rate\n• Fashion segment recovering with better curation and influencer partnerships driving improved GMV metrics",
  "• Competition from Myntra Beauty, Purplle and Reliance Tira may compress platform take-rates over time\n• Fashion segment remains loss-making — a continued drag on consolidated profitability for the business",
  "• Beauty GMV crossing Rs 2,500 Cr in Q2 FY27 — festive season boost expected to be above consensus\n• NykaaFashion profitability roadmap announcement expected on the Q1 FY27 earnings call in July\n• 20+ new global brand partnerships signed for H1 FY27 exclusive India launches on Nykaa platform",
  "• Profitability still fragile — any GMV growth miss could push consolidated EBITDA back to negative territory\n• Regulatory uncertainty around FDI in marketplace model — celebrity ownership structure under CCI scrutiny",
  "• EV/GMV of 3x FY27E — reasonable for a category-leading beauty marketplace with a proven brand moat\n• Own brand penetration reaching 15% by FY28 supports EBITDA margin expansion toward 8-10% target",
  "• Beauty NPS score of 74 vs nearest competitor Purplle at 58 — customer satisfaction clearly superior\n• Brand exclusivity — 150+ brands launch first on Nykaa India platform — a unique marketplace advantage",
  "• India's beauty premiumisation and K-beauty adoption by millennial consumers fuels sustainable GMV growth\n• Female financial empowerment and self-care spending are secular themes behind Nykaa's long-term TAM",
  66, "Moderate data quality (73%), category leadership clear but NykaaFashion profitability path needs validation.",
  "3-month view — festive season beauty GMV data and NykaaFashion profitability update are the key signals."
);

const NOTE_PIDILITIND = makeNote(
  "Pidilite Industries is the undisputed leader in India's adhesives and sealants market with Fevicol enjoying near-mythical consumer loyalty. The distribution moat of 7 lakh+ touchpoints is impossible to replicate and drives consistent 15-18% earnings compounding over long periods.",
  "• Waterproofing segment (Dr. Fixit) growing at 25%+ as India's housing construction market expands rapidly\n• Raw material cycle turning — VAM prices correcting 20% gives 150-200bps gross margin improvement\n• Rural distribution expansion — 1 lakh new touch points added annually drives consistent volume growth",
  "• Premium valuation leaves limited room for any earnings disappointment or market multiple compression\n• New entrants Henkel and Sika targeting industrial adhesive segment with 10-15% pricing below Pidilite",
  "• Q1 FY27 gross margin data — VAM price correction benefits expected to flow through in H1 FY27 fully\n• Construction chemicals waterproofing segment reaching Rs 2,500 Cr annual revenue milestone in FY27\n• Rural distribution: sales from tier-4 towns crossing 25% of total revenue — distribution dividend realised",
  "• Premium valuation (P/E 65x) makes the stock highly sensitive to any macro slowdown concerns\n• Input cost reversal if crude-linked VAM prices spike on any Middle East supply disruption scenario",
  "• P/E of 65x FY27E — expensive in absolute terms but justified by a 20% CAGR compound track record\n• EV/EBITDA of 42x at current price vs historical average of 45x — offers a modest entry-point discount",
  "• Market share in adhesives above 70% vs nearest competitor at 8% — near-monopoly market position\n• ROE 28% and ROCE 35% — best capital efficiency metrics in the specialty chemicals India stock universe",
  "• India housing construction and renovation boom — every home uses Pidilite products multiple times\n• Infrastructure capex on roads and bridges drives industrial adhesive and structural sealant demand higher",
  84, "Excellent data quality (90%), monopoly economics confirmed and VAM price correction is a clear margin catalyst.",
  "12-month compounding horizon — accumulate on dips; near-term trigger is Q1 FY27 gross margin data release."
);

const NOTE_ASTRAL = makeNote(
  "Astral is the quality leader in India's CPVC pipes and adhesives market, expanding into paints and bathware using its proven distribution model. Consistent 20%+ earnings growth over a decade makes it a core multi-year compounder in India's branded building materials sector.",
  "• CPVC pipe volumes growing 18% as hot and cold water plumbing penetration rises in Indian residential\n• Astral Paints launch — leveraging distribution to disrupt decorative paints in tier-2 cities affordably\n• Bathware segment scaling toward Rs 1,000 Cr revenue — adjacent market with 40% gross margin profile",
  "• Adhesives margin compression if Pidilite responds aggressively to Astral's distribution expansion push\n• Paints entry is capital-intensive and brand building will take 5-7 years against Asian Paints dominance",
  "• Paints sales data first 12 months — Rs 500 Cr annual run-rate by Q3 FY27 would validate the model\n• PVC resin price correction adding 100-120bps EBITDA margin improvement through H2 FY27 period\n• Q1 FY27 volume growth above 20% would confirm demand recovery post-election government spending",
  "• Paints segment investment drag — negative EBIT from paints division will weigh on earnings for 3-4 years\n• Competitive intensity in CPVC from Prince Pipes and Finolex expanding South India manufacturing capacity",
  "• P/E of 52x FY27E — growth premium for a 20%+ EPS compounder with a demonstrated 10-year track record\n• Target price Rs 2,400 by FY28 on 48x earnings — 17% upside as paints losses narrow through FY29",
  "• CPVC quality rating highest among Indian pipe makers — premium brand with a 5-7% pricing lead\n• Distribution network of 2,500+ dealers vs 1,500 for Prince Pipes — a structural competitive advantage",
  "• Real estate construction recovery and housing-for-all scheme drive CPVC pipe volume expansion directly\n• Plumbing upgrade in 20-year-old urban housing stock creates replacement demand for premium CPVC pipes",
  78, "Good data quality (81%), CPVC leadership clear and Astral Paints is a multi-year optionality for patience.",
  "12-month view — Astral Paints initial traction data and CPVC volume recovery are 12-month key catalysts."
);

const NOTE_DRREDDY = makeNote(
  "Dr. Reddy's Laboratories is executing a specialty pivot in the US with biosimilar launches while India branded pharma sustains 12% growth. The Russia and CIS market franchise provides geographic diversification with high operating margins that peers cannot match.",
  "• US biosimilar launches — Rituximab and Bevacizumab gaining oncology market share in the United States\n• India market ranked number 5 — branded generics growing 14% YoY with chronic therapy category leadership\n• Russia and CIS markets: 25% operating margin — political tailwind as Western pharma exited the market",
  "• US generics base erosion at 8-10% annually is a structural headwind to total company revenue growth\n• USFDA inspection history at key plants requires clean audits to maintain US market export eligibility",
  "• Rituximab biosimilar US market share reaching 8% by end FY27 would be a meaningful revenue uplift\n• GLP-1 (semaglutide) API supply partnership announcement — a huge addressable market is opening up\n• India IPM growth data for chronic therapies (cardiac, diabetes) confirming continued market share gains",
  "• USFDA warning letter risk at the Srikakulam manufacturing plant — export approval is inspection-contingent\n• Currency risk in Russia — any RUB depreciation reduces CIS division dollar revenue contributions",
  "• P/E of 22x FY27E vs specialty pharma global peers at 18x — India biosimilar pipeline justifies premium\n• EV/EBITDA of 13x — at a discount to Sun Pharma 16x despite improving margins in the specialty division",
  "• More advanced on biosimilars vs Cipla and Lupin — first mover advantage gives a 3-5 year head start\n• Russia business profitability above all sector peers — 500bps EBITDA margin advantage in CIS geographies",
  "• Biosimilars wave in oncology and autoimmune diseases — India pharma is uniquely cost-competitive globally\n• API self-sufficiency policy theme — DRL is one of few Indian companies with GLP-1 backward integration",
  75, "Strong data quality (82%), biosimilar market share gaining and GLP-1 API is an optionality upside call.",
  "12-month view — biosimilar share uptake trajectory and any GLP-1 API deal are the primary re-rating catalysts."
);

const NOTE_ABBINDIA = makeNote(
  "ABB India is the premium industrial automation and power products company riding India's infrastructure electrification and factory automation themes simultaneously. The order book is at a multi-year high driven by data center, renewable energy and rail electrification projects.",
  "• Order book at Rs 9,000 Cr — revenue visibility for 18 months at current quarterly execution pace secured\n• Data centre power equipment — ABB winning switchgear and transformer orders for 3 major data parks\n• Rail electrification: 10,000 km of new rail lines being electrified create traction motor and signalling demand",
  "• Execution risk — order book concentration in 3-4 large clients creates quarterly revenue lumpiness risk\n• Competition from Siemens and Schneider Electric in industrial automation remains structurally intense",
  "• New order flow Q1 FY27 — Rs 2,500 Cr+ quarterly order wins would confirm sustained demand momentum\n• Data centre order book reaching 20% of total — drives margin expansion on high-complexity sophisticated orders\n• Railway electrification acceleration — government commitment of Rs 2.4 lakh Cr through FY27 is binding",
  "• Premium valuation P/E 65x is vulnerable if order inflows disappoint for two or more consecutive quarters\n• Execution capacity constraints — skilled workforce availability and component lead times are bottlenecks",
  "• P/E of 65x FY27E — premium for an industrial automation leader with 20%+ order growth rate visibility\n• EV/EBITDA of 40x vs global automation peers at 20x — India infrastructure buildout creates a durable premium",
  "• ABB India EBITDA margin of 17% vs Siemens India 15% — superior pricing power in automation equipment\n• Order book duration of 18 months vs Siemens 12 months — ABB has meaningfully longer revenue visibility",
  "• Industrial automation and power electrification are the two biggest government investment themes in India\n• Data centre construction boom by Microsoft, Google and Adani drives ABB switchgear and UPS system demand",
  81, "Excellent data quality (88%), order book at record high and data centre demand is a multi-year structural tailwind.",
  "12-month view — multi-year order execution and data centre infrastructure wins compound annual returns visibly."
);

const NOTE_NESTLEIND = makeNote(
  "Nestle India is the gold standard for FMCG category leadership with Maggi, Munch and KitKat brands sustaining pricing power in a competitive market. Volume-led growth is restarting as rural demand normalises and the company expands beyond metro channels into kiranas.",
  "• Rural volume recovery — FMCG rural growth at 8%+ after 3 quarters of narrowing urban-rural divergence\n• Premium portfolio (KitKat, Munch Extra) growing at 20%+ — premiumisation driving positive product mix\n• New categories: plant protein and health nutrition — leveraging Nestle parent global R&D pipeline",
  "• Prolonged urban slowdown could limit pricing power in the near-term discretionary food segment\n• Raw material inflation in cocoa and milk reducing gross margins if not fully passed through to consumers",
  "• Q1 FY27 volume growth data — 8%+ domestic volume growth would signal the FMCG cycle inflection point\n• Maggi noodles new premium SKUs targeting Rs 500 Cr incremental annual revenue by end of FY27\n• Rural distribution: kirana coverage reaching 5M outlets — extending well beyond saturated urban modern trade",
  "• Commodity cost pressure — cocoa prices at 5-year highs impact the chocolate portfolio margin assumptions\n• Competition in instant noodles from Ching's Secret and Knorr gaining share in the HoReCa food segment",
  "• P/E of 60x FY27E — expensive in absolute terms but justified for a defensive 15% EPS CAGR compounder\n• Dividend yield of 2.8% provides income support at current price with a consistently high 90%+ payout ratio",
  "• Maggi market share 63% vs ITC YiPPee at 26% — category dominance with strongest brand recall in India\n• EBITDA margin of 23% vs HUL 23.5% and Britannia 15% — superior to almost all listed mid-tier FMCG peers",
  "• Premiumisation of food consumption and health nutrition adoption are secular multi-year themes for Nestle\n• Rural market expansion and Bharat consumer spending recovery benefit the Maggi mass-market franchise",
  77, "Excellent data quality (92%), brand moat and pricing power proven through multiple commodity cost cycles.",
  "12-month view — rural recovery inflection in Q2 FY27 is the primary catalyst for a re-rating of growth estimates."
);

const NOTE_IEX = makeNote(
  "IEX is India's only power exchange with 95%+ market share in electricity spot trading. Power deregulation and green energy trading volumes are structural growth levers that give IEX a genuine monopoly economic moat lasting well into the next decade of energy transition.",
  "• Power trading volumes growing 25%+ as renewable energy integration drives increased spot market demand\n• Real-Time Market segment growing at 40% — new product gaining rapid adoption among distribution companies\n• Electricity derivatives approval expected from SEBI/CERC — a new high-margin trading product for IEX",
  "• CERC could open the market to competition — PXIL is gaining small share in some agricultural segments\n• Government intervention in spot power pricing mechanisms would directly impact IEX transaction revenue",
  "• Electricity derivatives launch timeline — SEBI and CERC regulatory approval process expected H1 FY27\n• Green Day Ahead Market volumes crossing 100 MW daily confirms new renewable product gaining traction\n• Environmental Markets subsidiary IPO or launch — a new revenue stream from carbon credit trading",
  "• Regulatory risk is the primary concern — any CERC adverse ruling could reshape the market structure\n• Slower renewable energy capacity addition by discoms would delay green power trading volume growth",
  "• P/E of 30x FY27E — cheap for a monopoly exchange with 90%+ EBITDA margins and near-zero incremental capex\n• EV/EBITDA of 20x — significant discount to NSE and BSE listed exchange premium; clear re-rating potential",
  "• 95% market share vs PXIL 3% — no viable power exchange competition exists today in electricity spot trading\n• EBITDA margin of 90%+ at the exchange level vs BSE 65% — power exchange economics are superior to equity",
  "• Power sector deregulation and green energy trading are decade-long structural megatrends for IEX business\n• India's 500 GW renewable energy target by 2030 creates massive incremental spot market trading volumes",
  85, "Excellent data quality (91%), monopoly economics confirmed and electricity derivatives approval is near catalyst.",
  "12-month compounding view — electricity derivatives approval is the key re-rating trigger; hold and compound."
);

const NOTE_CDSL = makeNote(
  "CDSL is India's second-largest depository with a structural edge in retail investor accounts. India's equity demat account count has doubled in 3 years and CDSL's 60% market share creates a toll-road business on India's capital markets growth that compounds automatically.",
  "• Demat account additions still growing at 25M per year — CDSL benefits directly via custody fee income\n• Transaction income growing 30%+ as retail delivery volumes and IPO settlement activity both rise\n• New services including e-CAS and digital insurance repository expand beyond core depository revenue",
  "• NSDL gaining share in institutional segment — could slow CDSL's transaction income per-account growth\n• Market downturn would reduce trading volumes and settlement activity — cyclical revenue sensitivity exists",
  "• Demat account count crossing 180M triggers incremental annual custody fee income from the milestone\n• KYC Registration Agency certification expansion — 100M+ documents processed creates a new revenue line\n• Bull market continuation — rising IPO pipeline and secondary volumes boost IEX settlement income directly",
  "• SEBI regulatory changes on depository fee structures could reduce the per-account income level for CDSL\n• Market correction reducing retail investor participation would slow demat account opening momentum",
  "• P/E of 38x FY27E — premium justified for a market-dominant depository with a capital-light business model\n• Free cash flow yield of 3% at current price; dividend payout of 60% — clearly shareholder-friendly company",
  "• CDSL 60% retail demat share vs NSDL institutional dominance — two complementary market segment leaders\n• Operating leverage: 20% demat account growth translates to 35% PAT growth — strong earnings multiplier",
  "• India's financialisation of savings and equity participation growth are structural tailwinds for CDSL business\n• Mutual fund SIP growth adding 50M+ folios per year also flows through the depository settlement system",
  82, "Strong data quality (87%), demat account growth compounding and operating leverage clearly visible in results.",
  "12-month view — demat account growth sustainability and market trading activity levels are the key monitors."
);

const NOTE_MCX = makeNote(
  "MCX dominates India's commodity derivatives market with 90%+ share in gold, silver and base metals. The technology platform migration to TCS is complete and MCX is entering a volume recovery phase with strong pent-up institutional and retail trading demand returning.",
  "• Commodity trading volumes recovering post-tech migration — daily ADT normalising toward pre-migration peaks\n• Gold and silver options gaining market traction — higher-margin instruments than simple futures contracts\n• Electricity futures launch planned for FY27 — new product creates cross-market synergy with IEX volumes",
  "• SEBI allowing NSE into commodity derivatives could bring significant Tier-1 competitive pressure to MCX\n• CTT (Commodity Transaction Tax) structure unchanged — any adverse revision would directly hit trading volumes",
  "• ADT recovery to pre-migration levels above Rs 40,000 Cr — management guidance confirmed for Q2 FY27\n• New product launches: weather derivatives and commodity index futures are pending SEBI regulatory approval\n• Gold commodity cycle: prices above Rs 80,000 per 10g increases hedger and retail participation at MCX",
  "• Tech platform risks — any recurrence of trading system downtime would damage exchange reputation severely\n• NSE's commodity segment gaining incremental share in agri-commodities is a gradual market share risk",
  "• P/E of 28x FY27E — at a discount to NSE 40x despite MCX having a higher EBITDA margin business profile\n• EV/EBITDA of 18x — undervalued vs global commodity exchanges at 22-25x; meaningful re-rating potential",
  "• 90% market share in non-agricultural commodity derivatives — virtually no competition in core gold and metals\n• EBITDA margin of 55% — among the highest for any Indian exchange or financial market infrastructure company",
  "• Gold and base metals super-cycle potential increases institutional hedging demand at MCX exchange platform\n• India's industrialisation and growing metal consumption drives base metal derivatives trading volumes higher",
  78, "Good data quality (83%), ADT volume recovery confirmed and new product pipeline is a clear growth optionality.",
  "12-month view — ADT recovery confirmation and new product regulatory approvals are the key catalyst points."
);

const NOTE_CAMS = makeNote(
  "CAMS is India's largest registrar and transfer agent for mutual funds, processing 70% of all industry AUM transactions. As India's mutual fund industry grows from Rs 60 trillion toward Rs 100+ trillion AUM by FY28, CAMS earns a reliable fee toll on every single rupee invested.",
  "• Mutual fund SIP inflows at Rs 20,000 Cr per month growing 20% annually — CAMS earns a fee on every SIP\n• Account aggregator platform — CAMS Central becoming the gateway for all financial data sharing in India\n• Insurance repository: CAMS extending registrar services to insurance policies — a new high-margin revenue line",
  "• AMC expense ratio compression if SEBI further cuts TER could reduce CAMS percentage fee income directly\n• Kfintech gaining mutual fund market share — any large AMC switching registrars dents CAMS revenue base",
  "• Industry AUM crossing Rs 75 trillion milestone — CAMS revenue base expands proportionally to the AUM level\n• Account aggregator monetisation: SIP analytics and credit scoring services now reaching 10M+ active users\n• International expansion: CAMS entering Mauritius and Singapore fund administration markets as next growth leg",
  "• Regulatory fee reduction on mutual fund charges reduces the AUM percentage income that CAMS earns directly\n• Large AMCs internalising registrar functions as HDFC AMC did previously — an existential concentration risk",
  "• P/E of 42x FY27E — justified for a near-monopoly process outsourcing company with 95%+ client retention\n• Dividend yield of 2.5% and ongoing buyback together provide 3.5% total shareholder yield with low risk",
  "• CAMS 70% market share vs Kfintech 28% — scale gives CAMS a 200bps cost advantage per transaction processed\n• Asset-light model: Rs 15,000 Cr AUM growth requires zero incremental capital — operating leverage compounds",
  "• India mutual fund and SIP culture growth with 20M new investors per year creates direct earnings tailwind\n• Financial data sharing infrastructure (Account Aggregator) creates an entirely new fintech franchise for CAMS",
  81, "Excellent data quality (89%), AUM growth compounding reliably and account aggregator creates new optionality.",
  "12-month view — AUM growth trajectory and account aggregator fee monetisation scale are the key tracking points."
);

const NOTE_IRCTC = makeNote(
  "IRCTC is the sole authorised online rail ticket booking platform in India, processing 15 lakh tickets daily across 800M train passengers. Vande Bharat train rollout, premium ticketing and catering expansion create multiple independently-compounding revenue growth levers.",
  "• Vande Bharat train rollout — 400 new trains by FY27 generating Rs 1,200 Cr of incremental annual revenue\n• International tourism recovery — IRCTC holiday packages growing at 35% post-COVID domestic travel revival\n• Payment gateway and UPI convenience fee income: Rs 5 per ticket on 5.5 lakh internet bookings daily",
  "• Government policy risk — mandated fee reduction on internet ticketing has occurred before and may recur\n• New private rail operators if introduced could potentially bypass IRCTC booking infrastructure long-term",
  "• Vande Bharat fleet: 200th Vande Bharat commissioned in Q2 FY27 — strong momentum and visibility signal\n• IRCTC Rail Cloud launch — new B2B rail analytics and data-as-a-service product at high EBITDA margin\n• Tourism packages crossing Rs 5,000 Cr annual GMV — confirms full post-COVID leisure travel recovery",
  "• Ministry of Railways intervention in IRCTC pricing policy has precedent and remains a structural risk factor\n• Technology capacity risk — any booking site downtime during Tatkal windows creates revenue and brand loss",
  "• P/E of 58x FY27E — expensive but reflects a genuine monopoly on 10 billion+ annual Indian rail journeys\n• Free cash flow conversion of 95% — dividends and buybacks expected to total Rs 20 per share in FY27",
  "• No direct listed competitor exists — IRCTC booking monopoly is the deepest regulatory moat in India today\n• Tourism packages are competitive with Makemytrip but railway discount advantage provides a unique edge",
  "• India's railway infrastructure expansion (Vande Bharat, freight corridors) directly expands IRCTC revenue base\n• Domestic tourism boom and Dekho Apna Desh government scheme drive IRCTC holiday package demand strongly",
  83, "Excellent data quality (91%), monopoly franchise growing and Vande Bharat fleet expansion is a durable catalyst.",
  "12-month view — Vande Bharat fleet expansion and tourism revenue compounding are the long-term growth drivers."
);

const NOTE_LT = makeNote(
  "Larsen & Toubro is India's premier engineering and construction conglomerate executing on a Rs 5 trillion order book across infrastructure, defence and technology segments. Diversified revenue across EPC, technology services and financial services provides recession-resilient cash flows.",
  "• Order book at Rs 5.5 trillion — highest ever in L&T history — provides 3 years of revenue execution certainty\n• Middle East construction boom: Saudi Aramco, NEOM and UAE infrastructure contracts adding strongly\n• Tech segment (LTI, LTTS) growing at 15% — software revenue now 20% of the consolidated EBITDA base",
  "• Working capital pressure from government clients paying 6-9 months after certification of billing milestones\n• Input cost inflation on steel, cement and skilled labour reducing EPC margins below management guidance",
  "• Q1 FY27 order inflow above Rs 70,000 Cr per quarter would confirm infrastructure CapEx cycle continuation\n• Hydrocarbon and defence order wins expected — submarine programme Phase 2 worth Rs 45,000 Cr pending\n• L&T Finance demerger plan — financial services SOTP value could unlock Rs 250-300 per share equivalent",
  "• Government CapEx slowdown post-election could delay large infrastructure order finalisations by 2-3 quarters\n• Middle East geopolitics affecting project execution timelines and labour mobilisation for overseas contracts",
  "• SOTP target of Rs 4,200 vs CMP Rs 3,720 — 13% upside from core EPC plus tech plus finance parts valuation\n• EV/EBITDA of 20x core EPC — at a discount to global infrastructure peers at 25x; deserved premium applies",
  "• Order book to revenue ratio 4.5x vs KNR Constructions 2.8x — L&T has clearly superior execution visibility\n• International business 22% of the total order book — geographical diversification absent in domestic peers",
  "• National infrastructure pipeline (NMP 2025-30) and government CapEx are the core thesis catalysts for L&T\n• Defence indigenisation and Make-in-India programmes — submarines, warships and missiles are L&T's domain",
  82, "Strong data quality (86%), order book at record high and Middle East exposure provides geographic hedge.",
  "3-month view — quarterly order inflow data and Middle East project announcements are the primary catalysts."
);

const NOTE_BEL = makeNote(
  "Bharat Electronics Limited is India's premier defence electronics PSU with a Rs 75,000 Cr order backlog spanning radar, electronic warfare, sonar and avionics systems. Export orders are growing at 40%+ as India's defence products gain recognition in global export markets.",
  "• Order pipeline of Rs 55,000 Cr in defence electronics is 4x current annual revenue — multi-year visibility\n• Export growth: BEL winning radar and EW system orders in Southeast Asian and Middle Eastern markets\n• Civil electronics (rail, smart city, surveillance) growing 25% — a diversifying and lower-risk revenue stream",
  "• Government budget constraints if fiscal deficit widens could delay defence allocation payments to BEL\n• Competition from private defence players (Data Patterns, Mtar Technologies) in some sub-segments growing",
  "• Akash missile system Phase 3 contract expected — Rs 15,000 Cr announcement likely within next 6 months\n• Export breakthrough: 5 international radar contracts expected to be signed and announced by end of FY27\n• Smart City surveillance contracts in civil segment reaching Rs 5,000 Cr milestone in the current FY27 year",
  "• Any defence budget cut or deferral by the Ministry of Defence directly delays BEL order execution timeline\n• Technology indigenisation risk — if DRDO faces development delays, BEL import substitution targets slip",
  "• P/E of 35x FY27E — fair for a defence PSU with Rs 75,000 Cr secured backlog and strong export prospects\n• ROE of 22% and ROCE of 28% — among the best in PSU defence with improving capital efficiency metrics",
  "• Order book to sales ratio 4.2x vs HAL 5.5x and Mazagon 6x — BEL has a shorter and more predictable cycle\n• EBITDA margins improving toward 25% vs sector median 20% as product mix shifts to higher-value electronics",
  "• Defence indigenisation and Atmanirbhar Bharat in defence are the primary government investment themes\n• Electronic warfare and radar systems are the top priority segments for Indian armed forces modernisation",
  79, "Strong data quality (85%), order book secured for 4+ years and export growth is a new compounding lever.",
  "3-month view — Akash Phase 3 order and international export contract announcements are primary near catalysts."
);

const NOTE_HAL = makeNote(
  "Hindustan Aeronautics Limited has the longest order backlog in its history at Rs 1.1 trillion, spanning Tejas fighters, military helicopters, aero-engines and the Rafale India maintenance programme. Execution visibility stretches to FY35+ giving exceptional long-run revenue certainty.",
  "• Tejas Mk1A contract: 83 aircraft worth Rs 46,898 Cr — deliveries beginning FY27 with peak from FY28\n• LCA Mk2 development funding fully secured — ensures HAL's relevance in next-generation fighter aircraft\n• MRO revenues growing at 30% — engine and airframe maintenance for IAF fleet drives high-margin recurring work",
  "• Execution risk — Tejas Mk1A delivery schedule has slipped historically; any further delay is a sentiment negative\n• GE F414 engine dependency for Mk1A — any US supply disruption impacts delivery schedule and revenue",
  "• First Tejas Mk1A delivery to IAF expected in Q3 FY27 — milestone triggers the 5+ year delivery programme\n• Helicopter contract: 90 Prachand Combat Helicopters worth Rs 20,000 Cr expected to be announced shortly\n• MRO expansion: HAL bidding for the MRTT military refuelling tanker maintenance contract worth Rs 8,000 Cr",
  "• Technology transfer delays from GE and Safran — each delay pushes out revenue recognition by 1-2 quarters\n• PSU governance risk — any management change or government directive on pricing could affect HAL margins",
  "• P/E of 30x FY27E — cheap for a defence prime with Rs 1.1 trillion secured order book at record backlog level\n• Order book at 8x FY27E revenue — no other Indian company has comparable long-run revenue visibility",
  "• Only Indian company that designs, develops and manufactures a complete indigenously-developed fighter aircraft\n• Order book scale of Rs 1.1 trillion is 3x BEL and 5x Mazagon Dock — unrivalled in the Indian defence sector",
  "• Make-in-India in defence aerospace — HAL is India's anchor for strategic aeronautics manufacturing capability\n• Tejas export to Malaysia, Egypt and Argentina — first Indian fighter aircraft exports build global credibility",
  85, "Excellent data quality (88%), order book visibility for 8+ years and Tejas delivery is the primary milestone.",
  "3-month view — first Tejas Mk1A delivery and Prachand helicopter contract announcement are primary catalysts."
);

const NOTE_RVNL = makeNote(
  "Rail Vikas Nigam Limited is India's primary execution arm for railway infrastructure projects, with a project pipeline aligned to the government's Rs 2.4 lakh crore annual railway capital budget. Order book and margins are expanding as Vande Bharat and DFC deployments accelerate.",
  "• Railway budget at Rs 2.4 lakh Cr in FY27 — sustained government allocation guarantees RVNL project workload\n• New diversification: RVNL entering metro rail, port connectivity and airport rail link projects for growth\n• Revenue recognition acceleration as the Dedicated Freight Corridor project nears completion milestone",
  "• Low-margin EPC nature at 5-6% EBIT — any cost overrun or project scope change compresses reported earnings\n• Competition from private EPC firms KNR and PNC winning market share in smaller railway contracts",
  "• DFC project completion — Eastern and Western freight corridors reaching commercial operations milestone\n• New order win: Rs 15,000 Cr+ quarterly order intake in Q1 FY27 would confirm demand pipeline momentum\n• International rail: RVNL bidding for African railway infrastructure projects in Ethiopia and Tanzania",
  "• Payment delays from the Indian Railways client — government payment cycles can stretch to 6-8 months\n• Execution risk in projects involving complex tunnelling and difficult terrain in the Northeast India region",
  "• P/E of 20x FY27E — market is pricing in deceleration but our view is sustained 20% EPS growth to FY29\n• Order book to revenue of 4x — execution capability is the binding constraint, not pipeline or demand",
  "• RVNL's status as government railway EPC arm gives it privileged access to the largest and most complex projects\n• Revenue quality vs KNR Constructions: RVNL has zero marketing cost and preferred contractor status built in",
  "• National railway modernisation (Kavach safety, Vande Bharat, DFC) — RVNL is the primary execution vehicle\n• Government NIP allocation: Rs 11 lakh Cr with railways as the largest single component by capital spending",
  75, "Good data quality (80%), government order pipeline secured and DFC completion is the near-term revenue trigger.",
  "3-month view — DFC completion milestone and Q1 FY27 order inflow data are the primary near-term catalysts."
);

const NOTE_IRFC = makeNote(
  "Indian Railway Finance Corporation is India's largest infrastructure financing NBFC with zero credit risk — it lends exclusively to Indian Railways with Ministry of Railways guarantee. The predictable spread income and AAA rating make IRFC a bond-like equity with 15%+ EPS growth.",
  "• Railway borrowing programme at Rs 1.5 lakh Cr in FY27 — IRFC manages and earns spread on the entire programme\n• Margin expansion expected as short-duration borrowings reprice lower in the RBI rate cut cycle from FY27\n• Dividend payout at 35% consistently maintained — yield of 2.5% with a 15%+ annual EPS growth trajectory",
  "• Rating risk is theoretical — any credit event at Indian Railways would cascade directly through to IRFC\n• Spread compression if the government mandates IRFC to pass on lower borrowing costs to Indian Railways",
  "• First RBI rate cut in FY27 — NIMs expand immediately as IRFC has floating-rate short-term liabilities\n• Railway borrowing programme mandate of Rs 1.5 lakh Cr confirms the FY27 revenue base for IRFC clearly\n• RBI rate cut cycle of 50bps expected by Q3 FY27 — the immediate NIM improvement flows to IRFC directly",
  "• Any adverse government mandate on IRFC lending rates would instantly squeeze the net interest spread\n• Liquidity risk if capital markets close for extended periods — IRFC is entirely wholesale-funded at scale",
  "• P/B of 1.8x FY27E — cheap for a AAA-rated NBFC with zero NPA and a full Ministry of Railways guarantee\n• Peer comparison: PFC at 1.9x and REC at 2.1x — IRFC deserves parity or a modest premium on credit quality",
  "• Zero gross NPA vs PFC 3.4% and REC 2.8% — IRFC credit quality is superior to all listed NBFC peers\n• Cost of funds at 7.1% (AAA rated) vs PFC 7.4% and REC 7.3% — lower funding cost is a sustainable edge",
  "• India's railway modernisation mega-programme is the primary theme — IRFC finances every single project\n• Green bonds: IRFC has issued Rs 3,500 Cr of green bonds for railway electrification — an ESG allocation",
  73, "Good data quality (81%), zero-NPA guarantee structure is unique and rate cut is an immediate margin catalyst.",
  "3-month view — RBI rate cut catalyst and annual railway borrowing mandate announcement are the near triggers."
);

const NOTE_TATAMOTORS = makeNote(
  "Tata Motors is in the midst of a major earnings recovery driven by JLR's Range Rover super-cycle and India EV market leadership. JLR's Reimagine strategy transitions to EV with luxury pricing that protects margins through the technology shift over the medium term.",
  "• JLR revenues growing at 15%+ — Range Rover and Defender global order backlog at 200,000 vehicles\n• India EV leadership: Tata Motors holds 62% of the domestic EV market with Nexon, Tiago and Safari EVs\n• Debt reduction target of Rs 15,000 Cr by FY27 — balance sheet deleveraging improving the ROE trajectory",
  "• JLR EV transition risk — Range Rover Electric programme delayed; any further slip dents premium positioning\n• India commercial vehicle market cyclicality — infrastructure slowdown would hit MHCV segment volumes hard",
  "• JLR FY27 wholesale volume guidance of 400,000+ vehicles confirms that premium luxury demand remains intact\n• India EV: Tata Curve and Harrier EV launches — new platform expected to drive 40%+ EV volume growth\n• Net debt target achieved — deleverage below Rs 30,000 Cr at JLR would trigger a credit rating upgrade",
  "• JLR China sales slowing — luxury market competitive pressure from BYD and BMW in PRC territory\n• Steel and aluminium input costs for JLR — supply chain disruption could squeeze FY27 operating margins",
  "• P/E of 8x FY27E consolidated — a significant discount to global peers given the JLR franchise optionality\n• JLR standalone at 10x UK peers; India business at 15x — SOTP analysis gives 40% upside to Rs 1,200 target",
  "• JLR brand equity vs BMW and Daimler — Range Rover retains a 12-week order lead time; pricing power intact\n• India EV market share at 62% vs next peer at 12% — structural dominance in India's electric car segment",
  "• EV adoption wave and premium auto demand recovery are two major growth themes converging for Tata Motors\n• India's commercial vehicle infrastructure investment cycle benefits the MHCV segment margins and share",
  75, "Good data quality (81%), JLR luxury demand confirmed strong and India EV leadership is a structural advantage.",
  "3-month view — JLR quarterly retail sales data and India EV new model launch are the key near-term catalysts."
);

const NOTE_VEDL = makeNote(
  "Vedanta Limited is a diversified natural resources company in structural recovery, with zinc, aluminium and oil businesses generating strong free cash flow to fund debt repayment. A potential demerger into separate listed entities would unlock significant sum-of-parts valuation.",
  "• Zinc business: Hindustan Zinc producing at one of the lowest costs globally — metal price recovery drives profits\n• Aluminium expansion: BALCO and Jharsuguda capacity additions at a structural cost advantage vs global peers\n• Demerger potential: 5 separate listed entities could unlock 25-40% sum-of-parts valuation premium for holders",
  "• Promoter pledge and debt structure at Vedanta Resources parent creates significant ongoing governance risk\n• Metal price cyclicality — any downturn in zinc or aluminium spot prices compresses the free cash flow rapidly",
  "• Demerger announcement: board approval expected by Q2 FY27 — market will immediately re-rate on confirmation\n• Zinc spot price above $3,000 per tonne — HZL EBITDA expansion drives Rs 400 Cr incremental PAT per quarter\n• Debt repayment: Vedanta Resources principal repayment ahead of schedule would meaningfully ease parent risk",
  "• Promoter group offshore debt at Vedanta Resources — any default triggers pledged share overhang and selling\n• Commodity price downside — iron ore, zinc and lead cycle turning would materially delay the recovery thesis",
  "• EV/EBITDA of 5x FY27E — massive discount to global diversified mining peers at 8-10x; demerger re-rates this\n• SOTP of individual business units gives Rs 600 per share vs CMP Rs 435 — 38% upside on successful demerger",
  "• HZL (Hindustan Zinc subsidiary) has lowest cost of production globally at $900 per tonne vs $1,200 average\n• Aluminium capacity at 3 MTPA positions Vedanta as India's largest aluminium producer with scale cost advantage",
  "• Metal super-cycle recovery and India's energy metals demand (zinc for galvanisation) growth themes are applicable\n• Aluminium as a substitute for steel in EV body panels creates a structural long-term demand upgrade for BALCO",
  68, "Moderate data quality (74%), demerger thesis is compelling but promoter governance risk requires position sizing.",
  "3-month view — demerger board approval timeline and zinc spot price recovery are the primary near-term catalysts."
);

const NOTE_HINDALCO = makeNote(
  "Hindalco Industries is India's largest aluminium company with Novelis (global automotive aluminium rolling) as its crown jewel — a high-quality recurring-margin business serving Ford, BMW and General Motors across 33 plants globally in 10 countries.",
  "• Novelis: automotive EV demand driving battery can sheet and EV body panel demand growth at 20% annually\n• India aluminium downstream expansion — rolled products growing at 25% with a premium margin profile\n• Debt repayment: partial Novelis proceeds being used to reduce Rs 50,000 Cr of consolidated group debt",
  "• LME aluminium price volatility — a 10% aluminium price fall reduces India segment PAT by Rs 1,200 Cr\n• Novelis margin pressure if scrap aluminium premium over primary aluminium rises in tight US market conditions",
  "• Novelis volume growth: beverage cans and automotive sheets growing at 12% YoY — Q1 FY27 data expected\n• India capacity expansion: 0.5 MTPA brownfield expansion commissioned — incremental revenue from H2 FY27\n• Coal cost improvement: linkage auction prices declining reduce India smelting cost by Rs 8-10 per kg",
  "• China aluminium overcapacity dumping risk — any LME price crash below $2,100 per tonne would be negative\n• Coal supply disruption at captive mines Mahan and Utkal — any blockage creates a serious production risk",
  "• EV/EBITDA of 6x FY27E — cheap vs global aluminium and copper majors at 8-10x; Novelis undervalued in sum\n• Novelis standalone at 7x EBITDA (similar to Arconic) would value it at Rs 250 per share vs total Rs 685",
  "• Only Indian aluminium company with a global downstream manufacturing presence — Novelis is the differentiator\n• Cost of production at Rs 145 per kg vs import parity Rs 165 per kg — structural cost moat in Indian market",
  "• EV lightweight materials and aluminium in automotive body panels are the core long-run growth thesis for Novelis\n• India per-capita aluminium consumption growth — construction and packaging demand drives the domestic segment",
  72, "Good data quality (79%), Novelis is a quality global asset and India expansion is adding medium-term revenue.",
  "3-month view — Novelis Q1 volume data and India capacity commissioning progress are the primary near catalysts."
);

const NOTE_SAIL = makeNote(
  "Steel Authority of India is a turnaround story dependent on India's infrastructure capex cycle and steel price recovery from multi-year cyclical lows. Capacity expansion and cost reduction position SAIL to benefit disproportionately from any steel price recovery cycle.",
  "• Domestic steel prices recovering — SAIL realisations expected to improve 8-10% through the FY27 year\n• Capacity expansion: 5 MTPA new capacity commissioned at Bhilai and Bokaro lowering cost per tonne\n• Infrastructure demand: railway tracks and structural steel for bridges — SAIL is the preferred government buyer",
  "• Cheap Chinese steel imports continue to undercut SAIL on price — anti-dumping duties are urgently needed\n• High debt at Rs 38,000 Cr — any earnings downturn increases leverage and limits capital expenditure flexibility",
  "• Anti-dumping duty on Chinese steel imports — government announcement expected by Q2 FY27 is the key trigger\n• Q1 FY27 production volume above 5 MT per quarter confirms capacity ramp-up is tracking on schedule\n• Indian Railways track order worth Rs 12,000 Cr — captive demand guarantees minimum volume floor for SAIL",
  "• Global steel oversupply from China and Southeast Asia continues to structurally pressure domestic steel prices\n• Labour disputes and Bokaro expansion commissioning delays could push cost reduction targets back to FY29",
  "• P/B of 0.9x FY27E — below book value for a PSU steel maker; upside is the anti-dumping duty being granted\n• EV/EBITDA of 7x — cheap vs Tata Steel India 8x and JSW Steel 10x; PSU discount reflects execution risk",
  "• Lower margin vs Tata Steel and JSW due to higher debt levels and older plant technology inefficiencies\n• Government supplier advantage — Indian Railways and SAIL have a longstanding captive procurement relationship",
  "• Railway and infrastructure steel demand is a direct SAIL theme — every km of new track uses SAIL rails\n• Government NIP steel demand benefits SAIL disproportionately as the preferred PSU supplier for public projects",
  65, "Moderate data quality (72%), turnaround thesis requires anti-dumping duty catalyst and price cycle recovery.",
  "3-month view — anti-dumping duty announcement and Q1 FY27 volume data are the primary near-term triggers."
);

const NOTE_JSWSTEEL = makeNote(
  "JSW Steel is India's largest private steel maker with an aggressive capacity expansion plan targeting 50 MTPA by FY30. Operational efficiency, international acquisitions and a value-added product mix give JSW an earnings quality profile well above commoditised steel industry peers.",
  "• Value-added products (HR, CR, PPGI sheets) growing at 18% — higher-margin mix is improving EBITDA per tonne\n• US expansion: Ohio Plate Mill ramping up — reduces USD currency risk and captures American CapEx spending\n• Capacity target 37 MTPA achieved by FY26 — next phase to 50 MTPA compounds earnings over the next 5 years",
  "• Chinese steel dumping risk — any LME benchmark drop below $450 per tonne affects JSW domestic realisations\n• High capex programme requiring Rs 50,000 Cr+ through FY30 keeps consolidated debt elevated in the medium term",
  "• Q1 FY27 EBITDA per tonne above Rs 8,000 — recovery from Rs 6,200 cyclical low would trigger earnings upgrades\n• US Mill Ohio: first quarterly profit expected Q2 FY27 — international breakeven de-risks the expansion thesis\n• Anti-dumping duty on Chinese coil steel imports — would immediately add Rs 2,000-3,000 per tonne to JSW realisation",
  "• Indian steel demand cyclicality — any infrastructure spending slowdown reduces volume and price simultaneously\n• Coking coal import dependency — Australian price spikes can compress steel margins sharply in a single quarter",
  "• EV/EBITDA of 10x FY27E — justified premium to SAIL 7x and Tata Steel India 8x for operational quality lead\n• P/B of 2.5x — justified for the private sector steel industry leader with superior measured operational efficiency",
  "• EBITDA margin of 18% vs SAIL 10% and Tata Steel India 14% — JSW's operational efficiency is clearly best\n• Capacity growth CAGR of 12% to FY30 vs peers at 5-8% — JSW is the highest growth rate steel company",
  "• India's steel demand supercycle driven by infrastructure, real estate and automotive sector is JSW's core thesis\n• EVs and renewable energy infrastructure require 20-30% more steel per unit — a structural demand upgrade",
  70, "Good data quality (78%), best operational metrics in Indian steel but commodity price sensitivity remains high.",
  "3-month view — EBITDA per tonne recovery and anti-dumping duty announcement are the key near-term catalysts."
);

export const DEMO_TOP10: Top10Response = {
  ok: true,
  updated: new Date().toISOString().slice(0, 10),
  listCount: 6,
  lists: [
    {
      name: "Top 10 Immediate Opportunities",
      items: [
        demoItemFull(1,  "RELIANCE",   "Reliance Industries",       "Energy / Retail",  84, NOTE_RELIANCE),
        demoItemFull(2,  "ICICIBANK",  "ICICI Bank",                 "Banking",          81, NOTE_ICICIBANK),
        demoItemFull(3,  "HDFCBANK",   "HDFC Bank",                  "Banking",          79, NOTE_HDFCBANK),
        demoItemFull(4,  "MARUTI",     "Maruti Suzuki",              "Auto",             77, NOTE_MARUTI),
        demoItemFull(5,  "TCS",        "Tata Consultancy Services",  "IT",               76, NOTE_TCS),
        demoItemFull(6,  "TITAN",      "Titan Company",              "Consumer",         75, NOTE_TITAN),
        demoItemFull(7,  "INFY",       "Infosys",                    "IT",               74, NOTE_INFY),
        demoItemFull(8,  "BAJFINANCE", "Bajaj Finance",              "NBFC",             73, NOTE_BAJFINANCE),
        demoItemFull(9,  "SUNPHARMA",  "Sun Pharmaceutical",         "Pharma",           71, NOTE_SUNPHARMA),
        demoItemFull(10, "LTIM",       "LTIMindtree",                "IT",               69, NOTE_LTIM),
      ],
    },
    {
      name: "Top 10 3-Month Opportunities",
      items: [
        demoItemFull(1, "DIXON",         "Dixon Technologies",       "EMS / Electronics", 78, NOTE_DIXON,         "3m"),
        demoItemFull(2, "ZOMATO",        "Zomato",                   "Internet / QC",     76, NOTE_ZOMATO,        "3m"),
        demoItemFull(3, "POLICYBAZAAR",  "PB Fintech",               "Fintech",           72, NOTE_POLICYBAZAAR,  "3m"),
        demoItemFull(4, "DELHIVERY",     "Delhivery",                "Logistics",         65, NOTE_DELHIVERY,     "3m"),
        demoItemFull(5, "NYKAA",         "Nykaa (FSN E-Commerce)",   "Consumer Internet", 63, NOTE_NYKAA,         "3m"),
      ],
    },
    {
      name: "Top 10 12-Month Compounders",
      items: [
        demoItemFull(1, "PIDILITIND", "Pidilite Industries",   "Specialty Chemicals", 80, NOTE_PIDILITIND, "12m"),
        demoItemFull(2, "ABBINDIA",   "ABB India",             "Industrials",         78, NOTE_ABBINDIA,   "12m"),
        demoItemFull(3, "ASTRAL",     "Astral",                "Building Materials",  75, NOTE_ASTRAL,     "12m"),
        demoItemFull(4, "NESTLEIND",  "Nestle India",          "FMCG",                74, NOTE_NESTLEIND,  "12m"),
        demoItemFull(5, "DRREDDY",    "Dr. Reddy's Labs",      "Pharma",              72, NOTE_DRREDDY,    "12m"),
      ],
    },
    {
      name: "Top 10 Monopoly Businesses",
      items: [
        demoItemFull(1, "IEX",   "Indian Energy Exchange",            "Energy Exchange",    82, NOTE_IEX,   "12m"),
        demoItemFull(2, "IRCTC", "IRCTC",                             "Rail / Tourism",     80, NOTE_IRCTC, "12m"),
        demoItemFull(3, "CDSL",  "CDSL",                              "Capital Markets",    79, NOTE_CDSL,  "12m"),
        demoItemFull(4, "CAMS",  "CAMS",                              "Asset Management",   78, NOTE_CAMS,  "12m"),
        demoItemFull(5, "MCX",   "Multi Commodity Exchange",          "Commodity Exchange", 75, NOTE_MCX,   "12m"),
      ],
    },
    {
      name: "Top 10 Government Beneficiaries",
      items: [
        demoItemFull(1, "HAL",  "Hindustan Aeronautics",  "Defence Aerospace",  82, NOTE_HAL,  "6m"),
        demoItemFull(2, "LT",   "Larsen & Toubro",        "Industrials / EPC",  79, NOTE_LT,   "6m"),
        demoItemFull(3, "BEL",  "Bharat Electronics",     "Defence Electronics",76, NOTE_BEL,  "6m"),
        demoItemFull(4, "RVNL", "Rail Vikas Nigam",       "Railways / EPC",     72, NOTE_RVNL, "6m"),
        demoItemFull(5, "IRFC", "Indian Railway Finance", "NBFC / Railways",    70, NOTE_IRFC, "6m"),
      ],
    },
    {
      name: "Top 10 Turnarounds",
      items: [
        demoItemFull(1, "TATAMOTORS", "Tata Motors",       "Auto",      75, NOTE_TATAMOTORS, "6m"),
        demoItemFull(2, "HINDALCO",   "Hindalco",          "Metals",    72, NOTE_HINDALCO,   "6m"),
        demoItemFull(3, "VEDL",       "Vedanta",           "Mining",    68, NOTE_VEDL,       "6m"),
        demoItemFull(4, "JSWSTEEL",   "JSW Steel",         "Steel",     67, NOTE_JSWSTEEL,   "6m"),
        demoItemFull(5, "SAIL",       "SAIL",              "Steel PSU", 62, NOTE_SAIL,       "6m"),
      ],
    },
  ],
};

export const DEMO_MACRO: MacroResponse = {
  ok: true,
  metrics: [
    { metric: "Nifty 50",    value: "24,812", trend: "+0.41%", bias: "bullish", as_of_date: "", notes: "" },
    { metric: "Sensex",      value: "81,543", trend: "+0.38%", bias: "bullish", as_of_date: "", notes: "" },
    { metric: "India VIX",   value: "13.2",   trend: "Calm",   bias: "neutral", as_of_date: "", notes: "" },
    { metric: "INR/USD",     value: "83.62",  trend: "Weak",   bias: "bearish", as_of_date: "", notes: "" },
    { metric: "Brent Crude", value: "$74.8",  trend: "Positive India", bias: "bullish", as_of_date: "", notes: "" },
    { metric: "FII Net Flow", value: "+₹1,240 Cr", trend: "Buy", bias: "bullish", as_of_date: "", notes: "" },
    { metric: "DII Net Flow", value: "+₹880 Cr",  trend: "Buy", bias: "bullish", as_of_date: "", notes: "" },
    { metric: "US 10Y Yield", value: "4.38%", trend: "Stable", bias: "neutral", as_of_date: "", notes: "" },
  ],
  macro_verdict: {
    metric: "Overall Bias",
    value: "BULLISH",
    trend: "UP",
    bias: "bullish",
    as_of_date: new Date().toISOString().slice(0, 10),
    notes: "Constructive domestic macro with supportive FII flows and stable VIX.",
  },
};

export function demoSymbol(symbol: string): SymbolResponse {
  const sym = symbol.toUpperCase();
  // Search all lists for the symbol
  let foundList = DEMO_TOP10.lists[0];
  let foundItem: RecommendationItem | undefined;
  for (const list of DEMO_TOP10.lists) {
    const item = list.items.find((i) => i.symbol === sym);
    if (item) { foundList = list; foundItem = item; break; }
  }
  const pick = foundItem ?? demoItem(1, sym, `${sym} Ltd (Demo)`, "Industrials", 68);
  const listName = foundList?.name ?? "Top 10 Immediate Opportunities";
  const listEntry = demoSymbolListEntry(pick, listName);
  const score = pick.conviction_total;
  // Scale sub-scores so they are proportional to the pick's conviction_total.
  // Max values: fundamentals/25, growth/15, valuation/15, financial_strength/12,
  //   sector_strength/10, news_events/8, technical_momentum/12, institutional_flow/8
  // A stock at score=68 has sub-scores near 68% of each max.
  const frac = score / 100;
  const stockPrice = DEMO_PRICES[sym] ?? 2450;
  return {
    ok: true,
    symbol: sym,
    universe: {
      symbol_nse: sym,
      company_name: pick.company_name,
      sector: pick.sector,
      theme_tags: "Capex, Defence",
      market_cap_cr: 45000,
      market_cap_bucket: "Large",
      cap_segment: "large",
      exchange: "NSE",
      pledge_pct: 0,
    },
    scoring: {
      symbol: sym,
      company_name: pick.company_name,
      conviction_total: score,
      opportunity_rank: Math.round(score * 1.05),
      quality_score: Math.round(score * 0.95),
      valuation_score: Math.round(score * 0.88),
      catalyst_score: Math.round(score * 0.82),
      fundamentals:       Math.round(25  * frac),
      valuation:          Math.round(15  * frac),
      growth:             Math.round(15  * frac),
      financial_strength: Math.round(12  * frac),
      sector_strength:    Math.round(10  * frac),
      news_events:        Math.round(8   * frac),
      technical_momentum: Math.round(12  * frac),
      institutional_flow: Math.round(8   * frac),
      data_quality_pct: 78,
      data_gate_flag: true,
      fundamentals_age_days: 14,
      data_completeness_pct: 78,
      quality_rank: 42,
      risk_score: Math.round(score * 0.90),
      risk_grade: score >= 70 ? "A" : "B",
      relative_quality_score: Math.round(score * 0.90),
      relative_valuation_score: Math.round(score * 0.82),
      relative_growth_score: Math.round(score * 0.85),
      sector_median_pe: 28,
      sector_median_pb: 3.5,
      sector_median_roe: 20,
      sector_median_roce: 18,
      action_label: score >= 80 ? "Strong Buy" : score >= 65 ? "Research overweight" : "Accumulate",
    },
    fundamentals: {
      symbol: sym,
      market_cap_cr: 45000,
      pe: 24.5,
      pb: 4.2,
      roe: 22,
      roce: 19,
      rev_yoy: 14,
      pat_yoy: 18,
      debt_equity: 0.35,
      current_ratio: 1.4,
      dividend_yield: 0.8,
      promoter_holding: 52,
      fii_holding: 18,
      sector_normalized: "Industrials",
      last_updated: new Date().toISOString().slice(0, 10),
      stale_flag: false,
    },
    price: {
      symbol: sym,
      price: stockPrice,
      chg_pct: 1.2,
      vol: 1200000,
      dma20: Math.round(stockPrice * 0.98),
      dma50: Math.round(stockPrice * 0.96),
      dma200: Math.round(stockPrice * 0.90),
      rsi14: 58,
      vs_50dma: 4.2,
      vs_200dma: 11.4,
      as_of_date: new Date().toISOString().slice(0, 10),
      tech_setup: "Above 50 DMA",
      macd_signal: "Bullish",
    },
    news: [
      {
        published_at: "2026-06-01",
        headline: "Company wins major order (demo)",
        summary: "Demo headline for preview mode.",
        url: "",
        source_name: "Demo Wire",
        sentiment: "positive",
        materiality: "medium",
      },
    ],
    lists: [listEntry],
    recommendation: listEntry,
  };
}

const demoHistoryEntry = (
  date: string,
  category: string,
  listName: string,
  rank: number,
  symbol: string,
  name: string,
  ret: number,
  alpha: number
) => ({
  snapshot_date: date,
  recommendation_category: category,
  list_name: listName,
  rank,
  symbol,
  company_name: name,
  sector_key: "Industrials",
  entry_price: 1000,
  conviction: 72,
  thesis: "Investment view: Demo pick ranks highly on our opportunity score with balanced quality and valuation.",
  target: "3m",
  confidence: 68,
  risk: "Earnings miss could compress multiples. Macro rotation risk.",
  risk_score: 62,
  data_quality_pct: 78,
  source: "demo",
  live: {
    entry_date: date,
    current_price: 1000 * (1 + ret / 100),
    current_return_pct: ret,
    nifty_return_pct: 4.2,
    sector_return_pct: 5.1,
    alpha_vs_nifty_pct: alpha,
    alpha_vs_sector_pct: ret - 5.1,
    hit: ret > 0,
  },
});

export const DEMO_HISTORY: RecommendationHistoryResponse = {
  ok: true,
  engine_version: "1.0",
  updated: new Date().toISOString(),
  total_rows: 5,
  date_range: { earliest: "2026-05-15", latest: "2026-06-01" },
  categories: ["immediate", "three_month", "compounders"],
  entries: [
    demoHistoryEntry("2026-05-15", "immediate", "Top 10 Immediate Opportunities", 1, "HAL", "Hindustan Aeronautics", 12.4, 8.2),
    demoHistoryEntry("2026-05-20", "immediate", "Top 10 Immediate Opportunities", 2, "BEL", "Bharat Electronics", 8.1, 3.9),
    demoHistoryEntry("2026-05-22", "three_month", "Top 10 3-Month Opportunities", 1, "TCS", "Tata Consultancy Services", 5.2, 1.0),
    demoHistoryEntry("2026-05-28", "compounders", "Top 10 12-Month Compounders", 1, "HDFCBANK", "HDFC Bank", -2.1, -6.3),
    demoHistoryEntry("2026-06-01", "immediate", "Top 10 Immediate Opportunities", 3, "RELIANCE", "Reliance Industries", 3.4, -0.8),
  ],
};

export const DEMO_VALIDATION: RecommendationValidationResponse = {
  ok: true,
  engine_version: "1.0",
  updated: new Date().toISOString(),
  total_recommendations: 5,
  total_with_returns: 5,
  overall_hit_rate_pct: 80,
  history_summary: { earliest: "2026-05-15", latest: "2026-06-01" },
  history_health: {
    status: "PASS",
    tab37_exists: true,
    snapshot_engine_deployed: true,
    last_snapshot_date: "2026-06-01",
    rows_added_today: 1,
    total_history_rows: 5,
    blank_category_rows: 0,
    last_8am_run_ok: true,
  },
  scorecards: [
    {
      recommendation_category: "immediate",
      category_label: "Top 10 Immediate Opportunities",
      recommendations_issued: 3,
      with_returns: 3,
      hit_rate_pct: 100,
      average_return_pct: 7.97,
      average_alpha_vs_nifty_pct: 3.77,
      average_alpha_vs_sector_pct: 2.87,
      best_pick: {
        symbol: "HAL",
        company_name: "Hindustan Aeronautics",
        list_name: "Top 10 Immediate Opportunities",
        entry_date: "2026-05-15",
        return_pct: 12.4,
        alpha_vs_nifty_pct: 8.2,
      },
      worst_pick: {
        symbol: "RELIANCE",
        company_name: "Reliance Industries",
        list_name: "Top 10 Immediate Opportunities",
        entry_date: "2026-06-01",
        return_pct: 3.4,
        alpha_vs_nifty_pct: -0.8,
      },
    },
    {
      recommendation_category: "three_month",
      category_label: "Top 10 3-Month Opportunities",
      recommendations_issued: 1,
      with_returns: 1,
      hit_rate_pct: 100,
      average_return_pct: 5.2,
      average_alpha_vs_nifty_pct: 1.0,
      average_alpha_vs_sector_pct: 0.1,
      best_pick: {
        symbol: "TCS",
        company_name: "Tata Consultancy Services",
        list_name: "Top 10 3-Month Opportunities",
        entry_date: "2026-05-22",
        return_pct: 5.2,
        alpha_vs_nifty_pct: 1.0,
      },
      worst_pick: {
        symbol: "TCS",
        company_name: "Tata Consultancy Services",
        list_name: "Top 10 3-Month Opportunities",
        entry_date: "2026-05-22",
        return_pct: 5.2,
        alpha_vs_nifty_pct: 1.0,
      },
    },
    {
      recommendation_category: "compounders",
      category_label: "Top 10 12-Month Compounders",
      recommendations_issued: 1,
      with_returns: 1,
      hit_rate_pct: 0,
      average_return_pct: -2.1,
      average_alpha_vs_nifty_pct: -6.3,
      average_alpha_vs_sector_pct: -7.2,
      best_pick: {
        symbol: "HDFCBANK",
        company_name: "HDFC Bank",
        list_name: "Top 10 12-Month Compounders",
        entry_date: "2026-05-28",
        return_pct: -2.1,
        alpha_vs_nifty_pct: -6.3,
      },
      worst_pick: {
        symbol: "HDFCBANK",
        company_name: "HDFC Bank",
        list_name: "Top 10 12-Month Compounders",
        entry_date: "2026-05-28",
        return_pct: -2.1,
        alpha_vs_nifty_pct: -6.3,
      },
    },
  ],
};

export const DEMO_DATA_COVERAGE: DataCoverageReport = {
  ok: true,
  target_pct: 80,
  average_coverage_pct: 82.4,
  meets_target_all_pillars: false,
  pillars: [
    { pillar: "fundamentals", label: "Fundamentals", coverage_pct: 78, stale_pct: 12, null_pct: 22, confidence_pct: 71, meets_target: false },
    { pillar: "valuation", label: "Valuation", coverage_pct: 85, stale_pct: 8, null_pct: 15, confidence_pct: 74, meets_target: true },
    { pillar: "growth", label: "Growth", coverage_pct: 81, stale_pct: 10, null_pct: 19, confidence_pct: 72, meets_target: true },
    { pillar: "financial_strength", label: "Financial Strength", coverage_pct: 80, stale_pct: 11, null_pct: 20, confidence_pct: 70, meets_target: true },
    { pillar: "sector_strength", label: "Sector Strength", coverage_pct: 88, stale_pct: 5, null_pct: 12, confidence_pct: 76, meets_target: true },
    { pillar: "news", label: "News", coverage_pct: 72, stale_pct: 15, null_pct: 28, confidence_pct: 65, meets_target: false },
    { pillar: "momentum", label: "Momentum", coverage_pct: 90, stale_pct: 4, null_pct: 10, confidence_pct: 78, meets_target: true },
    { pillar: "institutional_flow", label: "Institutional Flow", coverage_pct: 76, stale_pct: 14, null_pct: 24, confidence_pct: 68, meets_target: false },
    { pillar: "business_moat", label: "Business Moat", coverage_pct: 83, stale_pct: 9, null_pct: 17, confidence_pct: 75, meets_target: true },
  ],
};

const demoBriefDate = new Date().toISOString().slice(0, 10);

export const DEMO_MORNING_BRIEF: MorningBriefResponse = {
  ok: true,
  cached: true,
  brief: {
    version: "demo",
    date_ist: demoBriefDate,
    sections: {
      market_outlook: {
        headline: "Constructive bias (demo)",
        summary:
          "Preview brief — connect your research API for the live 8 AM institutional brief from Sheets.",
        breadth: { label: "Neutral-bullish", conviction_above_50_pct: 58 },
      },
      top10_opportunities: {
        immediate: DEMO_TOP10.lists[0]?.items ?? [],
        all_lists: DEMO_TOP10.lists,
      },
      sector_winners: {
        items: [{ sector: "Defence", rank: 1, momentum: "Strong", note: "Demo" }],
      },
      sector_losers: {
        items: [{ sector: "FMCG", rank: 12, momentum: "Soft", note: "Demo" }],
      },
      government_themes: {
        items: [{ theme: "Defence capex", bias: "Positive", symbols: ["HAL", "BEL"] }],
        top_picks: DEMO_TOP10.lists[4]?.items ?? [],
      },
      macro_themes: {
        headline: "Rates stable",
        items: [{ metric: "India VIX", value: 14.2, bias: "Neutral" }],
      },
      risk_alerts: {
        summary: "No critical flags in demo dataset.",
        scoring_flags: [],
        sheet_alerts: [],
      },
      watchlist_changes: { note: "Demo — no live diff" },
      portfolio_actions: {
        disclaimer: "Not investment advice. Demo preview only.",
        items: [
          { symbol: "HAL", action: "Hold / add on dips", rationale: "High conviction defence theme" },
        ],
      },
    },
  },
};

export const DEMO_PORTFOLIO: PortfolioConstructionResponse = {
  ok: true,
  engine_version: "demo",
  capital_tiers: [100000, 500000, 1000000, 10000000],
  default_capital: 500000,
  as_of: demoBriefDate,
  tiers: [
    {
      ok: true,
      capital_inr: 500000,
      as_of: demoBriefDate,
      position_count: 3,
      deployed_inr: 475000,
      cash_inr: 25000,
      cash_pct: 5,
      max_drawdown_estimate_pct: 12,
      portfolio_conviction_score: 71,
      suggested_allocation: {
        core: { target_pct: 50, actual_pct: 48, amount_inr: 240000 },
        growth: { target_pct: 35, actual_pct: 34, amount_inr: 170000 },
        opportunistic: { target_pct: 15, actual_pct: 13, amount_inr: 65000 },
        cash: { target_pct: 5, actual_pct: 5, amount_inr: 25000 },
        deployed_pct: 95,
      },
      sector_exposure: [
        { sector: "Defence", amount_inr: 175000, weight_pct: 35, over_limit: false },
        { sector: "Oil & Gas", amount_inr: 150000, weight_pct: 30, over_limit: false },
        { sector: "BFSI", amount_inr: 150000, weight_pct: 30, over_limit: false },
      ],
      positions: [
        {
          symbol: "HAL",
          company_name: "Hindustan Aeronautics",
          sector: "Defence",
          bucket: "core",
          amount_inr: 175000,
          weight_pct: 35,
          shares_estimate: 100,
          last_price: 1750,
          opportunity_rank: 74,
          risk_score: 38,
          risk_grade: "B",
          data_quality_pct: 78,
        },
        {
          symbol: "RELIANCE",
          company_name: "Reliance Industries",
          sector: "Oil & Gas",
          bucket: "core",
          amount_inr: 150000,
          weight_pct: 30,
          shares_estimate: 120,
          last_price: 1250,
          opportunity_rank: 78,
          risk_score: 42,
          risk_grade: "B",
          data_quality_pct: 82,
        },
        {
          symbol: "HDFCBANK",
          company_name: "HDFC Bank",
          sector: "BFSI",
          bucket: "growth",
          amount_inr: 150000,
          weight_pct: 30,
          shares_estimate: 200,
          last_price: 750,
          opportunity_rank: 75,
          risk_score: 35,
          risk_grade: "A",
          data_quality_pct: 80,
        },
      ],
      constraints: { max_positions: 12, max_single_pct: 15, max_sector_pct: 35 },
      pool_size: 24,
    },
  ],
};

export const DEMO_BACKTEST: BacktestResponse = {
  ok: true,
  engine_version: "4.0",
  snapshot_only: true,
  snapshot_rows_total: 0,
  results: [],
  comparison: [],
  dashboard: {
    snapshot_rows_total: 0,
    snapshot_only: true,
    min_snapshots_required: 5,
    lists_ready: 0,
    lists_total: 6,
    overall_12m: null,
    by_horizon: [],
    comparison: [],
    comparison_by_list: {},
  },
};

export const DEMO_IPO: IpoIntelligenceResponse = {
  ok: true,
  engine_version: "demo",
  total: 5,
  by_verdict: { Subscribe: 2, Watch: 2, Avoid: 1 },
  rows: [
    {
      symbol: "AADHAAR",
      company_name: "Aadhaar Housing Finance",
      status: "open",
      issue_price: 315,
      gmp_pct: 22,
      subscription_x: 8.7,
      listing_date: "2026-06-18",
      sector: "NBFC / Housing Finance",
      verdict: "Subscribe",
      score: 78,
      thesis: "Market leader in affordable housing loans with 30%+ CAGR, strong NPA track record, and government tailwind on PMAY.",
      risks: "Rising interest rates could compress NIMs. MFI stress in some geographies.",
    },
    {
      symbol: "WAAREETECH",
      company_name: "Waaree Technologies",
      status: "open",
      issue_price: 1,
      gmp_pct: 36,
      subscription_x: 24.1,
      listing_date: "2026-06-17",
      sector: "Defence Electronics",
      verdict: "Subscribe",
      score: 84,
      thesis: "Sole domestic supplier of EW systems to Indian armed forces. 5-year order book visibility. Rare SME-to-mainboard migration.",
      risks: "Revenue concentration risk (single-client exposure to MoD). Execution risk on scale-up.",
    },
    {
      symbol: "MOBIKWIK",
      company_name: "MobiKwik Systems",
      status: "upcoming",
      issue_price: 279,
      gmp_pct: 12,
      subscription_x: 0,
      listing_date: "2026-06-28",
      sector: "Fintech",
      verdict: "Watch",
      score: 58,
      thesis: "Profitable fintech with 140M registered users. BNPL growth strong but competitive from PhonePe/Razorpay.",
      risks: "Fintech regulatory uncertainty. High marketing spend needed to maintain market share.",
    },
    {
      symbol: "FAALCON",
      company_name: "Faalcon Concepts",
      status: "upcoming",
      issue_price: 182,
      gmp_pct: 0,
      subscription_x: 0,
      listing_date: "2026-07-05",
      sector: "Consumer / Restaurants",
      verdict: "Watch",
      score: 52,
      thesis: "QSR chain with 140 outlets. Growing unit economics but pre-profitability stage.",
      risks: "Food cost inflation, rental escalation, and execution risk in Tier 2/3 expansion.",
    },
    {
      symbol: "CLOUDLEAK",
      company_name: "CloudLeak Solutions",
      status: "upcoming",
      issue_price: 95,
      gmp_pct: -4,
      subscription_x: 0,
      listing_date: "2026-07-12",
      sector: "IT Services",
      verdict: "Avoid",
      score: 32,
      thesis: "IT services firm with no differentiated offering. Commoditized business model.",
      risks: "Negative GMP signals poor market reception. Overvalued at 35x FY26 PE vs sector at 22x.",
    },
  ],
};

export const DEMO_SME: SmeAlphaResponse = {
  ok: true,
  engine_version: "demo",
  list_name: "SME Alpha",
  items: [
    { rank: 1, symbol: "EMIL",      sme_alpha_score: 92, sme_track: "sme_compounder" },
    { rank: 2, symbol: "YAARIZONE", sme_alpha_score: 87, sme_track: "sme_export" },
    { rank: 3, symbol: "DPWIRES",   sme_alpha_score: 83, sme_track: "sme_gov" },
    { rank: 4, symbol: "OPTIMUS",   sme_alpha_score: 79, sme_track: "sme_compounder" },
    { rank: 5, symbol: "GKWLMTD",   sme_alpha_score: 76, sme_track: "sme_export" },
    { rank: 6, symbol: "NKGSBFC",   sme_alpha_score: 72, sme_track: "sme_gov" },
    { rank: 7, symbol: "ESFL",      sme_alpha_score: 68, sme_track: "sme_compounder" },
    { rank: 8, symbol: "NITIRAJ",   sme_alpha_score: 65, sme_track: "sme_export" },
  ],
};

export const DEMO_THEME: ThemeIntelligenceResponse = {
  ok: true,
  intelligence: {
    version: "demo",
    as_of: new Date().toISOString().slice(0, 10),
    top_themes: [
      {
        theme_id: "defence",
        theme_label: "Defence & aerospace",
        theme_strength: 82,
        theme_momentum: 74,
        government_support: 88,
        capex_cycle: 80,
        order_momentum: 76,
        theme_conviction_score: 81,
        symbol_count: 12,
        rank: 1,
      },
      {
        theme_id: "renewables",
        theme_label: "Renewables & grid",
        theme_strength: 76,
        theme_momentum: 70,
        government_support: 72,
        capex_cycle: 78,
        order_momentum: 68,
        theme_conviction_score: 74,
        symbol_count: 18,
        rank: 2,
      },
      {
        theme_id: "banks",
        theme_label: "Private banks",
        theme_strength: 68,
        theme_momentum: 62,
        government_support: 55,
        capex_cycle: 50,
        order_momentum: 58,
        theme_conviction_score: 61,
        symbol_count: 22,
        rank: 3,
      },
    ],
  },
};

export const DEMO_SHEET_AUDIT: SheetAuditResponse = {
  ok: true,
  timestampIst: new Date().toISOString(),
  spreadsheetName: "Demo Mode",
  tab1_row_count: 4200,
  tab6_row_count: 3800,
  tab10_row_count: 4100,
  tab11_row_count: 60,
  non_zero_conviction_scores: 3900,
  recommendations_generated: 60,
  sector_coverage_pct: 94.2,
  market_cap_coverage_pct: 91.5,
  theme_coverage_pct: 78.3,
  universe_symbols_loaded: 4200,
  conviction_distribution: {
    tab10_rows: 4100,
    count_gt_10: 3500,
    count_gt_20: 2800,
    max_conviction: 92,
  },
  diagnosis: [
    { severity: "info", message: "Preview audit — connect live API for sheet diagnosis." },
  ],
};

export const DEMO_WATCHLIST: WatchlistEntry[] = [
  { symbol: "RELIANCE",   bucket: "high_conviction", addedAt: "2026-06-01T08:00:00Z" },
  { symbol: "HAL",        bucket: "high_conviction", addedAt: "2026-06-01T08:00:00Z" },
  { symbol: "TCS",        bucket: "potential_buys",  addedAt: "2026-06-02T08:00:00Z" },
  { symbol: "INFY",       bucket: "potential_buys",  addedAt: "2026-06-02T08:00:00Z" },
  { symbol: "HDFCBANK",   bucket: "pullback",         addedAt: "2026-06-03T08:00:00Z" },
  { symbol: "ICICIBANK",  bucket: "pullback",         addedAt: "2026-06-03T08:00:00Z" },
  { symbol: "BAJFINANCE", bucket: "earnings",         addedAt: "2026-06-04T08:00:00Z" },
  { symbol: "WIPRO",      bucket: "earnings",         addedAt: "2026-06-04T08:00:00Z" },
  { symbol: "BEL",        bucket: "gov_theme",        addedAt: "2026-06-05T08:00:00Z" },
  { symbol: "IRFC",       bucket: "gov_theme",        addedAt: "2026-06-05T08:00:00Z" },
];
