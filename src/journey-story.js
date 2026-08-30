/**
 * The Living Journey's words.
 *
 * The Journey already had structure — eight stops across two chapters, a safe
 * and a risky route at each, stamps, a rival — but nothing to say. Every route
 * card read out its modifier ("Strong side gusts test your line.") and the map
 * read out its own coordinates, so a run of the campaign was mechanically
 * distinct from Classic and narratively identical to it. There was no reason
 * the letter had to get anywhere.
 *
 * So the beats live here, apart from `journey.js`, which stays a pure state
 * machine: this module is a lookup table of authored copy keyed by chapter,
 * stop, risk and pilot. It holds no state and reaches nothing, which is what
 * lets the story be revised without touching route generation, and lets the
 * route generator stay testable without stubbing prose.
 *
 * Two voices, because the pilot choice should change what the map sounds like
 * and not only how it plays. Milo reads the route; Pip reads the clock.
 */

/** Fallbacks, so a stop that outruns its copy still renders something true. */
const FALLBACK = Object.freeze({
  brief: 'The next sky is open. Pick a line and fly it.',
  arrival: 'Stamped. The letter moves on.',
  route: 'A way through, if you commit to it.',
})

const PILOT_VOICE = Object.freeze({
  navigator: Object.freeze({
    name: 'Milo',
    safe: 'Milo has the whole line drawn already.',
    risky: 'Milo folds the map twice and says it fits. Barely.',
  }),
  daredevil: Object.freeze({
    name: 'Pip',
    safe: 'Pip calls it the long way round, and takes it anyway.',
    risky: 'Pip is already gone.',
  }),
})

const CHAPTERS = Object.freeze({
  1: Object.freeze({
    kicker: 'Chapter One',
    title: 'Across the Paper Skies',
    premise:
      'A letter was folded into a plane and thrown from a high window. It has four skies to cross, ' +
      'and a red dart is crossing them too.',
    closing: Object.freeze({
      won: 'The letter lands where it was addressed, and the Red Dart lands somewhere behind it.',
      lost: 'The letter lands. The Red Dart got there first, and had nothing to deliver.',
    }),
    steps: Object.freeze({
      rooftops: Object.freeze({
        headline: 'The window closes behind you',
        brief:
          'Paper City is chimneys, washing lines and a thousand rooftops that all look like the ' +
          'right one. Get above them before the updraft off the tiles runs out.',
        safe: 'The long ridge over the terraces. Slower, and you can see every roof coming.',
        risky: 'Straight down the service alley, under the lines, where nobody looks up.',
        arrival: 'Paper City lets you go. Somewhere behind you a red corner catches the light.',
      }),
      harbor: Object.freeze({
        headline: 'Nothing to lean on over water',
        brief:
          'The harbor has no thermals and no rooftops — only cranes, gulls cut from newsprint, and a ' +
          'crossing wind that has been waiting all morning for something light.',
        safe: 'Hug the quay. The cranes block the worst of the crosswind, and cost you the view.',
        risky: 'Cut the open channel. Nothing between you and the far side but the wind.',
        arrival: 'Salt on the creases. The far quay takes your weight and the wind lets go.',
      }),
      storm: Object.freeze({
        headline: 'Wet paper does not fly',
        brief:
          'The storm front is the one sky that can end the letter rather than delay it. Rain softens ' +
          'the folds. Whatever you decide here, decide it early.',
        safe: 'Around the shoulder of the front, the long way, while the folds stay crisp.',
        risky: 'Through the seam in the middle, where the lightning is drawing the map for you.',
        arrival: 'Through, and still dry at the nose. The storm keeps the sound of you for a while.',
      }),
      aurora: Object.freeze({
        headline: 'The Red Dart, finally',
        brief:
          'Above the weather the sky goes green and quiet, and the Red Dart stops hiding. It has ' +
          'been folded sharper than you and it knows it. Last sky.',
        safe: 'Take the scissor gauntlet head on and let the Dart wear itself out on the blades.',
        risky: 'Race it. Same line, same gate, and only one of you is carrying anything.',
        arrival: 'The aurora keeps the last of the noise. The letter is still folded, and still yours.',
      }),
    }),
  }),
  2: Object.freeze({
    kicker: 'Chapter Two',
    title: 'Desk After Dark',
    premise:
      'The reply was written at midnight and folded badly. Getting it back across the desk means ' +
      'crossing the lamp, the drawer and whatever the stapler has become.',
    closing: Object.freeze({
      won: 'The reply lands on the pillow of the blotter, and the stapler closes on nothing.',
      lost: 'The reply lands. The jaws got a corner of it, and the corner will show.',
    }),
    steps: Object.freeze({
      golden: Object.freeze({
        headline: 'Last of the desk lamp',
        brief:
          'The lamp is still on and the whole desk is the colour of a good fold. It will not be on ' +
          'long. Everything is easier while you can see the edges.',
        safe: 'Ride the warm air off the shade while it lasts.',
        risky: 'Cut behind the bulb. Blinding, brief, and half the distance.',
        arrival: 'The lamp clicks off behind you. The desk keeps its shape for a few seconds more.',
      }),
      midnight: Object.freeze({
        headline: 'The desk in the dark',
        brief:
          'Without the lamp the desk is a landscape you have to remember rather than read. Mugs are ' +
          'towers. The keyboard is a canyon. None of it has moved; you just cannot see it.',
        safe: 'Follow the monitor glow along the back edge. Longer, lit, honest.',
        risky: 'Straight over the keyboard in the dark, on the shape of it you already know.',
        arrival: 'You come out over the mousepad with the folds intact. Nothing here saw you.',
      }),
      scrapyard: Object.freeze({
        headline: 'Stapler Alley',
        brief:
          'Between the tray and the drawer, everything is metal and everything is hinged. This is the ' +
          'part of the desk that was never meant to be flown.',
        safe: 'The gutter beside the tray — narrow, but nothing in it bites.',
        risky: 'Down the middle of the alley, between the jaws, on the beat.',
        arrival: 'Out the far end of the alley with all four corners. That is not usual.',
      }),
      'desk-finale': Object.freeze({
        headline: 'The jaws, and the Dart again',
        brief:
          'The stapler has the last gate and the Red Dart has the last idea. One of them wants the ' +
          'letter stopped and the other wants it first. Neither is getting it.',
        safe: 'Read the jaws. Three closes, one gap, and it is the same gap every time.',
        risky: 'Let the Dart go in first and take the gap it opens.',
        arrival: 'The desk goes quiet. Somewhere under the lamp, a reply is waiting to be read.',
      }),
    }),
  }),
})

