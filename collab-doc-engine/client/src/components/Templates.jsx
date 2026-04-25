import React from 'react';

const TEMPLATES = [
  {
    id: 'blank',
    name: 'Blank Document',
    icon: '📄',
    desc: 'Start from scratch',
    content: { ops: [] },
  },
  {
    id: 'meeting',
    name: 'Meeting Notes',
    icon: '📋',
    desc: 'Agenda, attendees, action items',
    content: {
      ops: [
        { insert: 'Meeting Notes\n', attributes: { header: 1 } },
        { insert: 'Date: ', attributes: { bold: true } },
        { insert: new Date().toLocaleDateString() + '\n' },
        { insert: 'Attendees: ', attributes: { bold: true } },
        { insert: '\n' },
        { insert: 'Agenda\n', attributes: { header: 2 } },
        { insert: 'Item 1\n', attributes: { list: 'ordered' } },
        { insert: 'Item 2\n', attributes: { list: 'ordered' } },
        { insert: 'Action Items\n', attributes: { header: 2 } },
        { insert: 'Task 1\n', attributes: { list: 'bullet' } },
        { insert: 'Task 2\n', attributes: { list: 'bullet' } },
        { insert: 'Notes\n', attributes: { header: 2 } },
        { insert: '\n' },
      ],
    },
  },
  {
    id: 'report',
    name: 'Project Report',
    icon: '📊',
    desc: 'Executive summary, findings, recommendations',
    content: {
      ops: [
        { insert: 'Project Report\n', attributes: { header: 1 } },
        { insert: 'Executive Summary\n', attributes: { header: 2 } },
        { insert: 'Brief overview of the project...\n' },
        { insert: 'Objectives\n', attributes: { header: 2 } },
        { insert: 'Objective 1\n', attributes: { list: 'ordered' } },
        { insert: 'Objective 2\n', attributes: { list: 'ordered' } },
        { insert: 'Findings\n', attributes: { header: 2 } },
        { insert: 'Key finding 1\n', attributes: { list: 'bullet' } },
        { insert: 'Key finding 2\n', attributes: { list: 'bullet' } },
        { insert: 'Recommendations\n', attributes: { header: 2 } },
        { insert: '\n' },
        { insert: 'Conclusion\n', attributes: { header: 2 } },
        { insert: '\n' },
      ],
    },
  },
  {
    id: 'readme',
    name: 'README',
    icon: '📖',
    desc: 'Project documentation template',
    content: {
      ops: [
        { insert: 'Project Name\n', attributes: { header: 1 } },
        { insert: 'Short description of the project.\n\n' },
        { insert: 'Features\n', attributes: { header: 2 } },
        { insert: 'Feature 1\n', attributes: { list: 'bullet' } },
        { insert: 'Feature 2\n', attributes: { list: 'bullet' } },
        { insert: 'Installation\n', attributes: { header: 2 } },
        { insert: 'npm install\n', attributes: { 'code-block': true } },
        { insert: 'Usage\n', attributes: { header: 2 } },
        { insert: 'npm start\n', attributes: { 'code-block': true } },
        { insert: 'Contributing\n', attributes: { header: 2 } },
        { insert: 'Pull requests are welcome.\n' },
        { insert: 'License\n', attributes: { header: 2 } },
        { insert: 'MIT\n' },
      ],
    },
  },
  {
    id: 'essay',
    name: 'Essay',
    icon: '✍️',
    desc: 'Introduction, body, conclusion',
    content: {
      ops: [
        { insert: 'Essay Title\n', attributes: { header: 1 } },
        { insert: 'Introduction\n', attributes: { header: 2 } },
        { insert: 'Hook sentence. Background information. Thesis statement.\n\n' },
        { insert: 'Body Paragraph 1\n', attributes: { header: 2 } },
        { insert: 'Topic sentence. Evidence. Analysis. Transition.\n\n' },
        { insert: 'Body Paragraph 2\n', attributes: { header: 2 } },
        { insert: 'Topic sentence. Evidence. Analysis. Transition.\n\n' },
        { insert: 'Conclusion\n', attributes: { header: 2 } },
        { insert: 'Restate thesis. Summarize main points. Closing thought.\n' },
      ],
    },
  },
  {
    id: 'todo',
    name: 'To-Do List',
    icon: '✅',
    desc: 'Task tracker with priorities',
    content: {
      ops: [
        { insert: 'To-Do List\n', attributes: { header: 1 } },
        { insert: new Date().toLocaleDateString() + '\n\n' },
        { insert: '🔴 High Priority\n', attributes: { header: 3 } },
        { insert: 'Task 1\n', attributes: { list: 'bullet' } },
        { insert: '🟡 Medium Priority\n', attributes: { header: 3 } },
        { insert: 'Task 2\n', attributes: { list: 'bullet' } },
        { insert: '🟢 Low Priority\n', attributes: { header: 3 } },
        { insert: 'Task 3\n', attributes: { list: 'bullet' } },
        { insert: '✅ Done\n', attributes: { header: 3 } },
        { insert: '\n' },
      ],
    },
  },

  // ── 10 new templates ──────────────────────────────────────────────────────

  {
    id: 'weekly-plan',
    name: 'Weekly Planner',
    icon: '📅',
    desc: 'Plan your week day by day',
    content: {
      ops: [
        { insert: 'Weekly Planner\n', attributes: { header: 1 } },
        { insert: 'Week of: [Date]\n\n' },
        ...['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].flatMap(day => [
          { insert: day + '\n', attributes: { header: 2 } },
          { insert: '[Tasks / events for ' + day + ']\n\n' },
        ]),
      ],
    },
  },

  {
    id: 'bug-report',
    name: 'Bug Report',
    icon: '🐛',
    desc: 'Structured software bug report',
    content: {
      ops: [
        { insert: 'Bug Report\n', attributes: { header: 1 } },
        { insert: 'Summary\n', attributes: { header: 2 } },
        { insert: '[One-line description of the bug]\n\n' },
        { insert: 'Environment\n', attributes: { header: 2 } },
        { insert: 'OS: ', attributes: { bold: true } }, { insert: '[e.g. Windows 11]\n' },
        { insert: 'Browser: ', attributes: { bold: true } }, { insert: '[e.g. Chrome 124]\n' },
        { insert: 'Version: ', attributes: { bold: true } }, { insert: '[app version]\n\n' },
        { insert: 'Steps to Reproduce\n', attributes: { header: 2 } },
        { insert: 'Step 1\n', attributes: { list: 'ordered' } },
        { insert: 'Step 2\n', attributes: { list: 'ordered' } },
        { insert: 'Step 3\n', attributes: { list: 'ordered' } },
        { insert: '\n' },
        { insert: 'Expected Behavior\n', attributes: { header: 2 } },
        { insert: '[What should happen]\n\n' },
        { insert: 'Actual Behavior\n', attributes: { header: 2 } },
        { insert: '[What actually happens]\n\n' },
        { insert: 'Screenshots / Logs\n', attributes: { header: 2 } },
        { insert: '[Attach if available]\n\n' },
        { insert: 'Severity\n', attributes: { header: 2 } },
        { insert: '☐ Critical  ☐ High  ☐ Medium  ☐ Low\n' },
      ],
    },
  },

  {
    id: 'sprint-retro',
    name: 'Sprint Retrospective',
    icon: '🔄',
    desc: 'Agile sprint retro — went well, improve, actions',
    content: {
      ops: [
        { insert: 'Sprint Retrospective\n', attributes: { header: 1 } },
        { insert: 'Sprint: ', attributes: { bold: true } }, { insert: '[Sprint #]   ' },
        { insert: 'Date: ', attributes: { bold: true } }, { insert: new Date().toLocaleDateString() + '\n\n' },
        { insert: '✅ What Went Well\n', attributes: { header: 2 } },
        { insert: '[Item 1]\n', attributes: { list: 'bullet' } },
        { insert: '[Item 2]\n', attributes: { list: 'bullet' } },
        { insert: '\n' },
        { insert: '🔧 What Could Be Improved\n', attributes: { header: 2 } },
        { insert: '[Item 1]\n', attributes: { list: 'bullet' } },
        { insert: '[Item 2]\n', attributes: { list: 'bullet' } },
        { insert: '\n' },
        { insert: '🚀 Action Items\n', attributes: { header: 2 } },
        { insert: '[Action] — Owner: [Name] — Due: [Date]\n', attributes: { list: 'ordered' } },
        { insert: '[Action] — Owner: [Name] — Due: [Date]\n', attributes: { list: 'ordered' } },
        { insert: '\n' },
        { insert: 'Team Mood\n', attributes: { header: 2 } },
        { insert: '😊 😐 😞  (circle one)\n' },
      ],
    },
  },

  {
    id: 'job-application',
    name: 'Job Application',
    icon: '💼',
    desc: 'Cover letter + application tracker',
    content: {
      ops: [
        { insert: '[Your Name]\n', attributes: { header: 1 } },
        { insert: '[Email] · [Phone] · [LinkedIn URL]\n\n' },
        { insert: new Date().toLocaleDateString() + '\n\n' },
        { insert: 'Hiring Manager\n', attributes: { bold: true } },
        { insert: '[Company Name]\n[Company Address]\n\n' },
        { insert: 'Dear Hiring Manager,\n\n' },
        { insert: 'Opening Paragraph\n', attributes: { header: 2 } },
        { insert: 'I am writing to express my interest in the [Job Title] position at [Company]. [Why you are excited about this role and company.]\n\n' },
        { insert: 'Why Me\n', attributes: { header: 2 } },
        { insert: 'In my previous role at [Previous Company], I [key achievement with measurable result]. I bring expertise in [Skill 1], [Skill 2], and [Skill 3].\n\n' },
        { insert: 'Why This Company\n', attributes: { header: 2 } },
        { insert: '[Specific reason you want to work here — mission, product, culture.]\n\n' },
        { insert: 'Closing\n', attributes: { header: 2 } },
        { insert: 'I would welcome the opportunity to discuss how my background aligns with your needs. Thank you for your time and consideration.\n\nSincerely,\n[Your Name]\n' },
      ],
    },
  },

  {
    id: 'research-notes',
    name: 'Research Notes',
    icon: '🔬',
    desc: 'Structured notes for research & study',
    content: {
      ops: [
        { insert: 'Research Notes\n', attributes: { header: 1 } },
        { insert: 'Topic: ', attributes: { bold: true } }, { insert: '[Topic]\n' },
        { insert: 'Date: ', attributes: { bold: true } }, { insert: new Date().toLocaleDateString() + '\n' },
        { insert: 'Source: ', attributes: { bold: true } }, { insert: '[Book / Paper / URL]\n\n' },
        { insert: 'Key Questions\n', attributes: { header: 2 } },
        { insert: '[Question 1]\n', attributes: { list: 'ordered' } },
        { insert: '[Question 2]\n', attributes: { list: 'ordered' } },
        { insert: '\n' },
        { insert: 'Main Findings\n', attributes: { header: 2 } },
        { insert: '[Finding 1]\n', attributes: { list: 'bullet' } },
        { insert: '[Finding 2]\n', attributes: { list: 'bullet' } },
        { insert: '\n' },
        { insert: 'Quotes & Evidence\n', attributes: { header: 2 } },
        { insert: '"[Direct quote]" — [Author, page]\n\n' },
        { insert: 'My Analysis\n', attributes: { header: 2 } },
        { insert: '[Your interpretation and connections to other ideas]\n\n' },
        { insert: 'Further Reading\n', attributes: { header: 2 } },
        { insert: '[Reference 1]\n', attributes: { list: 'bullet' } },
        { insert: '[Reference 2]\n', attributes: { list: 'bullet' } },
      ],
    },
  },

  {
    id: 'product-spec',
    name: 'Product Spec',
    icon: '📐',
    desc: 'Product requirements & feature spec',
    content: {
      ops: [
        { insert: 'Product Specification\n', attributes: { header: 1 } },
        { insert: 'Feature: ', attributes: { bold: true } }, { insert: '[Feature Name]\n' },
        { insert: 'Author: ', attributes: { bold: true } }, { insert: '[Name]   ' },
        { insert: 'Status: ', attributes: { bold: true } }, { insert: 'Draft\n' },
        { insert: 'Date: ', attributes: { bold: true } }, { insert: new Date().toLocaleDateString() + '\n\n' },
        { insert: 'Problem Statement\n', attributes: { header: 2 } },
        { insert: '[What problem does this solve? Who is affected?]\n\n' },
        { insert: 'Goals\n', attributes: { header: 2 } },
        { insert: '[Goal 1]\n', attributes: { list: 'bullet' } },
        { insert: '[Goal 2]\n', attributes: { list: 'bullet' } },
        { insert: '\n' },
        { insert: 'Non-Goals\n', attributes: { header: 2 } },
        { insert: '[What is explicitly out of scope]\n\n' },
        { insert: 'User Stories\n', attributes: { header: 2 } },
        { insert: 'As a [user], I want to [action] so that [benefit].\n', attributes: { list: 'ordered' } },
        { insert: 'As a [user], I want to [action] so that [benefit].\n', attributes: { list: 'ordered' } },
        { insert: '\n' },
        { insert: 'Acceptance Criteria\n', attributes: { header: 2 } },
        { insert: 'GIVEN [context] WHEN [action] THEN [outcome]\n', attributes: { list: 'ordered' } },
        { insert: '\n' },
        { insert: 'Technical Notes\n', attributes: { header: 2 } },
        { insert: '[Architecture decisions, API changes, DB schema]\n\n' },
        { insert: 'Open Questions\n', attributes: { header: 2 } },
        { insert: '[Question 1]\n', attributes: { list: 'bullet' } },
      ],
    },
  },

  {
    id: 'invoice',
    name: 'Invoice',
    icon: '🧾',
    desc: 'Simple freelance / business invoice',
    content: {
      ops: [
        { insert: 'INVOICE\n', attributes: { header: 1 } },
        { insert: 'From: ', attributes: { bold: true } }, { insert: '[Your Name / Company]\n' },
        { insert: '[Your Address]\n' },
        { insert: '[Email] · [Phone]\n\n' },
        { insert: 'Bill To: ', attributes: { bold: true } }, { insert: '[Client Name]\n' },
        { insert: '[Client Address]\n\n' },
        { insert: 'Invoice #: ', attributes: { bold: true } }, { insert: '[001]\n' },
        { insert: 'Date: ', attributes: { bold: true } }, { insert: new Date().toLocaleDateString() + '\n' },
        { insert: 'Due Date: ', attributes: { bold: true } }, { insert: '[Due Date]\n\n' },
        { insert: 'Services\n', attributes: { header: 2 } },
        { insert: '[Service Description]          [Hours]    [Rate]    [Amount]\n', attributes: { bold: true } },
        { insert: '[Item 1]                        [X hrs]    $[rate]   $[total]\n' },
        { insert: '[Item 2]                        [X hrs]    $[rate]   $[total]\n\n' },
        { insert: 'Subtotal: ', attributes: { bold: true } }, { insert: '$[amount]\n' },
        { insert: 'Tax ([X]%): ', attributes: { bold: true } }, { insert: '$[amount]\n' },
        { insert: 'Total Due: ', attributes: { bold: true } }, { insert: '$[TOTAL]\n\n' },
        { insert: 'Payment Instructions\n', attributes: { header: 2 } },
        { insert: '[Bank transfer / PayPal / other — include account details]\n\n' },
        { insert: 'Thank you for your business!\n', attributes: { italic: true } },
      ],
    },
  },

  {
    id: 'book-review',
    name: 'Book Review',
    icon: '📚',
    desc: 'Structured book review & rating',
    content: {
      ops: [
        { insert: '[Book Title]\n', attributes: { header: 1 } },
        { insert: 'Author: ', attributes: { bold: true } }, { insert: '[Author Name]\n' },
        { insert: 'Genre: ', attributes: { bold: true } }, { insert: '[Genre]   ' },
        { insert: 'Pages: ', attributes: { bold: true } }, { insert: '[Pages]   ' },
        { insert: 'Rating: ', attributes: { bold: true } }, { insert: '⭐⭐⭐⭐☆\n\n' },
        { insert: 'Summary\n', attributes: { header: 2 } },
        { insert: '[2–3 sentence overview of the book without major spoilers]\n\n' },
        { insert: 'What I Liked\n', attributes: { header: 2 } },
        { insert: '[Point 1]\n', attributes: { list: 'bullet' } },
        { insert: '[Point 2]\n', attributes: { list: 'bullet' } },
        { insert: '\n' },
        { insert: 'What Could Be Better\n', attributes: { header: 2 } },
        { insert: '[Point 1]\n', attributes: { list: 'bullet' } },
        { insert: '\n' },
        { insert: 'Favourite Quote\n', attributes: { header: 2 } },
        { insert: '"[Quote]"\n\n' },
        { insert: 'Who Should Read This\n', attributes: { header: 2 } },
        { insert: '[Audience description]\n\n' },
        { insert: 'Final Verdict\n', attributes: { header: 2 } },
        { insert: '[Your overall recommendation]\n' },
      ],
    },
  },

  {
    id: 'travel-itinerary',
    name: 'Travel Itinerary',
    icon: '✈️',
    desc: 'Day-by-day trip planner',
    content: {
      ops: [
        { insert: '[Destination] Trip\n', attributes: { header: 1 } },
        { insert: 'Dates: ', attributes: { bold: true } }, { insert: '[Start] → [End]\n' },
        { insert: 'Travellers: ', attributes: { bold: true } }, { insert: '[Names]\n' },
        { insert: 'Budget: ', attributes: { bold: true } }, { insert: '$[amount]\n\n' },
        { insert: 'Flights & Transport\n', attributes: { header: 2 } },
        { insert: 'Outbound: ', attributes: { bold: true } }, { insert: '[Flight / Train details]\n' },
        { insert: 'Return: ', attributes: { bold: true } }, { insert: '[Flight / Train details]\n\n' },
        { insert: 'Accommodation\n', attributes: { header: 2 } },
        { insert: '[Hotel / Airbnb name, address, check-in/out]\n\n' },
        { insert: 'Day 1 — [Date]\n', attributes: { header: 2 } },
        { insert: 'Morning: ', attributes: { bold: true } }, { insert: '[Activity]\n' },
        { insert: 'Afternoon: ', attributes: { bold: true } }, { insert: '[Activity]\n' },
        { insert: 'Evening: ', attributes: { bold: true } }, { insert: '[Restaurant / Activity]\n\n' },
        { insert: 'Day 2 — [Date]\n', attributes: { header: 2 } },
        { insert: 'Morning: ', attributes: { bold: true } }, { insert: '[Activity]\n' },
        { insert: 'Afternoon: ', attributes: { bold: true } }, { insert: '[Activity]\n' },
        { insert: 'Evening: ', attributes: { bold: true } }, { insert: '[Restaurant / Activity]\n\n' },
        { insert: 'Packing List\n', attributes: { header: 2 } },
        { insert: '[Item 1]\n', attributes: { list: 'bullet' } },
        { insert: '[Item 2]\n', attributes: { list: 'bullet' } },
        { insert: '\n' },
        { insert: 'Emergency Contacts\n', attributes: { header: 2 } },
        { insert: 'Local emergency: ', attributes: { bold: true } }, { insert: '[number]\n' },
        { insert: 'Embassy: ', attributes: { bold: true } }, { insert: '[number]\n' },
      ],
    },
  },

  {
    id: 'standup',
    name: 'Daily Standup',
    icon: '🧍',
    desc: 'Yesterday · Today · Blockers',
    content: {
      ops: [
        { insert: 'Daily Standup\n', attributes: { header: 1 } },
        { insert: new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) + '\n\n' },
        { insert: '✅ Yesterday\n', attributes: { header: 2 } },
        { insert: '[What I completed yesterday]\n', attributes: { list: 'bullet' } },
        { insert: '[What I completed yesterday]\n', attributes: { list: 'bullet' } },
        { insert: '\n' },
        { insert: '🎯 Today\n', attributes: { header: 2 } },
        { insert: '[What I plan to work on today]\n', attributes: { list: 'bullet' } },
        { insert: '[What I plan to work on today]\n', attributes: { list: 'bullet' } },
        { insert: '\n' },
        { insert: '🚧 Blockers\n', attributes: { header: 2 } },
        { insert: '[Any blockers or help needed — or "None"]\n' },
      ],
    },
  },
];

