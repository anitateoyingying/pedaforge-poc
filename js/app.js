/* ============================================================
   PedaForge Demo – Shared JavaScript
   Static demo site interactivity (no backend)
   ============================================================ */

/* ─── Inject animation CSS ────────────────────────────────── */
(() => {
  const style = document.createElement('style');
  style.textContent = `
    .animate-on-scroll { opacity: 0; transform: translateY(20px); transition: all 0.6s ease; }
    .animate-on-scroll.visible { opacity: 1; transform: translateY(0); }
  `;
  document.head.appendChild(style);
})();

document.addEventListener('DOMContentLoaded', () => {
  initNavbarScroll();
  initActiveNavLink();
  initMobileNav();
  initNavDropdowns();
  initSmoothScroll();
  initCoachingModes();
  initChatDemoInput();
  initPlannerDemo();
  initPortfolioDemo();
  initDashboardDemo();
  initCounterAnimation();
  initScrollAnimations();
  initBlobParallax();
  initScrollProgress();
  initMagneticTilt();
  initButtonRipple();
  initHeroParallax();
  initTypingIndicator();
  initBackToTop();
});

/* ─── 1. Navbar Scroll Effect ─────────────────────────────── */

function initNavbarScroll() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;

  const update = () => {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', update, { passive: true });
  update();
}

function initActiveNavLink() {
  const links = document.querySelectorAll('.nav-links a');
  if (links.length === 0) return;

  const path = window.location.pathname;

  links.forEach(link => {
    const href = link.getAttribute('href');
    if (!href) return;

    const linkPath = href.replace(/^\.\//, '').replace(/^\//, '');
    const currentPath = path.replace(/^\//, '');

    const isHome = linkPath === '' || linkPath === 'index.html';
    const currentIsHome = currentPath === '' || currentPath.endsWith('/') || currentPath.endsWith('index.html');

    if (isHome && currentIsHome) {
      link.classList.add('active');
    } else if (!isHome && currentPath.endsWith(linkPath)) {
      link.classList.add('active');
    }
  });
}

/* ─── 2. Mobile Navigation Toggle ─────────────────────────── */

function initMobileNav() {
  const toggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (!toggle || !navLinks) return;

  toggle.addEventListener('click', () => {
    navLinks.classList.toggle('open');
  });

  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
    });
  });
}

/* ─── 2b. Nav Dropdown Interaction ────────────────────────── */

function initNavDropdowns() {
  const triggers = document.querySelectorAll('.nav-dropdown-trigger');
  triggers.forEach(trigger => {
    const parent = trigger.parentElement;
    if (!parent) return;

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const wasOpen = parent.classList.contains('dropdown-open');
      // Close all dropdowns
      document.querySelectorAll('.nav-links li.dropdown-open').forEach(li => li.classList.remove('dropdown-open'));
      if (!wasOpen) parent.classList.add('dropdown-open');
    });
  });

  // Close dropdowns on outside click
  document.addEventListener('click', () => {
    document.querySelectorAll('.nav-links li.dropdown-open').forEach(li => li.classList.remove('dropdown-open'));
  });

  // Close dropdowns when a link inside is clicked
  document.querySelectorAll('.nav-dropdown a').forEach(link => {
    link.addEventListener('click', () => {
      document.querySelectorAll('.nav-links li.dropdown-open').forEach(li => li.classList.remove('dropdown-open'));
    });
  });
}

/* ─── 3. Smooth Scroll ────────────────────────────────────── */

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href');
      if (!targetId || targetId === '#') return;

      const target = document.querySelector(targetId);
      if (!target) return;

      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

/* ─── 4. Coaching Mode Selector ───────────────────────────── */

