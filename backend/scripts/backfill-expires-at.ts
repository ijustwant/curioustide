// Engangs-script: retter opp kanaler rammet av plan-nøkkel-bugen i channels.ts,
// der '7dager'-kanaler som allerede har begynt å sende aldri fikk expiresAt satt.
// Kjør én gang etter deploy av bug-fiksen: npx tsx scripts/backfill-expires-at.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const rammet = await prisma.channel.findMany({
    where: { plan: '7dager', firstSentAt: { not: null }, expiresAt: null },
  })

  console.log(`Fant ${rammet.length} kanal(er) rammet av bugen.`)

  for (const ch of rammet) {
    const utløper = new Date(ch.firstSentAt!)
    utløper.setDate(utløper.getDate() + 7)
    await prisma.channel.update({ where: { id: ch.id }, data: { expiresAt: utløper } })
    console.log(`  ${ch.id} (${ch.name}): expiresAt satt til ${utløper.toISOString()}`)
  }

  console.log('Ferdig.')
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
