const GEMINI_VOICE_DETAILS: Record<string, { gender: string; description: string }> = {
  Zephyr: { gender: 'female', description: 'Bright, Higher pitch' },
  Puck: { gender: 'male', description: 'Upbeat, Middle pitch' },
  Charon: { gender: 'male', description: 'Informative, Lower pitch' },
  Kore: { gender: 'female', description: 'Firm, Middle pitch' },
  Fenrir: { gender: 'male', description: 'Excitable, Lower middle pitch' },
  Leda: { gender: 'female', description: 'Youthful, Higher pitch' },
  Orus: { gender: 'male', description: 'Firm, Lower middle pitch' },
  Aoede: { gender: 'female', description: 'Breezy, Middle pitch' },
  Callirrhoe: { gender: 'female', description: 'Easy-going, Middle pitch' },
  Autonoe: { gender: 'female', description: 'Bright, Middle pitch' },
  Enceladus: { gender: 'male', description: 'Breathy, Lower pitch' },
  Iapetus: { gender: 'male', description: 'Clear, Lower middle pitch' },
  Umbriel: { gender: 'male', description: 'Easy-going, Lower middle pitch' },
  Algieba: { gender: 'male', description: 'Smooth, Lower pitch' },
  Despina: { gender: 'female', description: 'Smooth, Middle pitch' },
  Erinome: { gender: 'female', description: 'Clear, Middle pitch' },
  Algenib: { gender: 'male', description: 'Gravelly, Lower pitch' },
  Rasalgethi: { gender: 'male', description: 'Informative, Middle pitch' },
  Laomedeia: { gender: 'female', description: 'Upbeat, Higher pitch' },
  Achernar: { gender: 'female', description: 'Soft, Higher pitch' },
  Alnilam: { gender: 'male', description: 'Firm, Lower middle pitch' },
  Schedar: { gender: 'male', description: 'Even, Lower middle pitch' },
  Gacrux: { gender: 'female', description: 'Mature, Middle pitch' },
  Pulcherrima: { gender: 'female', description: 'Forward, Middle pitch' },
  Achird: { gender: 'male', description: 'Friendly, Lower middle pitch' },
  Zubenelgenubi: { gender: 'male', description: 'Casual, Lower middle pitch' },
  Vindemiatrix: { gender: 'female', description: 'Gentle, Middle pitch' },
  Sadachbia: { gender: 'male', description: 'Lively, Lower pitch' },
  Sadaltager: { gender: 'male', description: 'Knowledgeable, Middle pitch' },
  Sulafat: { gender: 'female', description: 'Warm, Middle pitch' }
};

export const GEMINI_TTS_VOICES = Object.keys(GEMINI_VOICE_DETAILS);
export const GEMINI_VOICE_METADATA_DESC =
  '\n\nDetailed Voice Options:\n' +
  GEMINI_TTS_VOICES.map((name) => `- ${name} (${GEMINI_VOICE_DETAILS[name].gender}): ${GEMINI_VOICE_DETAILS[name].description}`).join('\n');
