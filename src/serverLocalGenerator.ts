export function createLocalDynamicBlueprint(topic: string, tone: string) {
  const cleanTopic = topic.trim();
  const titleTopic = cleanTopic.split(" ").map(w => w.charAt(0).toUpperCase() + w.substr(1)).join(" ");
  
  // Dynamic descriptive components based on selected Tone
  let toneKeyword = "existential";
  let emotionalTone = "quiet, raw melancholy";
  let primaryMusic = "ambient piano";

  if (tone === "Melancholic") {
    toneKeyword = "deep melancholic";
    emotionalTone = "poetic and fragile solitude";
    primaryMusic = "atmospheric textures";
  } else if (tone === "Overthinking") {
    toneKeyword = "intricate analytical";
    emotionalTone = "claustrophobic mental loops";
    primaryMusic = "subtle tension";
  } else if (tone === "Stoic") {
    toneKeyword = "stoic and resilient";
    emotionalTone = "calm, disciplined acceptance";
    primaryMusic = "cinematic drones";
  } else if (tone === "Golden-Sand Comfort") {
    toneKeyword = "warm golden-sand";
    emotionalTone = "tender comforting resolution";
    primaryMusic = "emotional strings";
  }

  // Generate 20 topic-tailored, highly captivating YouTube titles
  const titles = [
    `The Quiet Psychology of ${titleTopic}`,
    `Why We Secretly Love ${titleTopic}`,
    `The Psychological Trap of ${titleTopic}`,
    `Why Intelligent People Struggle with ${titleTopic}`,
    `How to Survive the Weight of ${titleTopic}`,
    `The Silent Grief of ${titleTopic}`,
    `Why Your Brain Prefers ${titleTopic} over Peace`,
    `The Illusion of Resolving ${titleTopic}`,
    `Jean-Paul Sartre and the Burden of ${titleTopic}`,
    `An Overthinker's Survival Guide to ${titleTopic}`,
    `The Art of Letting Go of ${titleTopic}`,
    `Who Are You When ${titleTopic} Lies Silent?`,
    `Why ${titleTopic} Feels Like a Fragile Shield`,
    `Stop Trying to Fix ${titleTopic}`,
    `The Absurd Reality of Modern ${titleTopic}`,
    `The Hidden Protection Mechanism of ${titleTopic}`,
    `Why You're Terrified of Leaving ${titleTopic} Behind`,
    `The Poetic Solitude of ${titleTopic}`,
    `Mourning the Phantom Self that Beats ${titleTopic}`,
    `Taking Our First Footstep Out of ${titleTopic}`
  ];

  // Detailed dynamic text chunks for the script
  const hookText = `Imagine waking up at 3:00 AM with a cold, quiet realization. It is not a sudden panic, but a slow, whispering fog surrounding ${cleanTopic}. You are constantly planning, searching, and hoping for a final resolution. But as the clock ticks away in the dark, you begin to suspect the truth: ${cleanTopic} is not a problem you can solve with more thinking. It is a mirror reflecting your deepest vulnerabilities. And you are terrified of looking too closely.`;

  const mirrorText = `Let us look at a person who spends their days navigating ${cleanTopic}. They buy the books, listen to the podcasts, and catalog the symptoms. They construct a vivid, cinematic vision of how simple life would be if they could just break free. But when the hour arrives to actually step out—to choose peace over the mental treadmill—a heavy, invisible anchor weights down their spirit. They aren't lazy. They are shielding themselves. Because as long as they stay stuck in ${cleanTopic}, their vulnerability remains perfectly protected in the fortress of their intellect.`;

  const expansionText = `This is the hidden curse of the modern thinker. When you over-identify with ${cleanTopic}, you build a fragile identity out of your struggles. To let card towers fall, to be normal, to write a clumsy first page of your life—it is terrifying. And so, hyper-analyzing ${cleanTopic} becomes a highly sophisticated defensive armor. Procrastination and overthinking are not failures of discipline; they are subconscious emotional regulation. By postponing action, you postpone the terrifying verdict that you are human, imperfect, and out of control.`;

  const analysisText = `Psychologists call this ego-defensive self-handicapping. We subconsciously preserve ${cleanTopic} as an excuse. 'I would have accomplished my masterpieces,' we tell ourselves, 'if only I wasn't carrying this heavy weight.' We fall in love with our limitations because they protect us from the painful possibility of trying with our full hearts and still falling short. We prefer being a sleeping giant paralyzed by ${cleanTopic} over being a small, clumsy, struggling creature taking real footsteps on dusty ground.`;

  const philosophicalText = `The philosophers of old knew this intimate terror. Seneca reminded us that we suffer more often in imagination than in reality. And the existentialist masters wrote that our freedom is a condemnation because it demands action, not endless preparation. ${cleanTopic} is a ghost we conjure to fill the void, a phantom companion that keeps us warm while we avoid the cold necessity of letting go. We would rather carry a heavy stone we understand than step empty-handed into the vast, unknown freedom of our own lives.`;

  const endingText = `To free yourself from this ancient loop, you must let your perfect self rest. You must mourn the idealized version of you who overcomes ${cleanTopic} flawlessly. You have to commit to the fragile, quiet, clumsy act of being a beginner. Stop protecting the phantom. Step onto the stage exactly as you are—cracked, tired, and average. Because a single real, imperfect footprint planted in the mud is worth more than an eternity of flying in a dream.`;

  // Join sections with standardized subheadings
  const scriptText = `### HOOK (0:00 - 0:30)
${hookText}

### EMOTIONAL MIRROR (0:30 - 1:45)
${mirrorText}

### PROBLEM EXPANSION (1:45 - 3:15)
${expansionText}

### PSYCHOLOGICAL ANALYSIS (3:15 - 4:45)
${analysisText}

### PHILOSOPHICAL LAYER (4:45 - 6:30)
${philosophicalText}

### ENDING (6:30 - 8:00)
${endingText}`;

  // Build the complete blueprint
  return {
    topic: cleanTopic,
    tone: tone as any,
    createdAt: new Date().toISOString(),
    isLocalFallback: true,
    analysis: {
      coreEmotion: `A sharp, lingering intellectual longing blended with ${emotionalTone}.`,
      coreConflict: `The painful friction between our defense mechanisms surrounding ${cleanTopic} and the absolute necessity of action.`,
      hiddenFear: `That if we let go of ${cleanTopic}, we will discover we are ordinary, vulnerable, and fully responsible for our fate.`,
      hiddenDesire: `To find silent, peaceful stillness where the mind no longer needs to analyze or justify its existence.`,
      existentialQuestion: `Who are we when we stop thinking about our problems and simply begin to exist?`,
      internalContradiction: `We spend our finest hours researching cures for ${cleanTopic}, yet we use that very research to avoid the quiet discomfort of taking a single step.`,
      emotionalTrigger: `Staring at a blank screen or a clean calendar, realizing how much life has been spent preparing instead of living.`,
      whyClick: `It gives a deeply validating name to the silent paralysis that clever overthinkers keep hidden from others.`,
      whyKeepWatching: `It bypasses generic motivational tropes to dissect the exact psychological armor we use to avoid reality.`,
      mostRelatableSituation: `Polishing an elaborate todo list and setting up the 'perfect' aesthetic workspace at midnight, only to close the laptop and sleep instead of starting.`
    },
    viralPositioning: {
      targetAudience: `Overthinkers, creative souls, and highly sensitive minds aged 18 to 40 who struggle to convert intellectual ambition into action.`,
      emotionalState: `Restless, anxious, slightly isolated, but intensely drawn to architectural typography and deep honesty.`,
      curiosityGap: `Why smart people stay stuck in ${cleanTopic} as a protective shield, and the counterintuitive secret to breaking free.`,
      psychologicalHook: `Your mind isn't broken; it's simply terrified. Let's explore the hidden wisdom of your paralysis.`,
      strongestTitleAngle: `The Quiet Trap of ${titleTopic} (An Elitist Defense)`,
      clickableThumbnailConcept: `A single sketch figure carrying a giant key of clockwork gears across an immense, empty plain.`
    },
    titles,
    thumbnailIdeas: [
      {
        id: 1,
        conceptName: `The Infinite Draft of ${titleTopic}`,
        description: `A dark sketch frame where a solitary figure stands waist-deep in a sea of crumpled papers, looking up at a single glowing door.`,
        symbolicElement: `Ethereal paper waves symbolizing lost thoughts and heavy planning.`,
        visualComposition: `Monochrome charcoal outline, left side dark, right side carrying a low warm golden frame from the door.`
      },
      {
        id: 2,
        conceptName: `The Locked Clockwork`,
        description: `An giant marble padlock whose internal tumblers are made of intricate human silhouettes clutching their heads in thought.`,
        symbolicElement: `Silhouette gears symbolizing internal intellectual entrapment.`,
        visualComposition: `High-contrast black-and-white chalk style, centered heavy padlock casting sharp shadows.`
      },
      {
        id: 3,
        conceptName: "The Step into the Wet Sand",
        description: `A lonely traveler taking off their heavy armor piece by piece, dropping it onto dry ground as they step into a infinite shimmering sea.`,
        symbolicElement: `Discarded armor representing defense mechanisms.`,
        visualComposition: `Minimal line art, cinematic low angle, vast starry horizon in the background.`
      }
    ],
    description: `Why do we remain trapped in loops of ${cleanTopic}? This highly cinematic documentary script unpacks the existential architecture of procrastination, why our clever minds love to construct excuses, and the silent courage of choosing imperfect action.\n\nChapters:\n0:00 - The Grief of Unlived Lives\n0:30 - The Protection of Procrastination\n1:45 - The Hyper-Analytical Shield\n3:15 - Saving our Fragile Ego\n4:45 - Existential Freedom & Imperfect Starts\n6:30 - The Freedom of Being Average\n\nKeywords: ${cleanTopic.toLowerCase()}, existential psychology, overthinking relief, stoic philosophy, letting go of perfection`,
    scriptText,
    scenes: [
      {
        number: 1,
        duration: "0:00 - 0:30",
        section: "HOOK",
        voiceoverText: hookText,
        visualDescription: `A dark, silent chamber with a single, immense arched window casting pale blue light across bare wooden floorboards. Built around the floor are towering, precarious pillars of heavy, blank stone slabs.`,
        cameraMovement: "A slow, creeping dolly forward towards the moonlight, emphasizing the cold empty stones.",
        transitionType: "Cut to black",
        emotion: `Quiet mourning and sudden clarity about ${cleanTopic}`,
        imagePrompt: `Minimalist existential illustration, black background, white sketch drawing, psychological symbolism. A tiny lone figure sitting on a bed in a vast dark room, surrounded by gigantic towers of blank geometric stones under a single ray of moonlight. High contrast, cinematic composition, hand-drawn look, 16:9 ratio.`,
        musicCategory: primaryMusic as any
      },
      {
        number: 2,
        duration: "0:30 - 1:45",
        section: "EMOTIONAL MIRROR",
        voiceoverText: mirrorText,
        visualDescription: `A thin skeleton-like silhouette standing before an ornate, colossal gilded picture frame. The canvas inside is entirely empty dark void, but the figure is meticulously drawing tiny, intricate gear systems on the surrounding plaster.`,
        cameraMovement: "Slow tilt up from the detailed gears to reveal the absolute emptiness inside the frame.",
        transitionType: "Cross dissolve",
        emotion: "Hesitancy and protective shield",
        imagePrompt: `Minimalist existential illustration, black background, white sketch drawing. A thin, lonely silhouette standing before an enormous empty picture frame, holding a tiny glowing quill. The surrounding wall is covered in chaotic, fine clockwork drawings. Chalk outline, hand-drawn, 16:9 ratio.`,
        musicCategory: "subtle tension"
      },
      {
        number: 3,
        duration: "1:45 - 3:15",
        section: "PROBLEM EXPANSION",
        voiceoverText: expansionText,
        visualDescription: `A human figure trapped inside a vast birdcage composed of soft, hand-scribbled charcoal bars. The heavy door is swung completely open, but the figure is obsessively polishing a tiny lock on a secure bar, refusing to look sideways.`,
        cameraMovement: "Slow crane shot rising and zooming out to emphasize the uselessness of the barrier.",
        transitionType: "Fade to black",
        emotion: "Complicit safety and dread",
        imagePrompt: `Minimalist existential illustration, black background, white sketch drawing. A lone human figure sitting inside a massive birdcage with its gate wide open. The figure is polishing a tiny lock mechanism on the bars. High contrast, emotional charcoal texture, 16:9 ratio.`,
        musicCategory: "atmospheric textures"
      },
      {
        number: 4,
        duration: "3:15 - 4:45",
        section: "PSYCHOLOGICAL ANALYSIS",
        voiceoverText: analysisText,
        visualDescription: `A traveler stride-walking across a stark desert landscape on thin, towering stilts formed of glass hourglasses. With every stride, the colored sand runs through, shortening the stilts, but the walker gazes proudly upward.`,
        cameraMovement: "Tracking shot low, moving parallel to the sandy feet to reveal the crumbling glass.",
        transitionType: "Cross dissolve",
        emotion: "Fragile ego defense",
        imagePrompt: `Minimalist existential illustration, black background, white sketch drawing. A travelers silhouette walking across a flat dark desert on high stilts made of glass hourglasses with pouring sand. Starry night sky. Deep shadows, hand-drawn, 16:9 ratio.`,
        musicCategory: "cinematic drones"
      },
      {
        number: 5,
        duration: "4:45 - 6:30",
        section: "PHILOSOPHICAL LAYER",
        voiceoverText: philosophicalText,
        visualDescription: `A wanderer stands beside a deep, mirror-calm dark body of water. Risu-glorious from the lake is a radiant specter version of themselves made of stellar dust, extending a hand of code stars. The wanderer stares down at their real, mud-spotted hands.`,
        cameraMovement: "A slow horizontal tracking pan across the water surface, showing the contrast between ideal specter and physical mud.",
        transitionType: "Slow dissolve",
        emotion: "Existential weight and awe",
        imagePrompt: `Minimalist existential illustration, black background, white sketch drawing. A wanderer standing on a rocky lake shore, staring at a massive glowing stardust double of themselves rising from the water. Highly symbolic, raw artistic look, 16:9.`,
        musicCategory: "emotional strings"
      },
      {
        number: 6,
        duration: "6:30 - 8:00",
        section: "ENDING",
        voiceoverText: endingText,
        visualDescription: `The figure steps decisively off a high, ornate concrete plinth down onto the plain, wet, rich dark soil below. As their foot touches the ground, tiny organic roots sprout from their heel, radiating a gentle warm light under a sky of stars.`,
        cameraMovement: "Slow zoom-in on the footprints, gradually tilting upwards into a sweeping stargazing celestial view.",
        transitionType: "Slow fade to black",
        emotion: "acceptance, quiet courage, home",
        imagePrompt: `Minimalist existential illustration, black background, white sketch drawing. A single figure stepping off a high concrete pedestal onto wet soil, small glowing organic roots spreading from the heel. Starry dark celestial sky. Acceptance, 16:9 ratio.`,
        musicCategory: primaryMusic as any
      }
    ],
    chapters: [
      { timestamp: "0:00", title: "The Grief of Unlived Lives" },
      { timestamp: "0:30", title: "The Protection of Procrastination" },
      { timestamp: "1:45", title: "The Hyper-Analytical Shield" },
      { timestamp: "3:15", title: "Saving our Fragile Ego" },
      { timestamp: "4:45", title: "Existential Freedom & Imperfect Starts" },
      { timestamp: "6:30", title: "The Freedom of Being Average" }
    ],
    tags: [cleanTopic.toLowerCase(), `${cleanTopic.toLowerCase()} psychology`, "existentialism", "overthinking", "mindfulness study"],
    keywords: [`overcoming ${cleanTopic.toLowerCase()}`, "philosophy video script", "youtube script ideas", "intellectual anxiety help"],
    pinnedComment: `For anyone experiencing the paralyzing weight of ${cleanTopic} right now: What is a single, ridiculously tiny, imperfect action you can commit to taking today? Let's make a pact in the comments to give our 'perfect self' a rest, and let ourselves stumble our way forward together.`
  };
}