const COACHING_CONVERSATIONS = {
  reflective: [
    {
      role: 'assistant',
      text: "Welcome! I'm your PedaForge Coach. Let's reflect on today's teaching. Can you describe a moment from today where you felt a child was particularly engaged, or particularly struggling?"
    },
    {
      role: 'user',
      text: "During our 'Community Helpers' activity, Leo got frustrated when building the fire station. He threw the blocks and started crying."
    },
    {
      role: 'assistant',
      text: 'That sounds like a significant moment. Before we explore strategies, tell me: what was your immediate reaction when Leo threw the blocks? <span class="qtt-tag">QTT: Teacher–Child Interaction</span>'
    },
    {
      role: 'user',
      text: 'I sat at his eye level, acknowledged his anger, and offered him a different tool.'
    },
    {
      role: 'assistant',
      text: "Excellent emotional scaffolding. You instinctively acted as Leo's Key Person by getting to his level and validating his feelings. For tomorrow, consider guiding Leo to articulate what frustrated him before offering alternatives. This builds his self-regulation vocabulary. <span class=\"qtt-tag\">QTT: Sustained Shared Thinking</span>"
    }
  ],

  qtt: [
    {
      role: 'assistant',
      text: "Let's focus on a specific QTT domain today. Which area would you like to explore: Learning Environment, Teacher–Child Interaction, or Curriculum & Pedagogy?"
    },
    {
      role: 'user',
      text: 'I want to improve my Learning Environment setup.'
    },
    {
      role: 'assistant',
      text: 'Good choice. Describe your current classroom layout. How are your learning corners organised, and what intentional choices have you made about material placement? <span class="qtt-tag">QTT: Learning Environment: Physical Setup</span>'
    },
    {
      role: 'user',
      text: "I have a reading corner, dramatic play area, and a math/science station. But children rarely use the science station."
    },
    {
      role: 'assistant',
      text: "Low engagement with the science station often indicates accessibility or visual cue issues. Try placing provocation questions at children's eye level, rotating materials weekly, and linking the station to your current theme. If your theme is 'Community Helpers', add magnifying glasses and uniforms to examine. How might you connect science exploration to your children's current interests? <span class=\"qtt-tag\">QTT: Learning Environment: Materials & Resources</span>"
    }
  ],

  socratic: [
    {
      role: 'assistant',
      text: "I'd like to explore your pedagogical assumptions today. Think about a routine practice you follow, something you've 'always done this way.' What comes to mind?"
    },
    {
      role: 'user',
      text: 'We always do circle time at 9am with the whole class sitting together.'
    },
    {
      role: 'assistant',
      text: "Interesting. What would happen if you didn't have whole-group circle time? What purpose does it actually serve for the children, not for the schedule? <span class=\"qtt-tag\">Assumption Challenge</span>"
    },
    {
      role: 'user',
      text: "Hmm... I suppose it's for community building and introducing the day's activities."
    },
    {
      role: 'assistant',
      text: "If community building is the goal, is a 20-minute large group the most effective format for 4-year-olds? What evidence from your own classroom tells you this works, or doesn't? Consider: which children thrive during circle time, and which struggle to sit still? What might that tell you? <span class=\"qtt-tag\">Evidence Examination</span>"
    }
  ],

  scenario: [
    {
      role: 'assistant',
      text: "Let's stress-test a plan before you implement it. Describe a lesson or initiative you're planning for next week."
    },
    {
      role: 'user',
      text: "I'm planning a cooking activity where children make fruit salad to learn about healthy eating."
    },
    {
      role: 'assistant',
      text: "Let's imagine it's Friday afternoon and the cooking activity went poorly. What's the most likely reason it failed? Think about logistics, safety, child engagement, and learning outcomes. <span class=\"qtt-tag\">Pre-Mortem: Failure Identification</span>"
    },
    {
      role: 'user',
      text: 'Probably children fighting over who gets to cut the fruits, or some children not wanting to try new fruits.'
    },
    {
      role: 'assistant',
      text: "Good identification. Now let's build safeguards. For the cutting conflict: assign rotating roles (cutter, mixer, server) with a visual role chart. For food reluctance: use a 'brave taste' approach; no child is forced, but the activity includes sensory exploration (smell, touch, describe) before tasting. What's your allergy protocol, and have you confirmed dietary restrictions with all parents? <span class=\"qtt-tag\">Risk Mitigation</span>"
    }
  ]
};

