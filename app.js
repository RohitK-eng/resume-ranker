```javascript
const USE_API = false;
const API_URL = '/api/rank';


/* =====================================================
   SAMPLE DATA
===================================================== */

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
        skills: [
            'python',
            'machine learning',
            'nlp',
            'pytorch',
            'sql',
            'docker',
            'git',
            'aws'
        ]
    },

    {
        id: 's2',
        name: 'Karthik Subramanian',
        role: 'Data Scientist',
        years: 3,
        edu: 'B.Tech',
        skills: [
            'python',
            'machine learning',
            'sql',
            'tensorflow',
            'data analysis',
            'git'
        ]
    },

    {
        id: 's3',
        name: 'Meera Nair',
        role: 'Backend Developer',
        years: 5,
        edu: 'B.Tech',
        skills: [
            'java',
            'sql',
            'docker',
            'aws',
            'git',
            'django'
        ]
    },

    {
        id: 's4',
        name: 'Rahul Verma',
        role: 'NLP Research Intern',
        years: 1,
        edu: 'B.Tech',
        skills: [
            'python',
            'nlp',
            'pytorch',
            'git'
        ]
    },

    {
        id: 's5',
        name: 'Divya Krishnan',
        role: 'Full Stack Developer',
        years: 2,
        edu: 'B.Tech',
        skills: [
            'javascript',
            'react',
            'node.js',
            'sql',
            'html',
            'css',
            'git'
        ]
    },

    {
        id: 's6',
        name: 'Arjun Patel',
        role: 'AI Engineer',
        years: 6,
        edu: 'PhD',
        skills: [
            'python',
            'machine learning',
            'nlp',
            'pytorch',
            'tensorflow',
            'docker',
            'aws',
            'git',
            'communication'
        ]
    }
];


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
    'bachelors': 1,
    'm.tech': 2,
    'master': 2,
    'masters': 2,
    'ms': 2,
    'phd': 3
};


/* =====================================================
   STATE
===================================================== */

let uploaded = [];
let ranked = [];

const shortlist = new Set();


/* =====================================================
   HELPERS
===================================================== */

const $ = id => document.getElementById(id);


function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[char]);
}


function has(text, term) {
    const escaped = term.replace(
        /[.+*?^${}()|[\]\\]/g,
        '\\$&'
    );

    return new RegExp(
        '(^|[^a-z0-9])' + escaped + '($|[^a-z0-9])',
        'i'
    ).test(text);
}


function extractSkills(text) {
    return SKILLS.filter(skill => has(text, skill));
}


function extractYears(text) {
    const match = text.match(
        /(\d+)\+?\s*(?:years?|yrs?)(?:\s+of\s+experience)?/i
    );

    return match ? Number(match[1]) : 0;
}


function extractEduLevel(text) {
    let level = 0;

    for (const key in EDU_LEVEL) {
        if (has(text, key)) {
            level = Math.max(level, EDU_LEVEL[key]);
        }
    }

    return level;
}


function getEducationLevel(education) {
    const value = String(education || '').toLowerCase();

    if (value === 'phd' || value.includes('doctorate')) {
        return 3;
    }

    if (
        value.includes('m.tech') ||
        value.includes('m.tech.') ||
        value.includes('master') ||
        value === 'ms'
    ) {
        return 2;
    }

    if (
        value.includes('b.tech') ||
        value.includes('bachelor')
    ) {
        return 1;
    }

    return 0;
}


function escapeCSV(value) {
    return '"' + String(value ?? '').replace(/"/g, '""') + '"';
}


function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);

    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
}


function getVisibleRanked() {
    const minimum = Number($('min').value);

    return ranked.filter(candidate =>
        candidate.pending || candidate.score >= minimum
    );
}


function getExportableRanked() {
    return getVisibleRanked().filter(candidate =>
        !candidate.pending
    );
}


function updateExportButtons() {
    const enabled = ranked.some(candidate => !candidate.pending);

    $('btn-export').disabled = !enabled;
    $('btn-export-pdf').disabled = !enabled;
    $('btn-export-docx').disabled = !enabled;
}


/* =====================================================
   SCORING ENGINE
===================================================== */

function mockRank(jd, candidates) {
    const requiredSkills = extractSkills(jd);

    const requiredYears = extractYears(jd);

    const requiredEducation = extractEduLevel(jd);


    return candidates.map(candidate => {

        if (candidate.pending) {
            return {
                id: candidate.id,
                pending: true
            };
        }


        const candidateSkills = candidate.skills || [];

        const matched = requiredSkills.filter(skill =>
            candidateSkills.includes(skill)
        );

        const missing = requiredSkills.filter(skill =>
            !candidateSkills.includes(skill)
        );


        const skillScore = requiredSkills.length
            ? matched.length / requiredSkills.length
            : 1;


        const experienceScore = requiredYears
            ? Math.min(candidate.years / requiredYears, 1)
            : 1;


        const educationLevel = getEducationLevel(candidate.edu);


        const educationScore = requiredEducation
            ? Math.min(educationLevel / requiredEducation, 1)
            : 1;


        const score = Math.round(
            100 * (
                0.60 * skillScore +
                0.25 * experienceScore +
                0.15 * educationScore
            )
        );


        return {
            id: candidate.id,
            score,
            matched,
            missing,

            breakdown: {
                skills: Math.round(skillScore * 100),

                experience: Math.round(
                    experienceScore * 100
                ),

                education: Math.round(
                    educationScore * 100
                )
            }
        };

    });
}


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


        return response.json();
    }


    return mockRank(jd, candidates);
}


/* =====================================================
   NAVIGATION
===================================================== */

document.querySelectorAll('.nav-btn').forEach(button => {

    button.addEventListener('click', () => {

        document.querySelectorAll('.nav-btn').forEach(item => {
            item.classList.toggle('active', item === button);
        });


        document.querySelectorAll('.view').forEach(view => {
            view.classList.toggle(
                'active',
                view.id === 'view-' + button.dataset.view
            );
        });

    });

});


/* =====================================================
   RESUME FILE PROCESSING
===================================================== */

async function readResumeFile(file) {

    const extension = file.name
        .split('.')
        .pop()
        .toLowerCase();


    if (extension === 'txt') {
        return file.text();
    }


    if (extension === 'pdf') {

        if (!window.pdfjsLib) {
            throw new Error('The PDF reader library did not load.');
        }


        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';


        const buffer = await file.arrayBuffer();

        const pdf = await window.pdfjsLib.getDocument({
            data: buffer
        }).promise;


        const pages = [];


        for (let pageNumber = 1;
             pageNumber <= pdf.numPages;
             pageNumber++) {

            const page = await pdf.getPage(pageNumber);

            const content = await page.getTextContent();

            pages.push(
                content.items
                    .map(item => item.str)
                    .join(' ')
            );
        }


        return pages.join('\n');
    }


    if (extension === 'docx') {

        if (!window.mammoth) {
            throw new Error('The DOCX reader library did not load.');
        }


        const buffer = await file.arrayBuffer();

        const result = await window.mammoth.extractRawText({
            arrayBuffer: buffer
        });


        return result.value;
    }


    throw new Error(
        'Unsupported file format. Please upload TXT, PDF, or DOCX.'
    );
}


function guessEducation(text) {

    const lower = text.toLowerCase();


    if (/\b(ph\.?d|doctorate)\b/i.test(lower)) {
        return 'PhD';
    }


    if (/\b(m\.?tech|m\.?sc|master'?s|postgraduate)\b/i.test(lower)) {
        return 'M.Tech';
    }


    if (/\b(b\.?tech|bachelor'?s|undergraduate)\b/i.test(lower)) {
        return 'B.Tech';
    }


    return 'none';
}


function createUploadedCandidate(file, text) {

    return {
        id: 'u' + Date.now() + Math.random().toString(36).slice(2, 8),

        name: file.name.replace(/\.[^.]+$/, ''),

        role: 'Uploaded resume',

        text,

        years: extractYears(text),

        edu: guessEducation(text),

        skills: extractSkills(text)
    };
}


$('files').addEventListener('change', async event => {

    const files = Array.from(event.target.files);

    event.target.value = '';


    if (!files.length) {
        return;
    }


    for (const file of files) {

        const name = file.name.replace(/\.[^.]+$/, '');

        const extension = file.name.split('.').pop().toLowerCase();


        if (!['txt', 'pdf', 'docx'].includes(extension)) {

            alert(
                'Unsupported file: ' + file.name +
                '. Please upload TXT, PDF, or DOCX.'
            );

            continue;
        }


        const loadingCandidate = {
            id: 'u' + Date.now() + Math.random().toString(36).slice(2, 8),

            name,

            role: 'Uploaded resume',

            pending: true,

            skills: [],

            years: 0,

            edu: 'none'
        };


        uploaded.push(loadingCandidate);

        renderFiles();


        try {

            const text = await readResumeFile(file);


            if (!text.trim()) {
                throw new Error(
                    'No readable text was found in this resume.'
                );
            }


            const candidate = createUploadedCandidate(file, text);

            candidate.id = loadingCandidate.id;


            uploaded = uploaded.map(item =>
                item.id === loadingCandidate.id
                    ? candidate
                    : item
            );

        } catch (error) {

            uploaded = uploaded.filter(item =>
                item.id !== loadingCandidate.id
            );


            alert(
                'Could not read ' + file.name + ': ' + error.message
            );

        }


        renderFiles();
    }

});


/* =====================================================
   FILE LIST
===================================================== */

function renderFiles() {

    $('file-list').innerHTML = uploaded.map(candidate => {

        const status = candidate.pending
            ? 'Processing'
            : 'Read';


        const className = candidate.pending ? '' : 'ok';


        return `
            <li>
                <span>${esc(candidate.name)}</span>

                <span class="tag ${className}">
                    ${status}
                </span>
            </li>
        `;

    }).join('');


    $('pool-count').textContent =
        `${SAMPLE_CANDIDATES.length} sample candidates + ` +
        `${uploaded.length} uploaded`;
}


/* =====================================================
   RENDER RESULTS
===================================================== */

function renderResults() {

    const rows = getVisibleRanked();

    updateExportButtons();


    if (!ranked.length) {
        return;
    }


    if (!rows.length) {

        $('results').innerHTML = `
            <p class="empty">
                No candidates meet the minimum score.
                Lower the filter to see more candidates.
            </p>
        `;

        return;
    }


    let displayedRank = 0;


    $('results').innerHTML = `
        <div class="table-wrap">

            <table>

                <thead>
                    <tr>
                        <th>#</th>
                        <th>Candidate</th>
                        <th>Match score</th>
                        <th>Skills</th>
                        <th>Actions</th>
                    </tr>
                </thead>

                <tbody>

                    ${rows.map(candidate => {

                        if (candidate.pending) {

                            return `
                                <tr>
                                    <td>–</td>

                                    <td>
                                        <b>${esc(candidate.name)}</b>

                                        <br>

                                        <small class="hint">
                                            ${esc(candidate.role)}
                                        </small>
                                    </td>

                                    <td colspan="3">
                                        <span class="tag">
                                            Waiting for processing
                                        </span>
                                    </td>
                                </tr>
                            `;
                        }


                        displayedRank++;


                        return `
                            <tr
                                class="clickable"
                                data-id="${esc(candidate.id)}"
                                tabindex="0"
                                aria-label="View ${esc(candidate.name)}"
                            >

                                <td>${displayedRank}</td>


                                <td>
                                    <b>${esc(candidate.name)}</b>

                                    <br>

                                    <small class="hint">
                                        ${esc(candidate.role)}
                                        ·
                                        ${candidate.years} yrs
                                    </small>
                                </td>


                                <td>
                                    <div class="score">

                                        <b>${candidate.score}</b>

                                        <div class="meter">
                                            <i
                                                style="width:${candidate.score}%"
                                            ></i>
                                        </div>

                                    </div>
                                </td>


                                <td>
                                    ${
                                        candidate.matched
                                            .slice(0, 4)
                                            .map(skill =>
                                                `<span class="chip">${esc(skill)}</span>`
                                            )
                                            .join('')
                                    }

                                    ${
                                        candidate.missing.length
                                            ? `<span class="chip miss">${candidate.missing.length} missing</span>`
                                            : ''
                                    }
                                </td>


                                <td class="actions-cell">

                                    <button
                                        class="star ${shortlist.has(candidate.id) ? 'on' : ''}"
                                        data-star="${esc(candidate.id)}"
                                        aria-label="Toggle shortlist for ${esc(candidate.name)}"
                                        aria-pressed="${shortlist.has(candidate.id)}"
                                        type="button"
                                    >★</button>


                                    <button
                                        class="remove-btn"
                                        data-remove="${esc(candidate.id)}"
                                        aria-label="Remove ${esc(candidate.name)}"
                                        type="button"
                                    >✕</button>

                                </td>

                            </tr>
                        `;

                    }).join('')}

                </tbody>

            </table>

        </div>
    `;
}


/* =====================================================
   RESULT INTERACTIONS
===================================================== */

$('results').addEventListener('click', event => {

    const removeButton = event.target.closest('[data-remove]');


    if (removeButton) {

        event.stopPropagation();

        const id = removeButton.dataset.remove;


        uploaded = uploaded.filter(candidate =>
            candidate.id !== id
        );


        ranked = ranked.filter(candidate =>
            candidate.id !== id
        );


        shortlist.delete(id);


        renderFiles();
        renderResults();

        return;
    }


    const starButton = event.target.closest('[data-star]');


    if (starButton) {

        event.stopPropagation();

        const id = starButton.dataset.star;


        if (shortlist.has(id)) {
            shortlist.delete(id);
        } else {
            shortlist.add(id);
        }


        renderResults();

        return;
    }


    const row = event.target.closest('tr[data-id]');


    if (row) {
        openDrawer(row.dataset.id);
    }

});


$('results').addEventListener('keydown', event => {

    if (
        event.target.matches('tr[data-id]') &&
        (event.key === 'Enter' || event.key === ' ')
    ) {

        event.preventDefault();

        openDrawer(event.target.dataset.id);
    }

});


/* =====================================================
   CANDIDATE DETAIL DRAWER
===================================================== */

function bar(label, value) {

    return `
        <div class="bd">

            <div class="bd-head">
                <span>${esc(label)}</span>
                <b>${value}%</b>
            </div>

            <div class="meter">
                <i style="width:${value}%"></i>
            </div>

        </div>
    `;
}


function openDrawer(id) {

    const candidate = ranked.find(item =>
        item.id === id
    );


    if (!candidate || candidate.pending) {
        return;
    }


    $('d-name').textContent = candidate.name;


    $('d-sub').textContent =
        `${candidate.role} · Overall score ${candidate.score}/100`;


    const breakdown = candidate.breakdown || {
        skills: 0,
        experience: 0,
        education: 0
    };


    $('d-body').innerHTML =

        bar('Skills match', breakdown.skills) +

        bar('Experience', breakdown.experience) +

        bar('Education', breakdown.education) +


        '<h3>Matched skills</h3>' +

        (
            candidate.matched.length
                ? candidate.matched.map(skill =>
                    `<span class="chip">${esc(skill)}</span>`
                ).join('')
                : '<p class="hint">No required skills matched.</p>'
        ) +


        '<h3 style="margin-top:22px">Missing skills</h3>' +

        (
            candidate.missing.length
                ? candidate.missing.map(skill =>
                    `<span class="chip miss">${esc(skill)}</span>`
                ).join('')
                : '<p class="hint">No missing skills identified.</p>'
        ) +


        `<div class="note">
            This score is generated by a rule-based matching system.
            It should support, not replace, human review of candidates.
        </div>`;


    $('drawer').hidden = false;

    $('d-close').focus();
}


$('d-close').addEventListener('click', () => {

    $('drawer').hidden = true;

});


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


/* =====================================================
   RANK BUTTON
===================================================== */

$('btn-rank').addEventListener('click', async () => {

    const jd = $('jd').value.trim();


    if (!jd) {

        $('results').innerHTML = `
            <p class="empty">
                Enter a job description before ranking candidates.
            </p>
        `;

        $('jd').focus();

        return;
    }


    const button = $('btn-rank');

    button.disabled = true;

    button.innerHTML = 'Ranking candidates…';


    const pool = [
        ...SAMPLE_CANDIDATES,
        ...uploaded
    ];


    $('results').innerHTML = `
        <p class="empty">
            Comparing candidate profiles with the job requirements…
        </p>
    `;


    try {

        const output = await rankCandidates(jd, pool);


        ranked = output.map(result => {

            const original = pool.find(candidate =>
                candidate.id === result.id
            );


            return {
                ...(original || {}),
                ...result
            };

        }).sort((a, b) => {

            return (b.score ?? -1) - (a.score ?? -1);

        });


        renderResults();

    } catch (error) {

        $('results').innerHTML = `
            <p class="empty">
                Could not rank candidates:
                ${esc(error.message)}.
                Check your backend connection if API mode is enabled.
            </p>
        `;

    } finally {

        button.disabled = false;

        button.innerHTML = '<span>↗</span> Rank candidates';

    }

});


/* =====================================================
   SCORE FILTER
===================================================== */

$('min').addEventListener('input', () => {

    $('min-out').textContent = $('min').value;

    renderResults();

});


/* =====================================================
   RESET SAMPLE JOB DESCRIPTION
===================================================== */

$('btn-sample').addEventListener('click', () => {

    $('jd').value = SAMPLE_JD;

});


/* =====================================================
   EXPORT DATA PREPARATION
===================================================== */

function getExportRows() {

    const candidates = getExportableRanked();


    return candidates.map((candidate, index) => ({

        rank: index + 1,

        name: candidate.name,

        role: candidate.role,

        years: candidate.years,

        education: candidate.edu,

        score: candidate.score,

        shortlisted: shortlist.has(candidate.id) ? 'Yes' : 'No',

        matched: candidate.matched || [],

        missing: candidate.missing || []

    }));
}


function getReportMetadata() {

    return {

        title: 'AI Resume Ranking System',

        jobDescription: $('jd').value.trim(),

        generatedAt: new Date().toLocaleString(),

        minimumScore: Number($('min').value)

    };
}


/* =====================================================
   CSV EXPORT
===================================================== */

$('btn-export').addEventListener('click', () => {

    const rows = getExportRows();


    if (!rows.length) {
        alert('There are no processed candidates to export.');
        return;
    }


    const headers = [
        'Rank',
        'Candidate Name',
        'Role',
        'Experience Years',
        'Education',
        'Match Score',
        'Shortlisted',
        'Matched Skills',
        'Missing Skills'
    ];


    const lines = [headers.map(escapeCSV).join(',')];


    rows.forEach(candidate => {

        lines.push([

            candidate.rank,

            candidate.name,

            candidate.role,

            candidate.years,

            candidate.education,

            candidate.score,

            candidate.shortlisted,

            candidate.matched.join('; '),

            candidate.missing.join('; ')

        ].map(escapeCSV).join(','));

    });


    const csv = '\uFEFF' + lines.join('\r\n');


    downloadBlob(

        new Blob([csv], {
            type: 'text/csv;charset=utf-8;'
        }),

        'ranked-candidates.csv'

    );

});


/* =====================================================
   PDF EXPORT
===================================================== */

$('btn-export-pdf').addEventListener('click', () => {

    const rows = getExportRows();


    if (!rows.length) {
        alert('There are no processed candidates to export.');
        return;
    }


    if (!window.jspdf || !window.jspdf.jsPDF) {

        alert(
            'The PDF library could not be loaded. ' +
            'Check your internet connection and refresh the page.'
        );

        return;
    }


    try {

        const { jsPDF } = window.jspdf;

        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });


        const pageWidth = pdf.internal.pageSize.getWidth();

        const pageHeight = pdf.internal.pageSize.getHeight();

        const margin = 14;

        const contentWidth = pageWidth - margin * 2;


        const metadata = getReportMetadata();


        pdf.setFont('helvetica', 'bold');

        pdf.setFontSize(20);

        pdf.text(
            'AI Resume Ranking System',
            margin,
            18
        );


        pdf.setFont('helvetica', 'normal');

        pdf.setFontSize(10);

        pdf.text(
            'Candidate Ranking Report',
            margin,
            25
        );


        pdf.setFontSize(8);

        pdf.text(
            'Generated: ' + metadata.generatedAt,
            margin,
            32
        );


        pdf.text(
            'Minimum score filter: ' + metadata.minimumScore + '%',
            margin,
            37
        );


        pdf.text(
            'Candidates included: ' + rows.length,
            margin,
            42
        );


        let y = 50;


        pdf.setFont('helvetica', 'bold');

        pdf.setFontSize(10);

        pdf.text('Job Description', margin, y);


        y += 5;


        pdf.setFont('helvetica', 'normal');

        pdf.setFontSize(8);


        const description = pdf.splitTextToSize(
            metadata.jobDescription || 'Not provided',
            contentWidth
        );


        const maxDescriptionLines = 5;

        const visibleDescription = description.slice(
            0,
            maxDescriptionLines
        );


        pdf.text(
            visibleDescription,
            margin,
            y
        );


        y += visibleDescription.length * 4 + 8;


        const columns = [
            { key: 'rank', label: '#' },
            { key: 'name', label: 'Candidate' },
            { key: 'role', label: 'Role' },
            { key: 'years', label: 'Years' },
            { key: 'education', label: 'Education' },
            { key: 'score', label: 'Score' },
            { key: 'shortlisted', label: 'Shortlisted' },
            { key: 'matched', label: 'Matched Skills' },
            { key: 'missing', label: 'Missing Skills' }
        ];


        const columnWidths = [
            8,
            35,
            30,
            12,
            23,
            15,
            23,
            52,
            52
        ];


        function drawTableHeader() {

            let x = margin;


            pdf.setFont('helvetica', 'bold');

            pdf.setFontSize(7);


            pdf.setFillColor(230, 239, 244);

            pdf.rect(
                margin,
                y - 4,
                contentWidth,
                8,
                'F'
            );


            columns.forEach((column, index) => {

                pdf.text(
                    column.label,
                    x + 1,
                    y
                );

                x += columnWidths[index];

            });


            y += 7;

        }


        function drawPageFooter() {

            const pageCount = pdf.internal.getNumberOfPages();


            for (let page = 1; page <= pageCount; page++) {

                pdf.setPage(page);

                pdf.setFont('helvetica', 'normal');

                pdf.setFontSize(8);

                pdf.text(
                    'AI Resume Ranking System',
                    margin,
                    pageHeight - 7
                );

                pdf.text(
                    'Page ' + page + ' of ' + pageCount,
                    pageWidth - margin,
                    pageHeight - 7,
                    { align: 'right' }
                );

            }

        }


        drawTableHeader();


        pdf.setFont('helvetica', 'normal');

        pdf.setFontSize(7);


        rows.forEach(candidate => {

            const values = [

                String(candidate.rank),

                candidate.name,

                candidate.role,

                String(candidate.years),

                candidate.education,

                candidate.score + '%',

                candidate.shortlisted,

                candidate.matched.join(', ') || 'None',

                candidate.missing.join(', ') || 'None'

            ];


            const wrapped = values.map((value, index) => {

                return pdf.splitTextToSize(
                    String(value),
                    columnWidths[index] - 2
                );

            });


            const maxLines = Math.max(
                ...wrapped.map(lines => lines.length)
            );


            const rowHeight = Math.max(
                9,
                maxLines * 3.5 + 3
            );


            if (y + rowHeight > pageHeight - 15) {

                pdf.addPage();

                y = 18;

                drawTableHeader();

                pdf.setFont('helvetica', 'normal');

                pdf.setFontSize(7);

            }


            let x = margin;


            wrapped.forEach((lines, index) => {

                pdf.text(
                    lines,
                    x + 1,
                    y
                );

                x += columnWidths[index];

            });


            y += rowHeight;


            pdf.setDrawColor(220, 226, 232);

            pdf.line(
                margin,
                y - 2,
                pageWidth - margin,
                y - 2
            );

        });


        drawPageFooter();


        pdf.save('ranked-candidates.pdf');

    } catch (error) {

        console.error('PDF export failed:', error);

        alert(
            'The PDF could not be generated. ' +
            'Please try again or use CSV export.'
        );

    }

});


/* =====================================================
   DOCX EXPORT
===================================================== */

$('btn-export-docx').addEventListener('click', async () => {

    const rows = getExportRows();


    if (!rows.length) {

        alert('There are no processed candidates to export.');

        return;
    }


    if (!window.docx) {

        alert(
            'The Word document library could not be loaded. ' +
            'Check your internet connection and refresh the page.'
        );

        return;
    }


    const button = $('btn-export-docx');

    button.disabled = true;

    button.textContent = 'Preparing…';


    try {

        const {
            Document,
            Packer,
            Paragraph,
            TextRun,
            HeadingLevel,
            Table,
            TableRow,
            TableCell,
            WidthType,
            BorderStyle
        } = window.docx;


        const metadata = getReportMetadata();


        const border = {
            style: BorderStyle.SINGLE,
            size: 1,
            color: 'DCE4EA'
        };


        const cellBorders = {
            top: border,
            bottom: border,
            left: border,
            right: border
        };


        function makeCell(text, bold = false) {

            return new TableCell({

                borders: cellBorders,

                width: {
                    size: 100,
                    type: WidthType.AUTO
                },

                children: [

                    new Paragraph({

                        children: [

                            new TextRun({

                                text: String(text ?? ''),

                                bold,

                                size: 18

                            })

                        ]

                    })

                ]

            });

        }


        const tableRows = [];


        tableRows.push(

            new TableRow({

                tableHeader: true,

                children: [

                    'Rank',

                    'Candidate',

                    'Role',

                    'Experience',

                    'Education',

                    'Score',

                    'Shortlist',

                    'Matched Skills',

                    'Missing Skills'

                ].map(text => makeCell(text, true))

            })

        );


        rows.forEach(candidate => {

            tableRows.push(

                new TableRow({

                    children: [

                        candidate.rank,

                        candidate.name,

                        candidate.role,

                        candidate.years + ' years',

                        candidate.education,

                        candidate.score + '%',

                        candidate.shortlisted,

                        candidate.matched.join(', ') || 'None',

                        candidate.missing.join(', ') || 'None'

                    ].map(value => makeCell(value))

                })

            );

        });


        const reportTable = new Table({

            width: {
                size: 100,
                type: WidthType.PERCENTAGE
            },

            rows: tableRows

        });


        const document = new Document({

            creator: 'AI Resume Ranking System',

            title: 'Candidate Ranking Report',

            description: 'Candidate ranking and skill matching report',

            sections: [

                {

                    properties: {},

                    children: [

                        new Paragraph({

                            heading: HeadingLevel.TITLE,

                            children: [

                                new TextRun(
                                    'AI Resume Ranking System'
                                )

                            ]

                        }),


                        new Paragraph({

                            heading: HeadingLevel.HEADING_1,

                            children: [

                                new TextRun(
                                    'Candidate Ranking Report'
                                )

                            ]

                        }),


                        new Paragraph({

                            children: [

                                new TextRun({

                                    text: 'Generated: ',

                                    bold: true

                                }),

                                new TextRun(metadata.generatedAt)

                            ]

                        }),


                        new Paragraph({

                            children: [

                                new TextRun({

                                    text: 'Minimum score filter: ',

                                    bold: true

                                }),

                                new TextRun(
                                    metadata.minimumScore + '%'
                                )

                            ]

                        }),


                        new Paragraph({

                            children: [

                                new TextRun({

                                    text: 'Candidates included: ',

                                    bold: true

                                }),

                                new TextRun(String(rows.length))

                            ]

                        }),


                        new Paragraph({

                            heading: HeadingLevel.HEADING_2,

                            children: [

                                new TextRun('Job Description')

                            ]

                        }),


                        new Paragraph({

                            children: [

                                new TextRun(
                                    metadata.jobDescription || 'Not provided'
                                )

                            ]

                        }),


                        new Paragraph({

                            heading: HeadingLevel.HEADING_2,

                            children: [

                                new TextRun('Candidate Results')

                            ],

                            spacing: {

                                before: 250,

                                after: 150

                            }

                        }),


                        reportTable,


                        new Paragraph({

                            spacing: {

                                before: 300

                            },

                            children: [

                                new TextRun({

                                    text: 'Scoring note: ',

                                    bold: true

                                }),

                                new TextRun(
                                    'Scores are produced by the current ' +
                                    'rule-based matching system. ' +
                                    'They should support human review ' +
                                    'rather than determine hiring decisions ' +
                                    'on their own.'
                                )

                            ]

                        })

                    ]

                }

            ]

        });


        const blob = await Packer.toBlob(document);


        downloadBlob(
            blob,
            'ranked-candidates.docx'
        );


    } catch (error) {

        console.error('DOCX export failed:', error);


        alert(
            'The Word document could not be generated. ' +
            'Please try again or use CSV export.'
        );

    } finally {

        button.disabled = false;

        button.textContent = 'DOCX ↓';

        updateExportButtons();

    }

});


/* =====================================================
   INITIALIZATION
===================================================== */

$('jd').value = SAMPLE_JD;

$('min-out').textContent = $('min').value;

renderFiles();

updateExportButtons();
```
