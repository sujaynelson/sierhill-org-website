// Mobile nav toggle
const toggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelector('.nav-links');

toggle.addEventListener('click', () => {
    navLinks.classList.toggle('open');
    const spans = toggle.querySelectorAll('span');
    if (navLinks.classList.contains('open')) {
        spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
        spans[1].style.opacity = '0';
        spans[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
    } else {
        spans[0].style.transform = '';
        spans[1].style.opacity = '';
        spans[2].style.transform = '';
    }
});

// Close nav on link click
navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
        navLinks.classList.remove('open');
        toggle.querySelectorAll('span').forEach(s => {
            s.style.transform = '';
            s.style.opacity = '';
        });
    });
});

// DNA helix canvas animation
const canvas = document.getElementById('dna-canvas');
const ctx = canvas.getContext('2d');
let w, h, time = 0;

function resize() {
    w = canvas.width = canvas.offsetWidth;
    h = canvas.height = canvas.offsetHeight;
}

window.addEventListener('resize', resize);
resize();

function draw() {
    ctx.clearRect(0, 0, w, h);
    time += 0.008;

    const centerX = w * 0.7;
    const amplitude = Math.min(w * 0.12, 120);
    const verticalSpacing = 28;
    const numPoints = Math.ceil(h / verticalSpacing) + 4;

    for (let i = 0; i < numPoints; i++) {
        const y = i * verticalSpacing - (time * 100) % verticalSpacing;
        const phase = i * 0.35 + time * 3;

        const x1 = centerX + Math.sin(phase) * amplitude;
        const x2 = centerX - Math.sin(phase) * amplitude;

        const depth1 = (Math.sin(phase) + 1) / 2;
        const depth2 = 1 - depth1;

        // Connecting rungs
        if (i % 2 === 0) {
            ctx.beginPath();
            ctx.moveTo(x1, y);
            ctx.lineTo(x2, y);
            ctx.strokeStyle = `rgba(56, 189, 248, ${0.06 + depth1 * 0.04})`;
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Strand 1
        if (i > 0) {
            const prevY = (i - 1) * verticalSpacing - (time * 100) % verticalSpacing;
            const prevPhase = (i - 1) * 0.35 + time * 3;
            const prevX1 = centerX + Math.sin(prevPhase) * amplitude;

            ctx.beginPath();
            ctx.moveTo(prevX1, prevY);
            ctx.lineTo(x1, y);
            ctx.strokeStyle = `rgba(56, 189, 248, ${0.08 + depth1 * 0.12})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();

            const prevX2 = centerX - Math.sin(prevPhase) * amplitude;
            ctx.beginPath();
            ctx.moveTo(prevX2, prevY);
            ctx.lineTo(x2, y);
            ctx.strokeStyle = `rgba(34, 211, 238, ${0.08 + depth2 * 0.12})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        // Nucleotide dots
        ctx.beginPath();
        ctx.arc(x1, y, 2.5 + depth1 * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(56, 189, 248, ${0.15 + depth1 * 0.35})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x2, y, 2.5 + depth2 * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(34, 211, 238, ${0.15 + depth2 * 0.35})`;
        ctx.fill();
    }

    requestAnimationFrame(draw);
}

draw();

// Scroll-triggered fade-in
const observerOptions = {
    threshold: 0.15,
    rootMargin: '0px 0px -40px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

document.querySelectorAll('.about-card, .service-card, .approach-step, .contact-item').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(24px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
});

// Load papers from API
(async function loadPapers() {
    const grid = document.getElementById('papers-grid');
    try {
        const res = await fetch(`${window.SIERHILL_API_URL || 'https://impartial-surprise-production-e659.up.railway.app'}/api/v1/documents`);
        const docs = await res.json();
        if (!docs.length) {
            grid.innerHTML = '<p class="papers-loading">No papers available.</p>';
            return;
        }
        const apiBase = window.SIERHILL_API_URL || 'https://impartial-surprise-production-e659.up.railway.app';
        grid.innerHTML = docs.map(doc => {
            const year = doc.filename.match(/^(\d{4})/)?.[1] || '';
            const title = doc.title || doc.filename.replace(/\.pdf$/i, '');
            const sizeMB = (doc.file_size / 1024 / 1024).toFixed(1);
            return `<a href="${apiBase}/api/v1/documents/${doc.id}/download" target="_blank" rel="noopener" class="paper-card">
                <svg class="paper-icon" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="currentColor" stroke-width="1.5"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                <div class="paper-info">
                    ${year ? `<div class="paper-year">${year}</div>` : ''}
                    <div class="paper-title">${title}</div>
                    <div class="paper-size">${sizeMB} MB</div>
                </div>
            </a>`;
        }).join('');

        // Animate paper cards on scroll
        grid.querySelectorAll('.paper-card').forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(24px)';
            el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            observer.observe(el);
        });
    } catch (e) {
        grid.innerHTML = '<p class="papers-loading">Unable to load papers.</p>';
    }
})();

// Analytics
const API_URL = window.SIERHILL_API_URL || 'https://impartial-surprise-production-e659.up.railway.app';
fetch(`${API_URL}/api/v1/analytics/pageview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        path: window.location.pathname,
        referrer: document.referrer,
    }),
}).catch(() => {});
