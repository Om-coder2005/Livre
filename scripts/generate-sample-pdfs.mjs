import fs from 'fs';

// Helper to build a minimal valid PDF with outline and multiple pages
function createMinimalPdf({ title, author, pages, outlines }) {
  const objects = [];
  let objCount = 0;
  const newObj = (content) => {
    objCount++;
    objects.push({ id: objCount, content });
    return objCount;
  };

  // 1: Catalog (will fill later)
  const catalogId = newObj('');
  // 2: Outlines root (will fill later)
  const outlinesId = newObj('');
  // 3: Pages root (will fill later)
  const pagesId = newObj('');
  // 4: Font
  const fontId = newObj(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`);

  const pageIds = [];
  const outlineIds = [];

  // Create outline items
  for (let i = 0; i < outlines.length; i++) {
    const o = outlines[i];
    const oId = newObj('');
    outlineIds.push({ id: oId, title: o.title, pageIndex: o.pageIndex });
  }

  // Populate outline item dictionaries
  for (let i = 0; i < outlineIds.length; i++) {
    const cur = outlineIds[i];
    const prev = i > 0 ? outlineIds[i - 1].id : null;
    const next = i < outlineIds.length - 1 ? outlineIds[i + 1].id : null;
    // Page destination (target page will be pageIds[cur.pageIndex])
    // We'll set this after pages are created
    cur.prev = prev;
    cur.next = next;
  }

  // Create pages
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    const streamContent = `BT
/F1 ${p.fontSize || 14} Tf
50 720 Td
(${p.heading.replace(/[()\\]/g, '\\$&')}) Tj
0 -30 Td
/F1 11 Tf
${p.lines.map((line, idx) => `0 -18 Td (${line.replace(/[()\\]/g, '\\$&')}) Tj`).join('\n')}
ET
${p.graphics || ''}`;
    
    const streamLen = Buffer.byteLength(streamContent, 'utf-8');
    const contentObjId = newObj(`<< /Length ${streamLen} >>\nstream\n${streamContent}\nendstream`);

    const pageObjId = newObj(`<<
  /Type /Page
  /Parent ${pagesId} 0 R
  /MediaBox [0 0 595 842]
  /Contents ${contentObjId} 0 R
  /Resources <<
    /Font << /F1 ${fontId} 0 R >>
  >>
>>`);
    pageIds.push(pageObjId);
  }

  // Now fill outline dictionaries
  for (let i = 0; i < outlineIds.length; i++) {
    const cur = outlineIds[i];
    const targetPageId = pageIds[cur.pageIndex];
    let dict = `<<
  /Title (${cur.title})
  /Parent ${outlinesId} 0 R
  /Dest [${targetPageId} 0 R /XYZ null null null]`;
    if (cur.prev) dict += `\n  /Prev ${cur.prev} 0 R`;
    if (cur.next) dict += `\n  /Next ${cur.next} 0 R`;
    dict += `\n>>`;
    objects[cur.id - 1].content = dict;
  }

  // Fill Outlines root
  objects[outlinesId - 1].content = `<<
  /Type /Outlines
  /First ${outlineIds[0].id} 0 R
  /Last ${outlineIds[outlineIds.length - 1].id} 0 R
  /Count ${outlineIds.length}
>>`;

  // Fill Pages root
  objects[pagesId - 1].content = `<<
  /Type /Pages
  /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}]
  /Count ${pageIds.length}
>>`;

  // Fill Catalog
  objects[catalogId - 1].content = `<<
  /Type /Catalog
  /Pages ${pagesId} 0 R
  /Outlines ${outlinesId} 0 R
>>`;

  // Assemble file
  let pdf = `%PDF-1.4\n%\xE2\xE3\xCF\xD3\n`;
  const offsets = [];

  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf-8'));
    pdf += `${obj.id} 0 obj\n${obj.content}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, 'utf-8');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer\n<<\n  /Size ${objects.length + 1}\n  /Root ${catalogId} 0 R\n>>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf, 'utf-8');
}

