import type { Category } from "../types";

export function categorizeTransaction(description: string): Category {
  const d = description.toLowerCase().replace(/\s+/g, " ").trim();

  // ── INCOME / TRANSFER IN ──────────────────────────────────────────────────────
  if (/fnb app transfer from|fnb app payment from/.test(d)) return "Transfer In";
  if (/snpersalk|sspersalk/.test(d)) return "Transfer In";
  if (/debiet order krediet.*snpersalk|debiet order krediet.*sspersalk/.test(d)) return "Transfer In";
  if (/debiet order krediet.*cape town|debiet order krediet.*tb/.test(d)) return "Transfer In";
  if (/debit order credit|salary|payroll|wages/.test(d)) return "Transfer In";
  if (/smart-ap betaling van|smart-ap oorplasing van/.test(d)) return "Transfer In";
  if (/payment received|credit received|funds received/.test(d)) return "Transfer In";
  // Fusion Interest Rebate = small cashback, treat as income
  if (/fusion interest rebate/.test(d)) return "Income";

  // ── SAVINGS ───────────────────────────────────────────────────────────────────
  // FNB Afrikaans
  if (/gereeld oorplaas na bel.*schedule transfer/.test(d)) return "Savings";
  if (/betaaling na belegging/.test(d)) return "Savings";
  if (/smart-ap betaling na savings/.test(d)) return "Savings";
  if (/int oorplasing na bonus|oorplaas na.*bonus/.test(d)) return "Savings";
  if (/int oorplasing na kredietkaart/.test(d)) return "Savings";
  if (/debicheck internal.*d\/o fnbcc|debicheck internal.*fnbcc/.test(d)) return "Savings";
  if (/schedule transfer/.test(d)) return "Savings";
  // English
  if (/savings|save$|\bsave\b/.test(d)) return "Savings";
  if (/transfer to savings|payment to savings/.test(d)) return "Savings";
  if (/tfsa|tax.free/.test(d)) return "Savings";
  if (/inter account transfer.*tfsa|inter account transfer.*invest/.test(d)) return "Savings";
  if (/investment transfer|belegging/.test(d)) return "Savings";

  // ── EDUCATION ─────────────────────────────────────────────────────────────────
  if (/inter account transfer.*uni/.test(d)) return "Education";
  if (/university|college|tuition|school fees|skool|universiteit/.test(d)) return "Education";
  if (/nsfas|student loan|bursary/.test(d)) return "Education";

  // ── TRANSFERS ─────────────────────────────────────────────────────────────────
  if (/inter account transfer/.test(d)) return "Transfers";
  if (/real.?time payment|rtp/.test(d)) return "Transfers";
  if (/int betaling na|int oorplasing na/.test(d)) return "Transfers";
  if (/smart-ap oorplasing na repay/.test(d)) return "Transfers";
  if (/transfer to|oordrag na|payment to|betaling na/.test(d)) return "Transfers";
  if (/electronic transfer|eft payment|eft betaling/.test(d)) return "Transfers";

  // ── BANK FEES ─────────────────────────────────────────────────────────────────
  if (/rente op dt bal|interest on debit balance|int on debit balance/.test(d)) return "Bank Fees";
  if (/bank u kleingeld|coin counting/.test(d)) return "Bank Fees";
  if (/fnb bank fee/.test(d)) return "Bank Fees";
  if (/maandlike.*fooi|maandelike.*fooi|monthly.*fee/.test(d)) return "Bank Fees";
  if (/diensfooi|service fee|service charge/.test(d)) return "Bank Fees";
  if (/toegevoegdewaard|value added serv/.test(d)) return "Bank Fees";
  if (/monthly account fee|monthly credit fee/.test(d)) return "Bank Fees";
  if (/eft charge|eft fooi/.test(d)) return "Bank Fees";
  if (/int pymt fee|intl payment fee|international.*fee/.test(d)) return "Bank Fees";
  if (/df17arb/.test(d)) return "Bank Fees";
  if (/declined purch|geweier/.test(d)) return "Bank Fees";
  if (/debit card intl|debietkaart/.test(d)) return "Bank Fees";
  if (/administration fee|admin fee|administrasie/.test(d)) return "Bank Fees";
  if (/overdraft fee|oortrekkingsfooi/.test(d)) return "Bank Fees";

  // ── RENT ──────────────────────────────────────────────────────────────────────
  if (/\bhuur\b|rental payment|rent payment|\brent\b/.test(d)) return "Rent";
  if (/landlord|verhuurder|property payment/.test(d)) return "Rent";

  // ── UTILITIES ─────────────────────────────────────────────────────────────────
  if (/electricity|elektrisiteit|elekt vooruitbetaal/.test(d)) return "Utilities";
  if (/water.*lights|ligte en water|munisipaliteit|municipality/.test(d)) return "Utilities";
  if (/prepaid.*electric|eskom|city power/.test(d)) return "Utilities";
  if (/gas|sewage|refuse|waste/.test(d)) return "Utilities";

  // ── AIRTIME & DATA ────────────────────────────────────────────────────────────
  if (/smart-ap lugtyd.*airtime|lugtyd aankope/.test(d)) return "Airtime & Data";
  if (/smart-ap prepaid|airtime|data bundle|databundel/.test(d)) return "Airtime & Data";
  if (/vodacom.*top|mtn.*top|cell c.*top|telkom.*top/.test(d)) return "Airtime & Data";
  if (/recharge|herlaai/.test(d)) return "Airtime & Data";

  // ── INTERNET & SUBSCRIPTIONS ──────────────────────────────────────────────────
  if (/rocketnet|payfast\*rocketnet/.test(d)) return "Internet & Subscriptions";
  if (/fibre|fiber|adsl|broadband/.test(d)) return "Internet & Subscriptions";
  if (/spotify|spotifyza/.test(d)) return "Internet & Subscriptions";
  if (/google|googl/.test(d)) return "Internet & Subscriptions";
  if (/netflix|showmax|dstv|youtube premium/.test(d)) return "Internet & Subscriptions";
  if (/microsoft 365|adobe|apple.*sub|icloud/.test(d)) return "Internet & Subscriptions";
  if (/playtomic|gaming.*sub|subscription/.test(d)) return "Internet & Subscriptions";
  if (/openai|chatgpt|claude/.test(d)) return "Internet & Subscriptions";

  // ── INSURANCE ─────────────────────────────────────────────────────────────────
  if (/dotsure/.test(d)) return "Insurance";
  if (/discovery(?! bank)|momentum|old mutual|sanlam|santam/.test(d)) return "Insurance";
  if (/assupol|hollard|outsurance|king price|miway/.test(d)) return "Insurance";
  if (/insurance|versekering|life cover|lewensdekking/.test(d)) return "Insurance";
  if (/medical aid|mediese hulp|health.*plan/.test(d)) return "Insurance";

  // ── GYM & FITNESS ─────────────────────────────────────────────────────────────
  if (/pfgymfee|magband debiet pfgymfee/.test(d)) return "Gym";
  if (/byc debit|virgin active|planet fitness|gym/.test(d)) return "Gym";
  if (/crossfit|pilates|yoga.*studio/.test(d)) return "Gym";

  // ── FUEL ──────────────────────────────────────────────────────────────────────
  if (/engen/.test(d)) return "Fuel";
  if (/\bshell\b/.test(d)) return "Fuel";
  if (/\bbp\b/.test(d)) return "Fuel";
  if (/caltex|sasol|astron|puma service/.test(d)) return "Fuel";
  if (/\bpetrol\b|petrol aankope|brandstof|fuel/.test(d)) return "Fuel";

  // ── GROCERIES ─────────────────────────────────────────────────────────────────
  if (/checkers/.test(d)) return "Groceries";
  if (/superspar|super spar/.test(d)) return "Groceries";
  if (/woolworths/.test(d)) return "Groceries";
  if (/pick n pay|pnp crp|pick and pay/.test(d)) return "Groceries";
  if (/shoprite/.test(d)) return "Groceries";
  if (/\bspar\b/.test(d)) return "Groceries";
  if (/food lover|boxer superstores/.test(d)) return "Groceries";
  if (/ok mini mark|ok foods|ok grocer/.test(d)) return "Groceries";
  if (/eskort|butch|slager/.test(d)) return "Groceries";
  if (/ik \*huismark|huismark/.test(d)) return "Groceries";
  if (/fruit.*veg|groente|produce/.test(d)) return "Groceries";

  // ── FOOD & DINING ─────────────────────────────────────────────────────────────
  if (/kfc/.test(d)) return "Food & Dining";
  if (/krispy kreme/.test(d)) return "Food & Dining";
  if (/steers/.test(d)) return "Food & Dining";
  if (/burger king|nandos|spur|wimpy|hungry lion|debonairs/.test(d)) return "Food & Dining";
  if (/roman|pizza/.test(d)) return "Food & Dining";
  if (/uber eats|ubereats|mr d food|mrdfoods|mr delivery/.test(d)) return "Food & Dining";
  if (/yoco/.test(d)) return "Food & Dining";
  if (/bakehouse|bakkerij|coffee|koffie/.test(d)) return "Food & Dining";
  if (/lucky bread|limnos bakers|biltong republic/.test(d)) return "Food & Dining";
  if (/tasting room|healthy owl|nykie bakes/.test(d)) return "Food & Dining";
  if (/vida e caffe|jackson and black|giraffe house/.test(d)) return "Food & Dining";
  if (/padstal|hennies|mcc groenkloof/.test(d)) return "Food & Dining";
  if (/baobab cafe|menlo park central|bex cherrylane|wedgewood/.test(d)) return "Food & Dining";
  if (/restaurant|eetplek|cafe|bistro|diner|takeaway|takeout/.test(d)) return "Food & Dining";

  // ── CLOTHING & BEAUTY ─────────────────────────────────────────────────────────
  if (/mr price|mrpriceh/.test(d)) return "Clothing & Beauty";
  if (/miladys|milady/.test(d)) return "Clothing & Beauty";
  if (/pep home|pep \d|pep store/.test(d)) return "Clothing & Beauty";
  if (/jetline|jet line|jet store/.test(d)) return "Clothing & Beauty";
  if (/foschini|truworths|edgars|cotton on|h&m|zara/.test(d)) return "Clothing & Beauty";
  if (/\bnaels\b|nail|naels/.test(d)) return "Clothing & Beauty";
  if (/\blashes\b|wimpers|beauty/.test(d)) return "Clothing & Beauty";
  if (/dazzle hair|hair salon|haarsalon|kapper/.test(d)) return "Clothing & Beauty";
  if (/\bhemde\b|clothing|klere|fashion/.test(d)) return "Clothing & Beauty";
  if (/spa|skincare|velsorging|cosmetics|make.?up/.test(d)) return "Clothing & Beauty";

  // ── HEALTH & PHARMACY ─────────────────────────────────────────────────────────
  if (/dischem|dis-chem|clicks/.test(d)) return "Health & Pharmacy";
  if (/pharmacy|apteek|chemist/.test(d)) return "Health & Pharmacy";
  if (/hospital|kliniek|clinic|doctor|dokter|gp visit/.test(d)) return "Health & Pharmacy";
  if (/dentist|tandarts|optometrist|optician/.test(d)) return "Health & Pharmacy";

  // ── SHOPPING ──────────────────────────────────────────────────────────────────
  if (/takealot|amazon/.test(d)) return "Shopping";
  if (/incredible connect|makro|game store/.test(d)) return "Shopping";
  if (/payflex|lay.?by|layby/.test(d)) return "Shopping";
  if (/\bpna\b|nfs atter/.test(d)) return "Shopping";
  if (/flm /.test(d)) return "Shopping";
  if (/salvage mart|the perfume gallery|alpaca loom/.test(d)) return "Shopping";
  if (/hpy\*queens cell|cell zone|phone shop/.test(d)) return "Shopping";
  if (/mr\.? d\.?i\.?y|mr diy|hardware|boumark/.test(d)) return "Shopping";
  if (/online.*shop|web.*purchase|e.?commerce/.test(d)) return "Shopping";

  // ── PARKING ───────────────────────────────────────────────────────────────────
  if (/admyt|parking|parkeer/.test(d)) return "Parking";

  // ── ENTERTAINMENT ─────────────────────────────────────────────────────────────
  if (/sterkinekor|ster kinekor|nu metro|cinema|bioscoop/.test(d)) return "Entertainment";
  if (/table mountain|cable car/.test(d)) return "Entertainment";
  if (/stellenbosch museum|museum|gallery|galery/.test(d)) return "Entertainment";
  if (/flysafai|sky diving|adventure/.test(d)) return "Entertainment";
  if (/afriforum/.test(d)) return "Entertainment";
  if (/concert|show|event|tickets|kaartjies/.test(d)) return "Entertainment";
  if (/escape room|bowling|miniature golf/.test(d)) return "Entertainment";

  // ── FAMILY ────────────────────────────────────────────────────────────────────
  if (/\bmamma\b|\bma\b|\bdad\b|\bpa\b|\boupa\b|\bouma\b/.test(d)) return "Family";
  if (/\bsnoepie\b|family|gesin/.test(d)) return "Family";
  if (/child.*support|onderhoud|kids/.test(d)) return "Family";

  // ── TRAVEL ────────────────────────────────────────────────────────────────────
  if (/cape town|tb cape town|kaapstad/.test(d)) return "Travel";
  if (/flight|vlug|airline|airways|kulula|mango|safair/.test(d)) return "Travel";
  if (/hotel|accommodation|verblyf|airbnb|booking\.com/.test(d)) return "Travel";
  if (/uber(?! eats)|bolt|taxi|cab|shuttle/.test(d)) return "Travel";
  if (/car hire|motor hire|avis|budget rent/.test(d)) return "Travel";

  return "Other";
}

export const CATEGORY_COLORS: Record<string, string> = {
  "Transfer In":              "#34d399",
  "Income":                   "#10b981",
  "Savings":                  "#378ADD",
  "Rent":                     "#7F77DD",
  "Utilities":                "#639922",
  "Internet & Subscriptions": "#14b8a6",
  "Insurance":                "#BA7517",
  "Gym":                      "#1D9E75",
  "Fuel":                     "#E24B4A",
  "Groceries":                "#22c55e",
  "Food & Dining":            "#EF9F27",
  "Clothing & Beauty":        "#D4537E",
  "Health & Pharmacy":        "#60a5fa",
  "Shopping":                 "#D85A30",
  "Airtime & Data":           "#f472b6",
  "Parking":                  "#94a3b8",
  "Bank Fees":                "#6b7280",
  "Family":                   "#fb923c",
  "Entertainment":            "#a855f7",
  "Travel":                   "#0ea5e9",
  "Transfers":                "#e2e8f0",
  "Education":                "#f59e0b",
  "Other":                    "#888780",
};