// server/services/deepseekLoyalty.js - DeepSeek AI for loyalty tier reasoning

import axios from 'axios';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

/**
 * Generate concise loyalty-tier reasoning for a startup/buyer profile.
 */
export async function generateCompanyLoyaltyReasoning(company, apiKey) {
  if (!apiKey || apiKey === 'demo_key') {
    return `Strong execution signals in ${company.segment || 'clean-energy procurement'} and consistent profile quality support a ${company.tierLabel} placement.`;
  }

  try {
    const prompt = `Company: ${company.name}
Sector: ${company.segment || 'Biogas / bioenergy buyer ecosystem'}
Weighted score: ${company.score}
Tier: ${company.tierLabel}
Breakdown: Reputation ${company.breakdown.reputation}, Accountability ${company.breakdown.accountability}, Duration ${company.breakdown.duration}, Reviews ${company.breakdown.reviewVolume}
Summary: ${company.summary || 'No summary available'}

Return exactly 2 short lines in plain text:
1) Why this tier is justified now
2) What operational proof points most influenced the score`;

    const response = await axios.post(
      DEEPSEEK_API_URL,
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are a B2B trust analyst for agri procurement and climate-tech partnerships. Keep response concise and practical.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.4,
        max_tokens: 180
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 7000
      }
    );

    return response.data?.choices?.[0]?.message?.content?.trim() ||
      `Composite trust indicators support ${company.tierLabel} status for ${company.name}.`;
  } catch (error) {
    console.error('Company loyalty reasoning error:', error.message);
    return `Composite trust indicators support ${company.tierLabel} status for ${company.name}.`;
  }
}

/**
 * Generate tier-level comparison reasoning for top companies.
 */
export async function generateTierComparisonReasoning(tier, companies, apiKey) {
  const safeTier = ['A', 'B', 'C'].includes(String(tier)) ? tier : 'C';
  const top = Array.isArray(companies) ? companies.slice(0, 3) : [];

  if (!top.length) {
    return `No companies are currently classified in Tier ${safeTier}.`;
  }

  if (!apiKey || apiKey === 'demo_key') {
    const leader = top[0];
    return `${leader.name} leads Tier ${safeTier} with stronger weighted trust indicators than peers, especially across reputation and delivery consistency.`;
  }

  try {
    const compact = top
      .map((c, i) => `${i + 1}. ${c.name} | score ${c.score} | rep ${c.breakdown.reputation} | acc ${c.breakdown.accountability} | dur ${c.breakdown.duration} | rev ${c.breakdown.reviewVolume}`)
      .join('\n');

    const prompt = `Tier: ${safeTier}\nTop companies:\n${compact}\n\nWrite exactly 2 short lines:\n1) Why rank #1 is currently better than #2/#3\n2) Which metric gap is most decisive for buyer benefit`;

    const response = await axios.post(
      DEEPSEEK_API_URL,
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are a B2B agri procurement analyst. Keep output practical, brief, and comparison focused.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.35,
        max_tokens: 160
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 7000
      }
    );

    return response.data?.choices?.[0]?.message?.content?.trim() ||
      `${top[0].name} currently outranks other Tier ${safeTier} peers on weighted trust metrics.`;
  } catch (error) {
    console.error('Tier comparison reasoning error:', error.message);
    return `${top[0].name} currently outranks other Tier ${safeTier} peers on weighted trust metrics.`;
  }
}
