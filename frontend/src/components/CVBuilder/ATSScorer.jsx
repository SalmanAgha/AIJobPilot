import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Zap, AlertCircle, CheckCircle2, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

const ATSScorer = ({ onOptimize, result, loading }) => {
  const [jobDesc, setJobDesc] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="ats-scorer-widget glassmorphic">
      <div className="widget-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="title-area">
          <Target className="icon-blue" size={18} />
          <h3>ATS Match Scorer</h3>
          {result && <span className="score-badge">{result.score}%</span>}
        </div>
        <button className="btn-icon">
          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="widget-body"
          >
            {!result && !loading && (
              <div className="scorer-input-area">
                <textarea 
                  placeholder="Paste Job Description here to check match score..."
                  value={jobDesc}
                  onChange={(e) => setJobDesc(e.target.value)}
                />
                <button 
                  className="btn btn-primary btn-full"
                  onClick={() => onOptimize(jobDesc)}
                  disabled={!jobDesc.trim()}
                >
                  <Zap size={14} /> Analyze Match
                </button>
              </div>
            )}

            {loading && (
              <div className="scorer-loading">
                <Loader2 className="spin icon-blue" size={32} />
                <p>Decoding ATS algorithms...</p>
              </div>
            )}

            {result && !loading && (
              <div className="scorer-results">
                <div className="score-summary">
                  <div className="gauge-container">
                    <svg viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="45" fill="none" stroke="#1e293b" strokeWidth="10" />
                      <circle 
                        cx="50" cy="50" r="45" 
                        fill="none" 
                        stroke="#3b82f6" 
                        strokeWidth="10"
                        strokeDasharray={`${result.score * 2.83} 283`}
                        transform="rotate(-90 50 50)"
                        strokeLinecap="round"
                      />
                      <text x="50" y="55" fontSize="20" fontWeight="800" textAnchor="middle" fill="white">
                        {result.score}%
                      </text>
                    </svg>
                  </div>
                  <p className="verdict">{result.atsVerdict}</p>
                </div>

                <div className="breakdown-grid">
                  {Object.entries(result.breakDown).map(([key, val]) => (
                    <div key={key} className="breakdown-item">
                      <span className="label">{key}</span>
                      <div className="bar-bg"><div className="bar-fill" style={{ width: `${val}%` }} /></div>
                    </div>
                  ))}
                </div>

                <div className="missing-keywords">
                  <h4><AlertCircle size={14} /> Missing Keywords</h4>
                  <div className="keyword-tags">
                    {result.missingKeywords.map(kw => <span key={kw} className="kw-tag">{kw}</span>)}
                  </div>
                </div>

                <div className="fixes-list">
                  <h4><CheckCircle2 size={14} /> Actionable Fixes</h4>
                  <ul>
                    {result.suggestedFixes.map(fix => <li key={fix}>{fix}</li>)}
                  </ul>
                </div>

                <button className="btn btn-ghost btn-full mt-2" onClick={() => onOptimize(jobDesc)}>
                  Re-Analyze
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ATSScorer;
