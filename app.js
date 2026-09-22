/* ==========================================================
   AI Resume Ranking System – Frontend Prototype

   Supports:
   - TXT resumes
   - PDF resumes
   - DOCX resumes
   - Keyword-based ranking
   - Shortlisting
   - Removing candidates
   - CSV export

   Later:
   - Connect backend/NLP model by setting USE_API = true
   ========================================================== */

const USE_API = false;
const API_URL = '/api/rank';

/* ---------- PDF.js setup ---------- */

if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

/* ---------- Sample data ---------- */

const SAMPLE_JD = `Machine Learning Engineer

We are looking for an ML engineer with 3+ years of experience.
Required skills: Python, machine learning, NLP, PyTorch, SQL, Docker, Git.
Nice to have: AWS, communication.
Education: Bachelor's degree in Computer Science or related field.`;

const SAMPLE_CANDIDATES = [
  {
    id: 's1',
    name: 'Ananya Raghavan',
    role: 'ML Engineer',
    years: 4,
    edu: 'M.Tech',
    skills: ['python','machine learning','nlp','pytorch','sql','docker','git','aws']
  },
  {
    id: 's2',
    name: 'Karthik Subramanian',
    role: 'Data Scientist',
    years: 3,
    edu: 'B.Tech',
    skills: ['python','machine learning','sql','tensorflow','data analysis','git']
  },
  {
    id: 's3',
    name: 'Meera Nair',
    role: 'Backend Developer',
    years: 5,
    edu: 'B.Tech',
    skills: ['java','sql','docker','aws','git','django']
  },
  {
    id: 's4',
    name: 'Rahul Verma',
    role: 'NLP Research Intern',
    years: 1,
    edu: 'B.Tech',
    skills: ['python','nlp','pytorch','git']
  },
  {
    id: 's5',
    name: 'Divya Krishnan',
    role: 'Full Stack Developer',
    years: 2,
    edu: 'B.Tech',
    skills: ['javascript','react','node.js','sql','html','css','git']
  },
  {
    id: 's6',
    name: 'Arjun Patel',
    role: 'AI Engineer',
    years: 6,
    edu: 'PhD',
    skills: ['python','machine learning','nlp','pytorch','tensorflow','docker','aws','git','communication']
  }
];

/* ---------- Skills ---------- */

const SKILLS = [
  'python',
  'java',
  'javascript',
  'react',
  'node.js',
  'sql',
  'machine learning',
  'nlp',
  'tensorflow',
  'pytorch',
  'docker',
  'aws',
  'git',
  'django',
  'flask',
  'html',
  'css',
  'data analysis',
  'communication',
  'leadership'
];

const EDU_LEVEL = {
  'b.tech': 1,
  'bachelor': 1,
  'm.tech': 2,
  'master': 2,
  'ms': 2,
  'phd': 3
};

/* ---------- State ---------- */

let uploaded = [];
let ranked = [];

const shortlist = new Set();

/* ---------- Helper functions ---------- */

const $ = (id) => document.getElementById(id);

const esc = (s) =>
  String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));

const has = (text, term) =>
  new RegExp(
    '(^|[^a-z0-9])' +
    term.replace(/[.+*?^${}()|[\]\\]/g, '\\$&') +
    '($|[^a-z0-9])',
    'i'
  ).test(text);

const extractSkills = (text) =>
  SKILLS.filter(skill => has(text, skill));

const extractYears = (text) => {
  const match = text.match(/(\d+)\+?\s*years?/i);
  return match ? Number(match[1]) : 0;
};

const extractEduLevel = (text) => {
  let level = 0;

  for (const key in EDU_LEVEL) {
    if (has(text, key)) {
      level = Math.max(level, EDU_LEVEL[key]);
    }
  }

  return level;
};

/* ---------- Resume text extraction ---------- */

async function extractTextFromTXT(file) {
  return await file.text();
}

async function extractTextFromPDF(file) {

  if (typeof pdfjsLib === 'undefined') {
    throw new Error('PDF.js could not be loaded.');
  }

  const arrayBuffer = await file.arrayBuffer();

  const pdf = await pdfjsLib
    .getDocument({ data: arrayBuffer })
    .promise;

  let fullText = '';

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {

    const page = await pdf.getPage(pageNumber);

    const content = await page.getTextContent();

    const pageText = content.items
      .map(item => item.str || '')
      .join(' ');

    fullText += pageText + '\n';
  }

  return fullText;
}

