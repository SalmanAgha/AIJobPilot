import React from 'react';

const CVPreview = ({ data }) => {
  return (
    <div className="cv-preview">
      <div className="preview-page">
        {/* Subtle Watermark/Logo */}
        <div className="preview-watermark">ATS Verified ✨</div>

        <header className="preview-header">
          <h1>{data.basics.name || 'Your Name'}</h1>
          <div className="contact-info">
            {data.basics.email || 'email@example.com'} 
            {data.basics.phone && ` • ${data.basics.phone}`} 
            {data.basics.location && ` • ${data.basics.location}`}
          </div>
          {data.basics.website && (
            <div className="contact-info" style={{ marginTop: '2px', color: '#2563eb' }}>
              {data.basics.website.replace(/^https?:\/\//, '')}
            </div>
          )}
        </header>

        {data.work.length > 0 && (
          <section className="preview-section">
            <h3>EXPERIENCE</h3>
            {data.work.map((job, i) => (
              <div key={i} className="preview-item">
                <div className="item-row">
                  <strong>{job.company}</strong>
                  <span>{job.startDate} – {job.endDate || 'Present'}</span>
                </div>
                <div className="item-row">
                  <em>{job.position}</em>
                </div>
                <ul className="highlights">
                  {job.highlights.filter(h => h.trim()).map((h, j) => (
                    <li key={j}>{h}</li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        )}

        {data.skills.length > 0 && (
          <section className="preview-section">
            <h3>SKILLS</h3>
            <div className="skills-grid" style={{ fontSize: '13px' }}>
              {data.skills.map((skill, i) => (
                <div key={i} style={{ marginBottom: '4px' }}>
                  <strong>{skill.name}:</strong> {skill.keywords.join(', ')}
                </div>
              ))}
            </div>
          </section>
        )}

        {data.education.length > 0 && (
          <section className="preview-section">
            <h3>EDUCATION</h3>
            {data.education.map((edu, i) => (
              <div key={i} className="preview-item">
                <div className="item-row">
                  <strong>{edu.institution}</strong>
                  <span>{edu.endDate}</span>
                </div>
                <div style={{ fontSize: '13.5px' }}>{edu.studyType} in {edu.area}</div>
              </div>
            ))}
          </section>
        )}
        
        {/* Empty State Illustration if no data */}
        {data.work.length === 0 && data.education.length === 0 && (
          <div className="preview-empty-state">
            <div style={{ fontSize: '4rem', opacity: 0.1, marginBottom: '1rem' }}>📄</div>
            <p style={{ color: '#94a3b8', fontSize: '14px' }}>Your resume is currently empty.<br/>Use the <strong>Auto-Import</strong> feature to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CVPreview;