function initCoachingModes() {
  const modes = document.querySelectorAll('.coaching-mode');
  if (modes.length === 0) return;

  const modeKeys = ['reflective', 'qtt', 'socratic', 'scenario'];

  modes.forEach((mode, index) => {
    mode.addEventListener('click', () => {
      modes.forEach(m => m.classList.remove('active'));
      mode.classList.add('active');

      const key = modeKeys[index] || 'reflective';
      renderConversation(key);

      const chatHeader = document.querySelector('.chat-demo-header h4') || document.getElementById('indexChatTitle');
      if (chatHeader) {
        const MODE_DISPLAY = {
          reflective: 'AI Coach: Reflective Practice Mode',
          qtt: 'AI Coach: QTT Deep Dive Mode',
          socratic: 'AI Coach: Socratic Inquiry Mode',
          scenario: 'AI Coach: Scenario Analysis Mode'
        };
        chatHeader.textContent = MODE_DISPLAY[key] || MODE_DISPLAY.reflective;
      }
    });
  });

  // Set default active mode if none is active
  if (!document.querySelector('.coaching-mode.active') && modes.length > 0) {
    modes[0].classList.add('active');
  }
}

function renderConversation(modeKey) {
  const chatBody = document.querySelector('.chat-demo-body');
  if (!chatBody) return;

  const conversation = COACHING_CONVERSATIONS[modeKey];
  if (!conversation) return;

  chatBody.innerHTML = '';

  conversation.forEach((msg, i) => {
    const delay = i * 200;
    setTimeout(() => {
      const messageEl = createChatMessage(msg.role, msg.text);
      chatBody.appendChild(messageEl);
      chatBody.scrollTop = chatBody.scrollHeight;
    }, delay);
  });
}

function createChatMessage(role, text) {
  const wrapper = document.createElement('div');
  wrapper.className = `chat-message ${role}`;

  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  avatar.textContent = role === 'assistant' ? 'PF' : 'You';

  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble';
  bubble.innerHTML = text;

  wrapper.appendChild(avatar);
  wrapper.appendChild(bubble);
  return wrapper;
}

/* ─── 5. Chat Demo Interaction ────────────────────────────── */

const CHAT_CANNED_RESPONSES = [
  {
    keywords: ['frustrated', 'angry', 'crying'],
    response: "Emotional moments like these are powerful learning opportunities. Consider using the RULER approach: Recognise the emotion, Understand its source, Label it with the child, Express empathy, and then Regulate together. You might say, \"I can see you're feeling very frustrated. That's okay. Let's take a deep breath together.\" Building an emotional vocabulary helps children self-regulate over time. <span class=\"qtt-tag\">QTT: Emotional Regulation</span>"
  },
  {
    keywords: ['lesson', 'plan', 'activity'],
    response: "When planning activities, differentiation is key. Consider three tiers: (1) a simplified version for children who need more support, (2) the core activity for most learners, and (3) extension challenges for those ready to go further. This ensures every child experiences success while being appropriately stretched. What age group are you planning for? <span class=\"qtt-tag\">QTT: Curriculum & Pedagogy</span>"
  },
  {
    keywords: ['parent', 'family'],
    response: "Family engagement is a cornerstone of effective early years practice. Consider implementing a two-way communication strategy: share observations via a digital portfolio, but also create structured opportunities for families to share what they notice at home. A simple \"Home Learning Story\" template can bridge the gap between school and home learning. <span class=\"qtt-tag\">QTT: Partnerships with Parents</span>"
  }
];

const CHAT_DEFAULT_RESPONSE = "That's a thoughtful observation. Can you tell me more about what you noticed in the children's responses? How did their engagement change throughout the activity? <span class=\"qtt-tag\">QTT: Observation & Assessment</span>";

