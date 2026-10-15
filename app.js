
const USE_API = false; 
const API_URL = '/api/rank'; 
 
/* ---------- Sample data (replace with DB later) ---------- */ 
const SAMPLE_JD = `Machine Learning Engineer 
 
We are looking for an ML engineer with 3+ years of experience. 
Required skills: Python, machine learning, NLP, PyTorch, SQL, Docker, Git. 
Nice to have: AWS, communication. 
Education: Bachelor's degree in Computer Science or related field.`; 
 
const SAMPLE_CANDIDATES = [ 
  { id: 's1', name: 'Ananya Raghavan', role: 'ML Engineer', years: 4, edu: 'M.Tech', skills: ['python','machine learning','nlp','pytorch','sql','docker','git','aws'] }, 
  { id: 's2', name: 'Karthik Subramanian', role: 'Data Scientist', years: 3, edu: 'B.Tech', skills: ['python','machine learning','sql','tensorflow','data analysis','git'] }, 
  { id: 's3', name: 'Meera Nair', role: 'Backend Developer', years: 5, edu: 'B.Tech', skills: ['java','sql','docker','aws','git','django'] }, 
  { id: 's4', name: 'Rahul Verma', role: 'NLP Research Intern', years: 1, edu: 'B.Tech', skills: ['python','nlp','pytorch','git'] }, 
  { id: 's5', name: 'Divya Krishnan', role: 'Full Stack Developer', years: 2, edu: 'B.Tech', skills: ['javascript','react','node.js','sql','html','css','git'] }, 
  { id: 's6', name: 'Arjun Patel', role: 'AI Engineer', years: 6, edu: 'PhD', skills: ['python','machine learning','nlp','pytorch','tensorflow','docker','aws','git','communication'] }, 
]; 
 
const SKILLS = ['python','java','javascript','react','node.js','sql','machine learning','nlp','tensorflow','pytorch', 
  'docker','aws','git','django','flask','html','css','data analysis','communication','leadership']; 
const EDU_LEVEL = { 'b.tech':1, 'bachelor':1, 'm.tech':2, 'master':2, 'ms':2, 'phd':3 }; 
 
/* ---------- State ---------- */ 
let uploaded = [];        // candidates added from files 
let ranked = [];          // last ranking result 
const shortlist = new Set(); 
 
/* ---------- Helpers ---------- */ 
const $ = (id) => document.getElementById(id); 
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); 
const has = (text, term) => new RegExp('(^|[^a-z0-9])' + term.replace(/[.+*?^${}()|[\]\\]/g, '\\$&') + '($|[^a-z0-9])', 'i').test(text); 
const extractSkills = (text) => SKILLS.filter(s => has(text, s)); 
const extractYears = (text) => { const m = text.match(/(\d+)\+?\s*years/i); return m ? +m[1] : 0; }; 
const extractEduLevel = (text) => { 
  let lvl = 0; 
  for (const k in EDU_LEVEL) if (has(text, k)) lvl = Math.max(lvl, EDU_LEVEL[k]); 
  return lvl; 
}; 
 
/* ---------- Placeholder scoring (REPLACE with AI model) ---------- */ 
function mockRank(jd, candidates) { 
  const need = extractSkills(jd); 
  const needYears = extractYears(jd); 
  const needEdu = extractEduLevel(jd); 
  return candidates.map(c => { 
    if (c.pending) return { id: c.id, pending: true }; 
    const matched = need.filter(s => c.skills.includes(s)); 
    const missing = need.filter(s => !c.skills.includes(s)); 
    const skills = need.length ? matched.length / need.length : 1; 
    const experience = needYears ? Math.min(c.years / needYears, 1) : 1; 
    const education = needEdu ? Math.min((EDU_LEVEL[c.edu.toLowerCase()] || 0) / needEdu, 1) : 1; 
    const score = Math.round(100 * (0.6 * skills + 0.25 * experience + 0.15 * education)); 
    return { id: c.id, score, matched, missing, 
      breakdown: { skills: Math.round(skills*100), experience: Math.round(experience*100), education: Math.round(education*100) } }; 
  }); 
} 
 