async function extractTextFromDOCX(file) {

  if (typeof mammoth === 'undefined') {
    throw new Error('Mammoth.js could not be loaded.');
  }

  const arrayBuffer = await file.arrayBuffer();

  const result = await mammoth.extractRawText({
    arrayBuffer: arrayBuffer
  });

  return result.value;
}

async function extractResumeText(file) {

  const extension = file.name
    .split('.')
    .pop()
    .toLowerCase();

  if (extension === 'txt') {
    return await extractTextFromTXT(file);
  }

  if (extension === 'pdf') {
    return await extractTextFromPDF(file);
  }

  if (extension === 'docx') {
    return await extractTextFromDOCX(file);
  }

  throw new Error('Unsupported file type. Please use TXT, PDF or DOCX.');
}

/* ---------- Ranking ---------- */

function mockRank(jd, candidates) {

  const need = extractSkills(jd);

  const needYears = extractYears(jd);

  const needEdu = extractEduLevel(jd);

  return candidates.map(candidate => {

    if (candidate.pending) {
      return {
        id: candidate.id,
        pending: true
      };
    }

    const matched = need.filter(skill =>
      candidate.skills.includes(skill)
    );

    const missing = need.filter(skill =>
      !candidate.skills.includes(skill)
    );

    const skills = need.length
      ? matched.length / need.length
      : 1;

    const experience = needYears
      ? Math.min(candidate.years / needYears, 1)
      : 1;

    const education = needEdu
      ? Math.min(
          (EDU_LEVEL[candidate.edu.toLowerCase()] || 0) / needEdu,
          1
        )
      : 1;

    const score = Math.round(
      100 * (
        0.60 * skills +
        0.25 * experience +
        0.15 * education
      )
    );

    return {
      id: candidate.id,
      score: score,
      matched: matched,
      missing: missing,

      breakdown: {
        skills: Math.round(skills * 100),
        experience: Math.round(experience * 100),
        education: Math.round(education * 100)
      }
    };
  });
}

/* ---------- Backend/API ranking ---------- */

async function rankCandidates(jd, candidates) {

  if (USE_API) {

    const response = await fetch(API_URL, {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json'
      },

      body: JSON.stringify({
        jobDescription: jd,

        candidates: candidates.map(candidate => ({
          id: candidate.id,
          name: candidate.name,
          text: candidate.text || ''
        }))
      })
    });

    if (!response.ok) {
      throw new Error(
        'Ranking service returned ' + response.status
      );
    }

    return await response.json();
  }

  return mockRank(jd, candidates);
}

/* ---------- Navigation ---------- */

document.querySelectorAll('.nav-btn').forEach(button => {

  button.addEventListener('click', () => {

    document
      .querySelectorAll('.nav-btn')
      .forEach(btn => {
        btn.classList.toggle('active', btn === button);
      });

    document
      .querySelectorAll('.view')
      .forEach(view => {
        view.classList.toggle(
          'active',
          view.id === 'view-' + button.dataset.view
        );
      });
  });
});

/* ---------- Uploaded file list ---------- */

function renderFiles() {

  $('file-list').innerHTML = uploaded.map(candidate => {

    let status = 'Read';

    if (candidate.pending) {
      status = 'Processing...';
    }

    return `
      <li>
        <span>${esc(candidate.name)}</span>
        <span class="tag ${candidate.pending ? '' : 'ok'}">
          ${status}
        </span>
      </li>
    `;

  }).join('');

  $('pool-count').textContent =
    `${SAMPLE_CANDIDATES.length} sample candidates + ${uploaded.length} uploaded`;
}

/* ---------- Upload resumes ---------- */

$('files').addEventListener('change', async (event) => {

  const files = Array.from(event.target.files);

  for (const file of files) {

    const id =
      'u' +
      Date.now() +
      Math.random().toString(36).slice(2, 7);

    const name =
      file.name.replace(/\.[^.]+$/, '');

    const candidate = {
      id: id,
      name: name,
      role: 'Uploaded resume',
      text: '',
      years: 0,
      edu: 'none',
      skills: [],
      pending: true
    };

    uploaded.push(candidate);

    renderFiles();

    try {

      const text = await extractResumeText(file);

      if (!text.trim()) {
        throw new Error(
          'No readable text was found in this resume.'
        );
      }

      candidate.text = text;

      candidate.skills = extractSkills(text);

      candidate.years = extractYears(text);

      const educationKey =
        Object.keys(EDU_LEVEL).find(key =>
          has(text, key)
        );

      candidate.edu =
        educationKey || 'none';

      candidate.pending = false;

      renderFiles();

    } catch (error) {

      uploaded = uploaded.filter(
        item => item.id !== id
      );

      renderFiles();

      alert(
        `Could not read "${file.name}".\n\n${error.message}`
      );
    }
  }

  event.target.value = '';
});