function initChatDemoInput() {
  const inputContainer = document.querySelector('.chat-demo-input');
  if (!inputContainer) return;

  const input = inputContainer.querySelector('input');
  const sendBtn = inputContainer.querySelector('button');
  if (!input || !sendBtn) return;

  const handleSend = () => {
    const text = input.value.trim();
    if (!text) return;

    const chatBody = document.querySelector('.chat-demo-body');
    if (!chatBody) return;

    // Add user message
    const userMsg = createChatMessage('user', escapeHtml(text));
    chatBody.appendChild(userMsg);
    chatBody.scrollTop = chatBody.scrollHeight;
    input.value = '';

    // Simulate assistant response after a short delay
    setTimeout(() => {
      const response = pickCannedResponse(text);
      const assistantMsg = createChatMessage('assistant', response);
      chatBody.appendChild(assistantMsg);
      chatBody.scrollTop = chatBody.scrollHeight;
    }, 1000);
  };

  sendBtn.addEventListener('click', handleSend);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  });
}

function pickCannedResponse(userText) {
  const lower = userText.toLowerCase();

  for (const entry of CHAT_CANNED_RESPONSES) {
    const matched = entry.keywords.some(kw => lower.includes(kw));
    if (matched) return entry.response;
  }

  return CHAT_DEFAULT_RESPONSE;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ─── 6. Planner Demo ─────────────────────────────────────── */

const PLANNER_CONTENT = {
  'community-helpers': {
    activity: 'Building a Fire Station',
    duration: '45 minutes',
    learningArea: 'Discovery of the World + Aesthetics & Creative Expression',
    keyConcepts: 'Community roles, cooperation, spatial awareness',
    scaffolding: [
      { profile: 'Kinesthetic Learners', color: 'rgba(59,130,246,0.1)', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>', desc: 'Allow children to physically build the fire station using large hollow blocks. Incorporate movement: "run like firefighters" to count blocks needed.' },
      { profile: 'Visual-Spatial Learners', color: 'rgba(139,92,246,0.1)', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>', desc: 'Provide blueprint templates and reference photos of fire stations. Use grid paper for children to design their station before building.' },
      { profile: 'Advanced Verbal', color: 'rgba(16,185,129,0.1)', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>', desc: 'Assign the "Dispatcher" role: they narrate what\'s happening, call out instructions, and describe the building process to classmates.' },
      { profile: 'Fine-Motor Needs', color: 'rgba(245,158,11,0.1)', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/></svg>', desc: 'Provide larger, ergonomic building pieces. Use Velcro-attached components that require less precision but still allow participation.' },
      { profile: 'Sensory-Avoidant', color: 'rgba(239,68,68,0.1)', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4zM23 9l-6 6M17 9l6 6"/></svg>', desc: 'Offer noise-dampening foam blocks. Designate a quieter building zone away from the main activity hub.' }
    ],
    rehearse: 'Recall last week\'s transportation activity. Ask: "Remember when we learned about different vehicles? What vehicle do firefighters use? How is a fire engine different from a bus?"',
    assessment: [
      'Can the child identify the role of firefighters in the community?',
      'Does the child collaborate effectively during group building?',
      'Can the child follow a simple blueprint or plan?'
    ]
  },
  'my-body': {
    activity: 'Exploring Our Senses',
    duration: '40 minutes',
    learningArea: 'Discovery of the World + Motor Skills Development',
    keyConcepts: 'Five senses, body awareness, descriptive language',
    scaffolding: [
      { profile: 'Kinesthetic Learners', color: 'rgba(59,130,246,0.1)', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>', desc: 'Set up a sensory obstacle course where children crawl, balance, and stretch while identifying which body parts they use at each station.' },
      { profile: 'Visual-Spatial Learners', color: 'rgba(139,92,246,0.1)', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>', desc: 'Provide body outline templates and sticker labels. Children match sense organs to their locations and draw what each sense detects.' },
      { profile: 'Advanced Verbal', color: 'rgba(16,185,129,0.1)', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>', desc: 'Challenge them to be "Sense Reporters" who describe sensory experiences using rich adjectives and record findings in a mini journal.' },
      { profile: 'Fine-Motor Needs', color: 'rgba(245,158,11,0.1)', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/></svg>', desc: 'Use large-handle magnifying glasses and chunky tweezers for sensory exploration. Provide pre-cut labels with Velcro backing for the body map.' },
      { profile: 'Sensory-Avoidant', color: 'rgba(239,68,68,0.1)', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4zM23 9l-6 6M17 9l6 6"/></svg>', desc: 'Offer a preview card showing each sensory station before participation. Provide gloves and tongs as alternatives to direct touch.' }
    ],
    rehearse: 'Recall yesterday\'s circle time about body parts. Ask: "What did we learn about our hands yesterday? How many fingers do we have? What can our hands do that our feet cannot?"',
    assessment: [
      'Can the child name at least three of the five senses?',
      'Does the child use descriptive language when exploring textures and sounds?',
      'Can the child match sense organs to their correct body locations?'
    ]
  },
  'seasons': {
    activity: 'Building a Weather Station',
    duration: '50 minutes',
    learningArea: 'Discovery of the World + Numeracy',
    keyConcepts: 'Weather patterns, measurement, seasonal changes',
    scaffolding: [
      { profile: 'Kinesthetic Learners', color: 'rgba(59,130,246,0.1)', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>', desc: 'Build a physical rain gauge and wind vane outdoors. Children take turns being "Weather Runners" who collect and report measurements.' },
      { profile: 'Visual-Spatial Learners', color: 'rgba(139,92,246,0.1)', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>', desc: 'Create a large visual weather calendar with magnetic icons. Children photograph clouds and compare them to a cloud identification chart.' },
      { profile: 'Advanced Verbal', color: 'rgba(16,185,129,0.1)', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>', desc: 'Assign "Weather Presenter" roles where children deliver a daily forecast to the class, using weather vocabulary and prediction language.' },
      { profile: 'Fine-Motor Needs', color: 'rgba(245,158,11,0.1)', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/></svg>', desc: 'Use large weather symbol stamps instead of drawing. Provide pre-made magnetic weather icons that snap onto the calendar board.' },
      { profile: 'Sensory-Avoidant', color: 'rgba(239,68,68,0.1)', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4zM23 9l-6 6M17 9l6 6"/></svg>', desc: 'Allow indoor observation through windows. Provide headphones for outdoor sessions and a shaded, enclosed observation spot.' }
    ],
    rehearse: 'Recall last week\'s nature walk. Ask: "What did we see on our walk? Were the leaves green or brown? What does that tell us about the season? What might change next month?"',
    assessment: [
      'Can the child identify today\'s weather using correct vocabulary?',
      'Does the child record observations accurately on the weather chart?',
      'Can the child make a simple prediction about tomorrow\'s weather?'
    ]
  }
};

function initPlannerDemo() {
  const chips = document.querySelectorAll('.profile-chip');
  const themeSelect = document.getElementById('theme-select');
  const lessonOutput = document.getElementById('lesson-output');
  const generateBtn = document.getElementById('generate-plan');

  if (chips.length === 0 && !themeSelect) return;

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chip.classList.toggle('selected');
    });
  });

  if (themeSelect) {
    themeSelect.addEventListener('change', () => {
      updatePlannerOutput();
    });
  }

  if (generateBtn) {
    generateBtn.addEventListener('click', () => {
      generateBtn.textContent = 'Generating...';
      generateBtn.disabled = true;
      setTimeout(() => {
        updatePlannerOutput();
        generateBtn.textContent = 'Generate Lesson Plan';
        generateBtn.disabled = false;
      }, 800);
    });
  }

  function updatePlannerOutput() {
    if (!lessonOutput) return;

    const themeKey = themeSelect ? themeSelect.value : 'community-helpers';
    const content = PLANNER_CONTENT[themeKey] || PLANNER_CONTENT['community-helpers'];
    const selectedProfiles = document.querySelectorAll('.profile-chip.selected');
    const selectedNames = new Set(
      Array.from(selectedProfiles).map(chip => {
        const nameEl = chip.querySelector('.profile-name');
        return nameEl ? nameEl.textContent.trim() : '';
      }).filter(Boolean)
    );

    let html = '';

    // Activity header
    html += '<div style="margin-bottom: 20px;">';
    html += '<h3 style="margin-bottom: 12px; color: var(--secondary);">Activity: ' + escapeHtml(content.activity) + '</h3>';
    html += '<div style="display: flex; flex-wrap: wrap; gap: 16px; font-size: 0.9rem; color: var(--text-light);">';
    html += '<span><strong>Duration:</strong> ' + escapeHtml(content.duration) + '</span>';
    html += '<span><strong>Learning Area:</strong> ' + escapeHtml(content.learningArea) + '</span>';
    html += '</div>';
    html += '<div style="font-size: 0.9rem; color: var(--text-light); margin-top: 6px;"><strong>Key Concepts:</strong> ' + escapeHtml(content.keyConcepts) + '</div>';
    html += '</div>';

    // Scaffolding strategies
    html += '<h4 style="margin-bottom: 14px; color: var(--secondary); font-size: 1rem;">Scaffolding Strategies</h4>';

    const profileMap = {
      'Kinesthetic Learners': true,
      'Visual-Spatial Learners': true,
      'Advanced Verbal': true,
      'Fine-Motor Needs': true,
      'Sensory-Avoidant': true,
      'Gifted/Twice Exceptional': true
    };

    content.scaffolding.forEach(item => {
      const isVisible = selectedNames.size === 0 || selectedNames.has(item.profile);
      if (!isVisible) return;

      html += '<div class="scaffolding-item" style="opacity: 0; transform: translateY(10px);">';
      html += '<div class="scaffolding-icon" style="background: ' + item.color + ';">' + item.icon + '</div>';
      html += '<div>';
      html += '<h4>' + escapeHtml(item.profile) + '</h4>';
      html += '<p>' + escapeHtml(item.desc) + '</p>';
      html += '</div>';
      html += '</div>';
    });

    // Rehearse & Retrieve
    html += '<div style="margin-top: 20px; padding: 16px; background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.2); border-radius: var(--radius-sm);">';
    html += '<h4 style="color: var(--secondary); margin-bottom: 8px; font-size: 0.9rem;">Rehearse & Retrieve Prompt</h4>';
    html += '<p style="font-size: 0.85rem; color: var(--text-light); font-style: italic;">"' + escapeHtml(content.rehearse) + '"</p>';
    html += '</div>';

    // Assessment Indicators
    html += '<div style="margin-top: 20px;">';
    html += '<h4 style="color: var(--secondary); margin-bottom: 10px; font-size: 0.9rem;">Assessment Indicators</h4>';
    html += '<ul style="list-style: none; padding: 0; margin: 0;">';
    content.assessment.forEach(indicator => {
      html += '<li style="padding: 6px 0; font-size: 0.85rem; color: var(--text-light); display: flex; align-items: flex-start; gap: 8px;">';
      html += '<span style="color: var(--success); flex-shrink: 0;">&#10003;</span>';
      html += escapeHtml(indicator);
      html += '</li>';
    });
    html += '</ul>';
    html += '</div>';

    lessonOutput.innerHTML = html;

    // Fade-in each scaffolding item sequentially
    const items = lessonOutput.querySelectorAll('.scaffolding-item');
    items.forEach((item, i) => {
      setTimeout(() => {
        item.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        item.style.opacity = '1';
        item.style.transform = 'translateY(0)';
      }, i * 150);
    });
  }
}

/* ─── 7. Portfolio Demo ───────────────────────────────────── */

function initPortfolioDemo() {
  // Animate bar fills on scroll
  const barFills = document.querySelectorAll('.bar-fill');
  if (barFills.length > 0) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const fill = entry.target;
          const targetWidth = fill.getAttribute('data-width') || fill.style.width;
          fill.style.width = '0%';
          requestAnimationFrame(() => {
            fill.style.width = targetWidth;
          });
          observer.unobserve(fill);
        }
      });
    }, { threshold: 0.2 });

    barFills.forEach(fill => {
      // Store the target width and reset for animation
      const targetWidth = fill.style.width || fill.getAttribute('data-width');
      if (targetWidth) {
        fill.setAttribute('data-width', targetWidth);
        fill.style.width = '0%';
      }
      observer.observe(fill);
    });
  }

  // Tab switching
  initTabSwitching();
}

/* ─── 8. Dashboard Demo ───────────────────────────────────── */

function initDashboardDemo() {
  // QTT bars rendered via inline styles — no JS needed

  // Animate stat counters
  const statValues = document.querySelectorAll('.dash-stat .stat-value');
  if (statValues.length > 0) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });

    statValues.forEach(el => observer.observe(el));
  }

  // Tab switching
  initTabSwitching();
}

/* ─── 9. Counter Animation ────────────────────────────────── */

function initCounterAnimation() {
  const kpiValues = document.querySelectorAll('.kpi-value');
  if (kpiValues.length === 0) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });

  kpiValues.forEach(el => observer.observe(el));
}

