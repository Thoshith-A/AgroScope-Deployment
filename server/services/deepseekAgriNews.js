// server/services/deepseekAgriNews.js - DeepSeek AI enrichment for agriculture news

import axios from 'axios';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

const ALLOWED_CATEGORIES = [
  'Crop Production',
  'Agricultural Waste',
  'Farming Technology',
  'Market Trends',
  'Government Policy',
  'Climate Impact'
];

function generateFallbackInsight(article) {
  const text = `${article.title || article.headline || ''} ${article.snippet || article.summary || ''}`.toLowerCase();
  if (text.match(/subsidy|scheme|policy|government|ministry/)) return 'Government Policy';
  if (text.match(/climate|monsoon|rainfall|weather|drought|flood/)) return 'Climate Impact';
  if (text.match(/drone|ai|digital|sensor|technology|automation/)) return 'Farming Technology';
  if (text.match(/waste|residue|stubble|biomass|bagasse/)) return 'Agricultural Waste';
  if (text.match(/market|price|commodity|trade|export|import/)) return 'Market Trends';
  return 'Crop Production';
}

function fallbackRegion(article, locationHint) {
  if (locationHint?.state || locationHint?.country) {
    return [locationHint.state, locationHint.country].filter(Boolean).join(', ');
  }
  const text = `${article.title || article.headline || ''} ${article.snippet || article.summary || ''}`.toLowerCase();
  if (text.includes('india')) return 'India';
  if (text.includes('asia')) return 'Asia';
  if (text.includes('europe')) return 'Europe';
  if (text.includes('africa')) return 'Africa';
  return 'Global';
}

function fallbackSentiment(article) {
  const text = `${article.title || article.headline || ''} ${article.snippet || article.summary || ''}`.toLowerCase();
  if (text.match(/crisis|shortage|decline|loss|risk|damage|fall/)) return 'Negative';
  if (text.match(/growth|increase|record|support|boost|opportunity|improve/)) return 'Positive';
  return 'Neutral';
}

function normalizeAIResult(article, payload = {}, locationHint) {
  const category = ALLOWED_CATEGORIES.includes(payload.category) ? payload.category : generateFallbackInsight(article);
  return {
    title: article.title || article.headline || 'Untitled',
    summary: payload.summary || article.snippet || article.summary || 'No summary available',
    category,
    region: payload.region || fallbackRegion(article, locationHint),
    sentiment: payload.sentiment || fallbackSentiment(article)
  };
}

export async function analyzeNewsWithAI(article, apiKey) {
  if (!apiKey || apiKey === 'demo_key') {
    return normalizeAIResult(article, {}, null);
  }

  try {
    const prompt = `Analyze the agriculture news article and return strict JSON only.

Allowed category values:
- Crop Production
- Agricultural Waste
- Farming Technology
- Market Trends
- Government Policy
- Climate Impact

Sentiment must be one of: Positive, Neutral, Negative.

Article title: ${article.title || article.headline}
Article snippet: ${article.snippet || article.summary}

Return JSON only:
{
  "summary": "short 2-3 line summary for farmers",
  "category": "one allowed value",
  "region": "country/state/region hint",
  "sentiment": "Positive|Neutral|Negative"
}`;

    const response = await axios.post(
      DEEPSEEK_API_URL,
      {
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'You are an agricultural intelligence analyst. Respond with strict JSON only.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 350
      },
      { headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, timeout: 8000 }
    );

    let jsonText = (response.data.choices?.[0]?.message?.content || '').trim();
    if (jsonText.startsWith('```json')) jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    else if (jsonText.startsWith('```')) jsonText = jsonText.replace(/```\n?/g, '').trim();

    const parsed = JSON.parse(jsonText);
    return normalizeAIResult(article, parsed, null);
  } catch (error) {
    console.error('DeepSeek agri news error:', error.response?.data || error.message);
    return normalizeAIResult(article, {}, null);
  }
}

export async function batchAnalyzeNews(articles, apiKey, maxArticles = 15) {
  const limit = Math.max(1, Math.min(maxArticles, 25));
  const scoped = (articles || []).slice(0, limit);
  const results = [];

  for (let i = 0; i < scoped.length; i++) {
    try {
      const ai = await Promise.race([
        analyzeNewsWithAI(scoped[i], apiKey),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 12000))
      ]);
      results.push({ ...scoped[i], ...ai });
      if (i < scoped.length - 1) await new Promise((resolve) => setTimeout(resolve, 250));
    } catch {
      results.push({ ...scoped[i], ...normalizeAIResult(scoped[i], {}, null) });
    }
  }

  return results;
}

export async function enrichNewsForLocation(articles, apiKey, location) {
  const analyzed = await batchAnalyzeNews(articles, apiKey, 20);
  return analyzed.map((item) => ({
    ...item,
    region: item.region || fallbackRegion(item, location)
  }));
}

export async function generateLocationInsight(location, newsArticles, apiKey) {
  if (!apiKey || apiKey === 'demo_key') {
    return [
      `${location.city}, ${location.state} is in ${location.agricultureRegion || 'an agriculture-active region'}.`,
      'Current weather, water availability, and crop pattern make local updates highly relevant.',
      'Follow local alerts first, then compare with national signals before taking farm decisions.'
    ].join('\n');
  }
  try {
    const newsContext = (newsArticles || []).slice(0, 3).map(a => a.headline).join('\n');
    const response = await axios.post(
      DEEPSEEK_API_URL,
      {
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'You are an agricultural advisor. Return plain text only.' },
          { role: 'user', content: `Based on these headlines for ${location.city}, ${location.state} (${location.agricultureRegion || 'agriculture region'}):\n${newsContext}\n\nProvide a concise 3-4 line note for local farmers. Plain text only.` }
        ],
        temperature: 0.7,
        max_tokens: 200
      },
      { headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, timeout: 8000 }
    );
    return (response.data.choices?.[0]?.message?.content || '').trim();
  } catch (error) {
    return `${location.city}, ${location.state} is seeing active agriculture signals. Prioritize local alerts from this feed.`;
  }
}

export async function generateLiveUpdateSummary(apiKey) {
  if (!apiKey || apiKey === 'demo_key') {
    return { headline: 'Live Agriculture Updates', summary: 'Real-time monitoring of agriculture news across India and globally.', timestamp: Date.now() };
  }
  try {
    const response = await axios.post(
      DEEPSEEK_API_URL,
      {
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'Generate a realistic agriculture news headline for the current moment.' },
          { role: 'user', content: 'Generate a single agriculture news headline happening right now in India.' }
        ],
        temperature: 0.9,
        max_tokens: 100
      },
      { headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, timeout: 5000 }
    );
    const headline = (response.data.choices?.[0]?.message?.content || 'Agriculture Markets Active').trim();
    return { headline, summary: 'Breaking agriculture news - stay updated with live developments.', timestamp: Date.now() };
  } catch (error) {
    return { headline: 'Agriculture Markets Active', summary: 'Monitoring live updates from farming regions nationwide.', timestamp: Date.now() };
  }
}