async function rankCandidates(jd, candidates) { 
  if (USE_API) { 
    const res = await fetch(API_URL, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ jobDescription: jd, candidates: candidates.map(c => ({ id: c.id, name: c.name, text: c.text || '' })) }) 
    }); 
    if (!res.ok) throw new Error('Ranking service returned ' + res.status); 
    return res.json(); 
  } 
  return mockRank(jd, candidates); 
} 
 
/* ---------- Views ---------- */ 
document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => { 
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b === btn)); 
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + btn.dataset.view)); 
})); 
 
/* ---------- Upload ---------- */ 
function renderFiles() { 
  $('file-list').innerHTML = uploaded.map(c => 
    `<li><span>${esc(c.name)}</span><span class="tag ${c.pending ? '' : 'ok'}">${c.pending ? 'Waiting for AI parser' : 'Read'}</span></li>`).join(''); 
  $('pool-count').textContent = `${SAMPLE_CANDIDATES.length} sample candidates + ${uploaded.length} uploaded`; 
} 
 
$('files').addEventListener('change', async (e) => { 
  for (const f of e.target.files) { 
    const id = 'u' + Date.now() + Math.random().toString(36).slice(2, 6); 
    const name = f.name.replace(/\.[^.]+$/, ''); 
    if (f.name.toLowerCase().endsWith('.txt')) { 
      const text = await f.text(); 
      uploaded.push({ id, name, role: 'Uploaded resume', text, years: extractYears(text), 
        edu: Object.keys(EDU_LEVEL).find(k => has(text, k)) || 'none', skills: extractSkills(text) }); 
    } else { 
      uploaded.push({ id, name, role: 'Uploaded resume', pending: true, skills: [], years: 0, edu: 'none' }); 
    } 
  } 
  e.target.value = ''; 
  renderFiles(); 
}); 
 
/* ---------- Results ---------- */ 
function renderResults() { 
  const min = +$('min').value; 
  const rows = ranked.filter(r => r.pending || r.score >= min); 
  $('btn-export').disabled = !ranked.length;
$('btn-export-pdf').disabled = !ranked.length;
$('btn-export-doc').disabled = !ranked.length; 
  if (!ranked.length) return; 
  if (!rows.length) { $('results').innerHTML = '<p class="empty">No candidates meet the minimum score. Lower the filter.</p>'; return; } 
  let rank = 0; 
  $('results').innerHTML = `<div class="table-wrap"><table> 
    <thead><tr><th>#</th><th>Candidate</th><th>Match score</th><th>Skills</th><th>Shortlist</th></tr></thead> 
    <tbody>${rows.map(r => { 
      if (r.pending) return `<tr><td>–</td><td>${esc(r.name)}<br><small class="hint">${esc(r.role)}</small></td><td colspan="3"><span class="tag">Resume content extraction will be integrated in a later processing layer</span></td></tr>`; 
      rank++; 
      return `<tr class="clickable" data-id="${r.id}"> 
        <td>${rank}</td> 
        <td><b>${esc(r.name)}</b><br><small class="hint">${esc(r.role)} · ${r.years} yrs</small></td> 
        <td><div class="score"><b>${r.score}</b><div class="meter"><i style="width:${r.score}%"></i></div></div></td> 
        <td>${r.matched.slice(0,4).map(s => `<span class="chip">${esc(s)}</span>`).join('')}${r.missing.length ? `<span class="chip miss">${r.missing.length} missing</span>` : ''}</td> 
        <td>
  <button class="star ${shortlist.has(r.id) ? 'on' : ''}"
          data-star="${r.id}"
          aria-label="Toggle shortlist for ${esc(r.name)}"
          aria-pressed="${shortlist.has(r.id)}">★</button>

  <button class="remove-btn"
          data-remove="${r.id}"
          aria-label="Remove ${esc(r.name)}">❌</button>
</td> 
      </tr>`; 
    }).join('')}</tbody></table></div>`; 
} 
 