function animateCounter(element) {
  const text = element.textContent.trim();
  const suffix = text.replace(/[\d.,]+/, '');
  const numericStr = text.replace(/[^\d.]/g, '');
  const target = parseFloat(numericStr);

  if (isNaN(target)) return;

  const duration = 1200;
  const startTime = performance.now();
  const isDecimal = numericStr.includes('.');
  const decimals = isDecimal ? (numericStr.split('.')[1] || '').length : 0;

  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(2, -10 * progress);
    const current = target * eased;

    if (isDecimal) {
      element.textContent = current.toFixed(decimals) + suffix;
    } else {
      element.textContent = Math.round(current) + suffix;
    }

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      // Ensure final value is exact
      element.textContent = numericStr + suffix;
    }
  }

  element.textContent = '0' + suffix;
  requestAnimationFrame(step);
}

/* ─── 10. General Scroll Animations ───────────────────────── */

function initScrollAnimations() {
  // Directional reveals for problem cards
  document.querySelectorAll('.problem-card:nth-child(odd)').forEach(el => el.classList.add('reveal-left'));
  document.querySelectorAll('.problem-card:nth-child(even)').forEach(el => el.classList.add('reveal-right'));

  // Scale reveals for feature cards
  document.querySelectorAll('.feature-card').forEach(el => el.classList.add('reveal-scale'));

  // Text reveal on section headings
  document.querySelectorAll('.section-header h2').forEach(h => h.classList.add('text-reveal'));

  // Stagger grids
  document.querySelectorAll('.features-grid, .problem-grid, .kpi-grid, .team-grid, .coaching-modes')
    .forEach(g => g.classList.add('stagger-grid'));

  // Tag remaining elements for standard animation
  const animatableSelectors = [
    'section .section-header',
    '.kpi-card',
    '.team-card',
    '.timeline-item',
    '.observation-card',
    '.dash-panel',
    '.scaffolding-item',
    '.coaching-progression'
  ];

  const elements = document.querySelectorAll(animatableSelectors.join(','));
  elements.forEach(el => {
    if (!el.classList.contains('animate-on-scroll') && !el.classList.contains('reveal-left')
        && !el.classList.contains('reveal-right') && !el.classList.contains('reveal-scale')) {
      el.classList.add('animate-on-scroll');
    }
  });

  // Observe all animatable elements
  const allAnimatable = document.querySelectorAll('.animate-on-scroll, .reveal-left, .reveal-right, .reveal-scale, .text-reveal');
  if (allAnimatable.length === 0) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  allAnimatable.forEach(el => observer.observe(el));
}