export { TEMPLATES };

export default function TemplateModal({ onSelect, onClose, darkMode, onSaveAsTemplate }) {
  const bg = darkMode ? '#1e1e2e' : '#fff';
  const border = darkMode ? '#313244' : '#e0e0e0';
  const textColor = darkMode ? '#cdd6f4' : '#1a1a2e';
  const cardBg = darkMode ? '#313244' : '#f8f9fa';

  // Req 9.7: load custom templates saved by user
  const customTemplates = React.useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('customTemplates') || '[]');
    } catch { return []; }
  }, []);

  const allTemplates = [...TEMPLATES, ...customTemplates];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}
      onClick={onClose}>
      <div style={{ background: bg, borderRadius: 16, padding: 28, width: 560, maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.3)' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: textColor }}>Choose a Template</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: '#aaa' }}>✕</button>
        </div>

        {/* Built-in templates */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {allTemplates.map(t => (
            <div key={t.id}
              onClick={() => onSelect(t)}
              style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 10, padding: 16, cursor: 'pointer', transition: 'border-color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#667eea'}
              onMouseLeave={e => e.currentTarget.style.borderColor = border}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>{t.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: textColor, marginBottom: 4 }}>{t.name}</div>
              <div style={{ fontSize: 12, color: '#888' }}>{t.desc}</div>
            </div>
          ))}
        </div>

        {/* Req 9.7: Save current document as template */}
        {onSaveAsTemplate && (
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${border}` }}>
            <button
              onClick={onSaveAsTemplate}
              style={{ width: '100%', padding: '10px', background: 'transparent', border: `1px dashed ${border}`, borderRadius: 10, cursor: 'pointer', color: textColor, fontSize: 13, fontWeight: 600 }}
            >
              💾 Save current document as template
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