function chapterBeats(chapter) {
  return CHAPTERS[chapter === 2 ? 2 : 1]
}

function stepBeats(chapter, stepId) {
  return chapterBeats(chapter).steps[String(stepId || '')] || null
}

/** Chapter framing for the Journey panel heading. */
export function chapterStory(chapter = 1) {
  const beats = chapterBeats(chapter)
  return Object.freeze({ kicker: beats.kicker, title: beats.title, premise: beats.premise })
}

/**
 * What is at stake at this stop, for the panel above the route choices.
 * `null` once the chapter is finished — there is no next stop to brief.
 */
export function stepStory(chapter = 1, stepId = '') {
  const beats = stepBeats(chapter, stepId)
  if (!beats) return null
  return Object.freeze({ headline: beats.headline, brief: beats.brief })
}

/**
 * The line a route card carries under its modifier: what this way through
 * actually is, and what the chosen pilot makes of taking it.
 */
export function routeStory({ chapter = 1, stepId = '', risk = 'safe', pilotId = 'navigator' } = {}) {
  const beats = stepBeats(chapter, stepId)
  const risky = risk === 'risky'
  const voice = PILOT_VOICE[pilotId] || PILOT_VOICE.navigator
  return Object.freeze({
    line: (risky ? beats?.risky : beats?.safe) || FALLBACK.route,
    voice: risky ? voice.risky : voice.safe,
  })
}

/** The line shown on the results screen once a stop has been stamped. */
export function arrivalStory(chapter = 1, stepId = '') {
  return stepBeats(chapter, stepId)?.arrival || FALLBACK.arrival
}

/** The line the finished postcard carries, which depends on the rival. */
export function closingStory(chapter = 1, { rivalBeaten = false } = {}) {
  const closing = chapterBeats(chapter).closing
  return rivalBeaten ? closing.won : closing.lost
}

/** Every stop id this module has copy for, so a test can assert coverage. */
export function storiedStepIds(chapter = 1) {
  return Object.freeze(Object.keys(chapterBeats(chapter).steps))
}