/* ─── 11. Background Blob Parallax ───────────────────────── */

function initBlobParallax() {
  const blobs = document.querySelectorAll('.bg-blob');
  if (blobs.length === 0 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    blobs.forEach((blob, i) => {
      const speed = 0.02 + i * 0.01;
      blob.style.transform = `translateY(${scrollY * speed}px)`;
    });
  }, { passive: true });
}

/* ─── Shared: Tab Switching ───────────────────────────────── */

function initTabSwitching() {
  const tabContainers = document.querySelectorAll('.tabs');

  tabContainers.forEach(container => {
    // Skip if already initialized
    if (container.dataset.initialized) return;
    container.dataset.initialized = 'true';

    const tabs = container.querySelectorAll('.tab');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        // Deactivate all tabs in this container
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Find the target panel by data-tab attribute
        const targetId = tab.getAttribute('data-tab');
        if (!targetId) return;

        const parent = container.parentElement;
        if (!parent) return;

        const panels = parent.querySelectorAll('.tab-panel');
        panels.forEach(panel => {
          if (panel.id === targetId || panel.getAttribute('data-tab-panel') === targetId) {
            panel.classList.remove('hidden');
            panel.style.display = '';
          } else {
            panel.classList.add('hidden');
            panel.style.display = 'none';
          }
        });
      });
    });
  });
}

