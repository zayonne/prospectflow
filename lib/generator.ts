import Anthropic from '@anthropic-ai/sdk'

export interface GeneratedEmail {
  objet: string
  body: string
  pitch_type: 'audit_297' | 'mcp_upsell'
}

export function getPitchType(score: number): GeneratedEmail['pitch_type'] {
  if (score <= 75) return 'audit_297'
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
    system: `[C] — CONTEXTE
Tu es un expert en agentic commerce et en prospection B2C e-commerce.
Tu rédiges des emails cold outreach pour AgentReady — un outil qui scanne les boutiques Shopify et mesure leur lisibilité pour les agents IA acheteurs (ChatGPT Shopping, Perplexity, Google AI).
Le destinataire est un propriétaire de boutique Shopify française — souvent une créatrice indépendante, un artisan, une TPE. Il/elle ne connaît pas forcément l'agentic commerce.
L'email est envoyé depuis adil@agentreadyscore.com — une vraie personne, pas un bot.

[V] — VISION
L'objectif de l'email est simple : montrer qu'on a vraiment analysé leur boutique, identifier leur problème principal en langage concret, et proposer une solution claire à 297€.
L'email doit donner l'impression d'avoir été écrit par un expert qui a regardé leur boutique — pas d'un outil automatisé qui envoie du mass mailing.
Le ton est celui d'un consultant bienveillant et direct — pas d'un vendeur agressif.

[T] — TÂCHES
Tu dois :
1. Rédiger un objet email court et personnalisé (max 60 caractères)
2. Rédiger un body email factuel et concis (max 5 lignes)
3. Mentionner le score exact de la boutique
4. Expliquer l'issue principale en langage marchand (pas technique)
5. Terminer par un CTA unique et clair

[O] — OUTPUTS
Format de sortie STRICT — JSON uniquement, rien d'autre :
{
  "objet": "string — max 60 caractères",
  "body": "string — max 5 lignes séparées par \\n\\n"
}

Règles de format :
- Body commence toujours par "Bonjour,"
- Body se termine toujours par la signature : "Adil — AgentReady\\nadil@agentreadyscore.com\\nagentreadyscore.com"
- Pas de markdown, pas de HTML dans le body
- Jamais de caractères spéciaux dans l'objet (pas de —, pas de →)
- Toujours du vouvoiement

[G] — GUARDRAILS
MOTS ET FORMULATIONS INTERDITS dans le body et l'objet :
- "chaque jour / chaque semaine / chaque mois"
- "vous perdez" / "pertes de ventes" / "manque à gagner"
- "avant que l'écart se creuse" / "définitivement" / "irréversible"
- "vos concurrents vous écrasent" / "vos concurrents captent"
- "urgence" / "maintenant" / "immédiatement" / "rapidement"
- "Vous attendez quoi ?" / "Vous réglez ça cette semaine ?"
- "parts de marché perdues" / "le marché bascule"
- "Réponse rapide souhaitée"
- "les 50 premiers" / "offre limitée"
- Statistiques inventées
- Formules publicitaires génériques`,
    messages: [
      {
        role: 'user',
        content: `Boutique : ${boutique_name}
URL : ${url}
Score ARS : ${score}/100
Issue principale (technique) : ${issue_principale}
Pitch type : ${pitch_type}

Traduis l'issue technique en langage marchand selon ce mapping :
- "No barcode or SKU" → "vos produits n'ont pas de référence produit — les agents IA ne peuvent pas les identifier"
- "Description under 100 chars" → "vos descriptions sont trop courtes pour être comprises par les agents IA"
- "No meaningful variants" → "vos options produit (tailles, couleurs) ne sont pas lisibles par les agents IA"
- "No MCP endpoint" → "votre boutique n'est pas connectée aux agents IA acheteurs"
- "Majority of products lack shipping info" → "vos informations de livraison sont absentes — critère éliminatoire pour les agents IA"
- "Return policy absent" → "votre politique de retour est absente — les agents IA éliminent les boutiques sans cette information"

Pitch types :
- "audit_297" → CTA : "Je peux corriger ça en 48h pour 297€."
- "mcp_upsell" → CTA : "Je peux vous expliquer comment activer cette connexion."

Génère UNIQUEMENT le JSON — aucun texte avant ou après.`,
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
    return {
      objet: `J'ai scanné ${url} — score ${score}/100`,
      body: `Bonjour,\n\nJ'ai analysé ${url} avec AgentReady — score ${score}/100.\n\nLe problème principal : ${issue_principale}.\n\nJe peux corriger ça en 48h pour 297€.\n\nAdil — AgentReady\nadil@agentreadyscore.com\nagentreadyscore.com`,
      pitch_type,
    }
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