$('results').addEventListener('click', (e) => {
  const removeBtn = e.target.closest('[data-remove]');
  if (removeBtn) {
    const id = removeBtn.dataset.remove;

    uploaded = uploaded.filter(c => c.id !== id);
    ranked = ranked.filter(r => r.id !== id);
    shortlist.delete(id);

    renderFiles();
    renderResults();
    return;
  }

  const star = e.target.closest('[data-star]');
  if (star) {
    const id = star.dataset.star;
    shortlist.has(id) ? shortlist.delete(id) : shortlist.add(id);
    renderResults();
    return;
  }

  const row = e.target.closest('tr[data-id]');
  if (row) openDrawer(row.dataset.id);
}); 
 
function bar(label, v) { 
  return `<div class="bd"><div class="bd-head"><span>${label}</span><b>${v}%</b></div><div class="meter"><i style="width:${v}%"></i></div></div>`; 
} 
 
function openDrawer(id) { 
  const r = ranked.find(x => x.id === id); 
  $('d-name').textContent = r.name; 
  $('d-sub').textContent = `${r.role} · overall score ${r.score}/100`; 
  $('d-body').innerHTML = 
    bar('Skills match', r.breakdown.skills) + bar('Experience', r.breakdown.experience) + bar('Education', r.breakdown.education) + 
    `<h2>Matched skills</h2>${r.matched.map(s => `<span class="chip">${esc(s)}</span>`).join('') || '<p class="hint">None</p>'}` + 
    `<h2>Missing skills</h2>${r.missing.map(s => `<span class="chip miss">${esc(s)}</span>`).join('') || '<p class="hint">None</p>'}` + 
    (r.explanation ? `<h2>Why this score</h2><p>${esc(r.explanation)}</p>` 
      : `<div class="note">AI explanation for this score will appear here once the model is connected.</div>`); 
  $('drawer').hidden = false; 
  $('d-close').focus(); 
} 
$('d-close').addEventListener('click', () => $('drawer').hidden = true); 
$('drawer').addEventListener('click', (e) => { if (e.target === $('drawer')) $('drawer').hidden = true; }); 
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') $('drawer').hidden = true; }); 
 
/* ---------- Actions ---------- */ 
$('btn-rank').addEventListener('click', async () => { 
  const jd = $('jd').value.trim(); 
  if (!jd) { $('results').innerHTML = '<p class="empty">Enter a job description first.</p>'; return; } 
  const pool = [...SAMPLE_CANDIDATES, ...uploaded]; 
  $('results').innerHTML = '<p class="empty">Ranking…</p>'; 
  try { 
    const out = await rankCandidates(jd, pool); 
    ranked = out.map(o => ({ ...pool.find(c => c.id === o.id), ...o })) 
                .sort((a, b) => (b.score ?? -1) - (a.score ?? -1)); 
    renderResults(); 
  } catch (err) { 
    $('results').innerHTML = `<p class="empty">Could not rank candidates: ${esc(err.message)}. Check that the backend is running.</p>`; 
  } 
}); 
 
$('min').addEventListener('input', () => { $('min-out').textContent = $('min').value; renderResults(); }); 
$('btn-sample').addEventListener('click', () => { $('jd').value = SAMPLE_JD; }); 
 