/* ─── 12. Back to Top Button ─────────────────────────── */

function initBackToTop() {
  const btn = document.getElementById('backToTop');
  if (!btn) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 400) {
      btn.classList.add('visible');
    } else {
      btn.classList.remove('visible');
    }
  }, { passive: true });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ─── 13. Scroll Progress Indicator ──────────────────── */

function initScrollProgress() {
  const bar = document.createElement('div');
  bar.className = 'scroll-progress';
  document.body.appendChild(bar);

  window.addEventListener('scroll', () => {
    const h = document.documentElement.scrollHeight - window.innerHeight;
    if (h > 0) bar.style.transform = `scaleX(${window.scrollY / h})`;
  }, { passive: true });
}

/* ─── 13. Magnetic Tilt Hover on Cards ───────────────── */

function initMagneticTilt() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  document.querySelectorAll('.feature-card, .kpi-card, .team-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(600px) rotateY(${x * 8}deg) rotateX(${y * -8}deg) translateY(-4px)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transition = 'transform 0.5s cubic-bezier(.22,1,.36,1)';
      card.style.transform = '';
    });
    card.addEventListener('mouseenter', () => {
      card.style.transition = 'transform 0.1s ease';
    });
  });
}

/* ─── 14. Button Ripple Effect ───────────────────────── */

