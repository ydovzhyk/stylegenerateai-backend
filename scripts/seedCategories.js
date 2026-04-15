const mongoose = require('mongoose')
require('dotenv').config()

const { Category } = require('../src/models/category.model')

const CATEGORY_ITEMS = [
  {
    value: 'Studio Portrait',
    dna: {
      coreIdentity: 'Controlled indoor portrait with studio setup.',
      mustHave: ['clean background', 'controlled lighting'],
      mayUse: ['beauty', 'fashion', 'editorial'],
      avoid: ['environmental storytelling', 'complex scenes'],
    },
  },
  {
    value: 'Cinematic Portrait',
    dna: {
      coreIdentity: 'Narrative portrait with film-like atmosphere.',
      mustHave: ['story-driven scene', 'mood lighting'],
      mayUse: ['urban', 'drama', 'character moment'],
      avoid: ['plain studio look', 'flat lighting'],
    },
  },
  {
    value: 'Close-up Portrait',
    dna: {
      coreIdentity: 'Face-dominant tight crop portrait.',
      mustHave: ['tight framing', 'focus on eyes and skin'],
      mayUse: ['beauty', 'editorial', 'character detail'],
      avoid: ['wide composition', 'environment focus'],
    },
  },
  {
    value: 'Black & White Portrait',
    dna: {
      coreIdentity: 'Monochrome-first portrait concept.',
      mustHave: ['strong tonal structure', 'clear monochrome logic'],
      mayUse: ['documentary', 'fashion', 'noir', 'fine-art'],
      avoid: ['color-dependent storytelling', 'generic beauty repetition'],
    },
  },
  {
    value: 'Soft Light Portrait',
    dna: {
      coreIdentity: 'Low-contrast portrait with soft flattering light.',
      mustHave: ['diffused light', 'gentle shadows'],
      mayUse: ['window light', 'lifestyle', 'beauty'],
      avoid: ['harsh contrast', 'dramatic lighting'],
    },
  },
  {
    value: 'Dramatic Light Portrait',
    dna: {
      coreIdentity: 'Expressive portrait built on strong light contrast.',
      mustHave: ['directional light', 'bold shadows'],
      mayUse: ['cinematic', 'theatrical', 'noir'],
      avoid: ['flat lighting', 'soft lifestyle mood'],
    },
  },
  {
    value: 'High Fashion Portrait',
    dna: {
      coreIdentity: 'Bold fashion-driven portrait with strong styling.',
      mustHave: ['fashion wardrobe', 'confident posing'],
      mayUse: ['avant-garde', 'runway', 'luxury'],
      avoid: ['casual styling', 'plain realism'],
    },
  },
  {
    value: 'Editorial Portrait',
    dna: {
      coreIdentity: 'Magazine-style portrait with concept and attitude.',
      mustHave: ['editorial styling', 'strong visual direction'],
      mayUse: ['fashion', 'narrative', 'art direction'],
      avoid: ['generic headshot', 'plain catalog look'],
    },
  },
  {
    value: 'Beauty Portrait',
    dna: {
      coreIdentity: 'Face-focused beauty and skincare portrait.',
      mustHave: ['skin detail', 'clean polished look'],
      mayUse: ['cosmetics', 'glam', 'high-key light'],
      avoid: ['busy background', 'heavy narrative scene'],
    },
  },
  {
    value: 'Minimalist Portrait',
    dna: {
      coreIdentity: 'Simple portrait with minimal visual elements.',
      mustHave: ['negative space', 'clean composition'],
      mayUse: ['neutral palette', 'subtle wardrobe'],
      avoid: ['busy styling', 'complex environment'],
    },
  },
  {
    value: 'Fantasy Warrior',
    dna: {
      coreIdentity: 'Heroic fantasy battle character portrait.',
      mustHave: ['warrior presence', 'armor or weapon cues'],
      mayUse: ['battle damage', 'epic atmosphere', 'mythic details'],
      avoid: ['modern fashion', 'casual realism'],
    },
  },
  {
    value: 'Dark Fantasy',
    dna: {
      coreIdentity: 'Moody fantasy portrait with dark mystical tone.',
      mustHave: ['dark atmosphere', 'fantasy world logic'],
      mayUse: ['magic', 'creatures', 'gothic styling'],
      avoid: ['bright cheerful tone', 'clean commercial beauty'],
    },
  },
  {
    value: 'Medieval Knight',
    dna: {
      coreIdentity: 'Historical-inspired armored knight portrait.',
      mustHave: ['medieval armor', 'chivalric character cues'],
      mayUse: ['castle', 'battlefield', 'heraldic elements'],
      avoid: ['futuristic tech', 'modern wardrobe'],
    },
  },
  {
    value: 'Viking Style',
    dna: {
      coreIdentity: 'Norse-inspired warrior portrait with rugged mythic feel.',
      mustHave: ['nordic styling', 'raw strength'],
      mayUse: ['braids', 'fur', 'runes', 'cold atmosphere'],
      avoid: ['clean modern fashion', 'soft glam polish'],
    },
  },
  {
    value: 'Mage / Sorcerer',
    dna: {
      coreIdentity: 'Arcane fantasy portrait centered on magic user identity.',
      mustHave: ['magical presence', 'mystic wardrobe cues'],
      mayUse: ['staff', 'spell light', 'ancient symbols'],
      avoid: ['mundane realism', 'warrior-only battle focus'],
    },
  },
  {
    value: 'Elf Character',
    dna: {
      coreIdentity: 'Elegant fantasy portrait with elven identity.',
      mustHave: ['ethereal presence', 'fantasy facial styling'],
      mayUse: ['forest', 'ornaments', 'graceful costume'],
      avoid: ['heavy industrial look', 'modern casual clothing'],
    },
  },
  {
    value: 'Post-Apocalyptic',
    dna: {
      coreIdentity: 'Survival portrait set in a broken world.',
      mustHave: ['worn styling', 'harsh environment cues'],
      mayUse: ['ruins', 'dust', 'scarcity', 'improvised gear'],
      avoid: ['clean polished luxury', 'safe modern lifestyle feel'],
    },
  },
  {
    value: 'Survivor Style',
    dna: {
      coreIdentity: 'Resilient character portrait built around endurance.',
      mustHave: ['practical survival styling', 'human grit'],
      mayUse: ['weathered clothing', 'travel gear', 'rough landscapes'],
      avoid: ['ornamental fantasy armor', 'high-fashion gloss'],
    },
  },
  {
    value: 'Cyberpunk',
    dna: {
      coreIdentity: 'Futuristic neon urban portrait with tech edge.',
      mustHave: ['neon or digital light', 'cyber elements'],
      mayUse: ['rain', 'city', 'implants', 'augmented styling'],
      avoid: ['natural pastoral setting', 'historical costume'],
    },
  },
  {
    value: 'Sci-Fi Character',
    dna: {
      coreIdentity:
        'Futuristic character portrait from a science-fiction world.',
      mustHave: ['future design language', 'speculative identity'],
      mayUse: ['space', 'advanced tech', 'uniforms', 'devices'],
      avoid: ['historical fantasy motifs', 'ordinary casual realism'],
    },
  },
  {
    value: 'Android / Robot',
    dna: {
      coreIdentity: 'Portrait with robotic or synthetic being identity.',
      mustHave: ['mechanical or artificial cues', 'non-human logic'],
      mayUse: ['metal surfaces', 'LED accents', 'human-machine fusion'],
      avoid: ['fully organic realism without tech cues'],
    },
  },
  {
    value: 'Futuristic Armor',
    dna: {
      coreIdentity:
        'Armor-driven sci-fi portrait with advanced protection design.',
      mustHave: ['futuristic armor', 'engineered silhouette'],
      mayUse: ['lights', 'panels', 'combat tech'],
      avoid: ['soft casual wardrobe', 'historical materials'],
    },
  },
  {
    value: 'Neon City',
    dna: {
      coreIdentity: 'Portrait rooted in luminous futuristic city atmosphere.',
      mustHave: ['urban neon environment', 'city-night energy'],
      mayUse: ['rain reflections', 'signage', 'street mood'],
      avoid: ['studio seamless background', 'nature setting'],
    },
  },
  {
    value: 'Space Explorer',
    dna: {
      coreIdentity: 'Adventure portrait of a character tied to space travel.',
      mustHave: ['space-exploration cues', 'future mission identity'],
      mayUse: ['helmet', 'suit', 'planet backdrop', 'starfield'],
      avoid: ['medieval fantasy', 'ordinary streetwear'],
    },
  },
  {
    value: 'Anime Style',
    dna: {
      coreIdentity: 'Stylized portrait in anime-inspired visual language.',
      mustHave: ['anime face logic', 'illustrative styling'],
      mayUse: ['expressive eyes', 'clean linework', 'vivid palettes'],
      avoid: ['photoreal rendering', 'heavy live-action realism'],
    },
  },
  {
    value: 'Comic Book',
    dna: {
      coreIdentity: 'Graphic portrait with comic-book storytelling energy.',
      mustHave: ['illustrated impact', 'stylized contrast'],
      mayUse: ['inking', 'hero framing', 'panel-like drama'],
      avoid: ['plain photo realism', 'soft subtle lighting only'],
    },
  },
  {
    value: 'Cartoon Style',
    dna: {
      coreIdentity: 'Playful stylized portrait with cartoon exaggeration.',
      mustHave: ['cartoon simplification', 'friendly readability'],
      mayUse: ['bold colors', 'fun expression', 'light humor'],
      avoid: ['grim realism', 'hyper-detailed skin texture'],
    },
  },
  {
    value: 'Oil Painting',
    dna: {
      coreIdentity: 'Portrait interpreted as classic or modern oil painting.',
      mustHave: ['paint texture', 'brushwork'],
      mayUse: ['classical composition', 'gallery mood', 'impasto'],
      avoid: ['clean digital photo realism'],
    },
  },
  {
    value: 'Watercolor',
    dna: {
      coreIdentity: 'Soft painterly portrait with watercolor behavior.',
      mustHave: ['transparent washes', 'painterly softness'],
      mayUse: ['paper texture', 'bleeding edges', 'light palette'],
      avoid: ['hard metallic rendering', 'photo-real sharpness'],
    },
  },
  {
    value: 'Sketch',
    dna: {
      coreIdentity: 'Portrait expressed as drawn sketch or study.',
      mustHave: ['linework', 'draftsmanship feel'],
      mayUse: ['pencil', 'charcoal', 'crosshatching'],
      avoid: ['full polished color realism'],
    },
  },
  {
    value: '3D Render',
    dna: {
      coreIdentity: 'CGI-rendered portrait with digital 3D look.',
      mustHave: ['3D shading', 'rendered materials'],
      mayUse: ['stylized realism', 'hyperreal CGI', 'design polish'],
      avoid: ['traditional painting feel', 'raw photography look'],
    },
  },
  {
    value: 'Pixel Art',
    dna: {
      coreIdentity: 'Portrait translated into pixel-art aesthetics.',
      mustHave: ['pixel structure', 'low-resolution logic'],
      mayUse: ['retro game palette', 'sprite influence'],
      avoid: ['smooth realism', 'high-detail continuous shading'],
    },
  },
  {
    value: 'Pop Art',
    dna: {
      coreIdentity: 'Bold graphic portrait with pop-art energy.',
      mustHave: ['graphic color blocking', 'high visual punch'],
      mayUse: ['halftones', 'poster feel', 'art print logic'],
      avoid: ['subtle muted realism', 'documentary tone'],
    },
  },
  {
    value: 'Business Portrait',
    dna: {
      coreIdentity: 'Professional portrait for corporate identity and trust.',
      mustHave: ['clean grooming', 'professional styling'],
      mayUse: ['office', 'neutral background', 'confident posture'],
      avoid: ['dramatic fantasy styling', 'streetwear attitude'],
    },
  },
  {
    value: 'LinkedIn Profile',
    dna: {
      coreIdentity:
        'Approachable professional headshot for online profile use.',
      mustHave: ['friendly credibility', 'clear face visibility'],
      mayUse: ['soft studio light', 'neutral palette', 'simple background'],
      avoid: ['heavy editorial drama', 'busy concepts'],
    },
  },
  {
    value: 'Casual Style',
    dna: {
      coreIdentity: 'Relaxed portrait with everyday approachable styling.',
      mustHave: ['casual wardrobe', 'natural attitude'],
      mayUse: ['lifestyle', 'urban', 'minimal interior'],
      avoid: ['formal luxury code', 'armor or costume logic'],
    },
  },
  {
    value: 'Street Style',
    dna: {
      coreIdentity:
        'Urban fashion portrait rooted in real-world street culture.',
      mustHave: ['streetwear', 'environment context'],
      mayUse: ['city textures', 'movement', 'attitude'],
      avoid: ['plain studio fashion without street cues'],
    },
  },
  {
    value: 'Luxury Style',
    dna: {
      coreIdentity:
        'Portrait built around premium taste and expensive aesthetic.',
      mustHave: ['refined styling', 'high-end visual feel'],
      mayUse: ['jewelry', 'designer wardrobe', 'clean polished settings'],
      avoid: ['rough survival styling', 'cheap casual mood'],
    },
  },
  {
    value: 'Fitness Style',
    dna: {
      coreIdentity: 'Active portrait centered on athletic identity.',
      mustHave: ['fit physique cues', 'sport or training styling'],
      mayUse: ['gym', 'movement', 'performance energy'],
      avoid: ['formal business mood', 'fragile luxury styling'],
    },
  },
  {
    value: 'Travel Style',
    dna: {
      coreIdentity: 'Portrait linked to movement, places, and exploration.',
      mustHave: ['travel context', 'journey identity'],
      mayUse: ['airport', 'street abroad', 'landscape', 'luggage'],
      avoid: ['plain studio backdrop', 'static office mood'],
    },
  },
  {
    value: 'Celebrity Style',
    dna: {
      coreIdentity: 'Portrait with high-visibility star-like public image.',
      mustHave: ['camera-ready polish', 'presence'],
      mayUse: ['flash photography', 'paparazzi mood', 'styled glamour'],
      avoid: ['ordinary casual anonymity'],
    },
  },
  {
    value: 'Magazine Cover',
    dna: {
      coreIdentity: 'Portrait designed for strong cover-image impact.',
      mustHave: ['clear focal face', 'cover-worthy composition'],
      mayUse: ['editorial styling', 'bold eye contact', 'clean punchy framing'],
      avoid: ['weak composition', 'overly cluttered scene'],
    },
  },
  {
    value: 'Red Carpet',
    dna: {
      coreIdentity: 'Event-glamour portrait with formal spotlight presence.',
      mustHave: ['formal styling', 'public-event polish'],
      mayUse: ['gowns', 'suits', 'flash lights', 'premiere mood'],
      avoid: ['casual wardrobe', 'rough documentary atmosphere'],
    },
  },
  {
    value: 'Royal Style',
    dna: {
      coreIdentity: 'Portrait with regal authority and ceremonial elegance.',
      mustHave: ['dignified posture', 'elevated styling'],
      mayUse: ['ornament', 'rich fabrics', 'courtly mood'],
      avoid: ['streetwear', 'messy casual realism'],
    },
  },
  {
    value: 'Luxury Editorial',
    dna: {
      coreIdentity:
        'High-end editorial portrait with premium fashion direction.',
      mustHave: ['luxury styling', 'editorial composition'],
      mayUse: ['jewel tones', 'designer materials', 'fashion attitude'],
      avoid: ['basic corporate headshot', 'plain lifestyle look'],
    },
  },
  {
    value: 'High-End Fashion',
    dna: {
      coreIdentity: 'Prestige fashion portrait with elite visual finish.',
      mustHave: ['designer-level wardrobe', 'strong fashion image'],
      mayUse: ['campaign feel', 'couture', 'dramatic posing'],
      avoid: ['cheap casual styling', 'low-stakes realism'],
    },
  },
  {
    value: 'Surreal',
    dna: {
      coreIdentity: 'Portrait operating by dream logic rather than realism.',
      mustHave: ['unexpected concept', 'non-literal imagery'],
      mayUse: ['floating elements', 'distortion', 'visual paradox'],
      avoid: ['strict real-world logic', 'plain documentary framing'],
    },
  },
  {
    value: 'Dreamlike',
    dna: {
      coreIdentity: 'Soft atmospheric portrait with dreamy emotional tone.',
      mustHave: ['ethereal mood', 'gentle visual softness'],
      mayUse: ['mist', 'pastels', 'glow', 'poetic styling'],
      avoid: ['hard realism', 'aggressive gritty contrast'],
    },
  },
  {
    value: 'Double Exposure',
    dna: {
      coreIdentity:
        'Composite portrait blending face with another scene or texture.',
      mustHave: ['layered imagery', 'dual-meaning composition'],
      mayUse: ['landscape', 'city', 'memory', 'symbolism'],
      avoid: ['single-layer plain realism'],
    },
  },
  {
    value: 'Glitch Art',
    dna: {
      coreIdentity: 'Portrait disrupted by digital distortion aesthetics.',
      mustHave: ['glitch logic', 'visual corruption effects'],
      mayUse: ['RGB split', 'scanlines', 'fragmentation'],
      avoid: ['clean polished realism without distortion'],
    },
  },
  {
    value: 'Vaporwave',
    dna: {
      coreIdentity:
        'Retro-futuristic portrait with vaporwave mood and palette.',
      mustHave: ['retro digital atmosphere', 'stylized synthetic vibe'],
      mayUse: ['pink-cyan-purple palette', 'grids', '80s/90s nostalgia'],
      avoid: ['earthy realism', 'historical costume logic'],
    },
  },
  {
    value: 'Soft Aesthetic',
    dna: {
      coreIdentity:
        'Gentle portrait centered on softness, tenderness, and visual calm.',
      mustHave: ['soft mood', 'delicate styling'],
      mayUse: ['pastels', 'cozy textures', 'youthful serenity'],
      avoid: ['harsh drama', 'heavy contrast', 'aggressive styling'],
    },
  },
]

async function seedCategories() {
  try {
    let doc = await Category.findOne()

    if (!doc) {
      doc = await Category.create({ items: CATEGORY_ITEMS })
      console.log(
        `✅ Categories document created with ${CATEGORY_ITEMS.length} items`,
      )
      return
    }

    doc.items = CATEGORY_ITEMS
    await doc.save()

    console.log(`✅ Categories updated with ${CATEGORY_ITEMS.length} items`)
  } catch (error) {
    console.error('❌ Failed to seed categories:', error)
  } finally {
    await mongoose.disconnect()
  }
}

async function run() {
  try {
    await mongoose.connect(process.env.DB_HOST)
    console.log('✅ Mongo connected')

    await seedCategories()
  } catch (error) {
    console.error('❌ Script failed:', error)
    process.exit(1)
  }
}

run()

// node scripts/seedCategories.js
