import fs from 'fs';
import path from 'path';

function cleanTsToJs(tsContent) {
  // Remove multi-line and single-line import statements
  let js = tsContent.replace(/import\s*[\s\S]*?from\s*['"][^'"]+['"];?/gm, '');
  // Remove type definitions
  js = js.replace(/export\s+type\s+[\s\S]*?};\s*/gm, '');
  js = js.replace(/:\s*(?:Theme\[\]|Theme|Record<[\s\S]*?>|WhatDoYouKnowTheme\[\]|WhoAmITheme\[\]|ImpostorScenario\[\])/g, '');
  // Replace icon identifiers with string equivalents
  const iconNames = ['Unlock', 'Star', 'Zap', 'Coffee', 'Film', 'Lightbulb', 'Brain', 'Heart', 'Briefcase', 'Flame', 'Crown', 'Gamepad2', 'Stars', 'Tv', 'Trophy', 'Scroll', 'Music'];
  for (const icon of iconNames) {
    const reg = new RegExp(`\\bicon:\\s*${icon}\\b`, 'g');
    js = js.replace(reg, `icon: '${icon}'`);
  }
  return js;
}

function run() {
  const rootDir = process.cwd();

  // 1. ITO
  const itoRaw = fs.readFileSync(path.join(rootDir, 'src/ito/data.ts'), 'utf-8');
  const itoJs = cleanTsToJs(itoRaw);
  const itoExports = {};
  const itoFn = new Function('exports', itoJs.replace(/export\s+const\s+/g, 'exports.') + '; return exports;');
  const itoData = itoFn(itoExports);

  // 2. IMPOSTOR
  const impRaw = fs.readFileSync(path.join(rootDir, 'src/impostor/data.ts'), 'utf-8');
  const impJs = cleanTsToJs(impRaw);
  const impExports = {};
  const impFn = new Function('exports', impJs.replace(/export\s+const\s+/g, 'exports.') + '; return exports;');
  const impData = impFn(impExports);

  // 3. WHAT DO YOU KNOW
  const whatRaw = fs.readFileSync(path.join(rootDir, 'src/whatdoyouknow/data.ts'), 'utf-8');
  const whatJs = cleanTsToJs(whatRaw);
  const whatExports = {};
  const whatFn = new Function('exports', whatJs.replace(/export\s+const\s+/g, 'exports.') + '; return exports;');
  const whatData = whatFn(whatExports);

  // 4. WHO AM I
  const whoRaw = fs.readFileSync(path.join(rootDir, 'src/whoami/data.ts'), 'utf-8');
  const whoJs = cleanTsToJs(whoRaw);
  const whoExports = {};
  const whoFn = new Function('exports', whoJs.replace(/export\s+const\s+/g, 'exports.') + '; return exports;');
  const whoData = whoFn(whoExports);

  const payload = {
    games: [
      {
        id: 'classic',
        name: 'ITO Clássico',
        description: 'Ordene suas cartas cooperativamente através de pistas subjetivas.',
        icon: 'Sparkles',
        themes: itoData.THEMES,
        questionsByTheme: itoData.QUESTIONS_DB
      },
      {
        id: 'impostor',
        name: 'Impostor',
        description: 'Dedução social e blefe. Encontre quem recebeu a pergunta secreta diferente.',
        icon: 'Ghost',
        themes: impData.THEMES,
        scenariosByTheme: impData.IMPOSTOR_SCENARIOS
      },
      {
        id: 'whatdoyouknow',
        name: 'O Que Você Sabe?',
        description: 'Descubra afinidades, opiniões e segredos entre amigos.',
        icon: 'MessagesSquare',
        themes: whatData.WHATDOYOUKNOW_THEMES.map(t => {
          const { questions, ...rest } = t;
          return rest;
        }),
        questionsByTheme: whatData.WHATDOYOUKNOW_THEMES.reduce((acc, t) => {
          acc[t.id] = t.questions;
          return acc;
        }, {})
      },
      {
        id: 'whoami',
        name: 'Quem Sou Eu?',
        description: 'Adivinhe qual personagem ou personalidade você é através de pistas.',
        icon: 'HelpCircle',
        themes: whoData.WHOAMI_THEMES.map(t => {
          const { personalities, ...rest } = t;
          return rest;
        }),
        personalitiesByTheme: whoData.WHOAMI_THEMES.reduce((acc, t) => {
          acc[t.id] = t.personalities;
          return acc;
        }, {})
      },
      {
        id: 'translator',
        name: 'Telefone Sem Fio',
        description: 'Cadeia de traduções globais hilárias geradas em múltiplos idiomas.',
        icon: 'Languages',
        themes: [],
        questionsByTheme: {}
      }
    ]
  };

  const outputPath = path.join(rootDir, 'backend/scripts/seed_data.json');
  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2), 'utf-8');

  console.log("Successfully extracted seed_data.json!");
  console.log("Summary of extracted games:", payload.games.map(g => ({
    id: g.id,
    themesCount: g.themes.length,
    questionsOrItems: g.questionsByTheme ? Object.keys(g.questionsByTheme).length : (g.scenariosByTheme ? Object.keys(g.scenariosByTheme).length : Object.keys(g.personalitiesByTheme || {}).length)
  })));
}

run();