function initButtonRipple() {
  document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('click', e => {
      const circle = document.createElement('span');
      circle.className = 'ripple';
      const r = btn.getBoundingClientRect();
      const d = Math.max(r.width, r.height);
      circle.style.width = circle.style.height = d + 'px';
      circle.style.left = (e.clientX - r.left - d / 2) + 'px';
      circle.style.top = (e.clientY - r.top - d / 2) + 'px';
      btn.appendChild(circle);
      circle.addEventListener('animationend', () => circle.remove());
    });
  });
}

/* ─── 15. Hero Parallax Depth ────────────────────────── */

function initHeroParallax() {
  const content = document.querySelector('.hero-content');
  const visual = document.querySelector('.hero-visual');
  if (!content || !visual) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  window.addEventListener('scroll', () => {
    const s = window.scrollY;
    if (s > window.innerHeight) return;
    content.style.transform = `translateY(${s * 0.15}px)`;
    visual.style.transform = `translateY(${s * 0.08}px)`;
  }, { passive: true });
}

/* ─── 16. Typing Indicator in Chat Demo ──────────────── */

function initTypingIndicator() {
  const chatBody = document.querySelector('.chat-demo-body');
  if (!chatBody) return;

  const originalRender = window.renderConversation;
  if (typeof originalRender !== 'function') return;

  window.renderConversation = function(modeKey) {
    const conversation = COACHING_CONVERSATIONS[modeKey];
    if (!conversation || !chatBody) return;

    chatBody.innerHTML = '';

    conversation.forEach((msg, i) => {
      const delay = i * 400;

      if (msg.role === 'assistant' && i > 0) {
        setTimeout(() => {
          const typing = document.createElement('div');
          typing.className = 'chat-message assistant';
          typing.innerHTML = '<div class="avatar">PF</div><div class="chat-bubble typing-indicator"><span></span><span></span><span></span></div>';
          chatBody.appendChild(typing);
          chatBody.scrollTop = chatBody.scrollHeight;

          setTimeout(() => {
            typing.remove();
            const messageEl = createChatMessage(msg.role, msg.text);
            chatBody.appendChild(messageEl);
            chatBody.scrollTop = chatBody.scrollHeight;
          }, 600);
        }, delay);
      } else {
        setTimeout(() => {
          const messageEl = createChatMessage(msg.role, msg.text);
          chatBody.appendChild(messageEl);
          chatBody.scrollTop = chatBody.scrollHeight;
        }, delay);
      }
    });
  };
}