// 1. Text-heavy document: "The Secret Garden" with multiple chapters
const textDoc = createMinimalPdf({
  title: 'The Secret Garden',
  author: 'Frances Hodgson Burnett',
  outlines: [
    { title: 'Chapter I: There Is No One Left', pageIndex: 0 },
    { title: 'Chapter II: Mistress Mary Quite Contrary', pageIndex: 2 },
    { title: 'Chapter III: Across the Moor', pageIndex: 4 },
    { title: 'Chapter IV: Martha', pageIndex: 6 },
  ],
  pages: [
    {
      heading: 'CHAPTER I — THERE IS NO ONE LEFT',
      lines: [
        'When Mary Lennox was sent to Manor to live with her uncle,',
        'everybody said she was the most disagreeable-looking child ever seen.',
        'It was true, too. She had a little thin face and a little thin body,',
        'rare thin hair and a sour expression. Her hair was yellow, and her',
        'face was yellow because she had been born in India and had always',
        'been ill in one way or another.',
        '',
        'Her father had held a position under the English Government and had',
        'always been busy and ill himself, and her mother had been a great beauty',
        'who cared only to go to parties and amuse herself with gay people.',
        'She had not wanted a little girl at all, and when Mary was born she handed',
        'her over to the care of an Ayah.',
      ]
    },
    {
      heading: 'CHAPTER I (CONTINUED)',
      lines: [
        'So when she was six months old, if she cried, the Ayah came running to',
        'soothe her. By the time she was six years old she was as tyrannical and',
        'selfish a little pig as ever lived. The young English governess who came',
        'to teach her to read and write disliked her so much that she gave up her',
        'place in three months, and after other governesses had come and gone in',
        'the same way, Mary knew nothing at all about books.',
        '',
        'One morning, when she was about nine years of age, she awakened in a very',
        'bad temper. She was still more displeased when she saw that the servant',
        'who stood by her bedside was not her Ayah.',
        '"Why did you come?" she said to the strange woman. "I will not let you stay."',
      ]
    },
    {
      heading: 'CHAPTER II — MISTRESS MARY QUITE CONTRARY',
      lines: [
        'Mary had liked to look at her mother from a distance, and she had',
        'thought her very pretty, but she knew very little of her, so she could',
        'scarcely be expected to love her or to miss her very much when she was',
        'gone. She did not miss her at all, in fact, and as she was a self-absorbed',
        'child she gave her entire thought to herself, as she had always done.',
        '',
        'If she had been older she would no doubt have been very anxious at being',
        'left alone in the world, but she was very young, and as she had always',
        'been taken care of, she supposed she always would be.',
      ]
    },
    {
      heading: 'CHAPTER II (CONTINUED)',
      lines: [
        'What she thought was that she would like to know if she was going to nice',
        'people, who would be polite to her and give her her own way as her Ayah',
        'and the other native servants had done. She knew that she was not going',
        'to stay at the English clergyman\'s house where she was taken at first.',
        'She did not want to stay there. The English clergyman was poor and had',
        'five children even dirtier than Mary had imagined possible.',
      ]
    },
    {
      heading: 'CHAPTER III — ACROSS THE MOOR',
      lines: [
        'She had had a long journey by train and had traveled through the green',
        'Midlands and had reached the Yorkshire moors. Mrs. Medlock, the housekeeper,',
        'was sitting opposite her, a comfortable woman with very red cheeks and',
        'sharp black eyes. She wore a purple silk dress and a black mantle with',
        'jet beads on it and a black bonnet with purple velvet flowers.',
        '',
        '"Well, what do you think of that?" she said, nodding out of the window.',
        '"It isn\'t the sea, is it?" said Mary looking at the vast black space.',
      ]
    },
    {
      heading: 'CHAPTER III (CONTINUED)',
      lines: [
        '"No, indeed it isn\'t," answered Mrs. Medlock. "Nor it isn\'t fields nor',
        'mountains, it\'s just miles and miles of wild land that nothing grows on',
        'but heather and gorse and broom, and nothing lives on but wild ponies',
        'and sheep." "I think it is a wild place," said Mary with a shiver.',
        '"Just you wait until you see the house," said Mrs. Medlock.',
      ]
    },
    {
      heading: 'CHAPTER IV — MARTHA',
      lines: [
        'When she opened her eyes in the morning it was because a young housemaid',
        'had come into her room to make the fire and was kneeling on the hearth-rug',
        'raking out the cinders. Mary sat up in bed and watched her for a moment.',
        '"What is that?" she said, pointing to the window.',
        '"That\'s the moor," with a good-natured grin. "Does tha\' like it?"',
        '"No," answered Mary. "I hate it."',
      ]
    },
    {
      heading: 'CHAPTER IV (CONTINUED)',
      lines: [
        '"That\'s because tha\'rt not used to it," Martha said, cheerfully.',
        '"Tha\' thinks it\'s too big an\' bare now. But tha\' will like it.',
        'When the heather is in flower it\'s just all purple, and there\'s',
        'butterflies and bees and birds singing everywhere."',
      ]
    }
  ]
});