$('btn-export').addEventListener('click', () => { 
  const lines = ['rank,name,role,score,shortlisted,matched_skills,missing_skills']; 
  ranked.filter(r => !r.pending).forEach((r, i) => lines.push( 
    [i + 1, r.name, r.role, r.score, shortlist.has(r.id) ? 'yes' : 'no', r.matched.join('; '), r.missing.join('; ')] 
      .map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))); 
  const a = document.createElement('a'); 
  a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' })); 
  a.download = 'ranked-candidates.csv'; 
  a.click(); 
  URL.revokeObjectURL(a.href); 
}); 
```javascript
/* ---------- Shared export data ---------- */

function getExportCandidates() {
  return ranked.filter(r => !r.pending);
}

function getExportDate() {
  return new Date().toLocaleDateString();
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');

  a.href = url;
  a.download = filename;

  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---------- Export PDF ---------- */

$('btn-export-pdf').addEventListener('click', () => {
  const candidates = getExportCandidates();

  if (!candidates.length) {
    alert('No ranked candidates available to export.');
    return;
  }

  if (!window.jspdf || !window.jspdf.jsPDF) {
    alert('PDF library could not be loaded. Check your internet connection.');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  let y = 20;
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(18);
  doc.text('AI Resume Ranking Report', margin, y);

  y += 10;

  doc.setFontSize(10);
  doc.text(`Generated: ${getExportDate()}`, margin, y);

  y += 12;

  candidates.forEach((c, index) => {
    const details = [
      `${index + 1}. ${c.name}`,
      `Role: ${c.role}`,
      `Match Score: ${c.score}/100`,
      `Shortlisted: ${shortlist.has(c.id) ? 'Yes' : 'No'}`,
      `Matched Skills: ${(c.matched || []).join(', ') || 'None'}`,
      `Missing Skills: ${(c.missing || []).join(', ') || 'None'}`
    ];

    const wrapped = [];

    details.forEach(line => {
      const parts = doc.splitTextToSize(line, pageWidth - margin * 2);
      wrapped.push(...parts);
    });

    const blockHeight = wrapped.length * 5 + 8;

    if (y + blockHeight > pageHeight - margin) {
      doc.addPage();
      y = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.text(wrapped[0], margin, y);
    y += 5;

    doc.setFont('helvetica', 'normal');

    wrapped.slice(1).forEach(line => {
      if (y > pageHeight - margin) {
        doc.addPage();
        y = 20;
      }

      doc.text(line, margin, y);
      y += 5;
    });

    y += 5;
  });

  doc.save('ranked-candidates.pdf');
});

/* ---------- Export Word document ---------- */

$('btn-export-doc').addEventListener('click', async () => {
  const candidates = getExportCandidates();

  if (!candidates.length) {
    alert('No ranked candidates available to export.');
    return;
  }

  if (!window.docx) {
    alert('Word document library could not be loaded. Check your internet connection.');
    return;
  }

  try {
    const {
      Document,
      Packer,
      Paragraph,
      TextRun,
      HeadingLevel
    } = window.docx;

    const children = [
      new Paragraph({
        text: 'AI Resume Ranking Report',
        heading: HeadingLevel.TITLE
      }),

      new Paragraph({
        children: [
          new TextRun({
            text: `Generated: ${getExportDate()}`,
            italics: true
          })
        ]
      }),

      new Paragraph({ text: '' })
    ];

    candidates.forEach((c, index) => {
      children.push(
        new Paragraph({
          text: `${index + 1}. ${c.name}`,
          heading: HeadingLevel.HEADING_1
        }),

        new Paragraph({
          children: [
            new TextRun({ text: 'Role: ', bold: true }),
            new TextRun(String(c.role || 'Not specified'))
          ]
        }),

        new Paragraph({
          children: [
            new TextRun({ text: 'Match Score: ', bold: true }),
            new TextRun(`${c.score}/100`)
          ]
        }),

        new Paragraph({
          children: [
            new TextRun({ text: 'Shortlisted: ', bold: true }),
            new TextRun(shortlist.has(c.id) ? 'Yes' : 'No')
          ]
        }),

        new Paragraph({
          children: [
            new TextRun({ text: 'Matched Skills: ', bold: true }),
            new TextRun((c.matched || []).join(', ') || 'None')
          ]
        }),

        new Paragraph({
          children: [
            new TextRun({ text: 'Missing Skills: ', bold: true }),
            new TextRun((c.missing || []).join(', ') || 'None')
          ]
        }),

        new Paragraph({ text: '' })
      );
    });

    const report = new Document({
      sections: [
        {
          children
        }
      ]
    });

    const blob = await Packer.toBlob(report);

    downloadBlob(blob, 'ranked-candidates.docx');

  } catch (error) {
    console.error('Word export failed:', error);
    alert('Could not generate the Word document. Check the browser console for details.');
  }
});
```

 
/* ---------- Init ---------- */ 
$('jd').value = SAMPLE_JD; 
renderFiles();