/* ---------- Results ---------- */

function renderResults() {

  const minimumScore =
    Number($('min').value);

  const rows = ranked.filter(candidate =>
    candidate.pending ||
    candidate.score >= minimumScore
  );

  $('btn-export').disabled =
    !ranked.length;

  if (!ranked.length) {
    return;
  }

  if (!rows.length) {

    $('results').innerHTML =
      '<p class="empty">No candidates meet the minimum score. Lower the filter.</p>';

    return;
  }

  let rank = 0;

  $('results').innerHTML = `
    <div class="table-wrap">

      <table>

        <thead>
          <tr>
            <th>#</th>
            <th>Candidate</th>
            <th>Match score</th>
            <th>Skills</th>
            <th>Shortlist</th>
          </tr>
        </thead>

        <tbody>

          ${rows.map(candidate => {

            if (candidate.pending) {

              return `
                <tr>
                  <td>–</td>

                  <td>
                    ${esc(candidate.name)}
                    <br>
                    <small class="hint">
                      ${esc(candidate.role)}
                    </small>
                  </td>

                  <td colspan="3">
                    <span class="tag">
                      Processing resume...
                    </span>
                  </td>
                </tr>
              `;
            }

            rank++;

            return `
              <tr
                class="clickable"
                data-id="${candidate.id}"
              >

                <td>${rank}</td>

                <td>
                  <b>${esc(candidate.name)}</b>
                  <br>

                  <small class="hint">
                    ${esc(candidate.role)}
                    · ${candidate.years} yrs
                  </small>
                </td>

                <td>

                  <div class="score">

                    <b>${candidate.score}</b>

                    <div class="meter">
                      <i style="width:${candidate.score}%"></i>
                    </div>

                  </div>

                </td>

                <td>

                  ${candidate.matched
                    .slice(0, 4)
                    .map(skill =>
                      `<span class="chip">${esc(skill)}</span>`
                    )
                    .join('')}

                  ${candidate.missing.length
                    ? `<span class="chip miss">
                         ${candidate.missing.length} missing
                       </span>`
                    : ''
                  }

                </td>

                <td>

                  <button
                    class="star ${shortlist.has(candidate.id) ? 'on' : ''}"
                    data-star="${candidate.id}"
                    aria-label="Toggle shortlist for ${esc(candidate.name)}"
                    aria-pressed="${shortlist.has(candidate.id)}"
                  >
                    ★
                  </button>

                  <button
                    class="remove-btn"
                    data-remove="${candidate.id}"
                    aria-label="Remove ${esc(candidate.name)}"
                  >
                    ❌
                  </button>

                </td>

              </tr>
            `;

          }).join('')}

        </tbody>

      </table>

    </div>
  `;
}

/* ---------- Result buttons ---------- */

$('results').addEventListener('click', event => {

  /* Shortlist */

  const star =
    event.target.closest('[data-star]');

  if (star) {

    const id = star.dataset.star;

    if (shortlist.has(id)) {
      shortlist.delete(id);
    } else {
      shortlist.add(id);
    }

    renderResults();

    return;
  }

  /* Remove candidate */

  const removeButton =
    event.target.closest('[data-remove]');

  if (removeButton) {

    const id =
      removeButton.dataset.remove;

    const candidate =
      ranked.find(item => item.id === id);

    if (!candidate) {
      return;
    }

    const confirmDelete = confirm(
      `Remove ${candidate.name} from the candidate list?`
    );

    if (!confirmDelete) {
      return;
    }

    ranked = ranked.filter(
      item => item.id !== id
    );

    uploaded = uploaded.filter(
      item => item.id !== id
    );

    shortlist.delete(id);

    renderResults();
    renderFiles();

    return;
  }

  /* Open candidate drawer */

  const row =
    event.target.closest('tr[data-id]');

  if (row) {
    openDrawer(row.dataset.id);
  }
});