// 2. Illustrated & Diagram Document: "Botanical Field Guide"
const illustratedDoc = createMinimalPdf({
  title: 'Botanical Field Studies',
  author: 'Dr. Eleanor Vance',
  outlines: [
    { title: 'Section I: Leaf Morphology', pageIndex: 0 },
    { title: 'Section II: Floral Diagrams', pageIndex: 1 },
    { title: 'Section III: Field Specimens', pageIndex: 2 },
    { title: 'Section IV: Cellular Structures', pageIndex: 3 },
  ],
  pages: [
    {
      heading: 'SECTION I — LEAF MORPHOLOGY & VENATION',
      lines: [
        'Plate 1. Comparative analysis of dicotyledonous leaf structures.',
        'Primary venation demonstrates characteristic reticulate patterns.',
        'Microscopic examinations reveal dense stomatal distributions.',
        '',
        'The diagram below illustrates lateral vein angle deviations:',
      ],
      graphics: `
0.2 0.45 0.3 rg
100 250 395 180 re f
0.95 0.92 0.85 rg
110 260 375 160 re f
0.15 0.35 0.2 RG
2 w
150 340 m 450 340 l S
200 340 m 250 400 l S
250 340 m 300 400 l S
300 340 m 350 400 l S
200 340 m 250 280 l S
250 340 m 300 280 l S
300 340 m 350 280 l S
`
    },
    {
      heading: 'SECTION II — FLORAL ARCHITECTURE & SYMMETRY',
      lines: [
        'Plate 2. Actinomorphic vs. Zygomorphic floral ground plans.',
        'Outer perianth whorls consist of pentamerous sepals and petals.',
        'Central gynoecium exhibits syncarpous multi-locular carpels.',
      ],
      graphics: `
0.72 0.40 0.28 rg
120 220 355 240 re f
1 0.98 0.94 rg
130 230 335 220 re f
0.72 0.40 0.28 RG
2 w
300 340 80 0 360 arc S
300 340 40 0 360 arc S
0.45 0.48 0.36 RG
300 240 m 300 440 l S
200 340 m 400 340 l S
`
    },
    {
      heading: 'SECTION III — HERBARIUM FIELD SPECIMENS',
      lines: [
        'Plate 3. Pressed specimen catalogued in the Blackwood Reserve.',
        'Collected at 1,420m elevation along north-facing limestone ridge.',
        'Preservation completed using acid-free mounting paper and gummed linen.',
      ],
      graphics: `
0.45 0.48 0.36 rg
80 180 435 280 re f
0.98 0.96 0.91 rg
90 190 415 260 re f
0.3 0.22 0.16 RG
1.5 w
140 230 m 460 230 l 460 410 l 140 410 l s
`
    },
    {
      heading: 'SECTION IV — EPIDERMAL CELLULAR ARCHITECTURE',
      lines: [
        'Plate 4. Cross-sectional micro-tomography of guard cell pairs.',
        'Turgor-mediated osmotic gradients control stomatal aperture width.',
        'Sub-stomatal cavities provide direct gas exchange with mesophyll.',
      ],
      graphics: `
0.2 0.3 0.25 rg
100 200 395 240 re f
0.96 0.94 0.88 rg
110 210 375 220 re f
0.2 0.3 0.25 RG
1 w
130 240 30 0 360 arc S
180 240 30 0 360 arc S
230 240 30 0 360 arc S
280 240 30 0 360 arc S
330 240 30 0 360 arc S
380 240 30 0 360 arc S
430 240 30 0 360 arc S
`
    }
  ]
});

fs.mkdirSync('d:/Reader Experience/public/sample-docs', { recursive: true });
fs.writeFileSync('d:/Reader Experience/public/sample-docs/the-secret-garden.pdf', textDoc);
fs.writeFileSync('d:/Reader Experience/public/sample-docs/botanical-field-studies.pdf', illustratedDoc);

console.log('Sample PDFs generated successfully!');
