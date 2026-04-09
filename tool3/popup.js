// JobAssist Pro V2.1 - Enhanced Intelligence Update
const PROFILE_DATA = {
    personal: {
        firstName: "Jane",
        lastName: "Smith",
        fullName: "Jane Smith",
        email: "jane.smith@example.com",
        phone: "+353871234567", // Removed spaces for better mapping
        location: "Dublin, Ireland",
        portfolio: "https://janesmith.dev",
        linkedin: "https://linkedin.com/in/janesmith",
        github: "https://github.com/janesmith"
    },
    work: {
        currentTitle: "Senior Software Engineer",
        currentCompany: "Tech Innovators",
        experienceYears: "7",
        noticePeriod: "1 month",
        expectedSalary: "90000",
    },
    legal: {
        visaRequired: "No", 
        authorizedToWork: "Yes",
        sponsorshipNeeded: "No"
    }
};

const magicBtn = document.getElementById('magicFillBtn');
const scanBtn = document.getElementById('scanSiteBtn');
const statusArea = document.getElementById('statusArea');
const logContent = document.getElementById('logContent');
const aiSection = document.getElementById('aiAnalysis');
const analysisDiv = document.getElementById('analysisResult');
const aiBridgeBtn = document.getElementById('aiBridgeBtn');
const copyLogsBtn = document.getElementById('copyLogsBtn');

function addLog(text, color = "#94a3b8") {
    statusArea.style.display = 'block';
    const div = document.createElement('div');
    div.className = 'log-line';
    div.style.color = color;
    div.innerHTML = `<span class="dot" style="background:${color}"></span> ${text}`;
    logContent.appendChild(div);
    statusArea.scrollTop = statusArea.scrollHeight;
}

copyLogsBtn.addEventListener('click', () => {
    const text = logContent.innerText;
    navigator.clipboard.writeText(text);
    const originalText = copyLogsBtn.innerText;
    copyLogsBtn.innerText = "Copied!";
    setTimeout(() => {
        copyLogsBtn.innerText = originalText;
    }, 2000);
});

magicBtn.addEventListener('click', async () => {
    logContent.innerHTML = '';
    addLog("Analyzing form architecture...", "#6366f1");
    
    try {
        let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: executeMagicFill,
            args: [PROFILE_DATA]
        }, (results) => {
            if (chrome.runtime.lastError) {
                addLog("Security Block: " + chrome.runtime.lastError.message, "#ef4444");
            } else {
                const stats = results[0].result;
                if (stats.filled > 0) {
                    addLog(`Successfully injected ${stats.filled} fields!`, "#22c55e");
                    addLog(`Identified engine: ${stats.engine}`, "#c084fc");
                } else {
                    addLog("No matching fields found on this screen.", "#f59e0b");
                }
            }
        });
    } catch (err) {
        addLog("Critical failure: " + err.message, "#ef4444");
    }
});

scanBtn.addEventListener('click', async () => {
    addLog("Booting Deep Scan Engine...", "#c084fc");
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: scanPageIntelligence
    }, (results) => {
        aiSection.style.display = 'block';
        if (results && results[0]) {
            const data = results[0].result;
            analysisDiv.innerHTML = `
                <div style="color:#22c55e; margin-bottom:4px; font-weight:bold;">🔍 SITE AUDIT COMPLETE</div>
                <div style="margin-bottom:2px;">Engine: <strong>${data.platform}</strong></div>
                <div style="margin-bottom:2px;">Complexity: <strong>${data.complexity}</strong></div>
                <div style="margin-bottom:8px;">Identified Inputs: <strong>${data.fieldCount}</strong></div>
                <div style="border-top:1px solid #334155; padding-top:8px; font-size:11px; color:#94a3b8;">
                    <strong>ROADMAP:</strong><br/>
                    ${data.steps.join(' → ')}
                </div>
            `;
        }
    });
});

