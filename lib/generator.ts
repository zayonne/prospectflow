import Anthropic from '@anthropic-ai/sdk'

export interface GeneratedEmail {
  objet: string
  body: string
  pitch_type: 'audit_297_agressif' | 'audit_297_standard' | 'mcp_upsell'
}

export function getPitchType(score: number): GeneratedEmail['pitch_type'] {
  if (score < 60) return 'audit_297_agressif'
  if (score <= 75) return 'audit_297_standard'
  return 'mcp_upsell'
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function generateEmail(
  boutique_name: string,
  url: string,
  score: number,
  issues: string[],
  issue_principale: string,
): Promise<GeneratedEmail> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('Missing environment variable: ANTHROPIC_API_KEY')

  const pitch_type = getPitchType(score)
  const client = new Anthropic({ apiKey })

  const message = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 400,
    system:
      "Tu es un expert en prospection B2B pour l'e-commerce francais, specialise dans l'agentic commerce. Tu travailles pour AgentReady — l'outil qui mesure si une boutique Shopify est visible par les agents IA comme ChatGPT Shopping, Perplexity et Google AI. Ton objectif : rediger des emails de prospection courts, percutants et personnalises qui generent des reponses de proprietaires de boutiques Shopify francaises. Regles absolues : Commencer par Bonjour suivi d une virgule et un saut de ligne. Deuxieme ligne = accroche choc basee sur le score reel et les problemes detectes. Rester percutant et professionnel. Mentionner le score exact et au moins 2 problemes critiques detectes. Traduire les problemes techniques en pertes business concretes : ventes perdues, invisibilite IA. Maximum 5 lignes de corps — chaque mot compte. Un seul CTA : obtenir le rapport complet a 297 euros OU scan gratuit selon l'angle. Creer l urgence sans etre agressif — les concurrents s optimisent maintenant. Jamais de formule generique. Signature : Adil — AgentReady / adil@agentreadyscore.com / agentreadyscore.com",
    messages: [
      {
        role: 'user',
        content: `Boutique : ${boutique_name}\nURL : ${url}\nScore ARS : ${score}/100\nIssues detectees (${issues.length}) :\n${issues.map((iss, i) => `${i + 1}. ${iss}`).join('\n')}\nAngle : ${pitch_type}\n\nGenere un email avec Objet max 60 caracteres et Body max 5 lignes.\n\nFormat JSON strict : {"objet": "...", "body": "..."}`,
      },
    ],
  })

  const block = message.content[0]
  const rawText = block.type === 'text' ? block.text : ''

  try {
    const cleaned = rawText.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()
    const parsed = JSON.parse(cleaned) as { objet: string; body: string }
    return { objet: parsed.objet, body: parsed.body, pitch_type }
  } catch {
    return { objet: 'ProspectFlow — votre boutique', body: rawText, pitch_type }
  }
}

export async function generateEmails(
  prospects: Array<{
    boutique_name: string
    url: string
    score: number
    issues: string[]
    issue_principale: string
  }>,
): Promise<GeneratedEmail[]> {
  const results: GeneratedEmail[] = []

  for (let i = 0; i < prospects.length; i++) {
    const { boutique_name, url, score, issues, issue_principale } = prospects[i]
    const email = await generateEmail(boutique_name, url, score, issues, issue_principale)
    results.push(email)

    if (i < prospects.length - 1) {
      await sleep(1_000)
    }
  }

  return results
}
