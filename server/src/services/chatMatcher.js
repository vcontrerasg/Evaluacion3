const STOPWORDS = new Set([
  'a', 'al', 'algo', 'ante', 'con', 'como', 'cual', 'cuales', 'de', 'del', 'el', 'ella', 'en', 'es', 'esta', 'estan',
  'ese', 'esto', 'hay', 'la', 'las', 'le', 'lo', 'los', 'me', 'mi', 'mis', 'muy', 'no', 'nos', 'o', 'para', 'pero',
  'por', 'puedo', 'que', 'se', 'si', 'son', 'su', 'sus', 'te', 'tu', 'tus', 'un', 'una', 'uno', 'y', 'yo'
]);

const GREETINGS = new Set(['hola', 'holi', 'buenas', 'buenos dias', 'buenas tardes', 'buenas noches', 'hey', 'saludos']);

const MIN_SCORE = 2;
const EXACT_SCORE = 100;
const MAX_OVERLAP = 2;

function normalize(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stem(token) {
  return token.length > 6 ? token.slice(0, 6) : token;
}

function tokens(text) {
  return normalize(text)
    .split(' ')
    .filter(Boolean)
    .map(stem);
}

function contentTokens(text) {
  return normalize(text)
    .split(' ')
    .filter((t) => t && !STOPWORDS.has(t))
    .map(stem);
}

function containsSequence(haystack, needle) {
  if (needle.length === 0 || needle.length > haystack.length) return false;
  for (let i = 0; i <= haystack.length - needle.length; i += 1) {
    if (needle.every((t, j) => haystack[i + j] === t)) return true;
  }
  return false;
}

function isGreeting(text) {
  return GREETINGS.has(normalize(text));
}

function scoreFaq(message, faq) {
  if (normalize(message) === normalize(faq.question)) return EXACT_SCORE;

  const messageTokens = tokens(message);
  let score = 0;

  const seen = new Set();
  for (const keyword of faq.keywords || []) {
    const kt = tokens(keyword);
    const key = kt.join(' ');
    if (!key || seen.has(key)) continue;
    seen.add(key);
    if (containsSequence(messageTokens, kt)) score += 1 + kt.length;
  }

  const questionTokens = new Set(contentTokens(faq.question).filter((t) => t.length >= 4));
  const messageContent = new Set(contentTokens(message));
  let overlap = 0;
  for (const t of messageContent) if (questionTokens.has(t)) overlap += 1;
  score += Math.min(overlap, MAX_OVERLAP);

  return score;
}

function bestMatch(message, faqs) {
  let best = null;
  let bestScore = 0;
  for (const faq of faqs) {
    const score = scoreFaq(message, faq);
    const better = score > bestScore || (score === bestScore && best && (faq.order ?? 0) < (best.order ?? 0));
    if (better) {
      best = faq;
      bestScore = score;
    }
  }
  return bestScore >= MIN_SCORE ? { faq: best, score: bestScore } : null;
}

module.exports = { normalize, stem, tokens, isGreeting, scoreFaq, bestMatch, MIN_SCORE };