aiBridgeBtn.addEventListener('click', async () => {
    logContent.innerHTML = '';
    addLog("Initializing AI Bridge...", "#c084fc");
    document.getElementById('attachmentNotice').style.display = 'none';
    document.getElementById('questionsArea').style.display = 'none';
    
    try {
        let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        addLog("Capturing complex form context...", "#6366f1");
        
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: captureDetailedContext
        }, async (results) => {
            if (results && results[0]) {
                const context = results[0].result;
                addLog(`Found ${context.formFields.length} potential fields.`, "#22c55e");
                
                // Show attachment notice if file input exists
                if (context.hasFileInput) {
                    document.getElementById('attachmentNotice').style.display = 'block';
                    addLog("Detected Attachment field!", "#22c55e");
                }

                addLog("Connecting to Backend AI...", "#c084fc");
                
                try {
                    const response = await fetch('http://localhost:5000/api/bridge/fill', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(context)
                    });
                    
                    if (!response.ok) {
                        const errData = await response.json().catch(() => ({}));
                        throw new Error(errData.error || "Backend connection failed.");
                    }
                    
                    const mapping = await response.json();
                    addLog("AI Mapping received!", "#22c55e");
                    
                    chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        function: applyDetailedMapping,
                        args: [mapping]
                    }, (res) => {
                        const stats = res[0].result;
                        addLog(`Successfully filled ${stats.filled} fields.`, "#22c55e");
                        
                        if (stats.unfilled && stats.unfilled.length > 0) {
                            showUnfilledQuestions(stats.unfilled, tab.id);
                        }
                    });
                    
                } catch (err) {
                    addLog("Bridge Error: " + err.message, "#ef4444");
                }
            }
        });
    } catch (err) {
        addLog("Critical failure: " + err.message, "#ef4444");
    }
});

function showUnfilledQuestions(unfilled, tabId) {
    const area = document.getElementById('questionsArea');
    const list = document.getElementById('questionsList');
    list.innerHTML = '';
    area.style.display = 'block';
    
    unfilled.forEach(q => {
        const div = document.createElement('div');
        div.style.borderBottom = "1px solid #334155";
        div.style.paddingBottom = "8px";
        div.innerHTML = `
            <div style="font-weight:bold; margin-bottom:4px;">${q.label}</div>
            <div id="q-${q.id || q.name}" style="display:flex; flex-wrap:wrap; gap:4px;">
                <span style="color:#94a3b8">Scan engine finding options...</span>
            </div>
        `;
        list.appendChild(div);
        
        // If it has options from context, show them
        if (q.options && q.options.length > 0) {
            const optDiv = div.querySelector('div[id^="q-"]');
            optDiv.innerHTML = '';
            q.options.forEach(opt => {
                const btn = document.createElement('button');
                btn.innerText = opt;
                btn.style.cssText = "background:#334155; border:1px solid #475569; color:white; font-size:10px; padding:2px 8px; border-radius:4px; cursor:pointer;";
                btn.onclick = () => {
                    chrome.scripting.executeScript({
                        target: { tabId: tabId },
                        function: (id, val) => {
                            const el = document.getElementById(id) || document.querySelector(`[name="${id}"]`);
                            if (el) {
                                if (el.type === 'radio' || el.type === 'checkbox') {
                                    el.click();
                                } else {
                                    el.value = val;
                                }
                                el.dispatchEvent(new Event('change', {bubbles:true}));
                            }
                        },
                        args: [q.id || q.name, opt]
                    });
                    btn.style.background = "#22c55e";
                };
                optDiv.appendChild(btn);
            });
        }
    });
}

/**
 * -------------------------------------------------------------------
 * CORE V2.1 ENGINE: SHADOW DOM & IFRAME SUPPORT (Experimental)
 * -------------------------------------------------------------------
 */
