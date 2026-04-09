import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Briefcase, GraduationCap, Code, Plus, 
  Trash2, Download, Wand2, Upload, Loader2,
  ChevronRight, Sparkles, FileText
} from 'lucide-react';

const CVEditor = ({ 
  data, onChange, onOptimize, onDownload, showToast, onSave,
  resumes, activeId, onSwitch, onNew, resumeName, onRename 
}) => {
  const [activeSection, setActiveSection] = useState('basics');
  const [isExtracting, setIsExtracting] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsExtracting(true);
    showToast('AI is reading your document...', 'info');
    const formData = new FormData();
    formData.append('cv', file);

    try {
      const res = await fetch('http://localhost:5000/api/cv/extract', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const extractedData = await res.json();
        onChange(extractedData);
        showToast('CV successfully extracted!', 'success');
      } else {
        showToast('Extraction failed. Check API key.', 'error');
      }
    } catch (err) {
      showToast('Error connecting to server', 'error');
    } finally {
      setIsExtracting(false);
    }
  };

  const updateBasics = (field, value) => {
    onChange({ ...data, basics: { ...data.basics, [field]: value } });
  };

  const updateArrayItem = (section, index, field, value) => {
    const newList = [...data[section]];
    newList[index] = { ...newList[index], [field]: value };
    onChange({ ...data, [section]: newList });
  };

  const addArrayItem = (section, template) => {
    onChange({ ...data, [section]: [...data[section], template] });
  };

  const removeArrayItem = (section, index) => {
    const newList = data[section].filter((_, i) => i !== index);
    onChange({ ...data, [section]: newList });
  };

  const navItems = [
    { id: 'basics', label: 'Identity', icon: User },
    { id: 'work', label: 'History', icon: Briefcase },
    { id: 'education', label: 'Education', icon: GraduationCap },
    { id: 'skills', label: 'Skills', icon: Code },
  ];

  const sectionVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
  };

  return (
    <div className="cv-editor glassmorphic">
      {/* Variation Switcher */}
      <div className="cv-version-bar">
        <div className="version-info">
          <input 
            type="text" 
            className="version-name-input" 
            value={resumeName} 
            onChange={(e) => onRename(e.target.value)}
            placeholder="Variation Name (e.g. AI Engineer)"
          />
          <span className="version-status">{activeId ? 'Saved' : 'New Draft'}</span>
        </div>
        
        <div className="version-actions">
          <select 
            className="version-select" 
            value={activeId || ''} 
            onChange={(e) => {
              const res = resumes.find(r => r.id === parseInt(e.target.value));
              if (res) onSwitch(res.id, res.name);
            }}
          >
            <option value="" disabled>Switch Variation...</option>
            {resumes.map(r => (
              <option key={r.id} value={r.id}>{r.name} ({r.date})</option>
            ))}
          </select>
          <button className="btn btn-ghost btn-icon" onClick={onNew} title="Create New Variation">
            <Plus size={18} />
          </button>
        </div>
      </div>

      <div className="editor-nav">
        {navItems.map((item) => (
          <button 
            key={item.id} 
            className={`nav-item-btn ${activeSection === item.id ? 'active' : ''}`}
            onClick={() => setActiveSection(item.id)}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      <div className="editor-content">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            variants={sectionVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.2 }}
          >
            {activeSection === 'basics' && (
              <div className="section-form">
                <h2><User className="inline-icon" size={20} /> Personal Profile</h2>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Full Name</label>
                    <input 
                      className="form-input"
                      value={data.basics.name} 
                      onChange={(e) => updateBasics('name', e.target.value)} 
                      placeholder="e.g. Salman Agha"
                    />
                  </div>
                  <div className="form-group">
                    <label>Headline</label>
                    <input 
                      className="form-input"
                      value={data.basics.label} 
                      onChange={(e) => updateBasics('label', e.target.value)} 
                      placeholder="e.g. AI Engineer"
                    />
                  </div>
                  <div className="form-group">
                    <label>Email Address</label>
                    <input 
                      className="form-input"
                      value={data.basics.email} 
                      onChange={(e) => updateBasics('email', e.target.value)} 
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone Number</label>
                    <input 
                      className="form-input"
                      value={data.basics.phone} 
                      onChange={(e) => updateBasics('phone', e.target.value)} 
                    />
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label>Location</label>
                    <input 
                      className="form-input"
                      value={data.basics.location} 
                      onChange={(e) => updateBasics('location', e.target.value)} 
                      placeholder="City, Country"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'work' && (
              <div className="section-form">
                <div className="section-header">
                  <h2><Briefcase className="inline-icon" size={20} /> Technical Experience</h2>
                  <button 
                    className="btn btn-primary btn-sm"
                    onClick={() => addArrayItem('work', { company: '', position: '', startDate: '', endDate: '', highlights: [''] })}
                  >
                    <Plus size={14} /> Add Role
                  </button>
                </div>
                {data.work.length === 0 && (
                  <div className="empty-section-tip">No experience added yet. Try importing your CV!</div>
                )}
                {data.work.map((job, idx) => (
                  <div key={idx} className="card-item">
                    <button className="btn-remove" onClick={() => removeArrayItem('work', idx)}><Trash2 size={14}/></button>
                    <div className="form-grid">
                      <div className="form-group">
                        <label>Company</label>
                        <input className="form-input" value={job.company} onChange={(e) => updateArrayItem('work', idx, 'company', e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label>Position</label>
                        <input className="form-input" value={job.position} onChange={(e) => updateArrayItem('work', idx, 'position', e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label>Start date</label>
                        <input className="form-input" value={job.startDate} onChange={(e) => updateArrayItem('work', idx, 'startDate', e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label>End date</label>
                        <input className="form-input" value={job.endDate} onChange={(e) => updateArrayItem('work', idx, 'endDate', e.target.value)} />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Key Achievements (One per line)</label>
                      <textarea 
                        className="form-input"
                        style={{ minHeight: '100px', resize: 'vertical' }}
                        value={job.highlights.join('\n')}
                        onChange={(e) => updateArrayItem('work', idx, 'highlights', e.target.value.split('\n'))}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeSection === 'skills' && (
              <div className="section-form">
                <div className="section-header">
                  <h2><Code className="inline-icon" size={20} /> Skill Matrix</h2>
                  <button 
                    className="btn btn-primary btn-sm"
                    onClick={() => addArrayItem('skills', { name: '', keywords: [''] })}
                  >
                    <Plus size={14} /> Add Group
                  </button>
                </div>
                {data.skills.map((skill, idx) => (
                  <div key={idx} className="card-item">
                    <button className="btn-remove" onClick={() => removeArrayItem('skills', idx)}><Trash2 size={14}/></button>
                    <div className="form-group">
                      <label>Category Name</label>
                      <input className="form-input" placeholder="e.g. Cloud Infrastructure" value={skill.name} onChange={(e) => updateArrayItem('skills', idx, 'name', e.target.value)} />
                    </div>
                    <div className="form-group" style={{ marginTop: '1rem' }}>
                      <label>Skills (Separated by commas)</label>
                      <input 
                        className="form-input"
                        placeholder="AWS, Docker, Kubernetes"
                        value={skill.keywords.join(', ')} 
                        onChange={(e) => updateArrayItem('skills', idx, 'keywords', e.target.value.split(',').map(s => s.trim()))} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="editor-actions">
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          accept=".pdf"
          onChange={handleFileUpload}
        />
        <button 
          className="btn btn-ghost" 
          style={{ flex: 1, justifyContent: 'center' }}
          onClick={() => fileInputRef.current.click()}
          disabled={isExtracting}
        >
          {isExtracting ? <Loader2 size={18} className="spin" /> : <Upload size={18} />}
          {isExtracting ? 'Analyzing...' : 'Auto-Import'}
        </button>
        <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={onSave}>
          <span>💾 Save Profile</span>
        </button>
        <button className="btn btn-primary" style={{ flex: 1.5, justifyContent: 'center' }} onClick={onDownload}>
          <Download size={18} />
          Export ATS PDF
        </button>
      </div>
    </div>
  );
};

export default CVEditor;