/* ---------- Drawer ---------- */

function bar(label, value) {

  return `
    <div class="bd">

      <div class="bd-head">
        <span>${label}</span>
        <b>${value}%</b>
      </div>

      <div class="meter">
        <i style="width:${value}%"></i>
      </div>

    </div>
  `;
}

function openDrawer(id) {

  const candidate =
    ranked.find(item => item.id === id);

  if (!candidate || candidate.pending) {
    return;
  }

  $('d-name').textContent =
    candidate.name;

  $('d-sub').textContent =
    `${candidate.role} · overall score ${candidate.score}/100`;

  $('d-body').innerHTML =

    bar(
      'Skills match',
      candidate.breakdown.skills
    )

    +

    bar(
      'Experience',
      candidate.breakdown.experience
    )

    +

    bar(
      'Education',
      candidate.breakdown.education
    )

    +

    `<h2>Matched skills</h2>

     ${
       candidate.matched
         .map(skill =>
           `<span class="chip">${esc(skill)}</span>`
         )
         .join('')

       || '<p class="hint">None</p>'
     }`

    +

    `<h2>Missing skills</h2>

     ${
       candidate.missing
         .map(skill =>
           `<span class="chip miss">${esc(skill)}</span>`
         )
         .join('')

       || '<p class="hint">None</p>'
     }`

    +

    (
      candidate.explanation

        ?

      `<h2>Why this score</h2>
       <p>${esc(candidate.explanation)}</p>`

        :

      `<div class="note">
        AI explanation for this score will appear here
        once the NLP model is connected.
       </div>`
    );

  $('drawer').hidden = false;

  $('d-close').focus();
}

$('d-close').addEventListener(
  'click',
  () => {
    $('drawer').hidden = true;
  }
);

$('drawer').addEventListener('click', event => {

  if (event.target === $('drawer')) {
    $('drawer').hidden = true;
  }

});

document.addEventListener('keydown', event => {

  if (event.key === 'Escape') {
    $('drawer').hidden = true;
  }

});

/* ---------- Rank button ---------- */

$('btn-rank').addEventListener(
  'click',
  async () => {

    const jd =
      $('jd').value.trim();

    if (!jd) {

      $('results').innerHTML =
        '<p class="empty">Enter a job description first.</p>';

      return;
    }

    const pool = [
      ...SAMPLE_CANDIDATES,
      ...uploaded
    ];

    $('results').innerHTML =
      '<p class="empty">Ranking candidates...</p>';

    try {

      const output =
        await rankCandidates(jd, pool);

      ranked =
        output

          .map(result => ({
            ...pool.find(
              candidate =>
                candidate.id === result.id
            ),
            ...result
          }))

          .sort(
            (a, b) =>
              (b.score ?? -1) -
              (a.score ?? -1)
          );

      renderResults();

    } catch (error) {

      $('results').innerHTML = `
        <p class="empty">
          Could not rank candidates:
          ${esc(error.message)}
        </p>
      `;
    }
  }
);

/* ---------- Minimum score ---------- */

$('min').addEventListener(
  'input',
  () => {

    $('min-out').textContent =
      $('min').value;

    renderResults();
  }
);

/* ---------- Sample job description ---------- */

$('btn-sample').addEventListener(
  'click',
  () => {
    $('jd').value = SAMPLE_JD;
  }
);

/* ---------- Export CSV ---------- */

$('btn-export').addEventListener(
  'click',
  () => {

    const lines = [
      'rank,name,role,score,shortlisted,matched_skills,missing_skills'
    ];

    ranked
      .filter(candidate => !candidate.pending)
      .forEach((candidate, index) => {

        lines.push(
          [
            index + 1,
            candidate.name,
            candidate.role,
            candidate.score,
            shortlist.has(candidate.id)
              ? 'yes'
              : 'no',
            candidate.matched.join('; '),
            candidate.missing.join('; ')
          ]

          .map(value =>
            `"${String(value).replace(/"/g, '""')}"`
          )

          .join(',')
        );
      });

    const blob =
      new Blob(
        [lines.join('\n')],
        { type: 'text/csv' }
      );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement('a');

    link.href = url;

    link.download =
      'ranked-candidates.csv';

    link.click();

    URL.revokeObjectURL(url);
  }
);

/* ---------- Initial setup ---------- */

$('jd').value = SAMPLE_JD;

renderFiles();