function executeMagicFill(data) {
    let filled = 0;
    
    // Find all potential inputs, including ones inside Shadow DOMs commonly used in Workday
    function findInputs(root = document) {
        let inputs = Array.from(root.querySelectorAll('input, textarea, select, [role="textbox"]'));
        const shadows = Array.from(root.querySelectorAll('*')).filter(el => el.shadowRoot);
        shadows.forEach(s => {
            inputs = inputs.concat(findInputs(s.shadowRoot));
        });
        return inputs;
    }

    const allInputs = findInputs();

    function fuzzyMatch(targets, text) {
        text = text.toLowerCase();
        return targets.some(t => text.includes(t.toLowerCase()));
    }

    function triggerFrameworkEvents(el) {
        // Essential for React/Vue/Angular consistency
        const events = ['input', 'change', 'blur'];
        events.forEach(name => {
            const event = new Event(name, { bubbles: true });
            el.dispatchEvent(event);
        });
        // Special case for some custom frameworks
        el.dataset.filledByAutoFill = "true";
    }

    allInputs.forEach(el => {
        const label = document.querySelector(`label[for="${el.id}"]`)?.innerText || 
                      el.closest('div')?.querySelector('p, span')?.innerText || "";
        const id = el.id || "";
        const name = el.name || "";
        const placeholder = el.placeholder || "";
        const ariaLabel = el.getAttribute('aria-label') || "";
        const title = el.title || "";
        
        const context = `${label} ${id} ${name} ${placeholder} ${ariaLabel} ${title}`.toLowerCase();

        let val = null;

        // HIGH-VELOCITY MAPPING
        if (fuzzyMatch(['first name', 'given name'], context)) val = data.personal.firstName;
        else if (fuzzyMatch(['last name', 'surname', 'family name'], context)) val = data.personal.lastName;
        else if (fuzzyMatch(['full name'], context)) val = data.personal.fullName;
        else if (fuzzyMatch(['email'], context)) val = data.personal.email;
        else if (fuzzyMatch(['phone', 'mobile', 'contact'], context)) val = data.personal.phone;
        else if (fuzzyMatch(['linkedin'], context)) val = data.personal.linkedin;
        else if (fuzzyMatch(['github'], context)) val = data.personal.github;
        else if (fuzzyMatch(['portfolio', 'website', 'personal site'], context)) val = data.personal.portfolio;
        else if (fuzzyMatch(['location', 'city', 'country', 'address'], context)) val = data.personal.location;
        else if (fuzzyMatch(['current company', 'employer'], context)) val = data.work.currentCompany;
        else if (fuzzyMatch(['job title', 'current role'], context)) val = data.work.currentTitle;

        if (val && !el.value && el.type !== 'radio' && el.type !== 'checkbox') {
            el.focus();
            el.value = val;
            triggerFrameworkEvents(el);
            filled++;
        }

        // SMART CHOICE ENGINE (RADIO/CHECKBOX)
        if ((el.type === 'radio' || el.type === 'checkbox') && !el.checked) {
            const wrapperText = el.parentElement?.innerText.toLowerCase() || 
                               el.closest('div')?.innerText.toLowerCase() || "";
            
            // Visa sponsorship
            if (fuzzyMatch(['sponsorship', 'visa', 'require'], context + wrapperText)) {
                if (fuzzyMatch([data.legal.visaRequired], context + wrapperText)) {
                    el.click();
                    triggerFrameworkEvents(el);
                }
            }
            // Authorized to work
            if (fuzzyMatch(['authorized', 'eligib', 'legally'], context + wrapperText)) {
                if (fuzzyMatch([data.legal.authorizedToWork], context + wrapperText)) {
                    el.click();
                    triggerFrameworkEvents(el);
                }
            }
            // Acknowledge/Terms
            if (fuzzyMatch(['confirm', 'acknowledge', 'agree', 'i have read'], context + wrapperText)) {
                el.click();
                triggerFrameworkEvents(el);
            }
        }
    });

    const pageText = document.body.innerText.toLowerCase();
    const engine = pageText.includes('workday') ? 'Workday' : (pageText.includes('lever') ? 'Lever' : 'Standard');

    return { filled, engine };
}

function scanPageIntelligence() {
    const text = document.body.innerText.toLowerCase();
    const platform = text.includes('workday') ? 'Workday Engine V3' : 
                     text.includes('lever') ? 'Lever Pipeline' : 'Standard Dynamic Form';
    
    const inputs = document.querySelectorAll('input').length;
    const steps = Array.from(document.querySelectorAll('[class*="step"], [id*="step"], .progress-step'))
        .map(s => s.innerText.trim())
        .filter(s => s.length > 0 && s.length < 30);

    return {
        platform: platform,
        complexity: inputs > 20 ? 'Level: Advanced' : 'Level: Moderate',
        fieldCount: inputs,
        steps: steps.length > 0 ? [...new Set(steps)] : ['Sequential Workflow']
    };
}

/**
 * AI BRIDGE HELPERS V2.1
 */
function captureDetailedContext() {
    function getRoot(el) {
        let root = el.getRootNode();
        return root instanceof ShadowRoot ? root : document;
    }

    function findInputs(root = document) {
        let inputs = Array.from(root.querySelectorAll('input, textarea, select, [role="textbox"]'));
        const shadows = Array.from(root.querySelectorAll('*')).filter(el => el.shadowRoot);
        shadows.forEach(s => {
            inputs = inputs.concat(findInputs(s.shadowRoot));
        });
        return inputs;
    }

    const allInputs = findInputs();
    let hasFileInput = false;

    const formFields = allInputs.map(el => {
        if (el.type === 'file') hasFileInput = true;
        
        const labelEl = document.querySelector(`label[for="${el.id}"]`);
        let label = labelEl?.innerText || 
                    el.closest('div')?.querySelector('p, span')?.innerText || 
                    el.placeholder || el.name || el.id || "";
        
        let options = [];
        if (el.tagName === 'SELECT') {
            options = Array.from(el.options).map(o => o.text).filter(t => t.length > 0);
        } else if (el.type === 'radio' || el.type === 'checkbox') {
            const group = document.querySelectorAll(`[name="${el.name}"]`);
            options = Array.from(group).map(input => {
                return input.parentElement?.innerText.trim() || input.value;
            }).filter(t => t.length > 0);
        }

        return {
            id: el.id,
            name: el.name,
            type: el.type,
            label: label.trim(),
            placeholder: el.placeholder,
            options: [...new Set(options)]
        };
    }).filter(f => (f.label || f.id || f.name) && f.type !== 'hidden');

    return {
        formFields,
        hasFileInput,
        pageUrl: window.location.href,
        pageTitle: document.title
    };
}

function applyDetailedMapping(mapping) {
    function findInputs(root = document) {
        let inputs = Array.from(root.querySelectorAll('input, textarea, select, [role="textbox"]'));
        const shadows = Array.from(root.querySelectorAll('*')).filter(el => el.shadowRoot);
        shadows.forEach(s => {
            inputs = inputs.concat(findInputs(s.shadowRoot));
        });
        return inputs;
    }

    const allInputs = findInputs();
    let filled = 0;
    const unfilled = [];

    // Group inputs by name to handle radio groups properly
    const processedNames = new Set();

    allInputs.forEach(el => {
        const key = el.id || el.name;
        if (!key || el.type === 'hidden') return;

        if (mapping[key]) {
            el.focus();
            let success = false;
            
            if (el.type === 'radio' || el.type === 'checkbox') {
                const targetVal = String(mapping[key]).toLowerCase();
                const parentText = el.parentElement?.innerText.toLowerCase() || "";
                if (parentText.includes(targetVal) || el.value.toLowerCase() === targetVal) {
                    if (!el.checked) {
                        el.click();
                        success = true;
                    }
                }
            } else {
                el.value = mapping[key];
                success = true;
            }
            
            if (success) {
                filled++;
                el.dispatchEvent(new Event('change', { bubbles: true }));
            }
        } else if (el.type !== 'file') {
            // If the field is still empty and it's a "selection" type, mark for user
            if (!el.value && !processedNames.has(el.name)) {
                if (el.type === 'radio' || el.type === 'checkbox' || el.tagName === 'SELECT') {
                    const label = document.querySelector(`label[for="${el.id}"]`)?.innerText || 
                                 el.closest('div')?.querySelector('p, span')?.innerText || el.name || el.id;
                    
                    let options = [];
                    if (el.tagName === 'SELECT') options = Array.from(el.options).map(o => o.text);
                    else if (el.name) {
                        const group = document.querySelectorAll(`[name="${el.name}"]`);
                        options = Array.from(group).map(i => i.parentElement?.innerText.trim());
                    }

                    unfilled.push({ id: el.id, name: el.name, label, options: [...new Set(options)] });
                    if (el.name) processedNames.add(el.name);
                }
            }
        }
    });

    return { filled, unfilled };
}
